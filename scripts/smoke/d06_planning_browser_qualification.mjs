import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outputDirectory = path.join(repositoryRoot, 'artifacts/d06-planning-browser')
const previewOrigin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'
const playwrightModule = process.env.NEVOLIUM_PLAYWRIGHT_MODULE
const chromiumExecutable = process.env.NEVOLIUM_CHROMIUM_EXECUTABLE

assert(playwrightModule, 'NEVOLIUM_PLAYWRIGHT_MODULE must point to the ephemeral Playwright module')
const { chromium } = await import(pathToFileURL(playwrightModule).href)

await fs.mkdir(outputDirectory, { recursive: true })

const preview = spawn(
  path.join(repositoryRoot, 'apps/web/node_modules/.bin/vite'),
  ['preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  {
    cwd: path.join(repositoryRoot, 'apps/web'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

let previewOutput = ''
preview.stdout.on('data', (chunk) => { previewOutput += chunk.toString() })
preview.stderr.on('data', (chunk) => { previewOutput += chunk.toString() })

async function waitForPreview() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) {
      throw new Error(`Vite preview stopped before D06 qualification.\n${previewOutput}`)
    }
    try {
      const response = await fetch(previewOrigin)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Vite preview did not become ready.\n${previewOutput}`)
}

async function eventually(predicate, message, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(message)
}

function shiftLocalInput(value, minutes) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  const shifted = new Date(`${value}:00Z`)
  shifted.setUTCMinutes(shifted.getUTCMinutes() + minutes)
  return shifted.toISOString().slice(0, 16)
}

function makeState() {
  const now = new Date()
  const start = new Date(now.getTime() + 30 * 60 * 1000)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const created = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  return {
    project: {
      id: 'd06-project',
      name: 'Projet tactile D06',
      status: 'active',
      summary: 'Qualification planning mobile et tablette',
      parent_id: null,
      created_at: created,
      updated_at: created,
    },
    task: {
      id: 'd06-touch-task',
      project_id: 'd06-project',
      title: 'Tâche planning tactile D06',
      description: 'Même état canonique pour Liste, Gantt, Calendrier et Today.',
      status: 'todo',
      priority: 2,
      planned_start_at: start.toISOString(),
      planned_end_at: end.toISOString(),
      due_at: null,
      started_at: null,
      completed_at: null,
      created_at: created,
      updated_at: created,
      parent_task_id: null,
      kind: 'task',
      progress_percent: 25,
      planning_version: 1,
      recurrence_rule: null,
      recurrence_timezone: null,
      owner_type: 'user',
      owner_ref: null,
      authority_ceiling: 1,
      budget_usd: null,
      input: {},
    },
    layouts: new Map(),
    planningReads: 0,
    todayReads: 0,
    previewReads: 0,
    applyReads: 0,
  }
}

function json(route, value, status = 200, extraHeaders = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      ...extraHeaders,
    },
    body: JSON.stringify(value),
  })
}

function projectTaskView(task) {
  return {
    id: task.id,
    project_id: task.project_id,
    title: task.title,
    description: task.description,
    status: task.status,
    owner_type: task.owner_type,
    owner_ref: task.owner_ref,
    authority_ceiling: task.authority_ceiling,
    budget_usd: task.budget_usd,
    input: task.input,
    started_at: task.started_at,
    completed_at: task.completed_at,
    created_at: task.created_at,
    updated_at: task.updated_at,
  }
}

function planningTaskView(task) {
  return {
    id: task.id,
    project_id: task.project_id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    planned_start_at: task.planned_start_at,
    planned_end_at: task.planned_end_at,
    due_at: task.due_at,
    started_at: task.started_at,
    completed_at: task.completed_at,
    created_at: task.created_at,
    updated_at: task.updated_at,
    parent_task_id: task.parent_task_id,
    kind: task.kind,
    progress_percent: task.progress_percent,
    planning_version: task.planning_version,
    recurrence_rule: task.recurrence_rule,
    recurrence_timezone: task.recurrence_timezone,
  }
}

function criticalPathView(state) {
  return {
    project_id: state.project.id,
    basis: 'working_seconds',
    work_calendar_timezone: 'Europe/Paris',
    work_calendar_version: 1,
    network_complete: true,
    project_duration_seconds: 3600,
    project_task_count: 1,
    eligible_task_count: 1,
    dependency_count: 0,
    critical_task_ids: [state.task.id],
    critical_dependency_ids: [],
    excluded_task_ids: [],
    excluded_dependency_ids: [],
    tasks: [{
      task_id: state.task.id,
      earliest_start_seconds: 0,
      earliest_finish_seconds: 3600,
      latest_start_seconds: 0,
      latest_finish_seconds: 3600,
      slack_seconds: 0,
      critical: true,
    }],
  }
}

function changedFields(task, update) {
  return ['planned_start_at', 'planned_end_at', 'due_at'].filter(
    (field) => Object.prototype.hasOwnProperty.call(update, field) && task[field] !== update[field],
  )
}

async function installApiMock(context, state) {
  await context.route(`${apiOrigin}/v1/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname

    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      })
    }

    if (pathname.startsWith('/v1/ui/workspaces/') && pathname.endsWith('/layout')) {
      const workspaceKey = decodeURIComponent(pathname.split('/').at(-2))
      if (request.method() === 'PUT') {
        const body = request.postDataJSON()
        state.layouts.set(workspaceKey, body)
        return json(route, body)
      }
      return state.layouts.has(workspaceKey)
        ? json(route, state.layouts.get(workspaceKey))
        : json(route, {}, 404)
    }

    if (pathname === `/v1/projects/${state.project.id}/planning/tasks`) {
      state.planningReads += 1
      return json(route, [planningTaskView(state.task)])
    }
    if (pathname === `/v1/projects/${state.project.id}/task-dependencies`) {
      return json(route, [])
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/critical-path`) {
      return json(route, criticalPathView(state))
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/occurrences`) {
      return json(route, [])
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/replan/preview` && request.method() === 'POST') {
      state.previewReads += 1
      const body = request.postDataJSON()
      const update = body.updates[0]
      const fields = changedFields(state.task, update)
      const proposed = {
        planned_start_at: Object.prototype.hasOwnProperty.call(update, 'planned_start_at') ? update.planned_start_at : state.task.planned_start_at,
        planned_end_at: Object.prototype.hasOwnProperty.call(update, 'planned_end_at') ? update.planned_end_at : state.task.planned_end_at,
        due_at: Object.prototype.hasOwnProperty.call(update, 'due_at') ? update.due_at : state.task.due_at,
      }
      return json(route, {
        project_id: state.project.id,
        preview_digest: 'a'.repeat(64),
        can_apply: true,
        changed_task_count: fields.length ? 1 : 0,
        suggested_task_count: 0,
        changes: [{
          task_id: state.task.id,
          current_version: state.task.planning_version,
          expected_version: update.expected_version,
          current: {
            planned_start_at: state.task.planned_start_at,
            planned_end_at: state.task.planned_end_at,
            due_at: state.task.due_at,
          },
          proposed,
          changed_fields: fields,
        }],
        suggested_changes: [],
        dependency_findings: [],
      })
    }
    if (pathname === `/v1/projects/${state.project.id}/planning/replan/apply` && request.method() === 'POST') {
      state.applyReads += 1
      const body = request.postDataJSON()
      assert.equal(body.preview_digest, 'a'.repeat(64))
      const update = body.updates[0]
      assert.equal(update.expected_version, state.task.planning_version)
      const fields = changedFields(state.task, update)
      for (const field of ['planned_start_at', 'planned_end_at', 'due_at']) {
        if (Object.prototype.hasOwnProperty.call(update, field)) state.task[field] = update[field]
      }
      state.task.planning_version += 1
      state.task.updated_at = new Date().toISOString()
      return json(route, {
        project_id: state.project.id,
        preview_digest: body.preview_digest,
        updated: [{
          task_id: state.task.id,
          planning_version: state.task.planning_version,
          changed_fields: fields,
        }],
      })
    }

    if (pathname === '/v1/projects' || pathname === '/v1/projects/' && request.method() === 'GET') {
      return json(route, [state.project])
    }
    if (pathname === `/v1/projects/${state.project.id}` && request.method() === 'GET') {
      return json(route, state.project)
    }
    if (pathname === '/v1/tasks' && request.method() === 'GET') {
      return json(route, [projectTaskView(state.task)])
    }
    if (pathname === `/v1/tasks/${state.task.id}` && request.method() === 'GET') {
      return json(route, projectTaskView(state.task))
    }
    if (pathname === '/v1/documents' || pathname === '/v1/relationships') {
      return json(route, [])
    }
    if (pathname === '/v1/today') {
      state.todayReads += 1
      const day = url.searchParams.get('day') || new Date().toISOString().slice(0, 10)
      const timezone = url.searchParams.get('timezone') || 'Europe/Paris'
      return json(route, {
        day,
        timezone,
        day_start: state.task.planned_start_at,
        day_end: state.task.planned_end_at,
        overdue: [],
        in_progress: [],
        due_today: [],
        planned: [{
          bucket: 'planned',
          project_id: state.project.id,
          project_name: state.project.name,
          task: planningTaskView(state.task),
        }],
        completed_today: [],
        backlog: [],
        next_cursors: {},
      })
    }

    return json(route, { detail: `Endpoint absent du scénario D06: ${request.method()} ${pathname}` }, 404)
  })
}

async function openPlanning(page, state) {
  await page.goto(previewOrigin, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Nevolium', exact: true }).waitFor()
  await page.locator('.mycelium-space-node[data-space="projects"]').click()
  await page.getByRole('heading', {
    name: 'Donnez une forme concrète aux idées que vous choisissez de construire.',
  }).waitFor()
  await eventually(() => state.planningReads > 0, 'Planning projection was not loaded after project selection')
  const navigation = page.locator('.cockpit-panel-buttons')
  const planningButton = navigation.getByRole('button', { name: 'Planification', exact: true })
  await planningButton.waitFor({ state: 'visible' })
  await planningButton.click()
  const planning = page.locator('.planning-workspace:visible')
  await planning.waitFor({ state: 'visible' })
  await planning.getByRole('heading', {
    name: 'Organisez les mêmes tâches en liste, Kanban, Gantt ou calendrier.',
  }).waitFor()
  return planning
}

async function qualifyTablet(browser) {
  const state = makeState()
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
  })
  await installApiMock(context, state)
  const page = await context.newPage()
  const planning = await openPlanning(page, state)

  assert(
    await page.evaluate(() => navigator.maxTouchPoints > 0),
    'tablet: Chromium context must expose touch input',
  )
  await planning.getByRole('button', { name: 'Gantt', exact: true }).click()
  const gantt = planning.locator('.planning-gantt')
  await gantt.waitFor({ state: 'visible' })
  await gantt.getByText(`◆ ${state.task.title}`, { exact: true }).waitFor({ state: 'visible' })
  const canvas = await gantt.locator('.planning-gantt-canvas').boundingBox()
  assert(canvas && canvas.width >= 300 && canvas.height >= 240, 'tablet: Gantt canvas is not usable')
  assert.equal(
    await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1),
    true,
    'tablet: planning must not force document-level horizontal overflow',
  )

  // Touch drag is optional input, never the only way to change a date.
  await planning.getByRole('button', { name: 'Liste', exact: true }).click()
  const editButton = planning.getByRole('button', { name: 'Modifier le créneau', exact: true }).first()
  await editButton.waitFor({ state: 'visible' })
  const editBox = await editButton.boundingBox()
  assert(editBox && editBox.height >= 36, 'tablet: non-drag schedule edit control is not touchable')

  await page.screenshot({
    path: path.join(outputDirectory, 'nevolium-d06-tablet-gantt.png'),
    fullPage: false,
  })
  await context.close()
  return {
    scenario: 'tablet-gantt',
    touch: true,
    planningReads: state.planningReads,
    ganttCanvas: canvas,
  }
}

async function qualifyPhone(browser) {
  const state = makeState()
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
  })
  await installApiMock(context, state)
  const page = await context.newPage()
  const planning = await openPlanning(page, state)

  assert(
    await page.evaluate(() => navigator.maxTouchPoints > 0),
    'phone: Chromium context must expose touch input',
  )
  await planning.getByRole('button', { name: 'Calendrier', exact: true }).click()
  const calendar = planning.locator('.planning-calendar')
  await calendar.waitFor({ state: 'visible' })
  await calendar.locator('.planning-calendar-agenda').waitFor({ state: 'visible' })
  const eventButton = calendar.getByTitle(state.task.title).first()
  await eventButton.waitFor({ state: 'visible' })
  await eventButton.click()

  const editor = planning.locator('.planning-schedule-editor')
  await editor.waitFor({ state: 'visible' })
  await editor.getByRole('heading', { name: state.task.title, exact: true }).waitFor()
  const inputs = editor.locator('input[type="datetime-local"]')
  assert.equal(await inputs.count(), 3, 'phone: schedule editor must expose start/end/due controls')
  const initialStart = await inputs.nth(0).inputValue()
  const initialEnd = await inputs.nth(1).inputValue()
  const shiftedStart = shiftLocalInput(initialStart, 60)
  const shiftedEnd = shiftLocalInput(initialEnd, 60)
  await inputs.nth(0).fill(shiftedStart)
  await inputs.nth(1).fill(shiftedEnd)

  await editor.getByRole('button', { name: 'Prévisualiser', exact: true }).click()
  await editor.getByText('Aperçu valide', { exact: true }).waitFor({ state: 'visible' })
  assert.equal(state.previewReads, 1, 'phone: schedule change must go through preview')
  const readsBeforeApply = state.planningReads
  await editor.getByRole('button', { name: 'Appliquer', exact: true }).click()
  await editor.waitFor({ state: 'hidden' })
  await eventually(
    () => state.planningReads > readsBeforeApply,
    'phone: successful apply did not reload canonical planning projection',
  )
  assert.equal(state.applyReads, 1, 'phone: exactly one explicit replan apply is expected')
  assert.equal(state.task.planning_version, 2, 'phone: apply must advance canonical planning version')
  assert.equal(
    new Date(state.task.planned_start_at).getTime() - new Date(`${initialStart}:00+02:00`).getTime(),
    60 * 60 * 1000,
    'phone: canonical start did not move by one hour',
  )

  // Re-open calendar after the canonical reload: the same task must still be visible from the
  // canonical projection, then Today must expose the exact updated schedule.
  await planning.getByRole('button', { name: 'Calendrier', exact: true }).click()
  await planning.locator('.planning-calendar').getByTitle(state.task.title).first().waitFor({ state: 'visible' })

  const todayButton = page.locator('.cockpit-panel-buttons').getByRole('button', {
    name: 'Aujourd’hui',
    exact: true,
  })
  await todayButton.click()
  const today = page.locator('.news-workspace:visible').filter({
    has: page.getByRole('heading', { name: 'Retrouvez ce que vous souhaitez faire aujourd’hui.' }),
  })
  await today.getByText(state.task.title, { exact: true }).waitFor({ state: 'visible' })
  await eventually(() => state.todayReads > 0, 'phone: Today did not reload canonical task state')
  const todayCard = today.locator('.source-card').filter({ hasText: state.task.title })
  const expectedStart = await page.evaluate(
    (value) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)),
    state.task.planned_start_at,
  )
  assert(
    (await todayCard.textContent())?.includes(expectedStart),
    'phone: Today does not display the schedule applied from Planning',
  )

  const widthState = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert(
    widthState.scrollWidth <= widthState.innerWidth + 1,
    `phone: document-level horizontal overflow ${widthState.scrollWidth}/${widthState.innerWidth}`,
  )
  await page.screenshot({
    path: path.join(outputDirectory, 'nevolium-d06-phone-today-after-replan.png'),
    fullPage: false,
  })
  await context.close()
  return {
    scenario: 'phone-calendar-replan-today',
    touch: true,
    previewReads: state.previewReads,
    applyReads: state.applyReads,
    planningReads: state.planningReads,
    todayReads: state.todayReads,
    planningVersion: state.task.planning_version,
    widthState,
  }
}

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({
    headless: true,
    ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
  })
  const results = [
    await qualifyTablet(browser),
    await qualifyPhone(browser),
  ]
  await fs.writeFile(
    path.join(outputDirectory, 'qualification.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  )
  console.log(JSON.stringify(results, null, 2))
  console.log(
    'D06 PLANNING BROWSER PASS: touch tablet exposes the real Gantt plus a non-drag date editor; '
      + 'phone calendar editing goes through preview/apply, reloads the canonical planning projection, '
      + 'and Today displays the same updated schedule.',
  )
} catch (error) {
  const diagnostic = error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`
  await fs.writeFile(path.join(outputDirectory, 'failure.txt'), diagnostic)
  throw error
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
