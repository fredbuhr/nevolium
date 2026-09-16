import assert from 'node:assert/strict'
import { CASES, fixture, recordSample, summarize } from '../../apps/web/src/qualification/d09-measurements.ts'

for (const id of Object.keys(CASES)) {
  const data = fixture(id)
  assert.equal(data.nodes.length, CASES[id].nodes)
  assert.equal(data.edges.length, CASES[id].edges)
  const nodes = new Set(data.nodes.map(node => node.id))
  assert.equal(nodes.size, data.nodes.length)
  assert(data.edges.every(edge => nodes.has(edge.source) && nodes.has(edge.target) && edge.source !== edge.target))
  assert.equal(new Set(data.edges.map(edge => [edge.source, edge.target].sort().join('|'))).size, data.edges.length)
  assert.deepEqual(fixture(id), data)
}
const sample = (at_ms, segment = 1, heap_bytes = null) => ({
  at_ms, segment, heap_bytes, frames: 90, fps: 60, geometries: 3, textures: 0, calls: 3, triangles: 100,
  tier: 'eco', viewport: { width: 1280, height: 600, device_dpr: 2, buffer_width: 1280, buffer_height: 600 },
})
let recording = { started_at: '2026-09-15T00:00:00Z', target_ms: 600_000, active_ms: 0, samples: [], gaps: [] }
assert.equal(recordSample(recording, { ...sample(1), frames: 1, fps: 0 }), recording)
assert.equal(recordSample(recording, { ...sample(1500), fps: 0 }).samples[0].fps, 0, 'A real zero FPS window must not be discarded')
recording = recordSample(recording, sample(1500))
recording = recordSample(recording, sample(3000))
assert.equal(recording.active_ms, 1500)
recording = recordSample(recording, sample(10_000, 2))
assert.equal(recording.active_ms, 1500, 'Unmount gap must not count as measured activity')
recording = recordSample(recording, sample(11_500, 2))
recording = recordSample(recording, sample(30_000, 2))
assert.equal(recording.active_ms, 3000, 'Suspension gap must not count as measured activity')
assert.equal(recording.gaps.length, 1)
assert.equal(summarize(recording).duration_complete, false)
assert.equal(summarize(recording).heap_peak_bytes, null, 'Missing heap is unknown, never zero')
recording = recordSample(recording, sample(31_500, 2, 1024))
assert.equal(summarize(recording).heap_peak_bytes, 1024)
for (let i = 1; i <= 410; i++) recording = recordSample(recording, sample(31_500 + i * 1500, 2))
assert.equal(summarize(recording).duration_complete, true)
for (let i = 1; i < 1000; i++) recording = recordSample(recording, sample(650_000 + i * 1500, 2))
assert.equal(recording.samples.length, 1000, 'Recorder must bound its own retained memory')
console.log('D09 MEASUREMENTS PASS: fixtures, interrupted duration, nullable heap, completion, bounded evidence')
