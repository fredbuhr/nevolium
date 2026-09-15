import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildSpatialGraphLayout, type NevoliumGraphSnapshot } from '@nevolium/graph'
import {
  initialTier, observeQuality, QUALITY_SETTINGS,
  type CameraCommand, type CameraPose, type Quality, type QualityWindow,
  type SceneMetrics, type SpatialGroup, type SpatialNode, type Tier,
} from './presentation'

export type SceneProps = {
  graph: NevoliumGraphSnapshot
  nodes: SpatialNode[]
  rootId: string
  selected: string[]
  groups: SpatialGroup[]
  quality: Quality
  camera: CameraPose | null
  command: CameraCommand | null
  reducedMotion: boolean
  labels: RefObject<Map<string, HTMLButtonElement>>
  onSelect: (id: string, additive: boolean) => void
  onCamera: (pose: CameraPose) => void
  onCommandHandled: () => void
  onFailure: () => void
  onMetrics: (value: SceneMetrics) => void
}

function hash(value: string) {
  let result = 2166136261
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619)
  return (result >>> 0) / 0xffffffff
}

function color(node: SpatialNode) {
  if (node.kind === 'project') return '#79eee6'
  if (node.kind === 'task') return '#78e6ae'
  if (node.kind === 'idea') return '#c1a0ff'
  if (node.kind === 'decision') return '#e3c592'
  return '#81c5f1'
}

type PoseMap = Map<string, THREE.Vector3>

function Nodes({ nodes, poses, selected, tier, onSelect }: {
  nodes: SpatialNode[]; poses: PoseMap; selected: string[]; tier: Tier
  onSelect: SceneProps['onSelect']
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const halo = useRef<THREE.InstancedMesh>(null)
  const object = useMemo(() => new THREE.Object3D(), [])
  const tint = useMemo(() => new THREE.Color(), [])
  useEffect(() => {
    if (!mesh.current || !halo.current) return
    nodes.forEach((node, index) => {
      object.position.copy(poses.get(node.id) || new THREE.Vector3())
      const radius = node.id.startsWith('project:') ? 0.65 : selected.includes(node.id) ? 0.53 : 0.34
      object.rotation.set(hash(node.id) * 2, hash(`${node.id}:r`) * 3, 0.3)
      object.scale.set(radius, radius * (0.75 + hash(node.id) * 0.25), radius * 0.83)
      object.updateMatrix()
      mesh.current!.setMatrixAt(index, object.matrix)
      tint.set(selected.includes(node.id) ? '#f1fff5' : color(node))
      mesh.current!.setColorAt(index, tint)
      object.scale.multiplyScalar(1.85); object.updateMatrix()
      halo.current!.setMatrixAt(index, object.matrix)
      halo.current!.setColorAt(index, tint)
    })
    for (const item of [mesh.current, halo.current]) {
      item.instanceMatrix.needsUpdate = true
      if (item.instanceColor) item.instanceColor.needsUpdate = true
      item.computeBoundingSphere()
    }
  }, [nodes, poses, selected, tier, object, tint])
  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.instanceId !== undefined && nodes[event.instanceId]) {
      onSelect(nodes[event.instanceId].id, event.nativeEvent.shiftKey)
    }
  }
  return <>
    <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]} onClick={select}>
      <icosahedronGeometry args={[1, QUALITY_SETTINGS[tier].detail]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={halo} args={[undefined, undefined, nodes.length]} raycast={() => {}}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0.095} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  </>
}

function Filaments({ graph, poses, selected, tier }: {
  graph: NevoliumGraphSnapshot; poses: PoseMap; selected: string[]; tier: Tier
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [], colors: number[] = []
    const settings = QUALITY_SETTINGS[tier]
    for (const edge of graph.edges) {
      const from = poses.get(edge.source), to = poses.get(edge.target)
      if (!from || !to) continue
      const direction = to.clone().sub(from)
      const tangent = new THREE.Vector3(-direction.z, direction.x * 0.27, direction.x)
      if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0)
      tangent.normalize()
      const highlighted = selected.includes(edge.source) || selected.includes(edge.target)
      const tint = new THREE.Color(edge.relation === 'contradicts' ? '#e29dab' : '#66cabf')
      tint.multiplyScalar(highlighted ? 1.35 : selected.length ? 0.32 : 0.65)
      for (let strand = 0; strand < settings.strands; strand++) {
        const middle = from.clone().add(to).multiplyScalar(0.5)
        middle.addScaledVector(tangent, (hash(edge.id) - 0.5) * direction.length() * 0.45 + strand * 0.17)
        middle.y += (hash(`${edge.id}:${strand}`) - 0.5) * 1.5
        const curve = new THREE.QuadraticBezierCurve3(from, middle, to)
        const points = curve.getPoints(settings.segments)
        for (let i = 1; i < points.length; i++) {
          positions.push(...points[i - 1].toArray(), ...points[i].toArray())
          colors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b)
        }
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    result.computeBoundingSphere()
    return result
  }, [graph, poses, selected, tier])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry}>
    <lineBasicMaterial vertexColors transparent opacity={0.85} depthWrite={false} />
  </lineSegments>
}

function Activity({ nodes, poses, reducedMotion }: { nodes: SpatialNode[]; poses: PoseMap; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const active = useMemo(() => nodes.filter(node => ['queued', 'running'].includes(node.status)).slice(0, 24), [nodes])
  useFrame(({ clock }) => {
    if (group.current && !reducedMotion) group.current.children.forEach((child, index) => child.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2 + index) * 0.12))
  })
  // Activity derives exclusively from actual Task state; there is no fabricated event stream.
  return <group ref={group}>{active.map(node => <mesh key={node.id} position={poses.get(node.id)}>
    <icosahedronGeometry args={[0.72, 1]} /><meshBasicMaterial wireframe color="#e7d3a1" transparent opacity={0.5} />
  </mesh>)}</group>
}

function Groups({ groups, poses }: { groups: SpatialGroup[]; poses: PoseMap }) {
  const shells = useMemo(() => groups.slice(0, 24).flatMap(group => {
    const members = group.nodeIds.map(id => poses.get(id)).filter((p): p is THREE.Vector3 => Boolean(p))
    if (!members.length) return []
    const center = members.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(members.length)
    const radius = Math.max(1, ...members.map(p => center.distanceTo(p))) + 0.8
    return [{ id: group.id, center, radius }]
  }), [groups, poses])
  return <>{shells.map(shell => <mesh key={shell.id} position={shell.center} scale={[1, 0.92, 1.05]} raycast={() => {}}>
    <icosahedronGeometry args={[shell.radius, 1]} />
    <meshBasicMaterial color="#9691d8" transparent opacity={0.035} depthWrite={false} side={THREE.BackSide} />
  </mesh>)}</>
}

function CameraAndMetrics(props: SceneProps & { poses: PoseMap; tier: Tier; onTier: (tier: Tier) => void }) {
  const { camera, gl, size, invalidate, setDpr } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)
  const current = useRef(props)
  current.current = props
  const qualityWindow = useRef<QualityWindow>({ tier: props.tier, low: 0, high: 0 })
  const counters = useRef({ frames: 0, windowFrames: 0, started: performance.now() })
  const projected = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    qualityWindow.current = { tier: props.tier, low: 0, high: 0 }
    counters.current.windowFrames = 0; counters.current.started = performance.now()
    setDpr(Math.min(window.devicePixelRatio || 1, QUALITY_SETTINGS[props.tier].dpr))
  }, [props.tier, props.quality, setDpr])
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enableDamping = false
    controls.minDistance = 2; controls.maxDistance = 3000
    controls.rotateSpeed = 0.5; controls.zoomSpeed = 0.7
    const initial = current.current.camera
    if (initial) {
      camera.position.fromArray(initial.position); controls.target.fromArray(initial.target)
    }
    controls.update(); controlsRef.current = controls
    const changed = () => invalidate()
    const save = () => current.current.onCamera({
      position: camera.position.toArray() as CameraPose['position'],
      target: controls.target.toArray() as CameraPose['target'],
    })
    const lost = (event: Event) => { event.preventDefault(); current.current.onFailure() }
    controls.addEventListener('change', changed)
    controls.addEventListener('end', save)
    gl.domElement.addEventListener('webglcontextlost', lost)
    invalidate()
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost)
      controls.removeEventListener('change', changed); controls.removeEventListener('end', save)
      controls.dispose(); controlsRef.current = null
    }
  }, [camera, gl, invalidate])

  useEffect(() => {
    const controls = controlsRef.current
    const command = props.command
    if (!controls || !command) return
    const p = current.current
    if (command.action === 'reset') {
      const radius = Math.max(10, ...[...p.poses.values()].map(point => point.length()))
      controls.target.set(0, 0, 0); camera.position.set(0, radius * 0.55, radius * 2.8)
    } else if (command.action === 'focus') {
      const target = p.poses.get(p.selected[0])
      if (!target) { p.onCommandHandled(); return }
      const direction = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(target); camera.position.copy(target).addScaledVector(direction, 8)
    } else {
      const direction = camera.position.clone().sub(controls.target)
      direction.setLength(THREE.MathUtils.clamp(direction.length() * (command.action === 'in' ? 0.75 : 1.3), 2, 3000))
      camera.position.copy(controls.target).add(direction)
    }
    controls.update(); invalidate()
    p.onCamera({ position: camera.position.toArray() as CameraPose['position'], target: controls.target.toArray() as CameraPose['target'] })
    p.onCommandHandled()
  }, [props.command, camera, invalidate])

  useFrame(() => {
    const p = current.current
    for (const [id, element] of p.labels.current) {
      const pose = p.poses.get(id)
      if (!pose) { element.style.visibility = 'hidden'; continue }
      projected.copy(pose).project(camera)
      const visible = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 0.92 && Math.abs(projected.y) < 0.9
      element.style.visibility = visible ? 'visible' : 'hidden'
      element.style.transform = `translate(${(projected.x + 1) * size.width / 2}px, ${(-projected.y + 1) * size.height / 2 + 12}px) translateX(-50%)`
    }
    const c = counters.current
    c.frames++; c.windowFrames++
    const elapsed = performance.now() - c.started
    if (elapsed < 1500 && c.frames !== 1) return
    const fps = c.frames === 1 ? 0 : Math.round(c.windowFrames * 1000 / elapsed)
    p.onMetrics({ frames: c.frames, fps, geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures, calls: gl.info.render.calls, triangles: gl.info.render.triangles, tier: p.tier })
    if (!p.reducedMotion && p.quality === 'auto' && c.frames !== 1) {
      qualityWindow.current = observeQuality(qualityWindow.current, fps)
      if (qualityWindow.current.tier !== p.tier) p.onTier(qualityWindow.current.tier)
    }
    c.windowFrames = 0; c.started = performance.now()
  })
  return null
}

function Unavailable({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure])
  return null
}

export default function Scene(props: SceneProps) {
  const [supported] = useState(() => {
    // Probe before R3F's asynchronous renderer setup so unavailable WebGL has a usable fallback.
    try {
      const context = document.createElement('canvas').getContext('webgl2')
      if (!context) return false
      context.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch { return false }
  })
  const [autoTier, setAutoTier] = useState<Tier>(() => initialTier(
    navigator.hardwareConcurrency || 4,
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    window.matchMedia('(max-width: 900px)').matches,
  ))
  const tier = props.quality === 'auto' ? autoTier : props.quality
  const spatial = useMemo(() => buildSpatialGraphLayout(props.graph, { rootId: props.rootId }), [props.graph, props.rootId])
  const poses = useMemo(() => new Map(spatial.placements.map(p => [p.id, new THREE.Vector3(p.x, p.y, p.z)])), [spatial])
  const visibleGraph = useMemo(() => {
    const visible = new Set(props.nodes.map(node => node.id))
    return { nodes: props.nodes, edges: props.graph.edges.filter(edge => visible.has(edge.source) && visible.has(edge.target)) }
  }, [props.nodes, props.graph])
  const radius = Math.max(10, ...spatial.placements.map(p => Math.hypot(p.x, p.y, p.z)))
  // Canonical graph refreshes must not reset a camera the user has moved.
  const [defaultCamera] = useState(() => ({ position: [0, radius * 0.55, radius * 2.8] as [number, number, number], fov: 48, near: 0.1, far: 10_000 }))
  if (!supported) return <Unavailable onFailure={props.onFailure} />
  return <Canvas
    camera={defaultCamera}
    dpr={1}
    gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
    frameloop={props.reducedMotion ? 'demand' : 'always'}
    fallback={<Unavailable onFailure={props.onFailure} />}
    onPointerMissed={() => props.onSelect('', false)}
  >
    <CameraAndMetrics {...props} poses={poses} tier={tier} onTier={setAutoTier} />
    <Filaments graph={visibleGraph} poses={poses} selected={props.selected} tier={tier} />
    <Groups groups={props.groups} poses={poses} />
    <Nodes nodes={props.nodes} poses={poses} selected={props.selected} tier={tier} onSelect={props.onSelect} />
    <Activity nodes={props.nodes} poses={poses} reducedMotion={props.reducedMotion} />
  </Canvas>
}
