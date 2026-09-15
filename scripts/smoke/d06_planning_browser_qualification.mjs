import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'artifacts/d06-planning-browser')
const previewOrigin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'
const playwrightModule = process.env.NEVOLIUM_PLAYWRIGHT_MODULE
const chromiumExecutable = process.env.NEVOLIUM_CHROMIUM_EXECUTABLE

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

async function eventually(predicate, message, timeout = 10_000) {
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

function shiftLocalInput(value, minutes) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  const date = new Date(`${value}:00Z`)
  date.setUTCMinutes(date.getUTCMinutes() + minutes)
  return date.toISOString().slice(0, 16)
}

function makeState() {
  const now = new Date()
  const start = new Date(now.getTime() - 10 * 60 * 1000)
  const end = new Date(now.getTime() + 50 * 60 * 1000)
  const created = new Date(now.getTime() - 86_400_000).toISOString()
  return {
    project: {
      id: 'd06-project', name: 'Projet tactile D06', status: 'active',
      summary: 'Qualification planning mobile et tablette', parent_id: null,
      created_at: created, updated_at: created,
    },
    task: {
      id: 'd06-touch-task', project_id: 'd06-project', title: 'Tâche planning tactile D06',
      description: 'État canonique partagé par Planning et Today.', status: 'todo', priority: 2,
      planned_start_at: start.toISOString(), planned_end_at: end.toISOString(), due_at: null,
      started_at: null, completed_at: null, created_at: created, updated_at: created,
      parent_task_id: null, kind: 'task', progress_percent: 25, planning_version: 1,
      recurrence_rule: null, recurrence_timezone: null, owner_type: 'user', owner_ref: null,
      authority_ceiling: 1, budget_usd: null, input: {},
    },
    layouts: new Map(), planningReads: 0, previewReads: 0, applyReads: 0, todayReads: 0,
  }
}

function json(route, value, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(value),
  })
}

function planningTask(task) {
  return {
    id: task.id, project_id: task.project_id, title: task.title, description: task.description,
    status: task.status, priority: task.priority, planned_start_at: task.planned_start_at,
    planned_end_at: task.planned_end_at, due_at: task.due_at, started_at: task.started_at,
    completed_at: task.completed_at, created_at: task.created_at, updated_at: task.updated_at,
    parent_task_id: task.parent_task_id, kind: task.kind, progress_percent: task.progress_percent,
    planning_version: task.planning_version, recurrence_rule: task.recurrence_rule,
    recurrence_timezone: task.recurrence_timezone,
  }
}

function projectTask(task) {
  return {
    id: task.id, project_id: task.project_id, title: task.title, description: task.description,
    status: task.status, owner_type: task.owner_type, owner_ref: task.owner_ref,
    authority_ceiling: task.authority_ceiling, budget_usd: task.budget_usd, input: task.input,
    started_at: task.started_at, completed_at: task.completed_at,
    created_at: task.created_at, updated_at: task.updated_at,
  }
}

function criticalPath(state) {
  return {
    project_id: state.project.id, basis: 'working_seconds', work_calendar_timezone: 'Europe/Paris',
    work_calendar_version: 1, network_complete: true, project_duration_seconds: 3600,
    project_task_count: 1, eligible_task_count: 1, dependency_count: 0,
    critical_task_ids: [state.task.id], critical_dependency_ids: [], excluded_task_ids: [],
    excluded_dependency_ids: [], tasks: [{ task_id: state.task.id, earliest_start_seconds: 0,
      earliest_finish_seconds: 3600, latest_start_seconds: 0, latest_finish_seconds: 3600,
      slack_seconds: 0, critical: true }],
  }
}

function changedFields(task, update) {
  return ['planned_start_at', 'planned_end_at', 'due_at'].filter(
    field => Object.prototype.hasOwnProperty.call(update, field) && task[field] !== update[field],
  )
}

function todayView(state, url) {
  state.todayReads += 1
  return {
    day: url.searchParams.get('day'), timezone: url.searchParams.get('timezone'),
    day_start: state.task.planned_start_at, day_end: state.task.planned_end_at,
    overdue: [], in_progress: [], due_today: [], completed_today: [], backlog: [], next_cursors: {},
    planned: [{ bucket: 'planned', project_id: state.project.id, project_name: state.project.name,
      task: planningTask(state.task) }],
  }
}

async function installApiMock(context, state) {
  await context.route(`${apiOrigin}/v1/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type',
      } })
    }
    if (pathname.startsWith('/v1/ui/workspaces/') && pathname.endsWith('/layout')) {
      const key = decodeURIComponent(pathname.split('/').at(-2))
      if (request.method() === 'PUT') {
        const body = request.postDataJSON(); state.layouts.set(key, body); return json(route, body)
      }
      return state.layouts.has(key) ? json(route, state.layouts.get(key)) : json(route, {}, 404)
    }
    if (pathname === '/v1/projects') return json(route, [state.project])
    if (pathname === `/v1/projects/${state.project.id}`) return json(route, state.project)
    if (pathname === '/v1/tasks') return json(route, [projectTask(state.task)])
    if (pathname === `/v1/tasks/${state.task.id}` && request.method() === 'GET') {
      return json(route, projectTask(state.task))
    }
    if (pathname === '/v1/documents' || pathname === '/v1/relationships') return json(route, [])
    if (pathname === '/v1/today') return json(route, todayView(state, url))
    if (pathname === '/v1/admin/model-configurations') {
      return json(route, { active_calls: 0, allowed_providers: ['openai'], active: {
        id: null, source: 'environment', provider: 'openai', model_name: 'openai/gpt-4.1',
        model_alias: 'smart', status: 'active', connection_state: 'bootstrap',
        test_cost_usd: '0', test_cost_reported: false }, candidates: [] })
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/tasks`) {
      state.planningReads += 1
      return json(route, [planningTask(state.task)])
    }
    if (pathname === `/v1/projects/${state.project.id}/task-dependencies`) return json(route, [])
    if (pathname === `/v1/projects/${state.project.id}/planning/critical-path`) {
      return json(route, criticalPath(state))
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/occurrences`) return json(route, [])
    if (pathname === `/v1/projects/${state.project.id}/planning/replan/preview` && request.method() === 'POST') {
      state.previewReads += 1
      const update = request.postDataJSON().updates[0]
      const fields = changedFields(state.task, update)
      const proposed = {
        planned_start_at: Object.prototype.hasOwnProperty.call(update, 'planned_start_at') ? update.planned_start_at : state.task.planned_start_at,
        planned_end_at: Object.prototype.hasOwnProperty.call(update, 'planned_end_at') ? update.planned_end_at : state.task.planned_end_at,
        due_at: Object.prototype.hasOwnProperty.call(update, 'due_at') ? update.due_at : state.task.due_at,
      }
      return json(route, {
        project_id: state.project.id, preview_digest: 'a'.repeat(64), can_apply: true,
        changed_task_count: fields.length ? 1 : 0, suggested_task_count: 0,
        changes: [{ task_id: state.task.id, current_version: state.task.planning_version,
          expected_version: update.expected_version, current: {
            planned_start_at: state.task.planned_start_at, planned_end_at: state.task.planned_end_at,
            due_at: state.task.due_at }, proposed, changed_fields: fields }],
        suggested_changes: [], dependency_findings: [],
      })
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/replan/apply` && request.method() === 'POST') {
      state.applyReads += 1
      const body = request.postDataJSON(); assert.equal(body.preview_digest, 'a'.repeat(64))
      const update = body.updates[0]; assert.equal(update.expected_version, state.task.planning_version)
      const fields = changedFields(state.task, update)
      for (const field of ['planned_start_at', 'planned_end_at', 'due_at']) {
        if (Object.prototype.hasOwnProperty.call(update, field)) state.task[field] = update[field]
      }
      state.task.planning_version += 1; state.task.updated_at = new Date().toISOString()
      return json(route, { project_id: state.project.id, preview_digest: body.preview_digest,
        updated: [{ task_id: state.task.id, planning_version: state.task.planning_version,
          changed_fields: fields }] })
    }
    return json(route, { detail: `Unhandled D06 mock endpoint: ${request.method()} ${pathname}` }, 404)
  })
}

async function openPlanning(page, state) {
  await page.goto(previewOrigin, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Nevolium', exact: true }).waitFor()
  await page.locator('.mycelium-space-node[data-space="projects"]').click()
  await page.getByRole('heading', {
    name: 'Donnez une forme concrète aux idées que vous choisissez de construire.',
  }).waitFor()

  const planningButton = page.locator('.cockpit-panel-buttons').getByRole('button', {
    name: 'Planification', exact: true,
  })
  await planningButton.waitFor({ state: 'visible' })
  await planningButton.click()

  const planning = page.locator('.planning-workspace:visible')
  await planning.waitFor({ state: 'visible' })
  await eventually(() => state.planningReads > 0, 'Planning projection was not loaded after opening Planning')
  await planning.getByRole('heading', {
    name: 'Organisez les mêmes tâches en liste, Kanban, Gantt ou calendrier.',
  }).waitFor()
  await planning.getByText(state.task.title, { exact: true }).first().waitFor({ state: 'visible' })
  return planning
}

async function qualifyTablet(browser) {
  const state = makeState()
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, locale: 'fr-FR',
    timezoneId: 'Europe/Paris', colorScheme: 'dark', reducedMotion: 'reduce', hasTouch: true,
    isMobile: true, serviceWorkers: 'block' })
  await installApiMock(context, state)
  const page = await context.newPage()
  const planning = await openPlanning(page, state)

  assert(await page.evaluate(() => navigator.maxTouchPoints > 0), 'tablet: touch input missing')
  await planning.getByRole('button', { name: 'Gantt', exact: true }).click()
  await planning.locator('.planning-gantt-canvas').waitFor({ state: 'visible' })
  const canvas = await planning.locator('.planning-gantt-canvas').boundingBox()
  assert(canvas && canvas.width >= 300 && canvas.height >= 240, 'tablet: Gantt canvas is not usable')

  await planning.getByRole('button', { name: 'Liste', exact: true }).click()
  const edit = planning.getByRole('button', { name: 'Modifier le créneau', exact: true }).first()
  await edit.waitFor({ state: 'visible' })
  const editBox = await edit.boundingBox()
  assert(editBox && editBox.height >= 34, 'tablet: non-drag schedule editor control is unusable')
  await page.screenshot({ path: path.join(output, 'd06-tablet-gantt-and-list.png'), fullPage: false })
  await context.close()
  return { touch: true, gantt: true, alternativeEditor: true }
}

async function qualifyPhone(browser) {
  const state = makeState()
  const originalStart = state.task.planned_start_at
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR',
    timezoneId: 'Europe/Paris', colorScheme: 'dark', reducedMotion: 'reduce', hasTouch: true,
    isMobile: true, serviceWorkers: 'block' })
  await installApiMock(context, state)
  const page = await context.newPage()
  const planning = await openPlanning(page, state)
  const initialPlanningReads = state.planningReads

  await planning.getByRole('button', { name: 'Calendrier', exact: true }).click()
  await planning.locator('.planning-calendar').waitFor({ state: 'visible' })
  await planning.locator('.planning-calendar-agenda').waitFor({ state: 'visible' })
  const event = planning.locator('.planning-calendar-event').filter({ hasText: state.task.title }).first()
  await event.waitFor({ state: 'visible' })
  await event.click()

  const editor = planning.locator('.planning-schedule-editor')
  await editor.waitFor({ state: 'visible' })
  const startInput = editor.locator('input[type="datetime-local"]').nth(0)
  const endInput = editor.locator('input[type="datetime-local"]').nth(1)
  const nextStart = shiftLocalInput(await startInput.inputValue(), 15)
  const nextEnd = shiftLocalInput(await endInput.inputValue(), 15)
  await startInput.fill(nextStart)
  await endInput.fill(nextEnd)
  await editor.getByRole('button', { name: 'Prévisualiser', exact: true }).click()
  await editor.getByText('Aperçu valide', { exact: true }).waitFor({ state: 'visible' })
  await editor.getByRole('button', { name: 'Appliquer', exact: true }).click()

  await eventually(() => state.applyReads === 1, 'phone: replan apply was not sent')
  await eventually(() => state.planningReads > initialPlanningReads, 'phone: canonical planning was not reloaded')
  assert.notEqual(state.task.planned_start_at, originalStart, 'phone: canonical schedule did not change')
  assert.equal(state.task.planning_version, 2, 'phone: planning version did not advance')

  const todayButton = page.locator('.cockpit-panel-buttons').getByRole('button', {
    name: 'Aujourd’hui', exact: true,
  })
  await todayButton.click()
  await page.getByRole('heading', { name: 'Retrouvez ce que vous souhaitez faire aujourd’hui.' }).waitFor()
  await page.getByText(state.task.title, { exact: true }).last().waitFor({ state: 'visible' })
  await eventually(() => state.todayReads > 0, 'phone: Today did not read the canonical task')
  await page.screenshot({ path: path.join(output, 'd06-phone-calendar-editor-today.png'), fullPage: false })
  await context.close()
  return { touch: true, calendar: true, previewReads: state.previewReads, applyReads: state.applyReads,
    planningReads: state.planningReads, todayReads: state.todayReads }
}

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({ headless: true,
    ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}) })
  const tablet = await qualifyTablet(browser)
  const phone = await qualifyPhone(browser)
  const evidence = { tablet, phone }
  await fs.writeFile(path.join(output, 'qualification.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log('D06 PLANNING BROWSER PASS:', JSON.stringify(evidence))
} catch (error) {
  const diagnostic = error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`
  await fs.writeFile(path.join(output, 'failure.txt'), diagnostic)
  throw error
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
