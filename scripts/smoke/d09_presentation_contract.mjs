import assert from 'node:assert/strict'
import { readCamera, readPresentation, initialTier, observeQuality, overviewRadius } from '../../apps/web/src/Mycelium3D/presentation.ts'

assert.equal(overviewRadius([]), 4)
assert.equal(overviewRadius([0, 2.1, 3.7]), 4, 'Do not frame a tiny project as a ten-unit network')
assert.equal(overviewRadius([0, 7]), 7)
assert.equal(overviewRadius([0, 30]), 30, 'Larger networks must retain their bounding radius')
assert.equal(overviewRadius([NaN, Infinity]), 4)

assert.equal(readCamera({ position: [NaN, 2, 3], target: [0, 0, 0] }), null)
assert.equal(readCamera({ position: [0, 0, 0], target: [0, 0, 0] }), null)
assert.equal(readCamera({ position: [1e20, 0, 0], target: [0, 0, 0] }), null)
assert.equal(readCamera({ position: [0, 1, 5, 3], target: [0, 0, 0] }), null)
const camera = { position: [0, 2, 10], target: [0, 0, 0] }
const restored = readPresentation({ view: '3d', quality: 'eco', camera, nodes: ['forbidden'], roles: ['admin'] })
assert.deepEqual(restored, { view: '3d', quality: 'eco', camera })
camera.position[0] = 9
assert.equal(restored.camera.position[0], 0, 'parsed camera must not alias input data')
assert.throws(() => readPresentation({ view: '3d', quality: 'unbounded' }))
assert.throws(() => readPresentation(null))
assert.equal(initialTier(16, 16, true), 'eco')
assert.equal(initialTier(16, 4), 'eco')
assert.equal(initialTier(16, 16), 'balanced')
let state = { tier: 'high', low: 0, high: 0 }
state = observeQuality(state, 20); assert.equal(state.tier, 'high')
state = observeQuality(state, 20); assert.equal(state.tier, 'balanced')
for (let i = 0; i < 2; i++) state = observeQuality(state, 20)
assert.equal(state.tier, 'eco')
for (let i = 0; i < 3; i++) state = observeQuality(state, 60)
assert.equal(state.tier, 'eco', 'upgrades must be slower than downgrades')
state = observeQuality(state, 60); assert.equal(state.tier, 'balanced')
assert.deepEqual(observeQuality(state, Infinity), state)
console.log('D09 PRESENTATION PASS: finite bounded camera, no business fields, mobile economy, quality hysteresis')
