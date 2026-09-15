import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { NevoliumGraphSnapshot, NevoliumSpatialLayout } from '@nevolium/graph'
import membraneUrl from '../../public/mycelium-membrane.webp?url'
import { growFilaments, seed, type PoseMap } from './organicGeometry'
import type { SpatialGroup, SpatialNode, Tier } from './presentation'

type Colony = { id: string; position: THREE.Vector3; radius: number; tint: THREE.Color; active: boolean; selected: boolean }
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
  const bounds = new THREE.Box3()
  items.forEach(item => { bounds.expandByPoint(item.position.clone().addScalar(item.radius)); bounds.expandByPoint(item.position.clone().addScalar(-item.radius)) })
  geometry.boundingSphere = items.length ? bounds.getBoundingSphere(new THREE.Sphere()) : new THREE.Sphere(new THREE.Vector3(), 0)
  plane.dispose()
  return geometry
}

const vertexShader = `
  attribute vec3 center;
  attribute float radius;
  attribute vec3 tone;
  attribute float phase;
  attribute float activity;
  attribute float emphasis;
  varying vec2 vUv;
  varying vec3 vTone;
  varying float vPhase;
  varying float vActivity;
  varying float vEmphasis;
  void main() {
    vUv = uv; vTone = tone; vPhase = phase; vActivity = activity; vEmphasis = emphasis;
    vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
    // Fibre membranes face the viewer at real 3D positions; they never become polygonal cages.
    viewCenter.xy += position.xy * radius * vec2(1.0, 0.89 + sin(phase) * 0.055);
    gl_Position = projectionMatrix * viewCenter;
  }
`
const membraneShader = `
  uniform sampler2D tissue;
  uniform float time;
  uniform float motion;
  varying vec2 vUv;
  varying vec3 vTone;
  varying float vPhase;
  varying float vActivity;
  varying float vEmphasis;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float turn = vPhase;
    p = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p;
    p *= 1.0 + sin(angle * 3.0 + vPhase) * 0.035 + sin(angle * 5.0 - vPhase) * 0.025;
    vec3 sampleColor = texture2D(tissue, p * 0.5 + 0.5).rgb;
    float light = max(sampleColor.r, max(sampleColor.g, sampleColor.b));
    float fade = 1.0 - smoothstep(0.8, 1.0, radius);
    float breath = 1.0 + vActivity * motion * (0.12 + sin(time * 1.15 + vPhase) * 0.12);
    float alpha = max(clamp(light * 4.0, 0.0, 0.95), exp(-radius * radius * 11.0) * 0.82) * fade;
    if (alpha < 0.004) discard;
    vec3 ink = vec3(0.002, 0.013, 0.02);
    vec3 fibres = sampleColor * mix(vec3(1.0), vTone * 1.8, 0.28) * breath * (1.1 + vEmphasis * 0.55);
    fibres += vTone * exp(-radius * radius * 7.0) * (0.025 + vEmphasis * 0.055 + vActivity * 0.035);
    gl_FragColor = vec4(mix(ink, fibres, clamp(light * 6.0 + 0.12, 0.0, 1.0)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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

export function OrganicNodes({ nodes, poses, selected, reducedMotion, onSelect }: {
  nodes: SpatialNode[]; poses: PoseMap; selected: string[]; reducedMotion: boolean
  onSelect: (id: string, additive: boolean) => void
}) {
  // Reuse the approved D05 tissue, not a newly generated illustration or an external image.
  // useLoader retains one shared texture across remounts; per-scene geometry is disposed below.
  const texture = useLoader(THREE.TextureLoader, membraneUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = useRef<THREE.ShaderMaterial>(null)
  const items = useMemo(() => {
    const active = new Set(nodes.filter(node => ['queued', 'running'].includes(node.status)).slice(0, 24).map(node => node.id))
    return nodes.map(node => ({ id: node.id, position: poses.get(node.id) || new THREE.Vector3(),
      radius: (node.kind === 'project' ? 1.15 : 0.64) * (0.86 + seed(node.id) * 0.24) * (selected.includes(node.id) ? 1.25 : 1),
      tint: new THREE.Color(node.kind === 'project' ? '#58e0d0' : node.kind === 'task' ? '#81d9b5' : node.kind === 'decision' ? '#d5bf96' : node.kind === 'idea' ? '#aaa0db' : '#77bfce'),
      active: active.has(node.id), selected: selected.includes(node.id) }))
  }, [nodes, poses, selected])
  const geometry = useMemo(() => colonyGeometry(items), [items])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(() => ({ tissue: { value: texture }, time: { value: 0 }, motion: { value: 0 } }), [texture])
  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.time.value = clock.elapsedTime
      material.current.uniforms.motion.value = reducedMotion ? 0 : 1
    }
  })
  const raycast = useMemo(() => function (this: THREE.Mesh, raycaster: THREE.Raycaster, intersections: THREE.Intersection[]) {
    const normal = raycaster.camera?.getWorldDirection(new THREE.Vector3()) || raycaster.ray.direction
    const point = new THREE.Vector3(), plane = new THREE.Plane()
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      plane.setFromNormalAndCoplanarPoint(normal, item.position)
      if (!raycaster.ray.intersectPlane(plane, point) || point.distanceTo(item.position) > item.radius * 0.8) continue
      const distance = point.distanceTo(raycaster.ray.origin)
      if (distance >= raycaster.near && distance <= raycaster.far) intersections.push({ distance, point: point.clone(), object: this, instanceId: i })
    }
  }, [items])
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.instanceId !== undefined && nodes[event.instanceId]) onSelect(nodes[event.instanceId].id, event.nativeEvent.shiftKey)
  }
  return <mesh geometry={geometry} raycast={raycast} onClick={select} renderOrder={2}>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={membraneShader}
      transparent depthWrite={false} toneMapped={false} />
  </mesh>
}

export function OrganicFilaments({ graph, poses, layout, selected, tier }: {
  graph: NevoliumGraphSnapshot; poses: PoseMap; layout: NevoliumSpatialLayout; selected: string[]; tier: Tier
}) {
  const material = useMemo(() => growFilaments(graph, poses, layout, tier, selected), [graph, poses, layout, tier, selected])
  useEffect(() => () => { material.body.dispose(); material.fibres.dispose() }, [material])
  return <>
    <mesh geometry={material.body} raycast={() => {}}>
      <meshBasicMaterial vertexColors transparent opacity={0.66} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
    <lineSegments geometry={material.fibres} raycast={() => {}}>
      <lineBasicMaterial vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  </>
}

export function OrganicGroups({ groups, poses }: { groups: SpatialGroup[]; poses: PoseMap }) {
  const items = useMemo(() => groups.slice(0, 24).flatMap(group => {
    const members = group.nodeIds.map(id => poses.get(id)).filter((p): p is THREE.Vector3 => Boolean(p))
    if (!members.length) return []
    const center = members.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(members.length)
    return [{ id: group.id, position: center, radius: Math.max(1, ...members.map(p => p.distanceTo(center))) + 1.5,
      tint: new THREE.Color('#428e90'), active: false, selected: false }]
  }), [groups, poses])
  const geometry = useMemo(() => colonyGeometry(items), [items])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (!items.length) return null
  return <mesh geometry={geometry} raycast={() => {}} renderOrder={-1}>
    <shaderMaterial vertexShader={vertexShader} fragmentShader={groupShader} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
  </mesh>
}
