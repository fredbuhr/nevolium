import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

/** Real Chromium/WebGL UI over the existing D08 mock API. No provider or production calls. */
export async function qualifySpatial({ browser, makeState, casePage, openMindMap, eventually, ids, node, edge, output, setStage: reportStage }) {
  const setStage = value => { reportStage(value); console.log('D09 STAGE', value) }
  const target = path.resolve(output, '../d09-spatial-browser')
  await fs.mkdir(target, { recursive: true })
  const state = makeState()
  const { context, page, errors } = await casePage(browser, state, 'd09-desktop', { locale: 'fr-FR', viewport: { width: 1440, height: 1050 } })
  const key = `mycelium3d.project.${ids.project}`
  let failSave = false, gate = null, inFlight = 0, maxInFlight = 0, attempts = 0
  await context.route(`**/v1/ui/workspaces/${key}/layout`, async route => {
    if (route.request().method() !== 'PUT') return route.fallback()
    inFlight++; attempts++; maxInFlight = Math.max(maxInFlight, inFlight)
    try {
      if (failSave) {
        failSave = false
        return await route.fulfill({ status: 503, contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' }, body: '{"detail":"Injected D09 save failure"}' })
      }
      if (gate) { const current = gate; gate = null; await current }
      return await route.fallback()
    } finally { inFlight-- }
  })
  let map = await openMindMap(page)
  const twoDKey = `mindmap.project.${ids.project}`
  await map.locator(`.react-flow__node[data-id="document:${ids.idea}"]`).click()
  const twoDBefore = structuredClone(state.layouts.get(twoDKey))
  setStage('d09:enter-3d-and-selection')
  await map.getByRole('button', { name: 'Vue 3D', exact: true }).click()
  let viewport = map.locator('.spatial-viewport')
  await viewport.scrollIntoViewIfNeeded()
  await viewport.locator('canvas').waitFor()
  await eventually(async () => JSON.parse(await viewport.getAttribute('data-spatial-metrics') || '{}').frames > 1, 'D09 renderer did not produce measured frames', 25000)
  assert.equal(await map.getByLabel('Sélectionner un élément').inputValue(), `document:${ids.idea}`)
  await map.getByRole('button', { name: 'Centrer la sélection', exact: true }).click()
  await eventually(() => Boolean(state.layouts.get(key)?.layout.camera), 'D09 camera was not saved')
  const savedCamera = structuredClone(state.layouts.get(key).layout.camera)
  assert.deepEqual(state.layouts.get(twoDKey), twoDBefore, '3D must not overwrite 2D positions')
  await viewport.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(target, 'desktop-3d.png') })
  // Orbit using the real canvas, then verify that camera controls persist the gesture.
  const canvasBox = await viewport.locator('canvas').boundingBox(); assert(canvasBox)
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.36, { steps: 8 })
  await page.mouse.up()
  await eventually(() => JSON.stringify(state.layouts.get(key)?.layout.camera) !== JSON.stringify(savedCamera), 'D09 orbit did not save the camera')
  const orbitedCamera = structuredClone(state.layouts.get(key).layout.camera)

  setStage('d09:save-error-and-serialized-retry')
  failSave = true
  await map.getByLabel('Qualité 3D').selectOption('eco')
  await map.locator('[data-spatial-save="error"]').waitFor()
  await map.getByRole('button', { name: 'Réessayer la sauvegarde', exact: true }).click()
  await eventually(() => state.layouts.get(key)?.layout.quality === 'eco', 'D09 failed save was not retried')
  let release
  gate = new Promise(resolve => { release = resolve })
  const priorAttempts = attempts
  await map.getByLabel('Qualité 3D').selectOption('high')
  await eventually(() => attempts > priorAttempts, 'D09 first gated PUT did not begin')
  await map.getByLabel('Qualité 3D').selectOption('balanced')
  release()
  await eventually(() => state.layouts.get(key)?.layout.quality === 'balanced', 'D09 latest preference did not win')
  assert.equal(maxInFlight, 1)

  setStage('d09:selection-return-and-canonical-mutation')
  await map.getByRole('button', { name: 'Vue 2D', exact: true }).click()
  await map.locator(`.react-flow__node.selected[data-id="document:${ids.idea}"]`).waitFor()
  await map.getByRole('button', { name: 'Vue 3D', exact: true }).click()
  await viewport.scrollIntoViewIfNeeded(); await viewport.locator('canvas').waitFor()
  assert.deepEqual(state.layouts.get(key).layout.camera, orbitedCamera)
  await map.getByRole('button', { name: 'Convertir en tâche', exact: true }).click()
  await eventually(() => state.conversions === 1, 'D09 conversion from spatial selection failed')
  await eventually(async () => await map.getByLabel('Sélectionner un élément').inputValue() === `task:${ids.convertedTask}`, 'D09 canonical converted Task not selected')
  await map.getByRole('button', { name: 'Ouvrir l’élément', exact: true }).click()
  await page.locator('.planning-workspace:visible').getByText('Idée navigateur D08', { exact: true }).waitFor()
  assert.equal(await page.locator('.cockpit-dock .spatial-viewport canvas').count(), 0, 'Hidden Dockview panel retained a WebGL renderer')
  const desktopBackground = page.locator('.home-browser .spatial-viewport')
  assert.equal(await desktopBackground.getAttribute('data-spatial-background'), 'true', 'The desktop scene must pause behind tools')
  await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Carte mentale', exact: true }).click()
  map = page.locator('.mindmap-workspace:visible'); viewport = map.locator('.spatial-viewport')
  await viewport.scrollIntoViewIfNeeded(); await viewport.locator('canvas').waitFor()

  setStage('d09:refresh-and-reconnect')
  state.nodes.find(item => item.entity_id === ids.convertedTask).label = 'Task updated through canonical source'
  const beforeReads = state.mindmapReads
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('online')) })
  await eventually(() => state.mindmapReads > beforeReads, 'D09 online did not reconcile the snapshot')
  assert.equal(state.mindmapReads, beforeReads + 1, 'D09 duplicated reconnect reads')
  await map.getByLabel('Sélectionner un élément').getByText('Task updated through canonical source', { exact: true }).waitFor({ state: 'attached' })
  assert.equal(state.conversions, 1, 'Reconnect replayed a business mutation')

  setStage('d09:document-hidden-and-reduced-motion')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await eventually(async () => await page.locator('.spatial-viewport canvas').count() === 0, 'Hidden document retained its renderer')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await viewport.locator('canvas').waitFor()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await eventually(async () => await viewport.getAttribute('data-spatial-reduced-motion') === 'true', 'Reduced motion did not propagate')
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  setStage('d09:webgl-loss-fallback')
  await viewport.locator('canvas[data-spatial-ready="true"]').waitFor()
  await viewport.locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2')
    const extension = gl?.getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('WebGL loss extension unavailable in qualification browser')
    extension.loseContext()
  })
  await map.locator('.spatial-workspace[data-spatial-view="2d"]').waitFor()
  await map.getByText('La vue 3D est indisponible.', { exact: false }).waitFor()
  await map.locator(`.react-flow__node.selected[data-id="task:${ids.convertedTask}"]`).waitFor()
  await map.getByRole('button', { name: 'Réessayer la 3D', exact: true }).click()
  await viewport.scrollIntoViewIfNeeded(); await viewport.locator('canvas').waitFor()

  setStage('d09:locale-and-reload')
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await map.getByLabel('3D quality').selectOption('eco')
  await map.locator('[data-spatial-save="saved"]').waitFor()
  const retained = structuredClone(state.layouts.get(key).layout)
  await page.reload({ waitUntil: 'networkidle' })
  map = page.locator('.mindmap-workspace:visible')
  await map.getByLabel('3D quality').waitFor()
  assert.equal(await map.getByLabel('3D quality').inputValue(), 'eco')
  assert.deepEqual(state.layouts.get(key).layout, retained)
  await context.close()
  assert.equal(errors.length, 0, errors.join('\n'))


  setStage('d09:sparse-project-membership-and-motion')
  const sparseState = makeState()
  sparseState.edges = []
  const sparse = await casePage(browser, sparseState, 'd09-sparse', { locale: 'fr-FR', viewport: { width: 1440, height: 1050 }, reducedMotion: 'no-preference' })
  const sparseMap = await openMindMap(sparse.page)
  assert.equal(await sparseMap.locator('.react-flow__edge.is-membership').count(), 3,
    'A project with three members and no semantic relationships must show three membership links')
  assert.equal(await sparseMap.locator('.mindmap-editors:visible').count(), 0, 'Advanced graph editing must start collapsed')
  await sparseMap.getByRole('button', { name: 'Vue 3D', exact: true }).click()
  await sparseMap.getByLabel('Qualité 3D').selectOption('eco')
  const sparseSurface = sparseMap.locator('.spatial-viewport'), sparseCanvas = sparseSurface.locator('canvas')
  await sparseSurface.scrollIntoViewIfNeeded()
  await eventually(async () => JSON.parse(await sparseSurface.getAttribute('data-spatial-metrics') || '{}').frames > 3,
    'Sparse project did not render measured 3D frames', 30000)
  const pixelDifference = async (a, b) => sparse.page.evaluate(async ([first, second]) => {
    const pixels = async source => {
      const image = new Image(); image.src = source; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, canvas.width, canvas.height).data
    }
    const aa = await pixels(first), bb = await pixels(second)
    if (aa.length !== bb.length) throw new Error('Sparse scene dimensions changed')
    let changed = 0
    for (let i = 0; i < aa.length; i += 4)
      if (Math.abs(aa[i] - bb[i]) + Math.abs(aa[i + 1] - bb[i + 1]) + Math.abs(aa[i + 2] - bb[i + 2]) > 24) changed++
    return changed
  }, [a, b].map(buffer => `data:image/png;base64,${buffer.toString('base64')}`))
  const movingA = await sparseCanvas.screenshot()
  await sparse.page.waitForTimeout(1200)
  const movingB = await sparseCanvas.screenshot({ path: path.join(target, 'sparse-project-3d.png') })
  const animatedPixels = await pixelDifference(movingA, movingB)
  assert(animatedPixels > 20, `Sparse project must visibly animate without moving the camera: ${animatedPixels}`)
  await sparseMap.getByRole('button', { name: 'Animer le réseau', exact: true }).click()
  await sparseSurface.scrollIntoViewIfNeeded()
  await sparse.page.waitForTimeout(500)
  const calmA = await sparseCanvas.screenshot()
  await sparse.page.waitForTimeout(1200)
  const calmPixels = await pixelDifference(calmA, await sparseCanvas.screenshot())
  assert(calmPixels < 3, `Paused sparse scene must be static: ${calmPixels}`)
  await sparseMap.getByRole('button', { name: 'Animer le réseau', exact: true }).click()
  await sparse.page.emulateMedia({ reducedMotion: 'reduce' })
  await sparseMap.getByText('Animations en pause : votre appareil demande de réduire les mouvements.', { exact: true }).waitFor()
  assert.equal(await sparseMap.getByRole('button', { name: 'Animer le réseau', exact: true }).isDisabled(), true)
  assert.deepEqual(sparseState.edges, [], 'Visual membership must never create canonical semantic relationships')
  assert.equal(sparseState.linkCreates, 0)
  assert.equal(sparseState.conversions, 0)
  const sparseEvidence = { canonical_edges: 0, membership_edges: 3, animated_pixels: animatedPixels, calm_pixels: calmPixels }
  assert.deepEqual(sparse.errors, [])
  await sparse.context.close()

  const measurements = []
  for (const count of [51, 201, 501]) {
    setStage(`d09:measure-${count}`)
    const data = makeState()
    data.nodes = [data.nodes[0]]
    data.edges = []
    for (let i = 1; i < count; i++) {
      data.nodes.push(node(`document:measurement-${i}`, 'document', `measurement-${i}`, `Idea ${i}`, 'idea'))
      data.edges.push(edge(`measure-${i}`, data.nodes[Math.floor((i - 1) / 3)].key, data.nodes[i].key, 'related_to'))
    }
    const fixture = await casePage(browser, data, `d09-measure-${count}`, { locale: 'fr-FR', viewport: { width: 1280, height: 900 } })
    const view = await openMindMap(fixture.page)
    await view.getByRole('button', { name: 'Vue 3D', exact: true }).click()
    await view.getByLabel('Qualité 3D').selectOption('eco')
    const surface = view.locator('.spatial-viewport')
    await surface.scrollIntoViewIfNeeded()
    await eventually(async () => JSON.parse(await surface.getAttribute('data-spatial-metrics') || '{}').frames > 3, 'D09 benchmark produced no measured frames', 30000)
    const measured = JSON.parse(await surface.getAttribute('data-spatial-metrics'))
    assert(measured.geometries > 0 && measured.geometries < 20, 'D09 unbounded geometry count')
    assert(measured.calls < 40, 'D09 unbounded draw-call count')
    const environment = await surface.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2'), info = gl.getExtension('WEBGL_debug_renderer_info')
      return { renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        heap_bytes: performance.memory?.usedJSHeapSize ?? null, user_agent: navigator.userAgent }
    })
    measurements.push({ nodes: count, canonical_edges: count - 1, displayed_edges: (count - 1) + Math.max(0, count - 4), viewport: '1280x900', quality: 'eco', ...measured, ...environment })
    if (count === 201) {
      const overlapping = await surface.locator('.spatial-labels').evaluate(element => {
        const boxes = [...element.querySelectorAll('button')].filter(button => getComputedStyle(button).visibility === 'visible')
          .map(button => button.getBoundingClientRect())
        return boxes.some((box, i) => boxes.slice(i + 1).some(other => box.left < other.right && box.right > other.left
          && box.top < other.bottom && box.bottom > other.top))
      })
      assert.equal(overlapping, false, 'D09 dense graph labels overlap')
      await fixture.page.screenshot({ path: path.join(target, 'graph-201.png') })
    }
    await fixture.context.close()
    assert.equal(fixture.errors.length, 0, fixture.errors.join('\n'))
  }
  setStage('d09:phone-optional-3d')
  const phone = await casePage(browser, makeState(), 'd09-phone', { locale: 'fr-FR', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  const phoneMap = await openMindMap(phone.page)
  assert.equal(await phoneMap.locator('canvas').count(), 0, 'Phone must start in 2D')
  await phoneMap.getByRole('button', { name: 'Vue 3D', exact: true }).tap()
  const phoneSurface = phoneMap.locator('.spatial-viewport')
  await phoneSurface.scrollIntoViewIfNeeded(); await phoneSurface.locator('canvas').waitFor()
  await phoneMap.getByLabel('Sélectionner un élément').selectOption(`document:${ids.idea}`)
  await phoneMap.getByRole('button', { name: 'Centrer la sélection', exact: true }).tap()
  await phoneSurface.scrollIntoViewIfNeeded()
  await phone.page.screenshot({ path: path.join(target, 'phone-3d.png') })
  assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  await phone.context.close()
  assert.equal(phone.errors.length, 0, phone.errors.join('\n'))

  setStage('d09:webgl-unavailable-at-entry')
  const unavailable = await casePage(browser, makeState(), 'd09-unavailable', { locale: 'fr-FR', viewport: { width: 1280, height: 900 } })
  await unavailable.context.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null
      return getContext.call(this, kind, ...args)
    }
  })
  const fallbackMap = await openMindMap(unavailable.page)
  await fallbackMap.locator('.spatial-workspace').scrollIntoViewIfNeeded()
  await fallbackMap.getByRole('button', { name: 'Vue 3D', exact: true }).click()
  // WebGL failure may already have removed the viewport; the fallback is the observable result.
  await fallbackMap.getByText('La vue 3D est indisponible.', { exact: false }).waitFor()
  await fallbackMap.locator('.react-flow__node').first().waitFor()
  await unavailable.context.close()
  assert.equal(unavailable.errors.length, 0, unavailable.errors.join('\n'))

  const result = { status: 'passed', scope: 'Chromium WebGL with mocked owner-scoped Core API; not physical GPU/tablet qualification',
    checks: ['2d-3d-selection', 'separate-camera-layout', 'save-error-retry-serialization', 'conversion-and-planning-navigation',
      'orbit-camera', 'hidden-panel', 'hidden-document', 'reduced-motion', 'reconnect-coalescing', 'context-loss-fallback',
      'webgl-unavailable', 'reload-FR-EN', 'phone-optional-3d', 'sparse-membership', 'sparse-visible-motion', 'sparse-calm'],
    sparse: sparseEvidence, measurements }
  await fs.writeFile(path.join(target, 'result.json'), JSON.stringify(result, null, 2) + '\n')
  console.log('D09 SPATIAL BROWSER PASS', result)
  return result
}
