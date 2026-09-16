import { useEffect, useMemo } from 'react'
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
  varying vec2 vPlane;
  varying float vDepth;
  varying float vPhase;
  void passSurface(vec3 local, vec3 normal, float scale) {
    vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
    float size = min(scale, max(0.0, -viewCenter.z) * 0.105);
    vec4 view = modelViewMatrix * vec4(center + local * size, 1.0);
    vTone = tone; vNormal = normalize(normalMatrix * normal); vView = -view.xyz;
    vLocal = local; vState = state; vPhase = phase;
    vPlane = (modelViewMatrix * vec4(local, 0.0)).xy; vDepth = max(0.0, -viewCenter.z);
    gl_Position = projectionMatrix * view;
  }
`
const somaVertex = common + `
  uniform float nucleus;
  attribute vec3 axis;
  attribute vec3 axisB;
  attribute vec3 axisC;
  vec3 surface(vec3 p) {
    // Different broad lobes and shallow waists, never narrow cones. The light core
    // occupies only a fraction of this envelope, so silhouette comes from thin tissue.
    float lobes = 0.19 * sin(dot(p, axis) * 3.8 + phase)
      + 0.12 * sin(dot(p, axisB) * 4.5 - phase)
      + 0.07 * cos(dot(p, axisC) * 5.0 + phase);
    float shoulder = 0.16 * pow(max(0.0, dot(p, axisB)), 2.0);
    vec3 shape = p * (0.82 + (lobes + shoulder) * mix(1.0, 0.32, nucleus)) * vec3(1.12, 0.86 + sin(phase) * 0.08, 0.96);
    return shape * (1.0 + motion * 0.035 * sin(lifeTime * 0.95 + phase + p.y * 0.7));
  }
  void main() {
    vec3 p = normalize(position);
    vec3 tangent = normalize(cross(abs(p.y) > 0.9 ? vec3(1,0,0) : vec3(0,1,0), p));
    vec3 bitangent = cross(p, tangent);
    vec3 q = surface(p);
    vec3 normal = normalize(cross(surface(normalize(p + tangent * 0.025)) - q,
      surface(normalize(p + bitangent * 0.025)) - q));
    q *= mix(1.0, 0.26 + 0.025 * sin(phase), nucleus);
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
  varying vec2 vPlane;
  varying float vDepth;
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
    float facing = abs(dot(n, view));
    float rim = pow(1.0 - facing, 2.0);
    vec3 q = vLocal * 4.5 + vPhase;
    float tissue = tissueNoise(q);
    float filigree = tissueNoise(q * 2.3 + tissue * 1.6);
    float aa = max(0.012, fwidth(filigree));
    float fibres = (1.0 - smoothstep(0.012, 0.012 + aa, abs(filigree - 0.47)))
      * smoothstep(0.25, 0.62, tissue);
    float detail = 1.0 - smoothstep(0.16, 0.65, length(fwidth(q)));
    float tide = 0.5 + 0.5 * sin(lifeTime * 0.95 + vPhase);
    float innerLight = exp(-dot(vPlane, vPlane) * 5.5);
    // A thin, interrupted membrane: no broad white specular or opaque painted fill.
    float opacity = 0.012 + rim * (0.09 + tissue * 0.11)
      + fibres * detail * 0.052 + innerLight * (0.065 + motion * tide * 0.025);
    opacity *= vState.x * (1.0 + vState.y * 0.18);
    opacity *= 1.0 - smoothstep(35.0, 110.0, vDepth) * 0.36;
    vec3 light = vTone * (0.52 + rim * 0.35 + fibres * 0.18);
    // Amber is a small light in the tissue, never an orange coating of the whole cell.
    float warmSpot = pow(smoothstep(0.50, 0.82, tissueNoise(vLocal * 2.8 + vPhase)), 3.0);
    float ambientWarm = step(0.82, fract(vPhase * 3.17)) * 0.22;
    light += vec3(0.85, 0.28, 0.035) * warmSpot
      * (ambientWarm + vState.y * 0.28 + vState.z * 0.42) * (0.65 + motion * tide * 0.35);
    gl_FragColor = vec4(light, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const nucleusFragment = `
  uniform float lifeTime;
  uniform float motion;
  varying vec3 vTone;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  varying vec3 vState;
  varying float vPhase;
  void main() {
    float facing = max(0.0, dot(normalize(vNormal), normalize(vView)));
    float tide = 0.5 + 0.5 * sin(lifeTime * 0.95 + vPhase);
    vec3 light = vTone * (0.34 + pow(facing, 1.3) * 0.40 + motion * tide * 0.09);
    light += vec3(0.61, 0.95, 0.86) * pow(facing, 3.0) * (0.35 + vState.y * 0.16);
    float spot = pow(max(0.0, sin(vLocal.x * 12.0 + vLocal.y * 7.0 + vPhase)), 10.0);
    float ambientWarm = step(0.82, fract(vPhase * 3.17)) * 0.12;
    light += vec3(0.82, 0.25, 0.025) * spot * (ambientWarm + vState.y * 0.15 + vState.z * 0.36);
    gl_FragColor = vec4(light * vState.x, 1.0);
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
      tone: new THREE.Color(node.kind === 'project' ? '#77efb1' : node.kind === 'task' ? '#41e8cf' : node.kind === 'idea' ? '#50cee8' : '#66ddeb'),
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
  const model = useMemo(() => formsFor(nodes, poses), [nodes, poses])
  const geometry = useMemo(() => instances(new THREE.SphereGeometry(1, tier === 'eco' ? 18 : 26, tier === 'eco' ? 12 : 18), model), [model, tier])
  const coreGeometry = useMemo(() => instances(new THREE.SphereGeometry(1, 18, 12), model), [model])
  const uniforms = useMemo(() => ({ lifeTime: { value: 0 }, motion: { value: 0 }, nucleus: { value: 0 } }), [])
  const coreUniforms = useMemo(() => ({ ...uniforms, nucleus: { value: 1 } }), [uniforms])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => coreGeometry.dispose(), [coreGeometry])
  useEffect(() => {
    const nearby = new Set(selected)
    for (const edge of graph.edges) if (selected.includes(edge.source) || selected.includes(edge.target)) { nearby.add(edge.source); nearby.add(edge.target) }
    for (const surface of [geometry, coreGeometry]) {
      const state = surface.getAttribute('state') as THREE.InstancedBufferAttribute
      model.forEach((item, index) => state.setXYZ(index, selected.length && !nearby.has(item.id) ? 0.34 : 1, selected.includes(item.id) ? 1 : 0, item.active))
      state.needsUpdate = true
    }
  }, [selected, graph, geometry, coreGeometry, model])
  useFrame(({ clock }) => {
    // Both layers share the time/motion values; the opaque core never lags the membrane.
    uniforms.lifeTime.value = reducedMotion ? 0 : clock.elapsedTime
    uniforms.motion.value = reducedMotion ? 0 : 1
  })
  const raycast = useMemo(() => function (this: THREE.Mesh, raycaster: THREE.Raycaster, intersections: THREE.Intersection[]) {
    const normal = raycaster.camera?.getWorldDirection(new THREE.Vector3()) || raycaster.ray.direction
    const cameraPosition = raycaster.camera?.getWorldPosition(new THREE.Vector3()) || raycaster.ray.origin
    const sphere = new THREE.Sphere(), point = new THREE.Vector3()
    for (let i = 0; i < model.length; i++) {
      const item = model[i]
      const depth = item.center.clone().sub(cameraPosition).dot(normal)
      const size = Math.min(item.radius * (selected.includes(item.id) ? 1.12 : 1), Math.max(0, depth) * 0.105)
      // Broad lobes stay below (0.82+.19+.12+.07+.16)*1.12*1.035 < 1.58.
      // The transparent tissue remains a real object target; light halos never raycast.
      sphere.set(item.center, size * 1.60)
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
    <mesh geometry={coreGeometry} raycast={() => {}}>
      <shaderMaterial uniforms={coreUniforms} vertexShader={somaVertex} fragmentShader={nucleusFragment} toneMapped={false} />
    </mesh>
    <mesh geometry={geometry} raycast={raycast} onClick={select}>
      <shaderMaterial uniforms={uniforms} vertexShader={somaVertex} fragmentShader={tissueFragment}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  </>
}
