import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'artifacts/d08-mindmap-browser')
const previewOrigin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'
const playwrightModule = process.env.NEVOLIUM_PLAYWRIGHT_MODULE
assert(playwrightModule, 'NEVOLIUM_PLAYWRIGHT_MODULE is required')
const { chromium } = await import(pathToFileURL(playwrightModule).href)
await fs.mkdir(output, { recursive: true })

const preview = spawn(
  path.join(root, 'apps/web/node_modules/.bin/vite'),
  ['preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { cwd: path.join(root, 'apps/web'), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
)
let previewOutput = ''
preview.stdout.on('data', chunk => { previewOutput += chunk.toString() })
preview.stderr.on('data', chunk => { previewOutput += chunk.toString() })

async function eventually(predicate, message, timeout = 12_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(message)
}

async function waitForPreview() {
  await eventually(async () => {
    if (preview.exitCode !== null) throw new Error(`Vite preview stopped.\n${previewOutput}`)
    try { return (await fetch(previewOrigin)).ok } catch { return false }
  }, 'Vite preview did not become ready', 30_000)
}

const now = new Date().toISOString()
const ids = {
  project: 'd08-project', task: 'd08-task-a', idea: 'd08-idea', note: 'd08-note', convertedTask: 'd08-task-converted',
}
const project = { id: ids.project, name: 'Projet D08', status: 'active', summary: 'Qualification mindmap', parent_id: null, created_at: now, updated_at: now }

function task(id, title) {
  return { id, project_id: ids.project, title, description: null, status: 'todo', owner_type: 'user', owner_ref: 'development-user',
    authority_ceiling: 1, budget_usd: null, input: {}, priority: 2, planned_start_at: null, planned_end_at: null,
    due_at: null, started_at: null, completed_at: null, created_at: now, updated_at: now }
}

function planningTask(row) {
  return { ...row, parent_task_id: null, kind: 'task', progress_percent: 0, planning_version: 1,
    recurrence_rule: null, recurrence_timezone: null }
}

function node(key, type, id, label, kind, status = 'ready', epistemic = null, priority = null) {
  return { key, entity_type: type, entity_id: id, project_id: ids.project, label, kind, status,
    epistemic_status: epistemic, priority }
}

function edge(id, sourceKey, targetKey, relation, metadata = {}, directed = true) {
  const [sourceType, sourceId] = sourceKey.split(':')
  const [targetType, targetId] = targetKey.split(':')
  return { id, source_key: sourceKey, target_key: targetKey, source_type: sourceType, source_id: sourceId,
    relation_type: relation, target_type: targetType, target_id: targetId, directed, metadata_json: metadata, created_at: now }
}

function makeState() {
  return {
    tasks: [task(ids.task, 'Tâche initiale D08')],
    nodes: [
      node(`project:${ids.project}`, 'project', ids.project, project.name, 'project', 'active'),
      node(`task:${ids.task}`, 'task', ids.task, 'Tâche initiale D08', 'task', 'todo', null, 2),
      node(`document:${ids.idea}`, 'document', ids.idea, 'Idée navigateur D08', 'idea', 'ready', 'supported'),
      node(`document:${ids.note}`, 'document', ids.note, 'Note navigateur D08', 'note'),
    ],
    edges: [edge('d08-canonical-edge', `document:${ids.idea}`, `task:${ids.task}`, 'supports', {}, true)],
    layouts: new Map(), linkCreates: 0, linkDeletes: 0, conversions: 0, layoutWrites: 0,
    mindmapReads: 0, planningReads: 0, nextEdge: 1, requests: [],
  }
}

function json(route, value, status = 200, headers = {}) {
  return route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: JSON.stringify(value) })
}

function snapshot(state) {
  return { project_id: ids.project, layout_workspace_key: `mindmap.project.${ids.project}`,
    nodes: state.nodes, edges: state.edges, task_count: state.nodes.filter(item => item.entity_type === 'task').length,
    document_count: state.nodes.filter(item => item.entity_type === 'document').length,
    relationship_count: state.edges.length, tasks_truncated: false, documents_truncated: false, relationships_truncated: false,
    task_limit: 100, document_limit: 100, relationship_limit: 300 }
}

async function installApiMock(context, state) {
  await context.route(`${apiOrigin}/v1/**`, async route => {
    const request = route.request(); const url = new URL(request.url()); const p = url.pathname
    state.requests.push(`${request.method()} ${p}${url.search}`)
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
    } })

    const layoutMatch = p.match(/^\/v1\/ui\/workspaces\/(.+)\/layout$/)
    if (layoutMatch) {
      const key = decodeURIComponent(layoutMatch[1])
      if (request.method() === 'PUT') {
        const body = request.postDataJSON(); state.layouts.set(key, body); state.layoutWrites += key.startsWith('mindmap.project.') ? 1 : 0
        return json(route, { id: `layout-${key}`, workspace_key: key, schema_version: body.schema_version, layout: body.layout, created_at: now, updated_at: now })
      }
      if (!state.layouts.has(key)) return json(route, { detail: 'Workspace layout not found' }, 404)
      const body = state.layouts.get(key)
      return json(route, { id: `layout-${key}`, workspace_key: key, schema_version: body.schema_version, layout: body.layout, created_at: now, updated_at: now })
    }

    if (p === '/v1/projects') return json(route, [project])
    if (p === `/v1/projects/${ids.project}`) return json(route, project)
    if (p === '/v1/tasks') return json(route, state.tasks)
    if (p === '/v1/relationships') return json(route, [])
    if (p === '/v1/today') return json(route, { day: url.searchParams.get('day'), timezone: url.searchParams.get('timezone'),
      overdue: [], in_progress: [], due_today: [], planned: [], completed_today: [], backlog: [], next_cursors: {} })
    if (p === '/v1/admin/model-configurations') return json(route, { active_calls: 0, allowed_providers: ['openai'], active: {
      id: null, source: 'environment', provider: 'openai', model_name: 'openai/gpt-4.1', model_alias: 'smart', status: 'active',
      connection_state: 'bootstrap', test_cost_usd: '0', test_cost_reported: false }, candidates: [] })

    if (p === `/v1/projects/${ids.project}/mindmap` && request.method() === 'GET') {
      state.mindmapReads += 1; return json(route, snapshot(state))
    }
    if (p === `/v1/projects/${ids.project}/mindmap/relationships` && request.method() === 'POST') {
      const body = request.postDataJSON(); const id = `d08-edge-${state.nextEdge++}`
      const created = edge(id, `${body.source_type}:${body.source_id}`, `${body.target_type}:${body.target_id}`,
        body.relation_type, { surface: 'mindmap', project_id: ids.project }, body.relation_type !== 'related_to')
      state.edges.unshift(created); state.linkCreates += 1; return json(route, created, 201)
    }
    const deleteMatch = p.match(new RegExp(`^/v1/projects/${ids.project}/mindmap/relationships/([^/]+)$`))
    if (deleteMatch && request.method() === 'DELETE') {
      state.edges = state.edges.filter(item => item.id !== deleteMatch[1]); state.linkDeletes += 1
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' })
    }
    const convertMatch = p.match(new RegExp(`^/v1/projects/${ids.project}/mindmap/ideas/([^/]+)/convert-to-task$`))
    if (convertMatch && request.method() === 'POST') {
      if (state.conversions) return json(route, { detail: 'Idea is already converted to a task' }, 409)
      const source = state.nodes.find(item => item.entity_id === convertMatch[1] && item.kind === 'idea'); assert(source)
      const createdTask = task(ids.convertedTask, source.label)
      state.tasks.unshift(createdTask)
      state.nodes.push(node(`task:${ids.convertedTask}`, 'task', ids.convertedTask, source.label, 'task', 'todo', null, 2))
      const converted = edge('d08-converted-edge', `document:${source.entity_id}`, `task:${ids.convertedTask}`, 'converted_to',
        { surface: 'mindmap', project_id: ids.project, conversion: true }, true)
      state.edges.unshift(converted); state.conversions += 1
      return json(route, { document_id: source.entity_id, task_id: ids.convertedTask, task_title: source.label, relationship: converted }, 201)
    }

    if (p.endsWith('/planning/tasks')) {
      state.planningReads += 1; return json(route, state.tasks.map(planningTask), 200, { 'x-nevolium-next-cursor': '' })
    }
    if (p.endsWith('/task-dependencies') || p.endsWith('/planning/occurrences')) return json(route, [])
    if (p.endsWith('/planning/critical-path')) return json(route, { project_id: ids.project, basis: 'working_seconds',
      work_calendar_timezone: 'UTC', work_calendar_version: 1, network_complete: true, project_duration_seconds: 0,
      project_task_count: state.tasks.length, eligible_task_count: 0, dependency_count: 0, critical_task_ids: [],
      critical_dependency_ids: [], excluded_task_ids: state.tasks.map(item => item.id), excluded_dependency_ids: [], tasks: [] })

    return json(route, { detail: `Unhandled D08 mock endpoint: ${request.method()} ${p}` }, 404)
  })
}

async function openMindMap(page, state, errors, label) {
  await page.goto(previewOrigin, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Nevolium', exact: true }).waitFor()
  await page.locator('.mycelium-space-node[data-space="projects"]').click()
  await page.getByRole('heading', { name: 'Donnez une forme concrète aux idées que vous choisissez de construire.' }).waitFor()
  await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Carte mentale', exact: true }).click()
  const map = page.locator('.mindmap-workspace:visible')
  try {
    await map.waitFor({ state: 'visible', timeout: 5_000 })
    await eventually(async () => await map.locator('.react-flow__node').count() > 0, 'D08 mindmap nodes did not render', 8_000)
  } catch (error) {
    const diagnostic = {
      label,
      url: page.url(),
      workspace_count: await page.locator('.mindmap-workspace').count(),
      visible_workspace_count: await page.locator('.mindmap-workspace:visible').count(),
      workspace_text: await page.locator('.mindmap-workspace:visible').allTextContents().catch(() => []),
      page_errors: errors,
      mindmap_reads: state.mindmapReads,
      recent_requests: state.requests.slice(-30),
      error: error instanceof Error ? error.message : String(error),
    }
    await fs.writeFile(path.join(output, `diagnostic-${label}.json`), `${JSON.stringify(diagnostic, null, 2)}\n`)
    await page.screenshot({ path: path.join(output, `diagnostic-${label}.png`), fullPage: true })
    throw new Error(`D08 openMindMap failed: ${JSON.stringify(diagnostic)}`)
  }
  await map.getByRole('heading', { name: /Carte mentale|Mind map/, exact: true }).waitFor()
  return map
}

async function dragNode(page, locator, dx, dy) {
  const box = await locator.boundingBox(); assert(box)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 }); await page.mouse.up()
}

async function qualifyDesktop(browser, state) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 920 }, locale: 'fr-FR', timezoneId: 'Europe/Paris',
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true })
  await installApiMock(context, state)
  const page = await context.newPage(); const errors = []
  page.on('pageerror', error => errors.push(error.stack || error.message))
  let map = await openMindMap(page, state, errors, 'desktop-open')
  assert.equal(await map.locator('.react-flow__node').count(), 4)

  const idea = map.locator('.react-flow__node').filter({ hasText: 'Idée navigateur D08' }).first()
  await idea.click(); assert.equal(new URL(page.url()).searchParams.get('mindmap'), `document:${ids.idea}`)
  await dragNode(page, idea, 95, 55)
  await eventually(() => state.layoutWrites > 0, 'D08: drag did not persist WorkspaceLayout')
  assert(state.layouts.get(`mindmap.project.${ids.project}`)?.layout?.positions?.[`document:${ids.idea}`])

  const editor = map.locator('.mindmap-editor-card').first(); const selects = editor.locator('select')
  await selects.nth(0).selectOption(`document:${ids.note}`); await selects.nth(1).selectOption('references'); await selects.nth(2).selectOption(`document:${ids.idea}`)
  await editor.getByRole('button', { name: 'Créer le lien', exact: true }).click()
  await eventually(() => state.linkCreates === 1, 'D08: link mutation was not sent')
  await map.getByRole('button', { name: 'Annuler', exact: true }).click(); await eventually(() => state.linkDeletes === 1, 'D08: link undo failed')
  await map.getByRole('button', { name: 'Rétablir', exact: true }).click(); await eventually(() => state.linkCreates === 2, 'D08: link redo failed')

  const taskNode = map.locator('.react-flow__node').filter({ hasText: 'Tâche initiale D08' }).first()
  await taskNode.click(); await page.keyboard.down('Shift'); await idea.click(); await page.keyboard.up('Shift')
  const groupCard = map.locator('.mindmap-editor-card').nth(1)
  await groupCard.getByLabel('Nom du groupe').fill('Branche test'); await groupCard.getByRole('button', { name: 'Créer le groupe', exact: true }).click()
  await eventually(() => Boolean(state.layouts.get(`mindmap.project.${ids.project}`)?.layout?.groups), 'D08: group layout was not persisted')

  const downloadPromise = page.waitForEvent('download'); await map.locator('.mindmap-toolbar-actions button').nth(2).click(); const download = await downloadPromise
  assert.equal(download.suggestedFilename(), `nevolium-mindmap-${ids.project}.json`)

  await idea.click(); await map.locator('.mindmap-conversion-bar').getByRole('button').click()
  await eventually(() => state.conversions === 1, 'D08: idea conversion was not sent')
  await map.locator('.react-flow__node').filter({ hasText: 'Idée navigateur D08' }).nth(1).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('mindmap'), `task:${ids.convertedTask}`)

  await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Planification', exact: true }).click()
  const planning = page.locator('.planning-workspace:visible'); await planning.getByText('Idée navigateur D08', { exact: true }).waitFor(); assert(state.planningReads > 0)
  await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Carte mentale', exact: true }).click(); map = page.locator('.mindmap-workspace:visible')
  await page.getByRole('button', { name: 'English', exact: true }).click(); await map.getByRole('heading', { name: 'Mind map', exact: true }).waitFor()
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true }); assert.deepEqual(errors, [])
  await context.close()
}

async function qualifyReload(browser, state) {
  const beforeReads = state.mindmapReads
  const context = await browser.newContext({ viewport: { width: 1200, height: 820 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', serviceWorkers: 'block' })
  await installApiMock(context, state); const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.stack || error.message))
  const map = await openMindMap(page, state, errors, 'reload-open')
  await eventually(() => state.mindmapReads > beforeReads, 'D08: map was not reloaded')
  assert(await map.locator('.react-flow__node').filter({ hasText: 'Idée navigateur D08' }).count() >= 2)
  assert(state.layouts.get(`mindmap.project.${ids.project}`)?.layout?.positions?.[`document:${ids.idea}`]); assert.deepEqual(errors, [])
  await context.close()
}

async function qualifyPhone(browser) {
  const state = makeState()
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' })
  await installApiMock(context, state); const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.stack || error.message))
  const map = await openMindMap(page, state, errors, 'phone-open')
  const editor = map.locator('.mindmap-editor-card').first(); const selects = editor.locator('select')
  await selects.nth(0).selectOption(`document:${ids.note}`); await selects.nth(2).selectOption(`document:${ids.idea}`)
  await editor.getByRole('button', { name: 'Créer le lien', exact: true }).tap(); await eventually(() => state.linkCreates === 1, 'D08 phone: touch link creation failed')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert(overflow <= 2, `D08 phone overflow ${overflow}px`)
  const buttonBox = await editor.getByRole('button', { name: 'Créer le lien', exact: true }).boundingBox(); assert(buttonBox); assert(buttonBox.height >= 36)
  await page.screenshot({ path: path.join(output, 'phone.png'), fullPage: true }); assert.deepEqual(errors, [])
  await context.close()
}

await waitForPreview()
const browser = await chromium.launch({ headless: true })
const state = makeState()
try {
  await qualifyDesktop(browser, state); await qualifyReload(browser, state); await qualifyPhone(browser)
  const result = { status: 'passed', mindmap_reads: state.mindmapReads, layout_writes: state.layoutWrites,
    link_creates: state.linkCreates, link_deletes: state.linkDeletes, conversions: state.conversions, planning_reads: state.planningReads }
  await fs.writeFile(path.join(output, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log('D08 BROWSER PASS', result)
} finally {
  await browser.close(); preview.kill('SIGTERM')
}
