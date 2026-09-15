import type { NevoliumGraphSnapshot } from './index'

export interface NevoliumMindMapLayoutOptions {
  rootId?: string | null
  radialStep?: number
}

export interface NevoliumMindMapPlacement {
  id: string
  x: number
  y: number
  depth: number
  parentId: string | null
  connected: boolean
}

export interface NevoliumMindMapLayout {
  rootId: string | null
  placements: NevoliumMindMapPlacement[]
  maxDepth: number
}

type Neighbor = { id: string; edgeId: string }

function chooseRoot(snapshot: NevoliumGraphSnapshot, preferred?: string | null): string | null {
  const ids = new Set(snapshot.nodes.map((node) => node.id))
  if (preferred && ids.has(preferred)) return preferred
  return [...ids].sort((a, b) => a.localeCompare(b))[0] || null
}

function buildAdjacency(snapshot: NevoliumGraphSnapshot): Map<string, Neighbor[]> {
  const ids = new Set(snapshot.nodes.map((node) => node.id))
  const adjacency = new Map<string, Neighbor[]>()
  for (const id of ids) adjacency.set(id, [])

  for (const edge of [...snapshot.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) continue
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

export function buildRadialMindMapLayout(
  snapshot: NevoliumGraphSnapshot,
  options: NevoliumMindMapLayoutOptions = {},
): NevoliumMindMapLayout {
  const rootId = chooseRoot(snapshot, options.rootId)
  if (!rootId) return { rootId: null, placements: [], maxDepth: 0 }

  const radialStep = Math.max(160, options.radialStep ?? 260)
  const adjacency = buildAdjacency(snapshot)
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
  const disconnected = snapshot.nodes
    .map((node) => node.id)
    .filter((id) => !depth.has(id))
    .sort((a, b) => a.localeCompare(b))
  const disconnectedDepth = disconnected.length > 0 ? connectedMaxDepth + 1 : connectedMaxDepth
  for (const id of disconnected) {
    depth.set(id, disconnectedDepth)
    parent.set(id, null)
  }

  const byDepth = new Map<number, string[]>()
  for (const node of snapshot.nodes) {
    const nodeDepth = depth.get(node.id) ?? disconnectedDepth
    const values = byDepth.get(nodeDepth) ?? []
    values.push(node.id)
    byDepth.set(nodeDepth, values)
  }
  for (const values of byDepth.values()) values.sort((a, b) => a.localeCompare(b))

  const placements: NevoliumMindMapPlacement[] = []
  for (const node of [...snapshot.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const nodeDepth = depth.get(node.id) ?? 0
    if (node.id === rootId) {
      placements.push({
        id: node.id,
        x: 0,
        y: 0,
        depth: 0,
        parentId: null,
        connected: true,
      })
      continue
    }

    const ring = byDepth.get(nodeDepth) ?? [node.id]
    const index = ring.indexOf(node.id)
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, ring.length)
    const radius = radialStep * Math.max(1, nodeDepth)
    placements.push({
      id: node.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      depth: nodeDepth,
      parentId: parent.get(node.id) ?? null,
      connected: nodeDepth <= connectedMaxDepth,
    })
  }

  return {
    rootId,
    placements,
    maxDepth: disconnected.length > 0 ? disconnectedDepth : connectedMaxDepth,
  }
}
