import type { NevoliumGraphSnapshot } from './index'

export interface NevoliumSpatialLayoutOptions {
  rootId?: string | null
  shellStep?: number
}

export interface NevoliumSpatialPlacement {
  id: string
  x: number
  y: number
  z: number
  depth: number
  parentId: string | null
  connected: boolean
}

export interface NevoliumSpatialLayout {
  rootId: string | null
  placements: NevoliumSpatialPlacement[]
  maxDepth: number
}

type Neighbor = { id: string; edgeId: string }

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function stableNodeIds(snapshot: NevoliumGraphSnapshot): string[] {
  return [...new Set(snapshot.nodes.map((node) => node.id))]
    .sort((a, b) => a.localeCompare(b))
}

function chooseRoot(ids: string[], preferred?: string | null): string | null {
  const known = new Set(ids)
  if (preferred && known.has(preferred)) return preferred
  return ids[0] ?? null
}

function buildAdjacency(
  snapshot: NevoliumGraphSnapshot,
  ids: string[],
): Map<string, Neighbor[]> {
  const known = new Set(ids)
  const adjacency = new Map<string, Neighbor[]>(ids.map((id) => [id, []]))

  for (const edge of [...snapshot.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!known.has(edge.source) || !known.has(edge.target) || edge.source === edge.target) continue
    adjacency.get(edge.source)?.push({ id: edge.target, edgeId: edge.id })
    adjacency.get(edge.target)?.push({ id: edge.source, edgeId: edge.id })
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort((a, b) => {
      const idOrder = a.id.localeCompare(b.id)
      return idOrder !== 0 ? idOrder : a.edgeId.localeCompare(b.edgeId)
    })
  }
  return adjacency
}

function unitSpherePoint(index: number, count: number, depth: number) {
  const safeCount = Math.max(1, count)
  const y = 1 - ((index + 0.5) * 2) / safeCount
  const horizontal = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = GOLDEN_ANGLE * index + depth * 0.73
  return {
    x: Math.cos(theta) * horizontal,
    y,
    z: Math.sin(theta) * horizontal,
  }
}

/**
 * Deterministic, presentation-only 3D projection for the canonical graph snapshot.
 *
 * The function never invents business entities or relationships. Edges are used only
 * to derive stable breadth-first depth/parent information; callers remain responsible
 * for rendering the canonical edge list itself.
 */
export function buildSpatialGraphLayout(
  snapshot: NevoliumGraphSnapshot,
  options: NevoliumSpatialLayoutOptions = {},
): NevoliumSpatialLayout {
  const ids = stableNodeIds(snapshot)
  const rootId = chooseRoot(ids, options.rootId)
  if (!rootId) return { rootId: null, placements: [], maxDepth: 0 }

  const shellStep = Math.max(2, options.shellStep ?? 6.5)
  const adjacency = buildAdjacency(snapshot, ids)
  const depth = new Map<string, number>([[rootId, 0]])
  const parent = new Map<string, string | null>([[rootId, null]])
  const queue = [rootId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentDepth = depth.get(current) ?? 0
    for (const neighbor of adjacency.get(current) ?? []) {
      if (depth.has(neighbor.id)) continue
      depth.set(neighbor.id, currentDepth + 1)
      parent.set(neighbor.id, current)
      queue.push(neighbor.id)
    }
  }

  const connectedMaxDepth = Math.max(0, ...depth.values())
  const disconnected = ids.filter((id) => !depth.has(id))
  const disconnectedDepth = disconnected.length > 0 ? connectedMaxDepth + 1 : connectedMaxDepth
  for (const id of disconnected) {
    depth.set(id, disconnectedDepth)
    parent.set(id, null)
  }

  const byDepth = new Map<number, string[]>()
  for (const id of ids) {
    const nodeDepth = depth.get(id) ?? disconnectedDepth
    const values = byDepth.get(nodeDepth) ?? []
    values.push(id)
    byDepth.set(nodeDepth, values)
  }
  for (const values of byDepth.values()) values.sort((a, b) => a.localeCompare(b))

  const placements: NevoliumSpatialPlacement[] = ids.map((id) => {
    const nodeDepth = depth.get(id) ?? 0
    if (id === rootId) {
      return {
        id,
        x: 0,
        y: 0,
        z: 0,
        depth: 0,
        parentId: null,
        connected: true,
      }
    }

    const shell = byDepth.get(nodeDepth) ?? [id]
    const index = Math.max(0, shell.indexOf(id))
    const unit = unitSpherePoint(index, shell.length, nodeDepth)
    const radius = shellStep * Math.max(1, nodeDepth)
    return {
      id,
      x: unit.x * radius,
      y: unit.y * radius,
      z: unit.z * radius,
      depth: nodeDepth,
      parentId: parent.get(id) ?? null,
      connected: nodeDepth <= connectedMaxDepth,
    }
  })

  return {
    rootId,
    placements,
    maxDepth: disconnected.length > 0 ? disconnectedDepth : connectedMaxDepth,
  }
}
