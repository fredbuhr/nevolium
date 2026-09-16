import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { NevoliumGraphSnapshot } from '@nevolium/graph'
import { seed, type PoseMap } from './organicGeometry'
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
  attribute vec3 axisB;
  attribute vec3 axisC;
  vec3 surface(vec3 p) {
    // Broad, bounded asymmetry: no neighbour-directed spikes or decorative dendrites.
    float lobes = 0.075 * sin(dot(p, axis) * 3.0 + phase)
      + 0.045 * sin(dot(p, axisB) * 3.4 - phase)
      + 0.025 * sin(dot(p, axisC) * 4.0 + phase);
    vec3 shape = p * (0.9 + lobes) * vec3(1.06, 0.88 + sin(phase) * 0.04, 0.98);
    return shape * (1.0 + motion * 0.024 * sin(lifeTime * 0.85 + phase + p.y * 0.5));
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
const tissueFragment = `
  uniform float lifeTime;
  uniform float motion;
  varying vec3 vTone;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  varying vec3 vState;
  varying float vPhase;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.37, 0.73));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float tissueNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    vec3 n = normalize(vNormal), view = normalize(vView);
    vec3 light = normalize(vec3(-0.6, 0.8, 1.0));
    float facing = max(0.0, dot(n, view));
    float rim = pow(1.0 - facing, 2.8);
    float diffuse = max(0.0, dot(n, light));
    vec3 q = vLocal * 7.0 + vPhase;
    float cells = tissueNoise(q);
    float grain = tissueNoise(q * 3.7);
    // Interrupted micro-veins instead of evenly spaced topographic stripes.
    // Derivatives fade fine detail before it aliases on distant cells.
    float detail = 1.0 - smoothstep(0.12, 0.55, length(fwidth(q)));
    float veinDistance = abs(cells - 0.5);
    float aa = max(0.009, fwidth(cells));
    float veins = (1.0 - smoothstep(0.013, 0.013 + aa, veinDistance))
      * smoothstep(0.40, 0.67, grain) * detail;
    float tide = motion * (0.5 + 0.5 * sin(lifeTime * 0.85 + vPhase));
    float specular = pow(max(0.0, dot(n, normalize(light + view))), 19.0);
    vec3 tissue = vTone * (0.075 + diffuse * 0.30 + rim * 0.26);
    tissue *= 0.88 + cells * 0.18 + (grain - 0.5) * detail * 0.12;
    tissue += vTone * veins * (0.09 + tide * 0.04);
    tissue += vec3(0.55, 0.81, 0.73) * specular * 0.16;
    tissue += vTone * pow(facing, 4.0) * (0.014 + tide * 0.014);
    // Warm focus follows selection; warm internal light follows queued/running Tasks.
    // Labels/inspector remain the authority for state, including in calm mode.
    float focusPatch = smoothstep(0.38, 0.76, tissueNoise(vLocal * 2.3 + vPhase));
    tissue = mix(tissue, vec3(0.46, 0.135, 0.047) * (0.4 + diffuse * 0.6),
      focusPatch * vState.y * 0.58);
    tissue += vec3(0.56, 0.19, 0.045) * vState.z * pow(facing, 7.0) * (0.12 + tide * 0.05);
    tissue += vec3(0.33, 0.14, 0.045) * rim * vState.y * 0.18;
    tissue *= (1.0 + vState.y * 0.16) * vState.x;
    gl_FragColor = vec4(vec3(0.003, 0.008, 0.010) + tissue, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

type Form = { id: string; center: THREE.Vector3; radius: number; phase: number; tone: THREE.Color
  axis: THREE.Vector3; axisB: THREE.Vector3; axisC: THREE.Vector3; active: number }
function formsFor(nodes: SpatialNode[], poses: PoseMap): Form[] {
  return nodes.map(node => {
    const phase = seed(node.id) * Math.PI * 2
    const axis = new THREE.Vector3(Math.sin(phase), 0.35, Math.cos(phase)).normalize()
    const axisB = new THREE.Vector3(Math.cos(phase * 1.7), 1, Math.sin(phase * 1.3)).normalize()
    const axisC = new THREE.Vector3().crossVectors(axis, axisB).normalize()
    return { id: node.id, center: poses.get(node.id) || new THREE.Vector3(), radius: neuralRadius(node), phase, axis, axisB, axisC,
      tone: new THREE.Color(node.kind === 'project' ? '#71cfb5' : node.kind === 'task' ? '#73bea7' : node.kind === 'idea' ? '#aca2cb' : '#78b4c6'),
      active: ['queued', 'running'].includes(node.status) ? 1 : 0 }
  })
}

function instances(base: THREE.BufferGeometry, items: Form[]) {
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
  attribute('axisB', 3, items.flatMap(item => item.axisB.toArray()))
  attribute('axisC', 3, items.flatMap(item => item.axisC.toArray()))
  attribute('state', 3, items.flatMap(item => [1, 0, item.active]))
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
  const material = useRef<THREE.ShaderMaterial>(null)
  const model = useMemo(() => formsFor(nodes, poses), [nodes, poses])
  const geometry = useMemo(() => instances(new THREE.SphereGeometry(1, tier === 'eco' ? 18 : 26, tier === 'eco' ? 12 : 18), model), [model, tier])
  const uniforms = useMemo(() => ({ lifeTime: { value: 0 }, motion: { value: reducedMotion ? 0 : 1 } }), [reducedMotion])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    const nearby = new Set(selected)
    for (const edge of graph.edges) if (selected.includes(edge.source) || selected.includes(edge.target)) { nearby.add(edge.source); nearby.add(edge.target) }
    const state = geometry.getAttribute('state') as THREE.InstancedBufferAttribute
    model.forEach((item, index) => state.setXYZ(index, selected.length && !nearby.has(item.id) ? 0.38 : 1, selected.includes(item.id) ? 1 : 0, item.active))
    state.needsUpdate = true
  }, [selected, graph, geometry, model])
  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.lifeTime.value = reducedMotion ? 0 : clock.elapsedTime
      material.current.uniforms.motion.value = reducedMotion ? 0 : 1
    }
  })
  const raycast = useMemo(() => function (this: THREE.Mesh, raycaster: THREE.Raycaster, intersections: THREE.Intersection[]) {
    const normal = raycaster.camera?.getWorldDirection(new THREE.Vector3()) || raycaster.ray.direction
    const cameraPosition = raycaster.camera?.getWorldPosition(new THREE.Vector3()) || raycaster.ray.origin
    const sphere = new THREE.Sphere(), point = new THREE.Vector3()
    for (let i = 0; i < model.length; i++) {
      const item = model[i]
      const depth = item.center.clone().sub(cameraPosition).dot(normal)
      const size = Math.min(item.radius * (selected.includes(item.id) ? 1.12 : 1), Math.max(0, depth) * 0.105)
      // Maximum radial envelope: (0.9+.075+.045+.025)*1.06*1.024 < 1.14.
      // A small extra tolerance supports touch without retaining the old cones' hit area.
      sphere.set(item.center, size * 1.20)
      if (!raycaster.ray.intersectSphere(sphere, point)) continue
      const distance = point.distanceTo(raycaster.ray.origin)
      if (distance >= raycaster.near && distance <= raycaster.far) intersections.push({ distance, point: point.clone(), object: this, instanceId: i })
    }
  }, [model, selected])
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.instanceId !== undefined && nodes[event.instanceId]) onSelect(nodes[event.instanceId].id, event.nativeEvent.shiftKey)
  }
  return <mesh geometry={geometry} raycast={raycast} onClick={select}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={somaVertex} fragmentShader={tissueFragment} toneMapped={false} />
    </mesh>
}
