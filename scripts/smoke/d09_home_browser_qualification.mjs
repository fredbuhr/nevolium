import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {makeHomeFixture,mockHome,ref} from './d09_home_fixture.mjs'
const root=path.resolve(import.meta.dirname,'../..'),output=path.join(root,'artifacts/d09-home-browser')
await fs.mkdir(output,{recursive:true})
const {chromium}=await import(pathToFileURL(process.env.NEVOLIUM_PLAYWRIGHT_MODULE).href)
const server=spawn(path.join(root,'apps/web/node_modules/.bin/vite'),['preview','--host','127.0.0.1','--port','4199','--strictPort'],{cwd:path.join(root,'apps/web'),stdio:'ignore'})
let browser,stage='start';const results=[]
async function eventually(test,message){for(let i=0;i<100;i++){if(await test())return;await new Promise(r=>setTimeout(r,100))}throw Error(message)}
try{
 await eventually(async()=>{try{return(await fetch('http://127.0.0.1:4199')).ok}catch{return false}},'preview unavailable')
 browser=await chromium.launch({headless:true,executablePath:process.env.NEVOLIUM_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 for(const [name,width,height] of [['desktop',1440,1000],['tablet',820,1180],['phone',390,844]]){
  stage=name+':load';console.log(stage)
  const state=makeHomeFixture(),context=await browser.newContext({viewport:{width,height},locale:'fr-FR',serviceWorkers:'block'})
  await mockHome(context,state);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:4199');const home=page.locator('.home-browser:visible')
  await home.getByRole('heading',{name:'Votre Mycelium',exact:true}).waitFor()
  const spatial=home.locator('.spatial-workspace')
  if(name==='phone')assert.equal(await spatial.getAttribute('data-spatial-view'),'2d')
  else{
   await home.locator('.spatial-viewport canvas').waitFor()
   await eventually(async()=>JSON.parse(await home.locator('.spatial-viewport').getAttribute('data-spatial-metrics')||'{}').frames>1,'3D frames missing')
   assert.equal(await spatial.getAttribute('data-spatial-view'),'3d')
   await home.getByRole('button',{name:'Animer le réseau',exact:true}).click()
   assert.equal(await home.locator('.spatial-viewport').getAttribute('data-spatial-reduced-motion'),'true')
   await home.getByRole('button',{name:'Animer le réseau',exact:true}).click()
  }
  await page.screenshot({path:path.join(output,`${name}-home.png`)})
  // Accessible list has the same objects and is also the no-WebGL navigation surface.
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  stage=name+':transversal';console.log(stage)
  await home.locator(`.spatial-workspace [data-node="${ref('project:recherche')}"]`).click()
  await home.getByRole('button',{name:'Explorer les liens',exact:true}).click()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="${ref('document:recherche-2')}"]`).click()
  await home.getByRole('button',{name:'Explorer les liens',exact:true}).click()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="${ref('document:crypto-2')}"]`).click()
  await home.getByRole('button',{name:'Explorer les liens',exact:true}).click()
  await eventually(async()=>(await home.locator('.home-item-details h2').textContent())==='Hypothèse de concentration','cross-project focus missing')
  await home.getByRole('button',{name:'Épingler à l’accueil',exact:true}).click()
  await eventually(()=>state.layouts.get('mycelium.home.navigation').layout.entries.some(e=>e.ref===ref('document:crypto-2')),'pin not persisted')
  if(name!=='phone')await eventually(async()=>JSON.parse(await home.locator('.spatial-viewport').getAttribute('data-spatial-metrics')||'{}').frames>1,'transversal 3D frames missing')
  await page.screenshot({path:path.join(output,`${name}-transversal.png`)})
  await home.getByRole('button',{name:'Accueil',exact:true}).click()
  stage=name+':file';console.log(stage)
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator('.spatial-workspace [data-node="folder:sources"]').click()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="${ref('asset:recherche-observations.csv')}"]`).click()
  const download=page.waitForEvent('download')
  await home.getByRole('button',{name:'Télécharger le fichier',exact:true}).click()
  const received=await download
  assert.deepEqual(await fs.readFile(await received.path()),await fs.readFile(path.join(root,'examples/mycelium/recherche/observations.csv')))
  await home.getByRole('button',{name:'Explorer les liens',exact:true}).click()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="${ref('project:recherche')}"]`).click()
  await home.getByRole('button',{name:'Explorer les liens',exact:true}).click()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="${ref('asset:recherche-parcours.svg')}"]`).click()
  await home.getByRole('button',{name:'Afficher l’aperçu',exact:true}).click()
  await home.locator('.home-file-preview').waitFor()
  await eventually(async()=>home.locator('.home-file-preview').evaluate(img=>img.complete&&img.naturalWidth>0),'SVG preview missing')
  await home.getByRole('button',{name:'Accueil',exact:true}).click()
  stage=name+':customize';console.log(stage)
  await home.getByRole('button',{name:'Personnaliser mon accueil',exact:true}).click()
  const editor=home.locator('.home-customize')
  await editor.getByLabel('Nom du dossier',{exact:true}).first().fill('À vérifier')
  await editor.getByRole('button',{name:'Créer le dossier',exact:true}).click()
  await eventually(()=>state.layouts.get('mycelium.home.navigation').layout.folders.some(f=>f.label==='À vérifier'),'folder not saved')
  await editor.getByLabel('Nom du raccourci 1',{exact:true}).fill('Mon laboratoire')
  const folderId=state.layouts.get('mycelium.home.navigation').layout.folders.find(f=>f.label==='À vérifier').id
  await editor.getByLabel('Dossier 1',{exact:true}).selectOption(folderId)
  await editor.getByRole('button',{name:'Descendre 1',exact:true}).click()
  await eventually(()=>state.layouts.get('mycelium.home.navigation').layout.entries[1].label==='Mon laboratoire','order not saved')
  await editor.getByRole('button',{name:'Annuler la dernière modification',exact:true}).click()
  await eventually(()=>state.layouts.get('mycelium.home.navigation').layout.entries[0].label==='Mon laboratoire','undo not saved')
  state.failSave=true
  await editor.getByLabel('Nom du raccourci 1',{exact:true}).fill('Mon labo')
  await home.getByRole('button',{name:'Réessayer la sauvegarde',exact:true}).click()
  await eventually(()=>state.layouts.get('mycelium.home.navigation').layout.entries[0].label==='Mon labo','retry failed')
  await editor.getByRole('button',{name:'Terminé',exact:true}).click()
  await page.reload();await home.getByRole('heading',{name:'Votre Mycelium',exact:true}).waitFor()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="folder:${folderId}"]`).click()
  await home.getByRole('button',{name:'Vue 2D',exact:true}).click()
  await home.locator(`.spatial-workspace [data-node="${ref('project:recherche')}"]`).getByText('Mon labo',{exact:true}).waitFor()
  assert.equal(state.nodes.get(ref('project:recherche')).label,'EXEMPLE — Recherche — atelier fictif','Shortcut rename mutated canonical data')
  // Language changes only UI copy; example content stays as authored.
  await page.getByRole('button',{name:'English',exact:true}).click()
  await home.getByRole('heading',{name:'Your Mycelium',exact:true}).waitFor()
  await home.getByRole('button',{name:'Customize my home',exact:true}).waitFor()
  assert(!await home.getByRole('button',{name:'Personnaliser mon accueil',exact:true}).count())
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name}: horizontal overflow`)
  await page.screenshot({path:path.join(output,`${name}-personal-home-en.png`)})
  assert.deepEqual(errors,[])
  results.push({device:name,sharedRenderer:name==='phone'?'2D default':'3D default',transversal:true,privateLayout:true,folders:true,order:true,undo:true,saveRetry:true,reload:true,locale:true,fileBytes:true,svgPreview:true})
  await context.close()
 }
 await fs.writeFile(path.join(output,'qualification.json'),JSON.stringify({status:'passed',corpus:'mycelium-example-v1',results},null,2))
 console.log('D09 HOME BROWSER PASS',JSON.stringify(results))
}catch(error){
 await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({stage,error:String(error)},null,2))
 const page=browser?.contexts().at(-1)?.pages().at(-1)
 if(page){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});await fs.writeFile(path.join(output,'failure.html'),await page.content())}
 throw error
}
finally{await browser?.close();server.kill()}
