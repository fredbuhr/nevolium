import assert from 'node:assert/strict'
import { withProjectMembership } from '../../packages/graph/src/membership.ts'
import { buildSpatialGraphLayout } from '../../packages/graph/src/spatial.ts'
import { growFilaments, organicPositions, GROWTH_DETAIL } from '../../apps/web/src/Mycelium3D/organicGeometry.ts'

const graph = { nodes: [
  { id: 'project:p', entityType: 'project', label: 'Project', projectId: 'p' },
  { id: 'document:idea', entityType: 'document', label: 'Idea', projectId: 'p' },
  { id: 'task:a', entityType: 'task', label: 'Task', projectId: 'p' },
  { id: 'document:outside', entityType: 'document', label: 'Outside', projectId: 'other' },
  { id: 'document:unknown', entityType: 'document', label: 'Unknown' },
], edges: [] }
const original = structuredClone(graph)
const view = withProjectMembership(graph)
assert.equal(view.edges.length, 2)
assert(view.edges.every(edge => edge.source === 'project:p' && edge.presentation === 'project-membership'
  && edge.relation === 'project_membership' && edge.directed === false))
assert.deepEqual(view.edges.map(edge => edge.target), ['document:idea', 'task:a'])
assert.deepEqual(withProjectMembership(view), view, 'Membership must be idempotent')
assert.deepEqual(graph, original, 'Canonical input and export must not be mutated')
const explicit = { id: 'r1', source: 'document:idea', target: 'project:p', relation: 'references', directed: true }
const mixed = withProjectMembership({ ...graph, edges: [explicit] })
assert.equal(mixed.edges.length, 2, 'Do not duplicate existing project-to-item connections in either direction')
assert.equal(mixed.edges[0], explicit, 'Do not relabel explicit semantic relationships')
assert.deepEqual(withProjectMembership({ nodes: [], edges: [] }), { nodes: [], edges: [] })

const layout = buildSpatialGraphLayout(view, { rootId: 'project:p' })
for (const tier of ['eco', 'balanced', 'high']) {
  const grown = growFilaments(view, organicPositions(layout), layout, tier, [])
  assert.equal(grown.edgeIds.length, 2, 'Sparse projects must have visible project-membership filaments')
  assert.equal(grown.body.attributes.position.count, 2 * GROWTH_DETAIL[tier].segments * 2)
  assert(grown.flowingIds.length > 0, 'Sparse project links must participate in visual energy circulation')
  assert(grown.flowingIds.every(id => view.edges.some(edge => edge.id === id)))
  grown.body.dispose(); grown.fibres.dispose()
}
console.log('D09 PROJECT MEMBERSHIP PASS: sparse graph, scoped links, deduplication, immutable canonical data, bounded flowing filaments')
