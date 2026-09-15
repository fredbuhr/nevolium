import assert from 'node:assert/strict'
import path from 'node:path'

const previewOrigin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'

function json(route, value, status = 200, headers = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', ...headers },
    body: JSON.stringify(value),
  })
}

function planningTask(task) {
  return {
    ...task,
    parent_task_id: null,
    kind: 'task',
    progress_percent: 0,
    planning_version: task.planning_version || 1,
    recurrence_rule: null,
    recurrence_timezone: null,
  }
}

function makeTask(projectId, id, title) {
  const now = new Date().toISOString()
  return {
    id,
    project_id: projectId,
    title,
    description: null,
    status: 'todo',
    owner_type: 'user',
    owner_ref: 'development-user',
    authority_ceiling: 1,
    budget_usd: null,
    input: {},
    priority: 2,
    planned_start_at: null,
    planned_end_at: null,
    due_at: null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    planning_version: 1,
  }
}

function makeNode(projectId, key, type, id, label, kind, status = 'ready', epistemic = null) {
  return {
    key,
    entity_type: type,
    entity_id: id,
    project_id: projectId,
    label,
    kind,
    status,
    epistemic_status: epistemic,
    priority: type === 'task' ? 2 : null,
  }
}

function makeEdge(projectId, id, sourceKey, targetKey, relation, metadata = {}) {
  const [sourceType, sourceId] = sourceKey.split(':')
  const [targetType, targetId] = targetKey.split(':')
  return {
    id,
    source_key: sourceKey,
    target_key: targetKey,
    source_type: sourceType,
    source_id: sourceId,
    relation_type: relation,
    target_type: targetType,
    target_id: targetId,
    directed: true,
    metadata_json: metadata,
    created_at: new Date().toISOString(),
  }
}

async function qualifyFreshDeepLink(harness) {
  const { browser, makeState, casePage, eventually, ids, setStage } = harness
  const state = makeState()
  const { context, page, errors } = await casePage(browser, state, 'fresh-deep-link', {
    viewport: { width: 1280, height: 860 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })

  await context.route(`${apiOrigin}/v1/documents/${ids.idea}`, async route => {
    if (route.request().method() !== 'GET') return route.fallback()
    return json(route, {
      id: ids.idea,
      project_id: ids.project,
      title: 'Idée navigateur D08',
      kind: 'idea',
      status: 'ready',
      epistemic_status: 'supported',
      asset_id: null,
      media_type: 'application/vnd.nevolium.knowledge+json',
      source_sha256: null,
      metadata_json: { owner_subject: 'development-user', authored: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  })

  setStage('exit:fresh-deep-link')
  await page.goto(`${previewOrigin}/?mindmap=${encodeURIComponent(`document:${ids.idea}`)}`, {
    waitUntil: 'networkidle',
  })
  const map = page.locator('.mindmap-workspace:visible')
  await map.getByRole('heading', { name: 'Carte mentale', exact: true }).waitFor()
  await eventually(() => state.mindmapReads > 0, 'D08: fresh deep link never loaded the mindmap snapshot')
  await map.locator(`.react-flow__node[data-id="document:${ids.idea}"]`).waitFor()
  assert.equal(await map.getAttribute('data-project-id'), ids.project)
  assert.equal(await map.locator(`.react-flow__node[data-id="document:${ids.idea}"].selected`).count(), 1)
  assert.equal(
    await page.locator('.cockpit-panel-buttons button[aria-current="page"]').textContent(),
    'Carte mentale',
  )
  assert.equal(new URL(page.url()).searchParams.get('mindmap'), `document:${ids.idea}`)
  assert.deepEqual(errors, [])
  await context.close()
  return true
}

async function qualifyIdeaBranchToGantt(harness) {
  const { browser, makeState, casePage, openMindMap, selectOnlyNode, eventually, ids, output, setStage } = harness
  const state = makeState()
  const secondIdea = 'd08-idea-branch-b'
  const firstTask = 'd08-branch-task-a'
  const secondTask = 'd08-branch-task-b'
  const firstTitle = 'Idée navigateur D08'
  const secondTitle = 'Idée branche D08'

  state.nodes.push(makeNode(
    ids.project,
    `document:${secondIdea}`,
    'document',
    secondIdea,
    secondTitle,
    'idea',
    'ready',
    'supported',
  ))
  state.edges.push(makeEdge(
    ids.project,
    'd08-branch-edge',
    `document:${ids.idea}`,
    `document:${secondIdea}`,
    'derived_from',
  ))

  const { context, page, errors } = await casePage(browser, state, 'branch-gantt', {
    viewport: { width: 1360, height: 940 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })

  const convertedByIdea = new Map([
    [ids.idea, firstTask],
    [secondIdea, secondTask],
  ])

  await context.route(
    `${apiOrigin}/v1/projects/${ids.project}/mindmap/ideas/*/convert-to-task`,
    async route => {
      if (route.request().method() !== 'POST') return route.fallback()
      const documentId = new URL(route.request().url()).pathname.split('/').at(-2)
      const taskId = convertedByIdea.get(documentId)
      assert(taskId, `unexpected D08 idea conversion ${documentId}`)
      const source = state.nodes.find(item => item.entity_id === documentId && item.kind === 'idea')
      assert(source)
      if (state.edges.some(item => item.source_key === `document:${documentId}` && item.relation_type === 'converted_to')) {
        return json(route, { detail: 'Idea is already converted to a task' }, 409)
      }
      const created = makeTask(ids.project, taskId, source.label)
      state.tasks.unshift(created)
      state.nodes.push(makeNode(ids.project, `task:${taskId}`, 'task', taskId, source.label, 'task', 'todo'))
      const provenance = makeEdge(
        ids.project,
        `d08-converted-${taskId}`,
        `document:${documentId}`,
        `task:${taskId}`,
        'converted_to',
        { surface: 'mindmap', project_id: ids.project, conversion: true },
      )
      state.edges.unshift(provenance)
      state.conversions += 1
      return json(route, {
        document_id: documentId,
        task_id: taskId,
        task_title: source.label,
        relationship: provenance,
      }, 201)
    },
  )

  await context.route(`${apiOrigin}/v1/projects/${ids.project}/planning/tasks`, async route => {
    if (route.request().method() !== 'GET') return route.fallback()
    state.planningReads += 1
    return json(route, state.tasks.map(planningTask), 200, { 'x-nevolium-next-cursor': '' })
  })

  const digest = 'd'.repeat(64)
  await context.route(`${apiOrigin}/v1/projects/${ids.project}/planning/replan/preview`, async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    const update = route.request().postDataJSON().updates[0]
    const current = state.tasks.find(item => item.id === update.task_id)
    assert(current)
    const proposed = {
      planned_start_at: Object.prototype.hasOwnProperty.call(update, 'planned_start_at') ? update.planned_start_at : current.planned_start_at,
      planned_end_at: Object.prototype.hasOwnProperty.call(update, 'planned_end_at') ? update.planned_end_at : current.planned_end_at,
      due_at: Object.prototype.hasOwnProperty.call(update, 'due_at') ? update.due_at : current.due_at,
    }
    return json(route, {
      project_id: ids.project,
      preview_digest: digest,
      can_apply: true,
      changed_task_count: 1,
      suggested_task_count: 0,
      changes: [{
        task_id: current.id,
        current_version: current.planning_version || 1,
        expected_version: update.expected_version,
        current: {
          planned_start_at: current.planned_start_at,
          planned_end_at: current.planned_end_at,
          due_at: current.due_at,
        },
        proposed,
        changed_fields: ['planned_start_at', 'planned_end_at'],
      }],
      suggested_changes: [],
      dependency_findings: [],
    })
  })

  await context.route(`${apiOrigin}/v1/projects/${ids.project}/planning/replan/apply`, async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = route.request().postDataJSON()
    assert.equal(body.preview_digest, digest)
    const update = body.updates[0]
    const current = state.tasks.find(item => item.id === update.task_id)
    assert(current)
    assert.equal(update.expected_version, current.planning_version || 1)
    current.planned_start_at = update.planned_start_at
    current.planned_end_at = update.planned_end_at
    if (Object.prototype.hasOwnProperty.call(update, 'due_at')) current.due_at = update.due_at
    current.planning_version = (current.planning_version || 1) + 1
    current.updated_at = new Date().toISOString()
    return json(route, {
      project_id: ids.project,
      preview_digest: digest,
      updated: [{
        task_id: current.id,
        planning_version: current.planning_version,
        changed_fields: ['planned_start_at', 'planned_end_at'],
      }],
    })
  })

  setStage('exit:branch-conversion')
  let map = await openMindMap(page)
  for (const [ideaId, taskId] of [[ids.idea, firstTask], [secondIdea, secondTask]]) {
    await selectOnlyNode(map, `document:${ideaId}`)
    await map.locator('.mindmap-conversion-bar').getByRole('button').click()
    await eventually(
      () => state.edges.some(item => item.source_key === `document:${ideaId}`
        && item.target_key === `task:${taskId}` && item.relation_type === 'converted_to'),
      `D08: conversion provenance missing for ${ideaId}`,
    )
    map = page.locator('.mindmap-workspace:visible')
    await map.locator(`.react-flow__node[data-id="task:${taskId}"]`).waitFor()
  }
  assert.equal(state.conversions, 2)

  setStage('exit:branch-planning')
  await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Planification', exact: true }).click()
  const planning = page.locator('.planning-workspace:visible')
  await planning.getByText(firstTitle, { exact: true }).first().waitFor()
  await planning.getByText(secondTitle, { exact: true }).first().waitFor()

  async function plan(title, start, end) {
    const row = planning.locator('tbody tr').filter({ hasText: title })
    await row.getByRole('button', { name: 'Modifier le créneau', exact: true }).click()
    const editor = planning.locator('.planning-schedule-editor')
    await editor.waitFor({ state: 'visible' })
    await editor.locator('input[type="datetime-local"]').nth(0).fill(start)
    await editor.locator('input[type="datetime-local"]').nth(1).fill(end)
    await editor.getByRole('button', { name: 'Prévisualiser', exact: true }).click()
    await editor.getByText('Aperçu valide', { exact: true }).waitFor()
    await editor.getByRole('button', { name: 'Appliquer', exact: true }).click()
    await editor.waitFor({ state: 'hidden' })
  }

  await plan(firstTitle, '2026-09-16T09:00', '2026-09-16T10:00')
  await plan(secondTitle, '2026-09-16T10:00', '2026-09-16T11:00')

  const planned = state.tasks.filter(item => [firstTask, secondTask].includes(item.id))
  assert.equal(planned.length, 2)
  assert(planned.every(item => item.planned_start_at && item.planned_end_at && item.planning_version === 2))

  setStage('exit:branch-gantt')
  await planning.getByRole('button', { name: 'Gantt', exact: true }).click()
  const canvas = planning.locator('.planning-gantt-canvas:visible')
  await canvas.waitFor()
  await eventually(async () => {
    const text = await canvas.innerText()
    return text.includes(firstTitle) && text.includes(secondTitle)
  }, 'D08: converted and planned idea branch is not visible in the Gantt')
  assert.equal(await planning.locator('.planning-gantt-empty').count(), 0)
  await page.screenshot({ path: path.join(output, 'branch-to-gantt.png'), fullPage: true })
  assert.deepEqual(errors, [])
  await context.close()
  return { conversions: 2, plannedTasks: 2, gantt: true }
}

export async function qualifyMindMapExit(harness) {
  const deepLink = await qualifyFreshDeepLink(harness)
  const branchToGantt = await qualifyIdeaBranchToGantt(harness)
  return { deepLink, branchToGantt }
}
