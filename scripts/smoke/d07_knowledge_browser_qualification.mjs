import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'artifacts/d07-knowledge-browser')
const previewOrigin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'
const playwrightModule = process.env.NEVOLIUM_PLAYWRIGHT_MODULE
const chromiumExecutable = process.env.NEVOLIUM_CHROMIUM_EXECUTABLE
let diagnosticPage = null
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
const ids = { p1: 'd07-project-main', p2: 'd07-project-other', cross: 'd07-cross-document' }

function documentRow(id, projectId, title, kind = 'note', epistemic = null) {
  return { id, asset_id: null, project_id: projectId, title,
    media_type: 'application/vnd.nevolium.knowledge+json', source_sha256: null,
    status: 'ready', kind, epistemic_status: epistemic,
    metadata_json: { owner_subject: 'd07-browser', authored: true }, created_at: now, updated_at: now }
}

function versionRow(documentId, generation, text, contentJson = {}, searchStatus = 'ready') {
  return { id: `${documentId}-v${generation}`, document_id: documentId, generation, task_id: null,
    parser: 'nevolium-authored', parser_version: '1', source_sha256: null, status: 'completed',
    chunk_count: text ? 1 : 0, content_json: contentJson, content_text: text,
    content_sha256: 'a'.repeat(64), search_status: searchStatus, search_error: null,
    metadata_json: { authored: true }, last_error: null, created_at: now, completed_at: now }
}

function chunkFor(version) {
  if (!version.content_text) return []
  return [{ id: `${version.id}-chunk-0`, document_version_id: version.id, ordinal: 0,
    text: version.content_text, content_sha256: 'b'.repeat(64),
    metadata_json: { projection: 'authored-text' }, created_at: now }]
}

function makeState() {
  const cross = documentRow(ids.cross, ids.p2, 'Connaissance autre espace', 'note', 'supported')
  const crossVersion = versionRow(cross.id, 1, 'Preuve autre espace architecture distribuée.')
  return {
    projects: [
      { id: ids.p1, name: 'Projet D07', status: 'active', summary: 'Qualification D07', parent_id: null, created_at: now, updated_at: now },
      { id: ids.p2, name: 'Autre espace D07', status: 'active', summary: 'Recherche universelle', parent_id: null, created_at: now, updated_at: now },
    ],
    documents: [cross],
    versions: new Map([[cross.id, [crossVersion]]]),
    citations: new Map([[crossVersion.id, []]]),
    layouts: new Map(),
    createdId: null,
    saveCount: 0,
    restoreCount: 0,
    globalSearchCount: 0,
    chunkWindowReads: 0,
  }
}

function json(route, value, status = 200) {
  return route.fulfill({ status, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(value) })
}

function latest(state, documentId) {
  return [...(state.versions.get(documentId) || [])].sort((a, b) => b.generation - a.generation)[0] || null
}

function authoredRead(document, version) {
  return { id: document.id, project_id: document.project_id, title: document.title, kind: document.kind,
    epistemic_status: document.epistemic_status, status: document.status, generation: version.generation,
    version }
}

async function installApiMock(context, state) {
  await context.route(`${apiOrigin}/v1/**`, async route => {
    const request = route.request(); const url = new URL(request.url()); const p = url.pathname
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
    } })
    if (p.startsWith('/v1/ui/workspaces/') && p.endsWith('/layout')) {
      const key = decodeURIComponent(p.split('/').at(-2))
      if (request.method() === 'PUT') { const body = request.postDataJSON(); state.layouts.set(key, body); return json(route, body) }
      return state.layouts.has(key) ? json(route, state.layouts.get(key)) : json(route, {}, 404)
    }
    if (p === '/v1/projects') return json(route, state.projects)
    if (p.startsWith('/v1/projects/') && !p.includes('/planning/') && !p.endsWith('/task-dependencies')) {
      const project = state.projects.find(item => item.id === p.split('/')[3]); if (project) return json(route, project)
    }
    if (p === '/v1/tasks') return json(route, [])
    if (p === '/v1/relationships') return json(route, [])
    if (p === '/v1/today') return json(route, { day: url.searchParams.get('day'), timezone: url.searchParams.get('timezone'),
      overdue: [], in_progress: [], due_today: [], planned: [], completed_today: [], backlog: [], next_cursors: {} })
    if (p === '/v1/admin/model-configurations') return json(route, { active_calls: 0, allowed_providers: ['openai'],
      active: { id: null, source: 'environment', provider: 'openai', model_name: 'openai/gpt-4.1', model_alias: 'smart',
        status: 'active', connection_state: 'bootstrap', test_cost_usd: '0', test_cost_reported: false }, candidates: [] })
    if (p.endsWith('/planning/tasks') || p.endsWith('/task-dependencies') || p.endsWith('/planning/occurrences')) return json(route, [])
    if (p.endsWith('/planning/critical-path')) return json(route, { project_id: p.split('/')[3], basis: 'elapsed_seconds',
      network_complete: true, project_duration_seconds: 0, project_task_count: 0, eligible_task_count: 0,
      dependency_count: 0, critical_task_ids: [], critical_dependency_ids: [], excluded_task_ids: [],
      excluded_dependency_ids: [], tasks: [] })

    if (p === '/v1/documents' && request.method() === 'GET') {
      const projectId = url.searchParams.get('project_id')
      return json(route, state.documents.filter(item => !projectId || item.project_id === projectId))
    }
    const documentMatch = p.match(/^\/v1\/documents\/([^/]+)$/)
    if (documentMatch && request.method() === 'GET') {
      const doc = state.documents.find(item => item.id === documentMatch[1]); return doc ? json(route, doc) : json(route, { detail: 'Document not found' }, 404)
    }
    const versionsMatch = p.match(/^\/v1\/documents\/([^/]+)\/versions$/)
    if (versionsMatch && request.method() === 'GET') return json(route, [...(state.versions.get(versionsMatch[1]) || [])].sort((a, b) => b.generation - a.generation))
    const versionMatch = p.match(/^\/v1\/document-versions\/([^/]+)$/)
    if (versionMatch) {
      const version = [...state.versions.values()].flat().find(item => item.id === versionMatch[1]); return version ? json(route, version) : json(route, { detail: 'Version not found' }, 404)
    }
    const chunksMatch = p.match(/^\/v1\/document-versions\/([^/]+)\/chunks$/)
    if (chunksMatch) {
      const version = [...state.versions.values()].flat().find(item => item.id === chunksMatch[1]); return json(route, version ? chunkFor(version) : [])
    }
    const citationMatch = p.match(/^\/v1\/knowledge\/versions\/([^/]+)\/citations$/)
    if (citationMatch) return json(route, state.citations.get(citationMatch[1]) || [])

    if (p === '/v1/knowledge/items' && request.method() === 'POST') {
      const body = request.postDataJSON(); const id = `d07-created-${state.documents.length}`
      const doc = documentRow(id, body.project_id, body.title, body.kind, body.epistemic_status)
      const version = versionRow(id, 1, body.content_text || '', body.content_json || {})
      state.documents.unshift(doc); state.versions.set(id, [version]); state.citations.set(version.id, body.citations || [])
      state.createdId = id
      return json(route, authoredRead(doc, version), 201)
    }
    const saveMatch = p.match(/^\/v1\/knowledge\/items\/([^/]+)\/versions$/)
    if (saveMatch && request.method() === 'POST') {
      const id = saveMatch[1]; const body = request.postDataJSON(); const current = latest(state, id)
      assert.equal(body.expected_generation, current.generation)
      const version = versionRow(id, current.generation + 1, body.content_text || '', body.content_json || {})
      state.versions.set(id, [version, ...(state.versions.get(id) || [])])
      state.citations.set(version.id, (body.citations || []).map((citation, index) => ({
        id: `${version.id}-citation-${index}`, document_version_id: version.id, created_at: now, ...citation,
      })))
      state.saveCount += 1
      const doc = state.documents.find(item => item.id === id)
      return json(route, authoredRead(doc, version), 201)
    }
    const restoreMatch = p.match(/^\/v1\/knowledge\/items\/([^/]+)\/versions\/([^/]+)\/restore$/)
    if (restoreMatch && request.method() === 'POST') {
      const [, id, versionId] = restoreMatch; const body = request.postDataJSON(); const current = latest(state, id)
      assert.equal(body.expected_generation, current.generation)
      const source = (state.versions.get(id) || []).find(item => item.id === versionId); assert(source)
      const version = versionRow(id, current.generation + 1, source.content_text || '', source.content_json || {})
      state.versions.set(id, [version, ...(state.versions.get(id) || [])]); state.citations.set(version.id, state.citations.get(source.id) || [])
      state.restoreCount += 1
      const doc = state.documents.find(item => item.id === id)
      return json(route, authoredRead(doc, version), 201)
    }
    if (p === '/v1/knowledge/search' && request.method() === 'GET') {
      if (!url.searchParams.has('project_id')) state.globalSearchCount += 1
      const query = (url.searchParams.get('q') || '').toLocaleLowerCase(); const projectId = url.searchParams.get('project_id')
      const rows = []
      for (const doc of state.documents) {
        if (projectId && doc.project_id !== projectId) continue
        const version = latest(state, doc.id); if (!version || version.search_status !== 'ready') continue
        const haystack = `${doc.title} ${version.content_text || ''}`.toLocaleLowerCase()
        if (!query.split(/\s+/).every(term => haystack.includes(term))) continue
        const chunk = chunkFor(version)[0]; if (!chunk) continue
        rows.push({ document_id: doc.id, document_project_id: doc.project_id, document_title: doc.title,
          document_version_id: version.id, generation: version.generation, chunk_id: chunk.id, ordinal: 0,
          excerpt: chunk.text, content_sha256: chunk.content_sha256, rank: 1 })
      }
      return json(route, rows)
    }
    if (p === '/v1/knowledge/chunk-window') {
      state.chunkWindowReads += 1
      const versionId = url.searchParams.get('version_id'); const version = [...state.versions.values()].flat().find(item => item.id === versionId)
      const chunks = version ? chunkFor(version) : []; const anchor = url.searchParams.get('chunk_id')
      return json(route, { project_id: url.searchParams.get('project_id'), document_id: url.searchParams.get('document_id'),
        document_version_id: versionId, anchor_chunk_id: anchor, offset: 0, total: chunks.length, chunks })
    }
    if (p.includes('/export') && request.method() === 'GET') return json(route, { format: url.searchParams.get('format'),
      media_type: 'application/json', filename: 'd07.nevolium.json', lossless: true, content: '{}' })
    if (p === '/v1/knowledge/import' && request.method() === 'POST') return json(route, { detail: 'not exercised' }, 422)
    return json(route, { detail: `Unhandled D07 mock endpoint: ${request.method()} ${p}` }, 404)
  })
}

async function openKnowledge(page) {
  diagnosticPage = page
  await page.goto(previewOrigin, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Nevolium', exact: true }).waitFor()
  await page.locator('.mycelium-space-node[data-space="projects"]').click()
  await page.getByRole('heading', { name: 'Donnez une forme concrète aux idées que vous choisissez de construire.' }).waitFor()
  await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Documents', exact: true }).click()
  await page.getByRole('heading', { name: 'Nouvelle idée' }).waitFor()
  return page.locator('.knowledge-editor-shell:visible')
}

async function qualifyDesktop(browser, state) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR',
    timezoneId: 'Europe/Paris', colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' })
  await installApiMock(context, state)
  const page = await context.newPage(); const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const editor = await openKnowledge(page)

  assert.equal(await page.locator('.context-navigator:visible').count(), 0, 'Context tools must be optional')
  assert.equal(await editor.locator('.knowledge-create-row:visible').count(), 0, 'Advanced capture fields must start collapsed')
  await editor.getByLabel('Titre', { exact: true }).first().fill('Idée simple')
  await editor.getByLabel('Votre idée', { exact: true }).fill('Une idée enregistrée sans choisir un type ou un statut.')
  await editor.locator('.knowledge-capture').screenshot({ path: path.join(output, 'guided-idea-fr.png') })
  await editor.getByRole('button', { name: 'Enregistrer l’idée', exact: true }).click()
  await eventually(() => Boolean(state.createdId), 'Simple idea capture was not submitted')
  const simpleIdeaId = state.createdId
  assert.equal(state.documents.find(item => item.id === simpleIdeaId).kind, 'idea')
  assert.equal(state.documents.find(item => item.id === simpleIdeaId).epistemic_status, null)
  assert.equal(latest(state, simpleIdeaId).content_text, 'Une idée enregistrée sans choisir un type ou un statut.')
  await editor.locator('[contenteditable="true"]').waitFor({ state: 'visible' })
  await editor.getByLabel('Titre', { exact: true }).first().fill('Décision navigateur D07')
  await editor.getByLabel('Votre idée', { exact: true }).fill('Contenu capturé dès la création.')
  await editor.getByText('Type et statut — facultatifs', { exact: true }).click()
  await editor.locator('.knowledge-create-row select').nth(0).selectOption('decision')
  await editor.locator('.knowledge-create-row select').nth(1).selectOption('supported')
  await editor.getByRole('button', { name: 'Créer et ouvrir', exact: true }).click()
  await eventually(() => Boolean(state.createdId) && state.createdId !== simpleIdeaId, 'D07: authored item was not created')
  await editor.getByRole('heading', { name: /^Décision navigateur D07/ }).waitFor()
  await editor.locator('[contenteditable="true"]').waitFor({ state: 'visible' })
  assert.equal(latest(state, state.createdId).content_text, 'Contenu capturé dès la création.', 'Initial content must be persisted in the create request')
  await editor.getByText('Sources et export', { exact: true }).click()
  await editor.locator('[contenteditable="true"]').fill('Décision D07 avec provenance vérifiable.')
  await editor.getByLabel('URL de la source').fill('https://example.com/source-d07')
  await editor.getByLabel('Libellé').fill('Source D07')
  await editor.getByRole('button', { name: 'Ajouter la citation', exact: true }).click()
  await editor.evaluate(element => { window.__d09CaptureBeforeSave = element })
  await editor.getByLabel('Titre', { exact: true }).first().fill('Brouillon suivant conservé')
  await editor.getByLabel('Votre idée', { exact: true }).fill('Cette saisie ne doit pas disparaître pendant la sauvegarde du document ouvert.')
  await editor.getByRole('button', { name: 'Enregistrer une nouvelle version', exact: true }).click()
  await eventually(() => state.saveCount === 1 && latest(state, state.createdId)?.generation === 2,
    'D07: new canonical generation was not saved')
  const saved = latest(state, state.createdId)
  assert(saved.content_json?.root, 'D07: Lexical EditorState JSON was not sent')
  assert.match(saved.content_text, /Décision D07 avec provenance/)
  assert.equal((state.citations.get(saved.id) || []).length, 1, 'D07: citation was not version-bound')
  await editor.getByRole('heading', { name: 'Décision navigateur D07 v2', exact: true }).waitFor()
  assert.equal(await editor.evaluate(element => element === window.__d09CaptureBeforeSave), true,
    'Saving must not remount the capture form or collapse the open source tools')
  assert.equal(await editor.getByLabel('Titre', { exact: true }).first().inputValue(), 'Brouillon suivant conservé')

  await editor.getByRole('button', { name: 'Restaurer la version sélectionnée', exact: true }).waitFor({ state: 'visible' })
  await editor.getByRole('button', { name: 'Restaurer la version sélectionnée', exact: true }).click()
  await eventually(() => state.restoreCount === 1 && latest(state, state.createdId)?.generation === 3,
    'D07: restore did not create a new generation')

  await page.locator('.knowledge-search-disclosure > summary').click()
  const search = page.locator('section[aria-labelledby="knowledge-search-heading"]:visible')
  await search.getByLabel('Recherche').fill('autre espace architecture')
  await search.getByRole('button', { name: 'Rechercher', exact: true }).click()
  await search.getByText('Connaissance autre espace', { exact: true }).waitFor({ state: 'visible' })
  assert(state.globalSearchCount > 0, 'D07: search unexpectedly required a project scope')
  await search.getByRole('button', { name: 'Inspecter ce passage', exact: true }).click()
  await eventually(() => state.chunkWindowReads > 0, 'D07: cross-project inspection did not load its chunk')
  await page.getByText('Connaissance autre espace', { exact: true }).last().waitFor({ state: 'visible' })

  await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.getByRole('heading', { name: 'New idea' }).waitFor()
  await page.getByRole('heading', { name: 'Find knowledge across all your spaces.' }).waitFor()
  await page.getByRole('button', { name: 'Home', exact: true }).waitFor()
  await page.getByText('Workspace options', { exact: true }).click()
  await page.getByRole('button', { name: 'Links and context', exact: true }).click()
  await page.locator('.context-navigator').getByLabel('Your context', { exact: true }).waitFor()
  assert.equal(await page.getByText('Votre contexte', { exact: true }).count(), 0)
  assert.equal(await page.getByText('Sources et versions du projet sélectionné.', { exact: true }).count(), 0)
  await page.screenshot({ path: path.join(output, 'd07-desktop-editor-search-en.png'), fullPage: false })
  assert.deepEqual(errors, [], `D07 desktop page errors: ${errors.join(' | ')}`)
  await context.close()
  return { created: true, guidedIdeaCapture: true, savedGeneration: 2, restoredGeneration: 3, crossSpace: true, bilingual: true }
}

async function qualifyPhone(browser, state) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR',
    timezoneId: 'Europe/Paris', colorScheme: 'dark', reducedMotion: 'reduce', hasTouch: true,
    isMobile: true, serviceWorkers: 'block' })
  await installApiMock(context, state)
  const page = await context.newPage(); const editor = await openKnowledge(page)
  await editor.locator('[contenteditable="true"]').waitFor({ state: 'visible' })
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  assert(dimensions.scrollWidth <= dimensions.width + 1, 'D07 phone: horizontal overflow')
  const content = await editor.locator('[contenteditable="true"]').boundingBox()
  assert(content && content.width >= 250 && content.height >= 160, 'D07 phone: editor surface too small')
  const save = editor.getByRole('button', { name: 'Enregistrer une nouvelle version', exact: true })
  const saveBox = await save.boundingBox(); assert(saveBox && saveBox.height >= 40, 'D07 phone: save target too small')
  await page.screenshot({ path: path.join(output, 'd07-phone-editor.png'), fullPage: false })
  await context.close()
  return { touch: true, noHorizontalOverflow: true, editorUsable: true }
}

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({ headless: true, ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}) })
  const state = makeState()
  const desktop = await qualifyDesktop(browser, state)
  const phone = await qualifyPhone(browser, state)
  const evidence = { desktop, phone, api: { saveCount: state.saveCount, restoreCount: state.restoreCount,
    globalSearchCount: state.globalSearchCount, chunkWindowReads: state.chunkWindowReads } }
  await fs.writeFile(path.join(output, 'qualification.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log('D07 KNOWLEDGE BROWSER PASS:', JSON.stringify(evidence))
} catch (error) {
  if (diagnosticPage && !diagnosticPage.isClosed()) {
    await diagnosticPage.screenshot({ path: path.join(output, 'failure.png'), timeout: 5000 }).catch(() => {})
  }
  const diagnostic = error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`
  await fs.writeFile(path.join(output, 'failure.txt'), diagnostic)
  throw error
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
