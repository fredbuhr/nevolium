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
  eco: { segments: 14, strands: 2, sides: 3 },
  balanced: { segments: 22, strands: 3, sides: 4 },
  high: { segments: 30, strands: 4, sides: 4 },
} as const

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
  const edges = [...graph.edges].filter(edge => poses.has(edge.source) && poses.has(edge.target)
    && edge.source !== edge.target).sort((a, b) => a.id.localeCompare(b.id))
  const parents = new Map(layout.placements.map(p => [p.id, p.parentId]))
  const hubs = new Map<string, { direction: THREE.Vector3; count: number }>()
  const sector = (a: string, b: string) => {
    const d = poses.get(b)!.clone().sub(poses.get(a)!)
    return `${a}:${d.x < 0 ? 0 : 1}${d.y < 0 ? 0 : 1}${d.z < 0 ? 0 : 1}`
  }
  // Adjacent canonical edges share their initial growth direction and then bifurcate.
  for (const edge of edges) for (const [a, b] of [[edge.source, edge.target], [edge.target, edge.source]]) {
    const key = sector(a, b)
    const hub = hubs.get(key) || { direction: new THREE.Vector3(), count: 0 }
    hub.direction.add(poses.get(b)!.clone().sub(poses.get(a)!).normalize()); hub.count++
    hubs.set(key, hub)
  }
  for (const hub of hubs.values()) hub.direction.normalize()
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
    const strength = highlighted ? 1.15 : selected.length ? 0.13 : primary ? 0.65 : 0.15
    const tint = new THREE.Color(edge.relation === 'contradicts' ? '#c89ac5' : seed(edge.id) > 0.7 ? '#72dbb3' : '#4bc6d5')
    const points: THREE.Vector3[] = []
    const phase = seed(`${edge.id}:phase`) * Math.PI * 2
    for (let i = 0; i <= settings.segments; i++) {
      const t = i / settings.segments, envelope = Math.sin(t * Math.PI)
      points.push(curve.getPoint(t)
        .addScaledVector(side, Math.sin(t * 17 + phase) * envelope * Math.min(0.17, length * 0.012))
        .addScaledVector(up, Math.sin(t * 11 - phase) * envelope * Math.min(0.13, length * 0.01)))
    }
    // One tapered sheath per canonical edge, then fine fibres splitting and rejoining it.
    const rings: THREE.Vector3[][] = []
    for (let i = 0; i < points.length; i++) {
      const t = i / settings.segments
      const tangent = points[Math.min(i + 1, settings.segments)].clone().sub(points[Math.max(0, i - 1)]).normalize()
      const normal = new THREE.Vector3().crossVectors(tangent, side).normalize()
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize()
      const radius = (primary ? 0.025 : 0.01) * (0.65 + seed(edge.id) * 0.7)
        * (0.45 + Math.pow(Math.abs(Math.cos(t * Math.PI)), 3) * 1.4)
      const ring = Array.from({ length: settings.sides }, (_, s) => points[i].clone()
        .addScaledVector(normal, Math.cos(s / settings.sides * Math.PI * 2) * radius)
        .addScaledVector(binormal, Math.sin(s / settings.sides * Math.PI * 2) * radius))
      rings.push(ring)
      if (!i) continue
      const variation = strength * (0.55 + 0.45 * Math.pow(Math.sin(t * 8 + phase), 2))
      for (let s = 0; s < settings.sides; s++) {
        const next = (s + 1) % settings.sides
        for (const p of [rings[i - 1][s], ring[s], ring[next], rings[i - 1][s], ring[next], rings[i - 1][next]]) vertex(body, p, tint, variation)
      }
    }
    for (let strand = 0; strand < settings.strands; strand++) {
      const trace = points.map((p, i) => {
        const t = i / settings.segments
        // All fibres retain the same actual endpoints; only their material branches.
        const envelope = Math.pow(Math.sin(t * Math.PI), 1.2) * Math.sin(t * Math.PI * 2 + strand * 0.7)
        const spread = (strand + 1) * (primary ? 0.12 : 0.055)
        return p.clone().addScaledVector(side, envelope * spread)
          .addScaledVector(up, Math.sin(t * 10 + strand * 2 + phase) * Math.sin(t * Math.PI) * spread * 0.7)
      })
      for (let i = 1; i < trace.length; i++) {
        const light = strength * (0.22 + 0.22 * seed(`${edge.id}:${strand}:${i}`))
        vertex(fibres, trace[i - 1], tint, light); vertex(fibres, trace[i], tint, light)
      }
    }
  }
  return { body: geometry(body), fibres: geometry(fibres), edgeIds: edges.map(edge => edge.id) }
}
