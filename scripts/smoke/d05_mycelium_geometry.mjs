import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const appRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url))
const ts = appRequire('typescript')
const source = fs.readFileSync(new URL('../../apps/web/src/lib/myceliumGeometry.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const { createMyceliumGeometry } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

for (const [width, height] of [[308, 475], [378, 475], [576, 521], [800, 521], [960, 690], [1250, 740]]) {
  const geometry = createMyceliumGeometry(width, height)
  assert.deepEqual(geometry, createMyceliumGeometry(width, height), 'Resize must not reshuffle the tissue')
  assert.equal(geometry.nodes.length, 7)
  assert.equal(new Set(geometry.nodes.map(node => node.key)).size, 7)
  assert(geometry.fibres.length > 180 && geometry.fibres.length < 600)
  assert.equal(geometry.sheaths.length, 12)
  for (const node of geometry.nodes) {
    const hitRadius = node.radius * .88
    assert(hitRadius * 2 >= 44, `${width}: target too small: ${node.key}`)
    assert(node.x - hitRadius >= 0 && node.x + hitRadius <= width)
    assert(node.y - hitRadius >= 0 && node.y + hitRadius <= height)
    for (const other of geometry.nodes.filter(other => other.key !== node.key)) {
      assert(Math.hypot(node.x - other.x, node.y - other.y) > hitRadius + other.radius * .88 + 4,
        `${width}: overlapping targets: ${node.key}/${other.key}`)
    }
  }
  for (const fibre of geometry.fibres) {
    assert(fibre.path.startsWith('M') && fibre.path.includes('C'))
    assert(!/NaN|Infinity/.test(fibre.path))
    assert(fibre.width > 0 && fibre.width <= 2)
  }
  assert(new Set(geometry.fibres.map(fibre => fibre.opacity)).size > 10)
  assert(new Set(geometry.fibres.map(fibre => fibre.tone)).size === 4)
}
for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => createMyceliumGeometry(invalid, 600), RangeError)
}
for (const name of ['mycelium-landscape.webp', 'mycelium-membrane.webp']) {
  const asset = fileURLToPath(new URL(`../../apps/web/public/${name}`, import.meta.url))
  assert(fs.statSync(asset).size < 180_000, `${name}: decorative asset exceeded its transfer budget`)
}
console.log('D05 MYCELIUM PASS: deterministic branched tissue, bounded geometry/assets, aligned non-overlapping 44px targets')
