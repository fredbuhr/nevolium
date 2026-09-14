import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outputDirectory = path.join(repositoryRoot, 'artifacts/d05-browser')
const previewOrigin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'
const playwrightModule = process.env.NEVOLIUM_PLAYWRIGHT_MODULE

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
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk.toString()
})
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk.toString()
})

async function waitForPreview() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) {
      throw new Error(`Vite preview stopped before qualification.\n${previewOutput}`)
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

const savedLayouts = new Map()
const results = []

function json(route, value, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(value),
  })
}

async function installApiMock(context) {
  await context.route(`${apiOrigin}/v1/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,PUT,POST,PATCH,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      })
    }
    if (url.pathname.startsWith('/v1/ui/workspaces/') && url.pathname.endsWith('/layout')) {
      const workspaceKey = decodeURIComponent(url.pathname.split('/').at(-2))
      if (request.method() === 'PUT') {
        savedLayouts.set(workspaceKey, request.postDataJSON())
        return json(route, request.postDataJSON())
      }
      return savedLayouts.has(workspaceKey)
        ? json(route, savedLayouts.get(workspaceKey))
        : json(route, {}, 404)
    }
    if (url.pathname === '/v1/projects' || url.pathname === '/v1/tasks') return json(route, [])
    if (url.pathname === '/v1/today') {
      return json(route, {
        day: url.searchParams.get('day'),
        timezone: url.searchParams.get('timezone'),
        overdue: [],
        in_progress: [],
        due_today: [],
        planned: [],
        completed_today: [],
        backlog: [],
        next_cursors: {},
      })
    }
    if (url.pathname === '/v1/admin/model-configurations') {
      return json(route, {
        active_calls: 0,
        allowed_providers: ['openai', 'anthropic', 'xai', 'moonshot'],
        active: {
          id: null,
          source: 'environment',
          provider: 'openai',
          model_name: 'openai/gpt-4.1',
          model_alias: 'smart',
          status: 'active',
          connection_state: 'bootstrap',
          test_cost_usd: '0',
          test_cost_reported: false,
        },
        candidates: [],
      })
    }
    return json(route, { detail: 'Endpoint absent du scénario visuel D05' }, 404)
  })
}

async function qualify(browser, name, viewport, { detach = false, inspectAdmin = false } = {}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'dark',
    locale: 'fr-FR',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })
  await installApiMock(context)
  const page = await context.newPage()
  const consoleErrors = []
  const errorResponses = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errorResponses.push({ status: response.status(), url: response.url() })
    }
  })

  await page.goto(previewOrigin, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Nevolium', exact: true }).waitFor()
  const expectedDeviceLabel = viewport.width < 640 ? 'Téléphone' : viewport.width < 1024 ? 'Tablette' : 'Bureau'
  const deviceLabel = page.getByText(expectedDeviceLabel, { exact: true })
  await deviceLabel.waitFor({ state: 'attached' })
  assert.equal(
    await deviceLabel.isVisible(),
    name !== 'phone',
    `${name}: visibilité inattendue de la classe d’appareil`,
  )
  const privateLayoutLabel = page.getByText('Disposition privée', { exact: true })
  await privateLayoutLabel.waitFor({ state: 'attached' })
  assert.equal(
    await privateLayoutLabel.isVisible(),
    name !== 'phone',
    `${name}: visibilité inattendue du libellé de disposition`,
  )

  const quickAccess = page.getByRole('button', { name: /Accès rapide/ })
  await quickAccess.focus()
  await page.keyboard.press('Control+K')
  await page.getByRole('dialog', { name: 'Ouvrir un espace' }).waitFor()
  await page.getByRole('searchbox', { name: 'Rechercher un espace' }).fill('documents')
  await page.getByRole('option', { name: /Inspecteur/ }).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0, `${name}: la palette doit se fermer`)
  await page.waitForFunction(() => document.activeElement?.classList.contains('quick-access-button'))
  assert(
    await quickAccess.evaluate((node) => node === document.activeElement),
    `${name}: le focus doit revenir à l’accès rapide`,
  )

  const detachCount = await page.getByRole('button', { name: 'Détacher', exact: true }).count()
  assert.equal(detachCount, name === 'phone' ? 0 : 1, `${name}: action Détacher inattendue`)

  const screenshotPath = path.join(outputDirectory, `nevolium-d05-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  let popoutPath = null
  if (detach) {
    await page.getByRole('button', { name: 'Assistant', exact: true }).click()
    const popoutPromise = context.waitForEvent('page')
    await page.getByRole('button', { name: 'Détacher', exact: true }).click()
    const popout = await popoutPromise
    await popout.waitForLoadState('domcontentloaded')
    popoutPath = new URL(popout.url()).pathname
    assert.equal(popoutPath, '/popout.html', 'desktop: la fenêtre détachée doit utiliser popout.html')
    await popout.close()
  }

  if (inspectAdmin) {
    await page.getByRole('button', { name: 'Réglages API', exact: true }).click()
    await page.getByRole('heading', { name: 'Modèle et fournisseur IA' }).waitFor()
    const provider = page.getByLabel('Fournisseur')
    assert.deepEqual(
      await provider.locator('option').evaluateAll((options) =>
        options.map((option) => ({ label: option.textContent, value: option.value })),
      ),
      [
        { label: 'OpenAI', value: 'openai' },
        { label: 'Claude / Anthropic', value: 'anthropic' },
        { label: 'Grok / xAI', value: 'xai' },
        { label: 'Kimi / Moonshot', value: 'moonshot' },
      ],
    )
    assert.equal(await page.getByLabel('Clé API').getAttribute('type'), 'password')
    await page.getByText(/exemples non qualifiés/).waitFor()
    await page.screenshot({
      path: path.join(outputDirectory, 'nevolium-d05-desktop-admin.png'),
      fullPage: true,
    })
  }

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  assert(
    dimensions.scrollWidth <= dimensions.innerWidth + 1,
    `${name}: débordement horizontal ${dimensions.scrollWidth}/${dimensions.innerWidth}`,
  )
  assert.equal(await page.locator('canvas').count(), 0, `${name}: le cockpit de base ne doit pas exiger WebGL`)
  const unexpectedResponses = errorResponses.filter((response) => {
    const url = new URL(response.url)
    return response.status !== 404 || !url.pathname.startsWith('/v1/ui/workspaces/') || !url.pathname.endsWith('/layout')
  })
  assert.deepEqual(
    unexpectedResponses,
    [],
    `${name}: ressources en erreur: ${JSON.stringify(unexpectedResponses)}`,
  )
  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !message.includes('status of 404 (Not Found)'),
  )
  assert.deepEqual(
    unexpectedConsoleErrors,
    [],
    `${name}: erreurs console: ${unexpectedConsoleErrors.join(' | ')}`,
  )

  results.push({ name, viewport, dimensions, detachCount, popoutPath, consoleErrors, errorResponses })
  await context.close()
}

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({ headless: true })
  await qualify(browser, 'desktop', { width: 1440, height: 1000 }, { detach: true })
  await qualify(browser, 'desktop-admin', { width: 1440, height: 1000 }, {
    inspectAdmin: true,
  })
  await qualify(browser, 'compact-desktop', { width: 1024, height: 768 })
  await qualify(browser, 'tablet', { width: 820, height: 1180 })
  await qualify(browser, 'phone', { width: 390, height: 844 })
  await fs.writeFile(
    path.join(outputDirectory, 'qualification.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  )
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  const diagnostic = error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`
  await fs.writeFile(path.join(outputDirectory, 'failure.txt'), diagnostic)
  throw error
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
