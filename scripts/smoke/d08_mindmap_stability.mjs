import assert from 'node:assert/strict'
import path from 'node:path'
import './d08_layout_persistence_unit.mjs'
import { qualifyMindMapExit } from './d08_mindmap_exit.mjs'

// Reuses the D08 runner's API fixture. These are browser regressions, not a
// substitute for the independent owner-scoped PostgreSQL integration job.
export async function qualifyMindMapStability(harness) {
  const { browser, makeState, casePage, openMindMap, dragNode, selectOnlyNode, eventually, ids, output, setStage } = harness
  const state = makeState()
  const workspaceKey = `mindmap.project.${ids.project}`
  const ideaKey = `document:${ids.idea}`
  const taskKey = `task:${ids.task}`
  const noteKey = `document:${ids.note}`
  const initial = {
    positions: {
      [ideaKey]: { x: 80, y: 80 }, [taskKey]: { x: 370, y: 80 },
      [noteKey]: { x: 370, y: 270 }, [`project:${ids.project}`]: { x: 80, y: 270 },
    },
    groups: {}, viewport: { x: 15, y: 15, zoom: 0.8 },
  }
  state.layouts.set(workspaceKey, { schema_version: 1, layout: structuredClone(initial) })
  const options = { viewport: { width: 1360, height: 1000 }, locale: 'fr-FR', timezoneId: 'Europe/Paris',
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true }
  const { context, page, errors } = await casePage(browser, state, 'stability', options)
  let map = await openMindMap(page)
  const node = key => map.locator(`.react-flow__node[data-id="${key}"]`)
  const saved = () => state.layouts.get(workspaceKey).layout
  const position = async key => node(key).evaluate(element => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
    return { x: matrix.m41, y: matrix.m42 }
  })
  const near = (a, b) => Math.abs(a.x - b.x) < 0.2 && Math.abs(a.y - b.y) < 0.2
  const waitSaved = async () => map.locator('[data-save-state="saved"]').waitFor()
  const protectedReads = () => state.requests.filter(request => request.startsWith('GET ') && (
    request.includes('/mindmap') || request.includes('/ui/workspaces/') || request === 'GET /v1/projects'
  )).length

  setStage('stability:joint-drag')
  await selectOnlyNode(map, ideaKey)
  await page.keyboard.down('Shift')
  try { await node(taskKey).click() } finally { await page.keyboard.up('Shift') }
  await eventually(async () => await map.locator('.react-flow__node.selected').count() === 2,
    'D08: two nodes must be selected before the joint drag')
  const before = { [ideaKey]: await position(ideaKey), [taskKey]: await position(taskKey) }
  const writes = state.layoutWrites
  await dragNode(page, node(ideaKey), 64, 40)
  await eventually(() => state.layoutWrites > writes && !near(saved().positions[ideaKey], before[ideaKey])
    && !near(saved().positions[taskKey], before[taskKey]), 'D08: joint drag did not persist both node positions')
  await waitSaved()
  const afterJointDrag = structuredClone(saved().positions)
  assert(near(await position(ideaKey), afterJointDrag[ideaKey]))
  assert(near(await position(taskKey), afterJointDrag[taskKey]))
  const deltaA = { x: afterJointDrag[ideaKey].x - before[ideaKey].x, y: afterJointDrag[ideaKey].y - before[ideaKey].y }
  const deltaB = { x: afterJointDrag[taskKey].x - before[taskKey].x, y: afterJointDrag[taskKey].y - before[taskKey].y }
  assert(near(deltaA, deltaB), 'D08: joint drag changed the relative placement of the selected nodes')
  assert.deepEqual(saved().positions[noteKey], initial.positions[noteKey], 'D08: an unselected node moved')

  setStage('stability:locale-with-history')
  await map.getByLabel('Nom du groupe', { exact: true }).fill('Brouillon préservé')
  const readsBeforeLocale = protectedReads()
  await map.evaluate(element => { window.__d08WorkspaceUnderTest = element })
  await page.getByRole('button', { name: 'English', exact: true }).click()
  map = page.locator('.mindmap-workspace:visible')
  await map.getByRole('heading', { name: 'Mind map', exact: true }).waitFor()
  await map.locator(`.react-flow__node[data-id="${ideaKey}"]`).waitFor()
  assert.equal(await map.evaluate(element => element === window.__d08WorkspaceUnderTest), true,
    'D08: changing language remounted the workspace and lost its local state')
  assert.equal(await map.locator('.mindmap-editor-card').nth(1).locator('input').inputValue(), 'Brouillon préservé')
  assert.equal(await map.getAttribute('data-project-id'), ids.project)
  assert.equal(protectedReads(), readsBeforeLocale, 'D08: locale change restored layout or reloaded canonical data')
  assert.equal(await page.locator('.layout-state-loading:visible').count(), 0)
  assert.equal(await map.locator('.react-flow__node').count(), 4)
  assert.equal(await map.locator('.react-flow__node.selected').count(), 2)
  assert.equal(await page.locator('.cockpit-panel-buttons button[aria-current="page"]').textContent(), 'Mind map')

  setStage('stability:joint-undo-redo-after-locale')
  await map.getByRole('button', { name: 'Undo', exact: true }).click()
  await eventually(() => near(saved().positions[ideaKey], before[ideaKey]) && near(saved().positions[taskKey], before[taskKey]),
    'D08: undo did not restore both positions after the locale change')
  await waitSaved()
  assert(near(await position(ideaKey), before[ideaKey]))
  assert(near(await position(taskKey), before[taskKey]))
  await map.getByRole('button', { name: 'Redo', exact: true }).click()
  await eventually(() => near(saved().positions[ideaKey], afterJointDrag[ideaKey]) && near(saved().positions[taskKey], afterJointDrag[taskKey]),
    'D08: redo did not restore both joint positions')
  await waitSaved()
  assert.equal(protectedReads(), readsBeforeLocale, 'D08: editing after locale change triggered a hidden restore')
  await map.locator('.mindmap-canvas').screenshot({ path: path.join(output, 'stability-en-canvas.png') })
  await page.screenshot({ path: path.join(output, 'stability-en.png'), fullPage: true })

  setStage('stability:save-failure-retains-local-layout')
  await selectOnlyNode(map, ideaKey)
  const acknowledged = structuredClone(saved())
  state.failLayoutSaves = 1
  await dragNode(page, node(ideaKey), 40, 24)
  await map.locator('[data-save-state="error"]').waitFor()
  const localUnsaved = await position(ideaKey)
  assert(!near(localUnsaved, acknowledged.positions[ideaKey]))
  assert.deepEqual(saved(), acknowledged, 'D08: failed PUT changed the acknowledged server layout')
  assert.equal(await map.locator('[data-save-state="saved"]').count(), 0, 'D08: failed save was advertised as saved')
  const readsBeforeFailureLocale = protectedReads()
  await page.getByRole('button', { name: 'Français', exact: true }).click()
  map = page.locator('.mindmap-workspace:visible')
  await map.getByRole('heading', { name: 'Carte mentale', exact: true }).waitFor()
  await map.locator('[data-save-state="error"]').waitFor()
  assert.equal(protectedReads(), readsBeforeFailureLocale)
  assert(near(await position(ideaKey), localUnsaved), 'D08: language change discarded a failed local save')
  await map.getByRole('button', { name: 'Réessayer la sauvegarde', exact: true }).click()
  await waitSaved()
  assert(near(saved().positions[ideaKey], localUnsaved), 'D08: retry did not save the retained snapshot')
  assert.equal(await map.locator('[data-save-state="error"]').count(), 0)

  setStage('stability:serialized-latest-snapshot')
  // Hold the first PUT at the simulated server. A second edit must not overtake it.
  let release
  const held = new Promise(resolve => { release = resolve })
  state.layoutSaveGate = held
  const attemptsBefore = state.layoutAttempts
  await selectOnlyNode(map, ideaKey)
  await dragNode(page, node(ideaKey), 32, 16)
  await eventually(() => state.layoutAttempts === attemptsBefore + 1, 'D08: first queued save did not reach server')
  const firstPosition = await position(ideaKey)
  await selectOnlyNode(map, noteKey)
  await dragNode(page, node(noteKey), 24, 16)
  const secondPosition = await position(noteKey)
  assert.equal(state.layoutAttempts, attemptsBefore + 1, 'D08: a newer PUT overtook the unfinished older PUT')
  assert.equal(await map.locator('[data-save-state="saving"]').count(), 1)
  release()
  await waitSaved()
  await eventually(() => state.layoutAttempts >= attemptsBefore + 2, 'D08: latest snapshot was not flushed after the older acknowledgement')
  assert(near(saved().positions[ideaKey], firstPosition))
  assert(near(saved().positions[noteKey], secondPosition))
  assert.equal(state.maxLayoutInFlight, 1, 'D08: concurrent same-workspace PUTs can lose updates')
  const finalLayout = structuredClone(saved())
  assert.deepEqual(errors, [])
  await context.close()

  setStage('stability:reload-both-positions')
  const reloaded = await casePage(browser, state, 'stability-reload', options)
  map = await openMindMap(reloaded.page)
  for (const key of [ideaKey, taskKey, noteKey]) {
    assert(near(await position(key), finalLayout.positions[key]), `D08: reload lost ${key}`)
  }
  assert.equal(await map.getAttribute('data-project-id'), ids.project)
  await map.locator('.mindmap-canvas').screenshot({ path: path.join(output, 'stability-reload-canvas.png') })
  assert.deepEqual(reloaded.errors, [])
  await reloaded.context.close()

  const exit = await qualifyMindMapExit(harness)
  return { jointDrag: true, jointUndoRedoAfterLocale: true, localeWithoutRestore: true,
    failedSaveRetainedAcrossLocale: true, explicitRetry: true, latestSnapshotSerialized: true,
    reloadedPositions: 3, maxLayoutInFlight: state.maxLayoutInFlight, exit }
}
