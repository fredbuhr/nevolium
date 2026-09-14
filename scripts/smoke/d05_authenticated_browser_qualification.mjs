import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outputDirectory = path.join(repositoryRoot, 'artifacts/d05-authenticated-browser')
const webOrigin = process.env.NEVOLIUM_WEB_HTTP || 'http://localhost:5173'
const playwrightModule = process.env.NEVOLIUM_PLAYWRIGHT_MODULE

assert(playwrightModule, 'NEVOLIUM_PLAYWRIGHT_MODULE must point to Playwright')
const { chromium } = await import(pathToFileURL(playwrightModule).href)

await fs.mkdir(outputDirectory, { recursive: true })

async function waitForWeb() {
  const deadline = Date.now() + 90_000
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(webOrigin)
      if (response.ok) return
      lastError = new Error(`Web returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${webOrigin}: ${String(lastError)}`)
}

async function login(page, username, password) {
  await page.goto(webOrigin, { waitUntil: 'domcontentloaded' })
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await Promise.all([
    page.waitForURL(`${webOrigin}/**`, { timeout: 60_000 }),
    page.locator('#kc-login').click(),
  ])
  await page.getByRole('heading', { name: 'Nevolium', exact: true }).waitFor()
}

async function assertNoTokenPersistence(page) {
  const storedValues = await page.evaluate(() => [
    ...Object.values(localStorage),
    ...Object.values(sessionStorage),
  ])
  assert(
    storedValues.every((value) => !String(value).includes('eyJ')),
    'OIDC access tokens must not be persisted in browser storage',
  )
}

const results = []
let browser
try {
  await waitForWeb()
  browser = await chromium.launch({ headless: true })

  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    locale: 'fr-FR',
    serviceWorkers: 'block',
  })
  const adminPage = await adminContext.newPage()
  await login(adminPage, 'nevolium-dev', 'nevolium-dev')
  await adminPage.getByText('nevolium-dev', { exact: true }).waitFor()
  await adminPage.getByText('administrateur', { exact: true }).waitFor()
  await adminPage.getByRole('button', { name: 'Réglages API', exact: true }).click()
  await adminPage.getByRole('heading', { name: 'Modèle et fournisseur IA' }).waitFor()
  const activeModel = adminPage.locator('.active-model-card')
  await activeModel.waitFor({ state: 'visible' })
  assert.equal((await activeModel.locator('strong').textContent())?.trim(), 'openai/gpt-4.1')
  await activeModel.getByText('Configuration serveur', { exact: true }).waitFor()
  await adminPage.getByText('Lecture des réglages', { exact: true }).waitFor({ state: 'hidden' })
  assert.equal(await adminPage.getByLabel('Clé API').getAttribute('type'), 'password')
  await assertNoTokenPersistence(adminPage)
  await adminPage.screenshot({
    path: path.join(outputDirectory, 'nevolium-d05-authenticated-admin.png'),
    fullPage: true,
  })
  results.push({ identity: 'administrator', settingsVisible: true, activeAlias: 'smart' })
  await adminContext.close()

  const userContext = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    colorScheme: 'dark',
    locale: 'fr-FR',
    serviceWorkers: 'block',
  })
  const userPage = await userContext.newPage()
  await login(userPage, 'nevolium-dev-2', 'nevolium-dev-2')
  await userPage.getByText('nevolium-dev-2', { exact: true }).waitFor()
  await userPage.getByText('utilisateur', { exact: true }).waitFor()
  assert.equal(
    await userPage.getByRole('button', { name: 'Réglages API', exact: true }).count(),
    0,
    'A standard user must not receive the instance settings panel',
  )
  await assertNoTokenPersistence(userPage)
  await userPage.screenshot({
    path: path.join(outputDirectory, 'nevolium-d05-authenticated-user.png'),
    fullPage: true,
  })
  results.push({ identity: 'standard-user', settingsVisible: false })
  await userContext.close()

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
}
