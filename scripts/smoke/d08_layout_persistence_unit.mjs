import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireWeb = createRequire(path.join(root, 'apps/web/package.json'))
const ts = requireWeb('typescript')
const source = await fs.readFile(path.join(root, 'apps/web/src/MindMapWorkspace/useLayoutPersistence.ts'), 'utf8')
const built = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true,
})
assert.equal(built.diagnostics.length, 0)

// Isolated execution of the actual persistence source, with deliberately simulated
// React hooks, session events and transport. Not a mounted React/Keycloak proof.
let identity = { enabled: true, authenticated: true, subject: 'owner-a' }
const listeners = new Set()
let fetchImpl
const exports = {}
vm.runInNewContext(built.outputText, {
  exports, structuredClone, AbortController, Error, Set,
  require(name) {
    if (name === 'react') return { useMemo: fn => fn(), useSyncExternalStore: (_, get) => get() }
    if (name.endsWith('apiClient')) return { nevoliumFetch: (...args) => fetchImpl(...args) }
    if (name.endsWith('authSession')) return {
      getAuthSnapshot: () => ({ ...identity }),
      subscribeAuthSession: fn => { listeners.add(fn); return () => listeners.delete(fn) },
    }
    throw new Error(`Unexpected persistence dependency: ${name}`)
  },
})
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
const { LatestLayoutWriter, useLayoutPersistence } = exports

const held = deferred()
const calls = []
const states = []
const writer = new LatestLayoutWriter(async value => {
  calls.push(value)
  if (calls.length === 1) await held.promise
})
writer.subscribe(() => states.push(writer.getSnapshot().status))
writer.enqueue({ v: 1 }); writer.enqueue({ v: 2 }); writer.enqueue({ v: 3 })
assert.equal(calls.length, 1)
assert.equal(writer.getSnapshot().status, 'saving')
held.resolve(); await tick()
assert.deepEqual(calls, [{ v: 1 }, { v: 3 }])
assert.equal(writer.dirty, false)
assert.equal(states.filter(state => state === 'saved').length, 1)

let shouldFail = true
let observed
const retryWriter = new LatestLayoutWriter(async value => {
  observed = value
  if (shouldFail) throw new Error('503')
})
const payload = { positions: { a: { x: 1, y: 2 } } }
retryWriter.enqueue(payload); payload.positions.a.x = 999; await tick()
assert.equal(retryWriter.getSnapshot().status, 'error')
assert.equal(retryWriter.dirty, true)
assert.equal(observed.positions.a.x, 1)
shouldFail = false; retryWriter.retry(); await tick()
assert.equal(retryWriter.getSnapshot().status, 'saved')
assert.equal(retryWriter.dirty, false)

const tokenWait = deferred()
let requests = 0
let network = 0
fetchImpl = async (_, init) => {
  requests += 1
  await tokenWait.promise
  if (init.signal.aborted) throw new Error('aborted')
  network += 1
  return { ok: true }
}
const scoped = useLayoutPersistence('mock://api', 'mindmap.project.test')
scoped.save({ privateLabel: 'a' }); scoped.save({ privateLabel: 'newer-a' })
assert.equal(requests, 1)
assert.equal(listeners.size, 1)
identity = { enabled: true, authenticated: true, subject: 'owner-b' }
listeners.forEach(listener => listener())
tokenWait.resolve(); await tick()
assert.equal(network, 0)
assert.equal(requests, 1)
assert.equal(listeners.size, 0)
assert.equal(scoped.writer.getSnapshot().status, 'error')
assert.equal(scoped.writer.dirty, true)
scoped.retry(); await tick()
assert.equal(requests, 1, 'Old-owner retry must not even request a token')
assert.equal(network, 0)
assert.equal(listeners.size, 0)

const sameOwner = useLayoutPersistence('mock://api', 'mindmap.project.other')
fetchImpl = async (_, init) => {
  assert.equal(init.signal.aborted, false)
  return { ok: true }
}
sameOwner.save({ label: 'b' }); await tick()
assert.equal(sameOwner.writer.getSnapshot().status, 'saved')
assert.equal(listeners.size, 0)
identity = { enabled: true, authenticated: false, subject: 'owner-b' }
fetchImpl = async () => { throw new Error('Logged-out save reached transport') }
sameOwner.save({ label: 'must not be sent' }); await tick()
assert.equal(sameOwner.writer.getSnapshot().status, 'error')
assert.equal(sameOwner.writer.getSnapshot().error, 'Nevolium session changed')
assert.equal(listeners.size, 0)

console.log('D08 LAYOUT UNIT PASS: latest serial snapshot, honest acknowledgements, immutable retry, session-bound abort and logout (simulated hooks/auth/transport)')
