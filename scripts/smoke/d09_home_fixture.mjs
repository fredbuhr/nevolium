import fs from 'node:fs'
import { createHash } from 'node:crypto'
export const corpus=JSON.parse(fs.readFileSync(new URL('../../examples/mycelium/manifest.json',import.meta.url),'utf8'))
export function uuid(key){const h=createHash('sha256').update(key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
export const ref=key=>{const [kind,id]=key.split(':');return kind==='tool'?key:`${kind}:${uuid(key)}`}
export const wallpaperId=uuid('wallpaper')
export const wallpaperBytes=fs.readFileSync(new URL('../../apps/web/public/icons/nevolium-192.png',import.meta.url))
export function makeHomeFixture(){
 const nodes=new Map(),edges=[],layouts=new Map(),writes=[]
 for(const [kind,group] of [['project','projects'],['document','documents'],['task','tasks'],['asset','assets']])for(const item of corpus[group]){
  const key=`${kind}:${item.key}`,id=ref(key),projectId=uuid(`project:${kind==='project'?item.key:item.project}`)
  nodes.set(id,{id,entityId:uuid(key),entityType:kind,projectId,label:item.title||item.name||item.path.split('/').at(-1),kind:item.kind||kind,status:'ready',summary:item.revision||item.content_text||item.description||item.summary||'',mediaType:item.mime_type})
  if(kind!=='project')edges.push({id:`membership:${id}`,source:`project:${projectId}`,target:id,relation:'contains',category:'membership',directed:true})
  else if(item.parent)edges.push({id:`parent:${id}`,source:ref(`project:${item.parent}`),target:id,relation:'contains',category:'membership',directed:true})
 }
 for(const item of corpus.documents){
  for(const a of item.attachments)edges.push({id:`attachment:${item.key}:${a.asset}`,source:ref(`document:${item.key}`),target:ref(`asset:${a.asset}`),relation:a.role,category:'provenance',directed:true})
  for(const [i,c] of item.citations.entries()){
   const key=`citation:${item.key}-${i}`,id=ref(key)
   nodes.set(id,{id,entityId:uuid(key),entityType:'citation',projectId:uuid(`project:${item.project}`),label:c.label,kind:'citation',status:'ready',summary:c.excerpt,citingGeneration:1,sourceGeneration:1})
   edges.push({id:`citation:${key}`,source:ref(`document:${item.key}`),target:id,relation:'cites',category:'provenance',directed:true},{id:`source:${key}`,source:id,target:ref(`document:${c.document}`),relation:'references',category:'provenance',directed:true})
  }
 }
 for(const [i,e] of corpus.relationships.entries())edges.push({id:`relationship:${i}`,source:ref(e.source),target:ref(e.target),relation:e.relation,category:'relationship',directed:e.relation!=='related_to'})
 for(const [i,e] of corpus.dependencies.entries())edges.push({id:`dependency:${i}`,source:ref(`task:${e.successor}`),target:ref(`task:${e.predecessor}`),relation:'depends_on',category:'planning',directed:true})
 for(const t of corpus.tasks.filter(t=>t.parent))edges.push({id:`task-parent:${t.key}`,source:ref(`task:${t.parent}`),target:ref(`task:${t.key}`),relation:'contains',category:'planning',directed:true})
 const profile=corpus.home_profiles.recherche
 layouts.set('mycelium.home.navigation',{schema_version:1,layout:{folders:profile.folders,entries:profile.entries.map(e=>({...e,ref:ref(e.ref)}))}})
 return {nodes,edges,layouts,writes,failSave:false,revoked:new Set(),reads:0,wallpaperUpload:null,wallpaperUnavailable:false}
}
export async function mockHome(context,state){
 await context.route('**/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname,method=request.method()
  const send=(value,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*',...headers},body:JSON.stringify(value)})
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,PATCH,OPTIONS','access-control-allow-headers':'content-type,authorization'}})
  if(p.startsWith('/v1/ui/workspaces/')){
   const key=decodeURIComponent(p.split('/').at(-2))
   if(method==='PUT'){
    if(state.failSave&&key==='mycelium.home.navigation'){state.failSave=false;return send({},503)}
    state.layouts.set(key,request.postDataJSON());state.writes.push(key)
   }
   return state.layouts.has(key)?send(state.layouts.get(key)):send({},404)
  }
  if(p.startsWith('/v1/mycelium/')){
   state.reads++
   const parts=p.split('/'),focus=`${parts[3]}:${parts[4]}`
   if(!state.nodes.has(focus)||state.revoked.has(focus))return send({},404)
   const limit=Number(url.searchParams.get('limit')||36),start=Number(url.searchParams.get('cursor')||0)
   const all=state.edges.filter(e=>(e.source===focus||e.target===focus)&&!state.revoked.has(e.source)&&!state.revoked.has(e.target))
   const edges=all.slice(start,start+limit),ids=new Set([focus,...edges.flatMap(e=>[e.source,e.target])])
   return send({focus,nodes:[...ids].map(id=>state.nodes.get(id)),edges,next_cursor:start+limit<all.length?String(start+limit):null})
  }
  const collection={projects:'project',documents:'document',tasks:'task',assets:'asset'}[p.split('/')[2]]
  if(p==='/v1/assets'&&method==='POST'){
   state.wallpaperUpload=request.postDataBuffer()
   return send({id:wallpaperId,mime_type:'image/png',size_bytes:wallpaperBytes.length},201)
  }
  if(p===`/v1/assets/${wallpaperId}/content`){
   if(state.wallpaperUnavailable)return send({},404)
   return route.fulfill({contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:wallpaperBytes})
  }
  if(collection&&p.endsWith('/content')){
   const item=corpus.assets.find(a=>uuid(`asset:${a.key}`)===p.split('/')[3]);if(!item)return send({},404)
   return route.fulfill({contentType:item.mime_type,headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(new URL(`../../examples/mycelium/${item.path}`,import.meta.url))})
  }
  if(collection&&p.split('/').length===3){
   const all=[...state.nodes.values()].filter(n=>n.entityType===collection&&!state.revoked.has(n.id)).map(n=>({id:n.entityId,name:n.label,title:n.label,kind:n.kind,project_id:n.projectId,metadata_json:{filename:n.label},status:'active'}))
   return send(all)
  }
  return send([],200)
 })
}
