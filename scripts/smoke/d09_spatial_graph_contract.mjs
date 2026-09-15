import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSpatialGraphLayout } from '../../packages/graph/src/spatial.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const spatialSource = await fs.readFile(path.join(root, 'packages/graph/src/spatial.ts'), 'utf8')
assert(!spatialSource.includes('Math.random'), 'D09 spatial projection must not use randomness')

const nodes = [
  { id: 'project:p', entityType: 'project', label: 'Project', projectId: 'p' },
  { id: 'task:a', entityType: 'task', label: 'A', projectId: 'p' },
  { id: 'task:b', entityType: 'task', label: 'B', projectId: 'p' },
  { id: 'document:i', entityType: 'document', label: 'Idea', projectId: 'p' },
  { id: 'document:orphan', entityType: 'document', label: 'Orphan', projectId: 'p' },
]
const edges = [
  { id: 'e-pa', source: 'project:p', target: 'task:a', relation: 'contains', directed: true },
  { id: 'e-ab', source: 'task:a', target: 'task:b', relation: 'depends_on', directed: true },
  { id: 'e-ai', source: 'task:a', target: 'document:i', relation: 'references', directed: true },
  { id: 'e-self', source: 'task:b', target: 'task:b', relation: 'related_to', directed: true },
  { id: 'e-missing', source: 'task:b', target: 'document:missing', relation: 'related_to', directed: true },
]

const first = buildSpatialGraphLayout({ nodes, edges }, { rootId: 'project:p', shellStep: 7 })
const reordered = buildSpatialGraphLayout(
  { nodes: [...nodes].reverse(), edges: [edges[3], edges[1], edges[4], edges[0], edges[2]] },
  { rootId: 'project:p', shellStep: 7 },
)
assert.deepEqual(reordered, first, 'D09 spatial layout must be stable under input reordering')
assert.equal(first.rootId, 'project:p')
assert.equal(first.maxDepth, 3)
assert.deepEqual(first.placements.map((item) => item.id), [
  'document:i',
  'document:orphan',
  'project:p',
  'task:a',
  'task:b',
])
assert.equal(new Set(first.placements.map((item) => item.id)).size, nodes.length)

const byId = new Map(first.placements.map((item) => [item.id, item]))
assert.deepEqual(byId.get('project:p'), {
  id: 'project:p', x: 0, y: 0, z: 0, depth: 0, parentId: null, connected: true,
})
assert.equal(byId.get('task:a')?.depth, 1)
assert.equal(byId.get('task:a')?.parentId, 'project:p')
assert.equal(byId.get('task:b')?.depth, 2)
assert.equal(byId.get('task:b')?.parentId, 'task:a')
assert.equal(byId.get('document:i')?.depth, 2)
assert.equal(byId.get('document:i')?.parentId, 'task:a')
assert.equal(byId.get('document:orphan')?.depth, 3)
assert.equal(byId.get('document:orphan')?.parentId, null)
assert.equal(byId.get('document:orphan')?.connected, false)

for (const placement of first.placements) {
  if (placement.depth === 0) continue
  const radius = Math.hypot(placement.x, placement.y, placement.z)
  assert(Math.abs(radius - placement.depth * 7) < 1e-9, `${placement.id} is off its deterministic shell`)
}

const fallback = buildSpatialGraphLayout({ nodes, edges }, { rootId: 'missing' })
assert.equal(fallback.rootId, 'document:i', 'invalid preferred root must fall back deterministically')
assert.deepEqual(buildSpatialGraphLayout({ nodes: [], edges: [] }), {
  rootId: null,
  placements: [],
  maxDepth: 0,
})

console.log('D09 SPATIAL GRAPH PASS: deterministic 3D shells, stable identities, bounded invalid edges and disconnected nodes')
