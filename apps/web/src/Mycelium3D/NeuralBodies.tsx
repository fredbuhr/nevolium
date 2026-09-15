import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { NevoliumGraphSnapshot } from '@nevolium/graph'
import { growthHubs, seed, type PoseMap } from './organicGeometry'
import type { SpatialNode, Tier } from './presentation'

export function neuralRadius(node: SpatialNode) {
  return (node.kind === 'project' ? 1.05 : 0.72) * (0.9 + seed(node.id) * 0.2)
}

const common = `
  uniform float lifeTime;
  uniform float motion;
  attribute vec3 center;
  attribute vec3 tone;
  attribute float phase;
  attribute float radius;
  attribute vec3 state;
  varying vec3 vTone;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  varying vec3 vState;
  varying float vPhase;
  void passSurface(vec3 local, vec3 normal, float scale) {
    vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
    float size = min(scale, max(0.0, -viewCenter.z) * 0.105);
    vec4 view = modelViewMatrix * vec4(center + local * size, 1.0);
    vTone = tone; vNormal = normalize(normalMatrix * normal); vView = -view.xyz;
    vLocal = local; vState = state; vPhase = phase;
    gl_Position = projectionMatrix * view;
  }
`
const somaVertex = common + `
  attribute vec3 axis;
  vec3 surface(vec3 p) {
    float lobe = pow(max(0.0, dot(p, axis)), 6.0) * 0.32;
    float folds = 0.12 * sin(p.x * 4.3 + phase) * sin(p.y * 3.7 - phase)
      + 0.08 * sin(p.z * 5.0 + p.x * 2.0 + phase);
    vec3 shape = p * (1.0 + folds + lobe) * vec3(1.13, 0.84 + sin(phase) * 0.09, 0.94);
    return shape * (1.0 + motion * 0.047 * sin(lifeTime * 1.1 + phase + p.y * 0.8));
  }
  void main() {
    vec3 p = normalize(position);
    vec3 tangent = normalize(cross(abs(p.y) > 0.9 ? vec3(1,0,0) : vec3(0,1,0), p));
    vec3 bitangent = cross(p, tangent);
    vec3 q = surface(p);
    vec3 normal = normalize(cross(surface(normalize(p + tangent * 0.025)) - q,
      surface(normalize(p + bitangent * 0.025)) - q));
    passSurface(q, normal, radius * (1.0 + state.y * 0.12));
  }
`
const dendriteVertex = common + `
  attribute vec3 tip;
  attribute vec3 bend;
  attribute float girth;
  void main() {
    float t = position.y + 0.5;
    vec3 route = tip * t + bend * sin(t * 3.14159265);
    vec3 tangent = normalize(tip + bend * 3.14159265 * cos(t * 3.14159265));
    vec3 side = normalize(cross(abs(tangent.y) > 0.9 ? vec3(1,0,0) : vec3(0,1,0), tangent));
    vec3 up = cross(side, tangent);
    float taper = mix(girth, 0.012, pow(t, 0.58));
    taper *= 1.0 + 0.11 * sin(t * 18.0 + phase) + motion * 0.05 * sin(lifeTime * 1.1 + phase - t * 2.0);
    vec3 normal = normalize(side * position.x + up * position.z);
    vec3 local = route + normal * taper;
    passSurface(local, normal, radius);
  }
`
const tissueFragment = `
  uniform float lifeTime;
  uniform float motion;
  varying vec3 vTone;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  varying vec3 vState;
  varying float vPhase;
  void main() {
    vec3 n = normalize(vNormal), view = normalize(vView);
    vec3 light = normalize(vec3(-0.6, 0.8, 1.0));
    float facing = max(0.0, dot(n, view));
    float rim = pow(1.0 - facing, 2.4);
    float diffuse = max(0.0, dot(n, light));
    float grain = sin(vLocal.x * 16.0 + sin(vLocal.z * 12.0 + vPhase) * 2.0
      + vLocal.y * 9.0) * sin(vLocal.y * 11.0 - vLocal.z * 7.0 + vPhase);
    float veins = smoothstep(0.57, 0.9, grain);
    float breathing = 0.5 + 0.5 * sin(lifeTime * 1.1 + vPhase);
    float tide = motion * (0.08 + 0.14 * breathing);
    float specular = pow(max(0.0, dot(n, normalize(light + view))), 24.0);
    vec3 deep = vec3(0.004, 0.025, 0.03);
    vec3 tissue = vTone * (0.13 + diffuse * 0.28 + rim * 0.48 + veins * (0.32 + tide));
    tissue += vec3(0.42, 0.83, 0.73) * specular * 0.24;
    tissue += vTone * pow(facing, 5.0) * (0.09 + tide);
    // Warm local activity is backed by queued/running Tasks; ambient tide exists at rest.
    tissue += vec3(0.35, 0.18, 0.025) * vState.z * pow(facing, 8.0) * (0.25 + tide);
    tissue *= (1.0 + vState.y * 0.3) * vState.x;
    gl_FragColor = vec4(deep + tissue, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

type Form = { id: string; center: THREE.Vector3; radius: number; phase: number; tone: THREE.Color; axis: THREE.Vector3; active: number }
type Arbor = Form & { tip: THREE.Vector3; bend: THREE.Vector3; girth: number }

function formsFor(nodes: SpatialNode[], graph: NevoliumGraphSnapshot, poses: PoseMap) {
  const hubs = [...growthHubs(graph, poses).values()]
  const forms: Form[] = [], arbors: Arbor[] = []
  for (const node of nodes) {
    const phase = seed(node.id) * Math.PI * 2
    const local = hubs.filter(hub => hub.nodeId === node.id).sort((a, b) => b.count - a.count).slice(0, 5)
    const axis = local[0]?.direction.clone() || new THREE.Vector3(Math.sin(phase), 0.35, Math.cos(phase)).normalize()
    const form: Form = { id: node.id, center: poses.get(node.id) || new THREE.Vector3(), radius: neuralRadius(node), phase, axis,
      tone: new THREE.Color(node.kind === 'project' ? '#58d5be' : node.kind === 'task' ? '#65cfa7' : node.kind === 'idea' ? '#9b95d3' : '#5eafc8'),
      active: ['queued', 'running'].includes(node.status) ? 1 : 0 }
    forms.push(form)
    // Local dendrites are soma material; only the graph filaments connect distinct objects.
    const directions = local.length ? local.map(hub => hub.direction) : [axis, axis.clone().negate()]
    directions.forEach((direction, index) => {
      const side = new THREE.Vector3().crossVectors(direction, Math.abs(direction.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize()
      const extent = (1.65 + seed(`${node.id}:${index}`) * 0.6) / form.radius
      const tip = direction.clone().multiplyScalar(extent)
      const bend = side.clone().multiplyScalar((seed(`${node.id}:${index}:bend`) - 0.5) * 0.4)
      arbors.push({ ...form, tip, bend, girth: 0.33 })
      if (index < 2) {
        // A short tapering fork stays within the local neuron; it never becomes an extra edge.
        arbors.push({ ...form, tip: tip.clone().multiplyScalar(0.8).addScaledVector(side, 0.65),
          bend: bend.clone().addScaledVector(direction, 0.45), girth: 0.18 })
      }
    })
  }
  return { forms, arbors }
}

function instances(base: THREE.BufferGeometry, items: Form[] | Arbor[]) {
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = base.index
  geometry.attributes = { ...base.attributes }
  geometry.instanceCount = items.length
  const attribute = (name: string, size: number, values: number[]) => geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(values), size))
  attribute('center', 3, items.flatMap(item => item.center.toArray()))
  attribute('tone', 3, items.flatMap(item => item.tone.toArray()))
  attribute('phase', 1, items.map(item => item.phase))
  attribute('radius', 1, items.map(item => item.radius))
  attribute('axis', 3, items.flatMap(item => item.axis.toArray()))
  attribute('state', 3, items.flatMap(item => [1, 0, item.active]))
  if (items.length && 'tip' in items[0]) {
    const branches = items as Arbor[]
    attribute('tip', 3, branches.flatMap(item => item.tip.toArray()))
    attribute('bend', 3, branches.flatMap(item => item.bend.toArray()))
    attribute('girth', 1, branches.map(item => item.girth))
  }
  const bounds = new THREE.Box3()
  items.forEach(item => { bounds.expandByPoint(item.center.clone().addScalar(4)); bounds.expandByPoint(item.center.clone().addScalar(-4)) })
  geometry.boundingSphere = items.length ? bounds.getBoundingSphere(new THREE.Sphere()) : new THREE.Sphere(new THREE.Vector3(), 0)
  base.dispose()
  return geometry
}

export function NeuralBodies({ nodes, graph, poses, selected, reducedMotion, tier, onSelect }: {
  nodes: SpatialNode[]; graph: NevoliumGraphSnapshot; poses: PoseMap; selected: string[]; reducedMotion: boolean; tier: Tier
  onSelect: (id: string, additive: boolean) => void
}) {
  const material = useRef<THREE.ShaderMaterial>(null), branches = useRef<THREE.ShaderMaterial>(null)
  const model = useMemo(() => formsFor(nodes, graph, poses), [nodes, graph, poses])
  const geometry = useMemo(() => instances(new THREE.SphereGeometry(1, tier === 'eco' ? 18 : 26, tier === 'eco' ? 12 : 18), model.forms), [model, tier])
  const arborGeometry = useMemo(() => instances(new THREE.CylinderGeometry(1, 1, 1, tier === 'eco' ? 5 : 7, 8, true), model.arbors), [model, tier])
  const uniforms = useMemo(() => ({ lifeTime: { value: 0 }, motion: { value: reducedMotion ? 0 : 1 } }), [reducedMotion])
  useEffect(() => () => { geometry.dispose(); arborGeometry.dispose() }, [geometry, arborGeometry])
  useEffect(() => {
    const nearby = new Set(selected)
    for (const edge of graph.edges) if (selected.includes(edge.source) || selected.includes(edge.target)) { nearby.add(edge.source); nearby.add(edge.target) }
    for (const [surface, items] of [[geometry, model.forms], [arborGeometry, model.arbors]] as const) {
      const state = surface.getAttribute('state') as THREE.InstancedBufferAttribute
      items.forEach((item, index) => state.setXYZ(index, selected.length && !nearby.has(item.id) ? 0.2 : 1, selected.includes(item.id) ? 1 : 0, item.active))
      state.needsUpdate = true
    }
  }, [selected, graph, geometry, arborGeometry, model])
  useFrame(({ clock }) => {
    for (const surface of [material.current, branches.current]) if (surface) {
      surface.uniforms.lifeTime.value = reducedMotion ? 0 : clock.elapsedTime
      surface.uniforms.motion.value = reducedMotion ? 0 : 1
    }
  })
  const raycast = useMemo(() => function (this: THREE.Mesh, raycaster: THREE.Raycaster, intersections: THREE.Intersection[]) {
    const normal = raycaster.camera?.getWorldDirection(new THREE.Vector3()) || raycaster.ray.direction
    const cameraPosition = raycaster.camera?.getWorldPosition(new THREE.Vector3()) || raycaster.ray.origin
    const sphere = new THREE.Sphere(), point = new THREE.Vector3()
    for (let i = 0; i < model.forms.length; i++) {
      const item = model.forms[i]
      const depth = item.center.clone().sub(cameraPosition).dot(normal)
      const size = Math.min(item.radius * (selected.includes(item.id) ? 1.12 : 1), Math.max(0, depth) * 0.105)
      sphere.set(item.center, size * 1.16)
      if (!raycaster.ray.intersectSphere(sphere, point)) continue
      const distance = point.distanceTo(raycaster.ray.origin)
      if (distance >= raycaster.near && distance <= raycaster.far) intersections.push({ distance, point: point.clone(), object: this, instanceId: i })
    }
  }, [model, selected])
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.instanceId !== undefined && nodes[event.instanceId]) onSelect(nodes[event.instanceId].id, event.nativeEvent.shiftKey)
  }
  return <>
    <mesh geometry={arborGeometry} raycast={() => {}}>
      <shaderMaterial ref={branches} uniforms={uniforms} vertexShader={dendriteVertex} fragmentShader={tissueFragment} toneMapped={false} />
    </mesh>
    <mesh geometry={geometry} raycast={raycast} onClick={select}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={somaVertex} fragmentShader={tissueFragment} toneMapped={false} />
    </mesh>
  </>
}
