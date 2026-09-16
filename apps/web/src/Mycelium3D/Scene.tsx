import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildSpatialGraphLayout, type NevoliumGraphSnapshot } from '@nevolium/graph'
import {
  initialTier, observeQuality, overviewRadius, QUALITY_SETTINGS,
  type CameraCommand, type CameraPose, type Quality, type QualityWindow,
  type SceneMetrics, type SpatialGroup, type SpatialNode, type Tier,
} from './presentation'
import { OrganicFilaments, OrganicGroups } from './OrganicField'
import { NeuralBodies, neuralRadius } from './NeuralBodies'
import { organicPositions, type PoseMap } from './organicGeometry'

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
  transparent?: boolean
  interactive?: boolean
  positions?: Record<string, [number, number, number]>
  labels: RefObject<Map<string, HTMLButtonElement>>
  onSelect: (id: string, additive: boolean) => void
  onCamera: (pose: CameraPose) => void
  onCommandHandled: () => void
  onFailure: () => void
  onMetrics: (value: SceneMetrics) => void
}

function CameraAndMetrics(props: SceneProps & { poses: PoseMap; tier: Tier; onTier: (tier: Tier) => void }) {
  const { camera, gl, size, invalidate } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)
  const current = useRef(props)
  current.current = props
  const qualityWindow = useRef<QualityWindow>({ tier: props.tier, low: 0, high: 0 })
  const counters = useRef({ frames: 0, windowFrames: 0, started: performance.now() })
  const projected = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    qualityWindow.current = { tier: props.tier, low: 0, high: 0 }
    counters.current.windowFrames = 0; counters.current.started = performance.now()
  }, [props.tier, props.quality])
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
    if (controlsRef.current) controlsRef.current.enabled = props.interactive !== false
  }, [props.interactive])

  useEffect(() => {
    const controls = controlsRef.current
    const command = props.command
    if (!controls || !command) return
    const p = current.current
    if (command.action === 'reset') {
      const radius = overviewRadius([...p.poses.values()].map(point => point.length()))
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
    // Read dimensions before changing styles; at most seven labels participate.
    const labels = [...p.labels.current].map(([id, element]) => ({
      id, element, width: element.offsetWidth, height: element.offsetHeight,
    })).sort((a, b) => {
      const priority = (id: string) => p.selected.includes(id) ? 0 : id === p.rootId ? 1 : 2
      return priority(a.id) - priority(b.id) || a.id.localeCompare(b.id)
    })
    const occupied: { left: number; top: number; right: number; bottom: number }[] = []
    for (const { id, element, width, height } of labels) {
      const pose = p.poses.get(id)
      if (!pose) { element.style.visibility = 'hidden'; continue }
      const depth = -projected.copy(pose).applyMatrix4(camera.matrixWorldInverse).z
      const node = p.nodes.find(item => item.id === id)
      const screenRadius = node ? Math.min(neuralRadius(node) * (p.selected.includes(id) ? 1.12 : 1) / Math.max(0.1, depth), 0.105)
        * size.height / (2 * Math.tan(48 * Math.PI / 360)) : 0
      projected.copy(pose).project(camera)
      let visible = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 0.92 && Math.abs(projected.y) < 0.9
      const x = THREE.MathUtils.clamp((projected.x + 1) * size.width / 2, width / 2 + 8, size.width - width / 2 - 8)
      const y = THREE.MathUtils.clamp((-projected.y + 1) * size.height / 2 + Math.max(12, screenRadius * 1.65 + 8), 8, size.height - height - 8)
      const box = { left: x - width / 2, right: x + width / 2, top: y, bottom: y + height }
      if (occupied.some(other => box.left < other.right + 6 && box.right + 6 > other.left
        && box.top < other.bottom + 6 && box.bottom + 6 > other.top)) visible = false
      if (visible) occupied.push(box)
      element.style.visibility = visible ? 'visible' : 'hidden'
      element.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`
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
  const poses = useMemo(() => {
    const result = organicPositions(spatial)
    for (const [id, value] of Object.entries(props.positions || {})) {
      if (result.has(id) && value.length === 3 && value.every(Number.isFinite)) result.set(id, new THREE.Vector3(...value))
    }
    return result
  }, [spatial, props.positions])
  const visibleGraph = useMemo(() => {
    const visible = new Set(props.nodes.map(node => node.id))
    return { nodes: props.nodes, edges: props.graph.edges.filter(edge => visible.has(edge.source) && visible.has(edge.target)) }
  }, [props.nodes, props.graph])
  const radius = overviewRadius([...poses.values()].map(point => point.length()))
  // Canonical graph refreshes must not reset a camera the user has moved.
  const [defaultCamera] = useState(() => ({ position: [0, radius * 0.55, radius * 2.8] as [number, number, number], fov: 48, near: 0.1, far: 10_000 }))
  if (!supported) return <Unavailable onFailure={props.onFailure} />
  return <Canvas
    camera={defaultCamera}
    dpr={Math.min(window.devicePixelRatio || 1, QUALITY_SETTINGS[tier].dpr)}
    gl={{ antialias: false, alpha: Boolean(props.transparent), powerPreference: 'low-power' }}
    frameloop={props.reducedMotion ? 'demand' : 'always'}
    onPointerMissed={() => props.onSelect('', false)}
  >
    {/* The desktop's independently owned wallpaper remains visible through the scene. */}
    {!props.transparent ? <color attach="background" args={['#061216']} /> : null}
    <CameraAndMetrics {...props} poses={poses} tier={tier} onTier={setAutoTier} />
    <OrganicFilaments graph={visibleGraph} poses={poses} layout={spatial} selected={props.selected} tier={tier} reducedMotion={props.reducedMotion} />
    <OrganicGroups groups={props.groups} poses={poses} />
    <NeuralBodies nodes={props.nodes} graph={visibleGraph} poses={poses} selected={props.selected} tier={tier} reducedMotion={props.reducedMotion} onSelect={props.onSelect} />
  </Canvas>
}
