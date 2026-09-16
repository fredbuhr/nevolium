import * as THREE from 'three'
import type { NevoliumGraphSnapshot, NevoliumSpatialLayout } from '@nevolium/graph'
import type { Tier } from './presentation'

export type PoseMap = Map<string, THREE.Vector3>
export function seed(value: string) {
  let result = 2166136261
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619)
  return (result >>> 0) / 0xffffffff
}

// Presentation-only growth: stable identities/depth, irregular radii and sibling neighbourhoods.
// No animation moves a target and no business relationship is added by the material.
export function organicPositions(layout: NevoliumSpatialLayout): PoseMap {
  const poses: PoseMap = new Map()
  for (const p of [...layout.placements].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))) {
    const position = new THREE.Vector3(p.x, p.y * 0.76, p.z)
    position.multiplyScalar(0.82 + seed(p.id) * 0.36)
    const parent = p.parentId ? poses.get(p.parentId) : null
    if (parent?.lengthSq()) position.multiplyScalar(0.8).addScaledVector(parent, 0.2)
    const reach = Math.hypot(p.x, p.y, p.z)
    position.x += Math.sin(p.z * 0.2 + seed(`${p.id}:x`) * 6) * reach * 0.08
    position.y += Math.sin(p.x * 0.23 + seed(`${p.id}:y`) * 6) * reach * 0.1
    poses.set(p.id, position)
  }
  return poses
}

export const GROWTH_DETAIL = {
  eco: { segments: 18, strands: 2, pulses: 32 },
  balanced: { segments: 26, strands: 3, pulses: 48 },
  high: { segments: 34, strands: 4, pulses: 72 },
} as const

export function growthHubs(graph: NevoliumGraphSnapshot, poses: PoseMap) {
  const hubs = new Map<string, { nodeId: string; direction: THREE.Vector3; count: number }>()
  for (const edge of graph.edges) {
    if (edge.source === edge.target || !poses.has(edge.source) || !poses.has(edge.target)) continue
    for (const [a, b] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      const direction = poses.get(b)!.clone().sub(poses.get(a)!)
      const key = growthSector(a, direction)
      const hub = hubs.get(key) || { nodeId: a, direction: new THREE.Vector3(), count: 0 }
      hub.direction.add(direction.normalize()); hub.count++; hubs.set(key, hub)
    }
  }
  for (const hub of hubs.values()) hub.direction.normalize()
  return hubs
}
function growthSector(id: string, direction: THREE.Vector3) {
  return `${id}:${direction.x < 0 ? 0 : 1}${direction.y < 0 ? 0 : 1}${direction.z < 0 ? 0 : 1}`
}

type Batch = { positions: number[]; colors: number[] }
const batch = (): Batch => ({ positions: [], colors: [] })
function geometry(data: Batch) {
  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3))
  result.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3))
  result.computeBoundingSphere()
  return result
}
function vertex(data: Batch, point: THREE.Vector3, tint: THREE.Color, light: number) {
  data.positions.push(point.x, point.y, point.z)
  data.colors.push(tint.r * light, tint.g * light, tint.b * light)
}

export function growFilaments(graph: NevoliumGraphSnapshot, poses: PoseMap, layout: NevoliumSpatialLayout, tier: Tier, selected: string[]) {
  const settings = GROWTH_DETAIL[tier]
  const body = batch(), fibres = batch()
  const widths: number[] = [], flow: number[] = [], attention: number[] = [], fibrePhase: number[] = []
  const edges = [...graph.edges].filter(edge => poses.has(edge.source) && poses.has(edge.target)
    && edge.source !== edge.target).sort((a, b) => a.id.localeCompare(b.id))
  const parents = new Map(layout.placements.map(p => [p.id, p.parentId]))
  const crowding = Math.max(0.3, Math.min(1, Math.sqrt(120 / Math.max(1, edges.length))))
  const hubs = growthHubs(graph, poses)
  const sector = (a: string, b: string) => growthSector(a, poses.get(b)!.clone().sub(poses.get(a)!))
  // Visual circulation is a bounded material animation, never evidence of data transfer.
  const flowing = new Set([...edges].sort((a, b) => {
    const priority = (edge: typeof a) => selected.includes(edge.source) || selected.includes(edge.target) ? 0 : 1
    return priority(a) - priority(b) || seed(`${a.id}:flow`) - seed(`${b.id}:flow`)
  }).slice(0, settings.pulses).map(edge => edge.id))
  for (const edge of edges) {
    const from = poses.get(edge.source)!, to = poses.get(edge.target)!
    const length = from.distanceTo(to)
    if (length < 0.001) continue
    const direction = to.clone().sub(from).normalize()
    const side = new THREE.Vector3().crossVectors(direction, Math.abs(direction.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize()
    const up = new THREE.Vector3().crossVectors(direction, side).normalize()
    const aHub = hubs.get(sector(edge.source, edge.target))!, bHub = hubs.get(sector(edge.target, edge.source))!
    const stem = Math.min(length * 0.23, 2.3)
    const start = from.clone().addScaledVector(aHub.direction, stem)
    const end = to.clone().addScaledVector(bHub.direction, stem)
    const middle = from.clone().lerp(to, 0.4 + seed(edge.id) * 0.2)
      .addScaledVector(side, (seed(`${edge.id}:bend`) - 0.5) * length * 0.3)
      .addScaledVector(up, (seed(`${edge.id}:rise`) - 0.5) * length * 0.22)
    const curve = new THREE.CatmullRomCurve3([from, start, middle, end, to], false, 'centripetal')
    const primary = parents.get(edge.target) === edge.source || parents.get(edge.source) === edge.target
    const highlighted = selected.includes(edge.source) || selected.includes(edge.target)
    const strength = highlighted ? 0.48 : selected.length ? 0.022 : (primary ? 0.26 : 0.065) * crowding
    const tint = new THREE.Color(edge.relation === 'contradicts' ? '#89a9de' : seed(edge.id) > 0.65 ? '#54eab3' : '#36d5df')
    const points: THREE.Vector3[] = []
    const phase = seed(`${edge.id}:phase`) * Math.PI * 2
    for (let i = 0; i <= settings.segments; i++) {
      const t = i / settings.segments, envelope = Math.sin(t * Math.PI)
      points.push(curve.getPoint(t)
        .addScaledVector(side, Math.sin(t * 17 + phase) * envelope * Math.min(0.17, length * 0.012))
        .addScaledVector(up, Math.sin(t * 11 - phase) * envelope * Math.min(0.13, length * 0.01)))
    }
    const densityAt = (t: number) => 1 + (Math.sqrt(aHub.count) - 1) * Math.pow(1 - t, 5)
      + (Math.sqrt(bHub.count) - 1) * Math.pow(t, 5)
    // The real connection converges into the small depth-writing nucleus inside the
    // translucent membrane. Its short widening belongs to the fibre, not the soma.
    // Pulse power is independent of the background density/opacity budget: only a
    // bounded set of canonical edges carries energy, with quieter peripheral flows.
    for (let i = 1; i < points.length; i++) {
      const t = i / settings.segments
      const density = densityAt(t)
      const variation = strength * (0.78 + 0.22 * Math.pow(Math.sin(t * 8 + phase), 2)) / density
      vertex(body, points[i - 1], tint, variation); vertex(body, points[i], tint, variation)
      const distance = Math.min(points[i].distanceTo(from), points[i].distanceTo(to))
      const junction = 1 + 0.65 * Math.exp(-Math.pow((distance - 0.7) / 0.65, 2))
      widths.push((primary || highlighted ? 0.85 : 0.58) * junction * (0.9 + seed(edge.id) * 0.2))
      flow.push((i - 1) / settings.segments, t, seed(`${edge.id}:flow`),
        flowing.has(edge.id) ? (highlighted ? 0.9 : selected.length ? 0.18 : 0.7 * Math.sqrt(32 / settings.pulses)) / Math.sqrt(density) : 0)
      attention.push(highlighted ? 1 : 0)
    }
    for (let strand = 0; strand < settings.strands; strand++) {
      const trace = points.map((p, i) => {
        const t = i / settings.segments
        // All fibres retain the same actual endpoints; only their material branches.
        const attachment = Math.min(1, p.distanceTo(from) / 1.2, p.distanceTo(to) / 1.2)
        const attachmentFade = attachment * attachment * (3 - 2 * attachment)
        const envelope = Math.pow(Math.sin(t * Math.PI), 1.2) * Math.sin(t * Math.PI * 2 + strand * 0.7) * attachmentFade
        const spread = (strand + 1) * (primary ? 0.16 : 0.075)
        return p.clone().addScaledVector(side, envelope * spread)
          .addScaledVector(up, Math.sin(t * 10 + strand * 2 + phase) * Math.sin(t * Math.PI) * spread * 0.7 * attachmentFade)
      })
      for (let i = 1; i < trace.length; i++) {
        const light = strength * (0.21 + 0.065 * Math.sin(i / settings.segments * 14 + phase + strand * 0.7)) / densityAt(i / settings.segments)
        vertex(fibres, trace[i - 1], tint, light); vertex(fibres, trace[i], tint, light)
        const strandPhase = seed(`${edge.id}:strand:${strand}`)
        fibrePhase.push((i - 1) / settings.segments, strandPhase, i / settings.segments, strandPhase)
      }
    }
  }
  const fibreGeometry = geometry(fibres)
  fibreGeometry.setAttribute('fibrePhase', new THREE.Float32BufferAttribute(fibrePhase, 2))
  return { body: geometry(body), fibres: fibreGeometry, widths: new Float32Array(widths), flow: new Float32Array(flow), attention: new Float32Array(attention),
    edgeIds: edges.map(edge => edge.id), flowingIds: [...flowing] }
}
