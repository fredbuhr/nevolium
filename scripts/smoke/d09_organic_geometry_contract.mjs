import assert from 'node:assert/strict'
import { fixture } from '../../apps/web/src/qualification/d09-measurements.ts'
import { buildSpatialGraphLayout } from '../../packages/graph/src/spatial.ts'
import { growFilaments, organicPositions, GROWTH_DETAIL } from '../../apps/web/src/Mycelium3D/organicGeometry.ts'

for (const caseId of ['small', 'stress']) {
  const data = fixture(caseId), original = structuredClone(data)
  const layout = buildSpatialGraphLayout(data, { rootId: 'project:hardware' })
  const poses = organicPositions(layout)
  assert.equal(poses.size, data.nodes.length)
  assert.deepEqual(organicPositions({ ...layout, placements: [...layout.placements].reverse() }), poses)
  assert.deepEqual(poses.get('project:hardware').toArray(), [0, 0, 0])
  assert([...poses.values()].every(p => p.toArray().every(Number.isFinite)))
  const radii = layout.placements.filter(p => p.depth === 1).map(p => poses.get(p.id).length())
  assert(Math.max(...radii) - Math.min(...radii) > 0.1, 'Organic targets must not retain perfect spherical shells')
  for (const tier of ['eco', 'balanced', 'high']) {
    const grown = growFilaments(data, poses, layout, tier, [])
    assert.deepEqual(grown.edgeIds, data.edges.map(edge => edge.id).sort((a, b) => a.localeCompare(b)))
    const detail = GROWTH_DETAIL[tier]
    assert.equal(grown.body.attributes.position.count, data.edges.length * detail.segments * detail.sides * 6)
    assert.equal(grown.fibres.attributes.position.count, data.edges.length * detail.segments * detail.strands * 2)
    for (const geometry of [grown.body, grown.fibres]) {
      assert([...geometry.attributes.position.array].every(Number.isFinite), 'Growth must not introduce invalid vertices')
      assert(geometry.boundingSphere.radius < 250, 'Growth must stay within a bounded presentation volume')
      geometry.dispose()
    }
  }
  assert.deepEqual(data, original, 'Material must not change canonical data')
}
const empty = { nodes: [], edges: [{ id: 'invalid', source: 'x', target: 'y', relation: 'related_to', directed: true }] }
const emptyLayout = buildSpatialGraphLayout(empty)
const grown = growFilaments(empty, organicPositions(emptyLayout), emptyLayout, 'eco', [])
assert.deepEqual(grown.edgeIds, [])
assert.equal(grown.body.attributes.position.count, 0)
grown.body.dispose(); grown.fibres.dispose()
console.log('D09 ORGANIC GEOMETRY PASS: canonical endpoints, deterministic irregular placement, bounded dense geometry, empty graph')
