import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import type { NevoliumGraphSnapshot, NevoliumSpatialLayout } from '@nevolium/graph'
import { growFilaments, seed, type PoseMap } from './organicGeometry'
import type { SpatialGroup, Tier } from './presentation'

type Colony = { id: string; position: THREE.Vector3; radius: number; tint: THREE.Color; active: boolean; selected: boolean; strength: number }
function colonyGeometry(items: Colony[]) {
  const plane = new THREE.PlaneGeometry(2, 2)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.attributes.position = plane.attributes.position
  geometry.attributes.uv = plane.attributes.uv
  geometry.instanceCount = items.length
  geometry.setAttribute('center', new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap(item => item.position.toArray())), 3))
  geometry.setAttribute('radius', new THREE.InstancedBufferAttribute(new Float32Array(items.map(item => item.radius)), 1))
  geometry.setAttribute('tone', new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap(item => item.tint.toArray())), 3))
  geometry.setAttribute('phase', new THREE.InstancedBufferAttribute(new Float32Array(items.map(item => seed(item.id) * 6.28)), 1))
  geometry.setAttribute('activity', new THREE.InstancedBufferAttribute(new Float32Array(items.map(item => item.active ? 1 : 0)), 1))
  geometry.setAttribute('emphasis', new THREE.InstancedBufferAttribute(new Float32Array(items.map(item => item.selected ? 1 : 0)), 1))
  geometry.setAttribute('prominence', new THREE.InstancedBufferAttribute(new Float32Array(items.map(item => item.strength)), 1))
  const bounds = new THREE.Box3()
  items.forEach(item => { bounds.expandByPoint(item.position.clone().addScalar(item.radius)); bounds.expandByPoint(item.position.clone().addScalar(-item.radius)) })
  geometry.boundingSphere = items.length ? bounds.getBoundingSphere(new THREE.Sphere()) : new THREE.Sphere(new THREE.Vector3(), 0)
  plane.dispose()
  return geometry
}

const vertexShader = `
  uniform float maxAngle;
  attribute vec3 center;
  attribute float radius;
  attribute vec3 tone;
  attribute float phase;
  attribute float activity;
  attribute float emphasis;
  attribute float prominence;
  varying vec2 vUv;
  varying vec3 vTone;
  varying float vPhase;
  varying float vActivity;
  varying float vEmphasis;
  varying float vProminence;
  void main() {
    vUv = uv; vTone = tone; vPhase = phase; vActivity = activity; vEmphasis = emphasis; vProminence = prominence;
    vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
    // Fibre membranes face the viewer at real 3D positions; they never become polygonal cages.
    float apparentRadius = maxAngle > 0.0 ? min(radius, max(0.0, -viewCenter.z) * maxAngle) : radius;
    viewCenter.xy += position.xy * apparentRadius * vec2(1.0, 0.89 + sin(phase) * 0.055);
    gl_Position = projectionMatrix * viewCenter;
  }
`
const groupShader = `
  varying vec2 vUv;
  varying vec3 vTone;
  varying float vPhase;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float irregular = 1.0 + sin(p.x * 7.0 + sin(p.y * 5.0) + vPhase) * 0.22;
    float veil = exp(-r * r * 4.5) * (1.0 - smoothstep(0.65, 1.0, r)) * irregular;
    gl_FragColor = vec4(vTone, veil * 0.06);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function OrganicFilaments({ graph, poses, layout, selected, tier, reducedMotion }: {
  graph: NevoliumGraphSnapshot; poses: PoseMap; layout: NevoliumSpatialLayout; selected: string[]; tier: Tier; reducedMotion: boolean
}) {
  const material = useMemo(() => growFilaments(graph, poses, layout, tier, selected), [graph, poses, layout, tier, selected])
  const lines = useMemo(() => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(material.body.attributes.position.array as Float32Array)
    geometry.setColors(material.body.attributes.color.array as Float32Array)
    geometry.setAttribute('instanceWidth', new THREE.InstancedBufferAttribute(material.widths, 1))
    geometry.setAttribute('instanceFlow', new THREE.InstancedBufferAttribute(material.flow, 4))
    geometry.setAttribute('instanceAttention', new THREE.InstancedBufferAttribute(material.attention, 1))
    const makeMaterial = (linewidth: number, opacity: number) => {
      const line = new LineMaterial({ color: 0xffffff, vertexColors: true, linewidth, opacity,
        transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, alphaToCoverage: true })
      const marker = 'offset *= linewidth;'
      if (!line.vertexShader.includes(marker)) throw new Error('Organic line width shader contract changed')
      line.vertexShader = 'attribute float instanceWidth;\n' + line.vertexShader.replace(marker, 'offset *= linewidth * instanceWidth;')
      // Three's coverage branch replaces opacity at every round segment cap. Preserve it,
      // otherwise the faint glow becomes opaque dots and saturates dense junctions.
      const coverage = 'alpha = 1.0 - smoothstep'
      if (!line.fragmentShader.includes(coverage)) throw new Error('Organic line coverage shader contract changed')
      line.fragmentShader = line.fragmentShader.replaceAll(coverage, 'alpha *= 1.0 - smoothstep')
      line.uniforms.lifeTime = { value: 0 }; line.uniforms.motion = { value: 0 }
      const shared = 'uniform float lifeTime; uniform float motion; varying vec4 vFlow;\n'
      line.vertexShader = shared + 'attribute vec4 instanceFlow; attribute float instanceAttention;\n' + line.vertexShader.replace('void main() {', `void main() {
        vFlow = vec4(position.y < 0.5 ? instanceFlow.x : instanceFlow.y, instanceFlow.z, instanceFlow.w, instanceAttention);`)
      // The broad wave brightens the existing fibre itself, rather than orbiting dots.
      const color = '#include <color_fragment>'
      if (!line.fragmentShader.includes(color)) throw new Error('Neural flow shader contract changed')
      line.fragmentShader = shared + line.fragmentShader.replace(color, color + `
        float direction = fract(vFlow.y * 19.0) > 0.5 ? 1.0 : -1.0;
        // Rest intervals and a shared density budget prevent a dense white web.
        float front = fract(lifeTime * (0.042 + fract(vFlow.y * 7.0) * 0.022) + vFlow.y) * 2.3;
        float along = direction > 0.0 ? vFlow.x : 1.0 - vFlow.x;
        float delta = along - front;
        float head = exp(-delta * delta * 850.0);
        float wake = exp(-delta * delta * 65.0) * (1.0 - smoothstep(-0.015, 0.02, delta));
        float arrival = smoothstep(0.0, 0.06, front) * (1.0 - smoothstep(0.91, 1.0, front));
        float energy = (head * 0.82 + wake * 0.22) * arrival * vFlow.z * motion;
        vec3 pulse = mix(vec3(0.20, 0.62, 0.43), vec3(0.95, 0.28, 0.065), vFlow.w);
        diffuseColor.rgb += pulse * energy;
      `)
      return line
    }
    const core = new LineSegments2(geometry, makeMaterial(1.5, 0.62))
    const glow = new LineSegments2(geometry, makeMaterial(4.0, 0.035))
    core.raycast = () => {}; glow.raycast = () => {}
    return { geometry, core, glow }
  }, [material])
  useFrame(({ clock }) => {
    for (const line of [lines.core, lines.glow]) {
      line.material.uniforms.lifeTime.value = reducedMotion ? 0 : clock.elapsedTime
      line.material.uniforms.motion.value = reducedMotion ? 0 : 1
    }
  })
  useEffect(() => () => {
    material.body.dispose(); material.fibres.dispose(); lines.geometry.dispose()
    lines.core.material.dispose(); lines.glow.material.dispose()
  }, [material, lines])
  return <>
    <primitive object={lines.glow} dispose={null} />
    <primitive object={lines.core} dispose={null} />
    <lineSegments geometry={material.fibres} raycast={() => {}}>
      <lineBasicMaterial vertexColors transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  </>
}

export function OrganicGroups({ groups, poses }: { groups: SpatialGroup[]; poses: PoseMap }) {
  const items = useMemo(() => groups.slice(0, 24).flatMap(group => {
    const members = group.nodeIds.map(id => poses.get(id)).filter((p): p is THREE.Vector3 => Boolean(p))
    if (!members.length) return []
    const center = members.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(members.length)
    return [{ id: group.id, position: center, radius: Math.max(1, ...members.map(p => p.distanceTo(center))) + 1.5,
      tint: new THREE.Color('#428e90'), active: false, selected: false, strength: 1 }]
  }), [groups, poses])
  const geometry = useMemo(() => colonyGeometry(items), [items])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (!items.length) return null
  return <mesh geometry={geometry} raycast={() => {}} renderOrder={-1}>
    <shaderMaterial uniforms={{ maxAngle: { value: 0 } }} vertexShader={vertexShader} fragmentShader={groupShader} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
  </mesh>
}
