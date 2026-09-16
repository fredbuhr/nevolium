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
let activePage, stressBefore
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
  page.on('console', message => { if (message.type() === 'error' && /WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text())) errors.push(message.text()) })
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await page.goto(file)
  await page.getByRole('heading', { name: 'Essai matériel Mycelium 3D' }).waitFor()
  return { context, page }
}
async function waitMeasured(page, ms) {
  await page.waitForFunction(value => Number(document.querySelector('[data-active-ms]')?.getAttribute('data-active-ms')) >= value, ms, { timeout: 30000 })
}
// Read-only diagnostics for software-renderer capture stalls; no test criterion changes.
async function surfaceState(page) {
  return page.evaluate(() => {
    const surface = document.querySelector('.spatial-viewport'), canvas = surface?.querySelector('canvas')
    const box = surface?.getBoundingClientRect(), counter = document.querySelector('[data-recording]')
    return { at: performance.now(), visibility: document.visibilityState,
      viewport: { width: innerWidth, height: innerHeight, scroll_y: scrollY },
      box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      active: surface?.getAttribute('data-active'), recording: counter?.getAttribute('data-recording'),
      measured_ms: counter?.getAttribute('data-active-ms'),
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      metrics: surface?.nextElementSibling?.textContent }
  })
}
async function changedPixels(page, first, second) {
  return page.evaluate(async ([a, b]) => {
    const read = async source => {
      const image = new Image(); image.src = source; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, canvas.width, canvas.height).data
    }
    const aa = await read(a), bb = await read(b)
    if (aa.length !== bb.length) throw new Error('Animation comparison dimensions changed')
    let changed = 0
    for (let i = 0; i < aa.length; i += 4) if (Math.abs(aa[i] - bb[i]) + Math.abs(aa[i + 1] - bb[i + 1]) + Math.abs(aa[i + 2] - bb[i + 2]) > 24) changed++
    return changed
  }, [first, second].map(buffer => `data:image/png;base64,${buffer.toString('base64')}`))
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
  // Three 0.180 allocates an alpha-capable context even when renderer alpha:false.
  // Verify the visible behaviour: an opaque scene must hide a magenta CSS backdrop.
  const renderedCanvas = page.locator('canvas')
  await renderedCanvas.evaluate(canvas => { canvas.style.backgroundColor = '#ff00ff' })
  const opaqueFrame = await renderedCanvas.screenshot()
  const corners = await page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode()
    const probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height
    const context = probe.getContext('2d'); context.drawImage(image, 0, 0)
    // Stay inside the viewport's rounded clipping boundary.
    return [[32, 32], [image.width - 33, 32], [32, image.height - 33], [image.width - 33, image.height - 33]]
      .map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data))
  }, `data:image/png;base64,${opaqueFrame.toString('base64')}`)
  for (const pixel of corners) assert(pixel.every((value, i) => Math.abs(value - [6, 18, 22, 255][i]) < 4),
    `The scene must obscure its CSS backdrop (${pixel})`)
  await renderedCanvas.evaluate(canvas => { canvas.style.backgroundColor = '' })
  const surface = page.locator('.spatial-viewport')
  await surface.screenshot({ path: path.join(output, 'overview.png') })
  await page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('task:hardware-1')
  await page.getByRole('button', { name: 'Centrer', exact: true }).click()
  await surface.scrollIntoViewIfNeeded()
  await page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('')
  const canvas = page.locator('canvas'), box = await canvas.boundingBox()
  assert(box)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  assert.equal(await page.getByLabel('Sélectionner un objet', { exact: true }).inputValue(), 'task:hardware-1', 'Neuron volume raycast must select the real 3D object')
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
  await surface.scrollIntoViewIfNeeded()
  await surface.locator('canvas').waitFor()
  await surface.screenshot({ path: path.join(output, 'desktop.png') })
  const aliveBefore = await surface.screenshot({ path: path.join(output, 'life-before.png') })
  await page.waitForTimeout(1700)
  const aliveAfter = await surface.screenshot({ path: path.join(output, 'life-after.png') })
  const animatedPixels = await changedPixels(page, aliveBefore, aliveAfter)
  assert(animatedPixels > 120, `Neural bodies and flow must visibly animate with a stationary camera (${animatedPixels} changed pixels)`)
  await page.getByRole('button', { name: 'Animer le réseau', exact: true }).click()
  await surface.scrollIntoViewIfNeeded(); await page.waitForTimeout(500)
  const calmBefore = await surface.screenshot()
  await page.waitForTimeout(1200)
  const calmAfter = await surface.screenshot({ path: path.join(output, 'calm.png') })
  const calmPixels = await changedPixels(page, calmBefore, calmAfter)
  assert(calmPixels < 3, `Calm mode must stop material and flow animation (${calmPixels} changed pixels)`)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Animer le réseau' && button.disabled))
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
  assert(report.samples.every(sample => sample.viewport.buffer_width > 0 && sample.viewport.buffer_height > 0))
  assert(/^[a-f0-9]{40}$/.test(report.build.source_commit))
  await desktop.context.close()

  const phone = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await phone.page.getByLabel('Qualité', { exact: true }).selectOption('balanced')
  await phone.page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).tap()
  await phone.page.locator('canvas').waitFor()
  await waitMeasured(phone.page, 1500)
  await phone.page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('task:hardware-1')
  await phone.page.getByRole('button', { name: 'Centrer', exact: true }).tap()
  const phoneSurface = phone.page.locator('.spatial-viewport')
  await phoneSurface.scrollIntoViewIfNeeded()
  await phoneSurface.locator('canvas').waitFor()
  await phone.page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return canvas && Math.abs(canvas.width / canvas.clientWidth - 1.35) < 0.02
  })
  assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  await phoneSurface.screenshot({ path: path.join(output, 'phone.png') })
  await phone.page.getByRole('button', { name: 'Arrêter', exact: true }).tap()
  await phone.context.close()

  const demo = await open()
  await demo.page.getByLabel('Jeu synthétique', { exact: true }).selectOption('small')
  await demo.page.getByLabel('Qualité', { exact: true }).selectOption('balanced')
  await demo.page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).click()
  await demo.page.locator('canvas').waitFor(); await waitMeasured(demo.page, 1500)
  await demo.page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('task:hardware-1')
  await demo.page.getByRole('button', { name: 'Centrer', exact: true }).click()
  await demo.page.locator('.spatial-viewport').scrollIntoViewIfNeeded()
  await demo.page.locator('canvas').waitFor()
  await demo.page.locator('.spatial-viewport').screenshot({ path: path.join(output, 'neuron-closeup.png') })
  const film = await demo.page.locator('canvas').evaluate(canvas => new Promise((resolve, reject) => {
    const chunks = [], stream = canvas.captureStream(15)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1800000 })
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    recorder.onerror = event => { stream.getTracks().forEach(track => track.stop()); reject(String(event.error)) }
    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop())
      resolve(Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())))
    }
    recorder.start(); setTimeout(() => recorder.stop(), 10000)
  }))
  assert(film.length > 1000, 'Animated preview must contain recorded frames')
  await fs.writeFile(path.join(output, 'neural-life.webm'), Buffer.from(film))
  // Inspect the same real object at the near-camera size cap, with motion stopped.
  await demo.page.getByRole('button', { name: 'Animer le réseau', exact: true }).click()
  for (let i = 0; i < 5; i++) await demo.page.getByRole('button', { name: 'Zoom avant', exact: true }).click()
  await demo.page.locator('.spatial-viewport').scrollIntoViewIfNeeded()
  await demo.page.waitForTimeout(500)
  await demo.page.locator('.spatial-viewport').screenshot({ path: path.join(output, 'junction-near.png') })
  await demo.context.close()

  const dense = await open()
  await dense.page.getByLabel('Jeu synthétique', { exact: true }).selectOption('stress')
  await dense.page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).click()
  await dense.page.locator('canvas').waitFor(); await waitMeasured(dense.page, 1500)
  stressBefore = await surfaceState(dense.page)
  await fs.writeFile(path.join(output, 'stress-before.json'), JSON.stringify(stressBefore, null, 2))
  await dense.page.locator('.spatial-viewport').screenshot({ path: path.join(output, 'stress-overview.png') })
  await dense.page.getByLabel('Sélectionner un objet', { exact: true }).selectOption('task:hardware-1')
  await dense.page.getByRole('button', { name: 'Centrer', exact: true }).click()
  await dense.page.locator('.spatial-viewport').scrollIntoViewIfNeeded()
  await dense.page.locator('.spatial-viewport').screenshot({ path: path.join(output, 'stress-focus.png') })
  await dense.context.close()

  const unavailable = await open({}, true)
  await unavailable.page.getByRole('button', { name: 'Démarrer la mesure', exact: true }).click()
  await unavailable.page.getByRole('alert').waitFor()
  assert.equal(await unavailable.page.locator('[data-recording]').getAttribute('data-recording'), 'stopped')
  assert.equal(await unavailable.page.locator('canvas').count(), 0)
  await unavailable.context.close()
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [], 'Self-contained kit must make no HTTP requests')
  const result = { status: 'passed', scope: 'Offline file:// kit, Chromium SwiftShader; short software check, no hardware qualification',
    checks: ['no-network', 'real-scene-render', 'neuron-volume-raycast', 'select-focus-orbit', 'pause-remount', 'partial-report-export', 'touch-viewport', 'effective-dpr', 'no-webgl', 'visible-neural-animation', 'calm-static', 'reduced-motion-control', 'recorded-neural-preview', 'opaque-compositing', 'near-junction-capture', 'dense-network-captures'],
    animation: { animated_changed_pixels: animatedPixels, calm_changed_pixels: calmPixels },
    source_commit: report.build.source_commit }
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n')
  console.log('D09 HARDWARE KIT PASS', result)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), errors, requests, stressBefore,
    surface_after: activePage && !activePage.isClosed() ? await surfaceState(activePage).catch(() => null) : null }, null, 2))
  throw error
} finally { await browser.close() }
