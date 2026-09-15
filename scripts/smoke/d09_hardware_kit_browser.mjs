import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'artifacts/d09-hardware-browser')
await fs.mkdir(output, { recursive: true })
assert(process.env.NEVOLIUM_PLAYWRIGHT_MODULE, 'NEVOLIUM_PLAYWRIGHT_MODULE is required')
const { chromium } = await import(pathToFileURL(process.env.NEVOLIUM_PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const file = pathToFileURL(path.join(root, 'artifacts/d09-hardware-kit/nevolium-d09-hardware.html')).href
const errors = [], requests = []
let activePage
async function open(options = {}, unavailable = false) {
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 1000 }, offline: true, ...options })
  if (unavailable) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (/webgl/.test(kind)) return null
      return original.call(this, kind, ...args)
    }
  })
  const page = await context.newPage(); activePage = page
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await page.goto(file)
  await page.getByRole('heading', { name: 'Essai matériel Mycelium 3D' }).waitFor()
  return { context, page }
}
async function waitMeasured(page, ms) {
  await page.waitForFunction(value => Number(document.querySelector('[data-active-ms]')?.getAttribute('data-active-ms')) >= value, ms, { timeout: 30000 })
}
try {
  const desktop = await open()
  const page = desktop.page
  assert.equal(await page.locator('canvas').count(), 0)
  await page.getByLabel('Appareil et système', { exact: true }).fill('CI Chromium / SwiftShader — not physical hardware')
  await page.getByLabel('GPU vérifié', { exact: true }).selectOption('software')
  await page.getByLabel('Durée mesurée', { exact: true }).selectOption('60')
  await page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).click()
  await page.locator('canvas').waitFor()
  await waitMeasured(page, 3000)
  await page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('task:hardware-1')
  await page.getByRole('button', { name: 'Centrer', exact: true }).click()
  const canvas = page.locator('canvas'), box = await canvas.boundingBox()
  assert(box)
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5)
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .6, { steps: 10 }); await page.mouse.up()
  await page.getByRole('button', { name: 'Masquer 2 s', exact: true }).click()
  await page.locator('.spatial-viewport[data-active="false"]').waitFor()
  assert.equal(await page.locator('canvas').count(), 0)
  const pausedAt = Number(await page.locator('[data-active-ms]').getAttribute('data-active-ms'))
  await page.waitForTimeout(500)
  assert.equal(Number(await page.locator('[data-active-ms]').getAttribute('data-active-ms')), pausedAt)
  await page.locator('canvas').waitFor()
  await waitMeasured(page, pausedAt + 1500)
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Arrêter', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter le rapport JSON', exact: true }).first().click()
  const download = await downloadPromise
  const reportPath = path.join(output, 'incomplete-software-report.json')
  await download.saveAs(reportPath)
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))
  assert.equal(report.qualification_status, 'needs_review')
  assert.equal(report.summary.duration_complete, false)
  assert.equal(report.recording_in_progress, false)
  assert.equal(report.configuration.nodes, 201)
  assert.equal(report.configuration.edges, 300)
  assert.equal(report.configuration.quality, 'eco')
  assert.equal(report.device.gpu_class, 'software')
  assert(report.summary.sample_count >= 4)
  assert(report.environment.renderers.length >= 2, 'Each remount must identify its renderer')
  assert(report.events.some(event => event.kind === 'scene-unmounted'))
  assert(report.events.some(event => event.kind === 'camera-changed'))
  assert(report.samples.every(sample => Number.isFinite(sample.fps)))
  assert(/^[a-f0-9]{40}$/.test(report.build.source_commit))
  await desktop.context.close()

  const phone = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await phone.page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).tap()
  await phone.page.locator('canvas').waitFor()
  await waitMeasured(phone.page, 1500)
  await phone.page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('task:hardware-1')
  await phone.page.getByRole('button', { name: 'Centrer', exact: true }).tap()
  assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  await phone.page.screenshot({ path: path.join(output, 'phone.png'), fullPage: true })
  await phone.page.getByRole('button', { name: 'Arrêter', exact: true }).tap()
  await phone.context.close()

  const unavailable = await open({}, true)
  await unavailable.page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).click()
  await unavailable.page.getByRole('alert').waitFor()
  assert.equal(await unavailable.page.locator('[data-recording]').getAttribute('data-recording'), 'stopped')
  assert.equal(await unavailable.page.locator('canvas').count(), 0)
  await unavailable.context.close()
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [], 'Self-contained kit must make no HTTP requests')
  const result = { status: 'passed', scope: 'Offline file:// kit, Chromium SwiftShader; short software check, no hardware qualification',
    checks: ['no-network', 'real-scene-render', 'select-focus-orbit', 'pause-remount', 'partial-report-export', 'touch-viewport', 'no-webgl'],
    source_commit: report.build.source_commit }
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n')
  console.log('D09 HARDWARE KIT PASS', result)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), errors, requests }, null, 2))
  throw error
} finally { await browser.close() }
