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

const circulation = `
  uniform float lifeTime;
  uniform float motion;
  float neuralFront(float phase) {
    return fract(lifeTime * (0.145 + fract(phase * 7.0) * 0.09) + phase) * 1.25;
  }
  float neuralAlong(float progress, float phase) {
    return fract(phase * 19.0) > 0.5 ? progress : 1.0 - progress;
  }
  float neuralWidth(float progress, float phase) {
    float delta = neuralAlong(progress, phase) - neuralFront(phase);
    return (1.0 - smoothstep(0.018, 0.065, abs(delta))) * motion;
  }
  vec2 neuralSignal(float progress, float phase) {
    // A full journey takes 3.4–5.5 seconds, then a short, independently phased rest.
    float front = neuralFront(phase);
    float along = neuralAlong(progress, phase);
    float delta = along - front;
    float head = exp(-delta * delta * 1600.0);
    float trail = exp(-abs(delta) * 18.0) * (1.0 - smoothstep(-0.018, 0.008, delta));
    float arrival = smoothstep(-0.025, 0.045, front) * (1.0 - smoothstep(1.0, 1.12, front));
    return vec2(head, trail) * arrival * motion;
  }
`
const fibreVertex = `
  attribute vec3 color;
  attribute vec3 fibrePhase;
  varying vec3 vColor;
  varying vec3 vFibre;
  void main() {
    vColor = color; vFibre = fibrePhase;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const fibreFragment = `
  uniform float lifeTime;
  uniform float motion;
  uniform float contextOpacity;
  uniform float focusedOpacity;
  varying vec3 vColor;
  varying vec3 vFibre;
  void main() {
    // Longitudinal illumination keeps the little strands alive without moving targets
    // or their welds, and needs only one time uniform for the entire fibre batch.
    float shimmer = 1.0 + motion * 0.18 * sin(vFibre.x * 23.0 - lifeTime * 1.2 + vFibre.y * 6.283185);
    gl_FragColor = vec4(vColor, mix(contextOpacity, focusedOpacity, vFibre.z) * shimmer);
    #include <colorspace_fragment>
  }
`

export function OrganicFilaments({ graph, poses, layout, selected, tier, reducedMotion }: {
  graph: NevoliumGraphSnapshot; poses: PoseMap; layout: NevoliumSpatialLayout; selected: string[]; tier: Tier; reducedMotion: boolean
}) {
  const material = useMemo(() => growFilaments(graph, poses, layout, tier, selected), [graph, poses, layout, tier, selected])
  // Apply the density budget to opacity, after colour conversion. Lowering linear RGB
  // alone still lets hundreds of sRGB-encoded strokes accumulate into a white centre.
  const opacityBudget = Math.max(0.16, Math.min(1, 120 / Math.max(1, material.edgeIds.length)) ** 0.65)
  const contextOpacity = selected.length ? 0.12 * Math.sqrt(opacityBudget) : opacityBudget
  const lines = useMemo(() => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(material.body.attributes.position.array as Float32Array)
    geometry.setColors(material.body.attributes.color.array as Float32Array)
    geometry.setAttribute('instanceWidth', new THREE.InstancedBufferAttribute(material.widths, 1))
    geometry.setAttribute('instanceFlow', new THREE.InstancedBufferAttribute(material.flow, 4))
    geometry.setAttribute('instanceAttention', new THREE.InstancedBufferAttribute(material.attention, 1))
    const makeMaterial = (linewidth: number, opacity: number, pulseOpacity: number, halo: number) => {
      const line = new LineMaterial({ color: 0xffffff, vertexColors: true, linewidth, opacity,
        transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, alphaToCoverage: true })
      const marker = 'offset *= linewidth;'
      if (!line.vertexShader.includes(marker)) throw new Error('Organic line width shader contract changed')
      line.vertexShader = 'attribute float instanceWidth;\n' + line.vertexShader.replace(marker,
        'offset *= linewidth * instanceWidth * (1.0 + (vFlow.z > 0.0 ? neuralWidth(vFlow.x, vFlow.y) * vFlow.z * 0.38 : 0.0));')
      // Three's coverage branch replaces opacity at every round segment cap. Preserve it,
      // otherwise the faint glow becomes opaque dots and saturates dense junctions.
      const coverage = 'alpha = 1.0 - smoothstep'
      if (!line.fragmentShader.includes(coverage)) throw new Error('Organic line coverage shader contract changed')
      line.fragmentShader = line.fragmentShader.replaceAll(coverage, 'alpha *= 1.0 - smoothstep')
      line.uniforms.lifeTime = { value: 0 }; line.uniforms.motion = { value: 0 }
      line.uniforms.contextOpacity = { value: contextOpacity }
      line.uniforms.focusedOpacity = { value: selected.length ? 1 : opacityBudget }
      line.uniforms.pulseOpacity = { value: pulseOpacity }
      line.uniforms.halo = { value: halo }
      const shared = circulation + 'varying vec4 vFlow;\n'
      line.vertexShader = shared + 'attribute vec4 instanceFlow; attribute float instanceAttention;\n' + line.vertexShader.replace('void main() {', `void main() {
        vFlow = vec4(position.y < 0.5 ? instanceFlow.x : instanceFlow.y, instanceFlow.z, instanceFlow.w, instanceAttention);`)
      // Compose two light contributions after colour conversion. Sharing the background
      // alpha would erase energy in a dense view; adding linear RGB before conversion
      // would instead bleach hundreds of faint lines. Additive blending applies this
      // final alpha exactly once, while the journey stays on the actual fibre.
      const output = '#include <colorspace_fragment>'
      if (!line.fragmentShader.includes(output)) throw new Error('Organic line colour-space shader contract changed')
      line.fragmentShader = shared + 'uniform float contextOpacity; uniform float focusedOpacity; uniform float pulseOpacity; uniform float halo;\n'
        + line.fragmentShader.replace(output, output + `
          vec2 signal = vFlow.z > 0.0 ? neuralSignal(vFlow.x, vFlow.y) : vec2(0.0);
          float feather = mix(1.0, exp(-vUv.x * vUv.x * 3.5), halo);
          // Cap coverage alone leaves hard lateral edges on a non-MSAA canvas.
          // Bound the derivative band so even a thin fibre retains its luminous centre.
          float sideAA = clamp(fwidth(vUv.x), 0.025, 0.9);
          float lateral = 1.0 - smoothstep(1.0 - sideAA, 1.0 + sideAA, abs(vUv.x));
          float coverage = alpha / max(opacity, 0.0001) * feather * lateral;
          float tide = 1.0 + motion * 0.10 * sin(lifeTime * 0.9 - vFlow.x * 18.0 + vFlow.y * 6.283185);
          float strandAlpha = alpha * feather * lateral * mix(contextOpacity, focusedOpacity, vFlow.w) * tide;
          float energyAlpha = coverage * pulseOpacity * (signal.x + signal.y * 0.30) * vFlow.z;
          vec3 energyColor = mix(vec3(0.22, 0.91, 1.0), vec3(0.40, 1.0, 0.70), step(0.64, fract(vFlow.y * 11.0)));
          // Rare amber flecks are decorative light; attention still records only real
          // selection incidence. Neither material colour nor circulation claims a job.
          float amber = clamp((step(0.88, fract(vFlow.y * 31.0)) * 0.95 + vFlow.w * 0.70) * signal.x, 0.0, 1.0);
          energyColor = mix(energyColor, vec3(1.0, 0.61, 0.25), amber);
          float combinedAlpha = min(1.0, strandAlpha + energyAlpha);
          vec3 combinedLight = gl_FragColor.rgb * strandAlpha + energyColor * energyAlpha;
          gl_FragColor = vec4(combinedLight / max(combinedAlpha, 0.0001), combinedAlpha);
        `)
      return line
    }
    const core = new LineSegments2(geometry, makeMaterial(1.65, 0.58, 0.88, 0))
    const glow = new LineSegments2(geometry, makeMaterial(5.5, 0.018, 0.19, 1))
    const fibres = new THREE.ShaderMaterial({ vertexShader: fibreVertex, fragmentShader: fibreFragment,
      uniforms: { lifeTime: { value: 0 }, motion: { value: 0 },
        contextOpacity: { value: 0.32 * contextOpacity }, focusedOpacity: { value: 0.22 } },
      transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })
    core.raycast = () => {}; glow.raycast = () => {}
    return { geometry, core, glow, fibres }
  }, [material, contextOpacity, opacityBudget, selected.length])
  useFrame(({ clock }) => {
    for (const line of [lines.core, lines.glow]) {
      line.material.uniforms.lifeTime.value = reducedMotion ? 0 : clock.elapsedTime
      line.material.uniforms.motion.value = reducedMotion ? 0 : 1
    }
    lines.fibres.uniforms.lifeTime.value = reducedMotion ? 0 : clock.elapsedTime
    lines.fibres.uniforms.motion.value = reducedMotion ? 0 : 1
  })
  useEffect(() => () => {
    material.body.dispose(); material.fibres.dispose(); lines.geometry.dispose()
    lines.core.material.dispose(); lines.glow.material.dispose(); lines.fibres.dispose()
  }, [material, lines])
  return <>
    <primitive object={lines.glow} dispose={null} />
    <primitive object={lines.core} dispose={null} />
    <lineSegments geometry={material.fibres} raycast={() => {}}>
      <primitive object={lines.fibres} attach="material" dispose={null} />
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
