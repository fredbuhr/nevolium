import assert from 'node:assert/strict'
import path from 'node:path'

// Deterministic UI fixtures, not provider qualification or production data.
export async function qualifyConnectedScenarios(browser, { previewOrigin, apiOrigin, outputDirectory }) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, locale: 'fr-FR', reducedMotion: 'reduce', serviceWorkers: 'block' })
    const projects = [
      { id: 'p1', name: 'Un jardin pour le quartier', parent_id: 'p0', status: 'active' },
      { id: 'p0', name: 'Les communs du quartier', status: 'active' },
      { id: 'p2', name: 'Carnet de terrain', status: 'active' },
    ]
    const documents = [
      { id: 'd1', project_id: 'p1', title: 'Les besoins des habitants', status: 'ready', metadata_json: {} },
      { id: 'd2', project_id: 'p2', title: 'Notes de terrain', status: 'ready', metadata_json: {} },
    ]
    const task = { id: 't1', project_id: 'p1', title: 'Rencontrer les voisins', status: 'todo', input: {}, owner_type: 'human' }
    let inventory = { active_calls: 0, allowed_providers: ['openai'], active: { id: null, source: 'environment', provider: 'openai', model_name: 'openai/gpt-4.1', model_alias: 'smart', status: 'active', connection_state: 'bootstrap', test_cost_usd: 0, test_cost_reported: false }, candidates: [] }
    let postFails = true
    let readsFail = false
    let testCalls = 0
    let unknownRequests = []
    const layouts = new Map()
    await context.route(`${apiOrigin}/v1/**`, async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname
      const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(body) })
      if (req.method() === 'OPTIONS') return send({})
      if (p.includes('/ui/workspaces/')) {
        if (req.method() === 'PUT') { layouts.set(p, req.postDataJSON()); return send(req.postDataJSON()) }
        return send(layouts.get(p) || {}, layouts.has(p) ? 200 : 404)
      }
      if (p === '/v1/projects') return send(projects)
      if (p.startsWith('/v1/projects/')) return send(projects.find(item => item.id === p.split('/').at(-1)))
      if (p === '/v1/tasks') return send(url.searchParams.get('project_id') === 'p1' ? [task] : [])
      if (p === '/v1/tasks/t1') return send(task)
      if (p === '/v1/documents') return send(documents.filter(item => item.project_id === url.searchParams.get('project_id')))
      if (p.endsWith('/versions')) return send([])
      if (p.startsWith('/v1/documents/')) return send(documents.find(item => item.id === p.split('/').at(-1)))
      if (p === '/v1/relationships') return send(url.searchParams.get('entity_id') === 'd1' ? [{ id: 'r1', source_type: 'document', source_id: 'd1', target_type: 'document', target_id: 'd2', relation_type: 'references' }] : [])
      if (p === '/v1/admin/model-configurations') return readsFail ? send({ detail: 'Lecture temporairement indisponible' }, 503) : send(inventory)
      if (p === '/v1/admin/model-configurations/tests') {
        testCalls++
        if (postFails) return send({ detail: 'Le registre de test est indisponible.' }, 503)
        inventory.candidates = [{ ...inventory.active, id: 'candidate', source: 'managed', status: 'testing', connection_state: 'testing', test_execution_status: 'running' }]
        return send({ configuration: inventory.candidates[0] }, 202)
      }
      if (p.endsWith('/candidate/activate')) {
        assert.equal(inventory.active_calls, 0)
        inventory = { ...inventory, active: { ...inventory.candidates[0], status: 'active' }, candidates: [] }
        return send(inventory)
      }
      unknownRequests.push(p)
      return send({ detail: 'Route absente du scénario' }, 404)
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(previewOrigin, { waitUntil: 'networkidle' })
    await page.locator('.mycelium-space-node[data-space="command"]').click()
    const phone = viewport.width < 640
    const toggle = page.getByRole('button', { name: 'Liens et contexte', exact: true })
    await page.getByText('Options de l’espace', { exact: true }).click()
    await toggle.click()
    const navigator = page.getByRole('complementary', { name: 'Fil relié' })
    await navigator.getByLabel('Votre contexte').selectOption('p1')
    await navigator.getByRole('button', { name: /Les besoins des habitants/ }).waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(outputDirectory, `nevolium-connected-${phone ? 'phone' : 'desktop'}-overview.png`) })
    await navigator.getByRole('button', { name: 'Voir le contexte parent' }).click()
    assert.equal(await page.locator('#thread-parent').evaluate(element => element === document.activeElement), true)
    await navigator.getByRole('button', { name: /Revenir au projet parent/ }).click()
    await page.waitForFunction(() => document.querySelector('.thread-focus strong')?.textContent === 'Les communs du quartier')
    await navigator.getByRole('button', { name: /Revenir au lien précédent/ }).click()
    await navigator.getByRole('button', { name: /Les besoins des habitants/ }).click()
    await navigator.getByRole('button', { name: /Vers · fait référence à/ }).waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(outputDirectory, `nevolium-connected-${phone ? 'phone' : 'desktop'}.png`) })
    await navigator.getByRole('button', { name: /Vers · fait référence à/ }).click()
    await page.waitForFunction(() => document.querySelector('.thread-focus strong')?.textContent === 'Notes de terrain')
    assert.equal(await navigator.getByLabel('Votre contexte').inputValue(), 'p2', 'A transversal follows the canonical document project')
    await navigator.getByRole('button', { name: 'Ouvrir cet élément' }).click()
    await page.getByText('Importer un fichier et consulter les versions', { exact: true }).click()
    await page.getByRole('heading', { name: 'Notes de terrain', exact: true }).waitFor()
    if (!phone) await toggle.click()
    await page.locator('.cockpit-panel-buttons').getByRole('button', { name: 'Réglages API', exact: true }).click()
    const settings = page.locator('.model-settings')
    const summary = settings.locator('.model-connection-summary')
    await summary.getByText('Aucune nouvelle clé validée dans ces réglages', { exact: true }).waitFor()
    const submit = async () => {
      await settings.getByLabel('Clé API', { exact: true }).fill('fixture-not-a-real-key')
      await settings.getByRole('button', { name: 'Tester cette connexion', exact: true }).click()
    }
    await submit()
    await settings.getByRole('alert').getByText('Le registre de test est indisponible.', { exact: true }).waitFor()
    await summary.getByRole('button', { name: 'Actualiser l’état', exact: true }).click()
    await page.waitForTimeout(150)
    assert.equal(await settings.getByRole('alert').getByText('Le registre de test est indisponible.', { exact: true }).isVisible(), true, 'Successful polling must not erase a failed submission')
    assert.equal(testCalls, 1, 'Refresh is read-only')
    postFails = false
    await submit()
    await summary.getByText('Test en cours — clé pas encore confirmée', { exact: true }).waitFor()
    assert.equal(await settings.getByLabel('Clé API', { exact: true }).inputValue(), '')
    inventory.candidates[0] = { ...inventory.candidates[0], status: 'verified', connection_state: 'verified', provider_model: 'openai/gpt-4.1' }
    inventory.active_calls = 1
    await summary.getByRole('button', { name: 'Actualiser l’état', exact: true }).click()
    await summary.getByText('Test réussi — activation encore nécessaire', { exact: true }).waitFor()
    const activate = summary.getByRole('button', { name: 'Utiliser cette connexion vérifiée' })
    assert.equal(await activate.isDisabled(), true, 'An active call prevents activation')
    inventory.active_calls = 0
    await summary.getByRole('button', { name: 'Actualiser l’état', exact: true }).click()
    await activate.click()
    await summary.getByText('Connexion vérifiée et activée', { exact: true }).waitFor()
    await settings.evaluate(element => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) parent.scrollTop = 0
    })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(outputDirectory, `nevolium-connection-${phone ? 'phone' : 'desktop'}.png`) })
    readsFail = true
    await summary.getByRole('button', { name: 'Actualiser l’état', exact: true }).click()
    await summary.getByText('Vérification momentanément indisponible', { exact: true }).waitFor()
    assert.equal(testCalls, 2)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
    assert.equal(await page.locator('.quiet-atmosphere i').first().evaluate(element => getComputedStyle(element).animationName), 'none')
    assert.equal(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]).includes('fixture-not-a-real-key')), false)
    assert.deepEqual(errors, [])
    assert.deepEqual(unknownRequests, [])
    if (phone) {
      await page.locator('.cockpit-preferences summary').click()
      await page.getByLabel('Ambiance', { exact: true }).selectOption('minimal')
      assert.equal(await page.locator('.quiet-atmosphere').count(), 0)
    }
    await context.close()
  }
  console.log('D05 CONNECTED PASS: parent, neighbourhood, transversal, shared document selection, key receipt/test/activation, polling error retention, read-only refresh, responsive and reduced motion (mock API, no paid call)')
}
