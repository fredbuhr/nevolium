import assert from 'node:assert/strict'
import { homeGraph, readHomeLayout, reorder, DEFAULT_HOME } from '../../apps/web/src/MyceliumHome/model.ts'
const id='a5ab12ee-2356-4b85-a43b-32494ee0f152'
const ref=`document:${id}`
const layout=readHomeLayout({folders:[{id:'work',label:'Mon travail'}],entries:[{ref:'tool:knowledge',label:'',folder:''},{ref,label:'Mon idée',folder:'work'}]})
const resolved=new Map([[ref,{id:ref,label:'Idée canonique',kind:'idea',entityType:'document',status:'ready'}]])
assert.deepEqual(DEFAULT_HOME.entries.map(e=>e.ref),['tool:command','tool:projects','tool:research','tool:today','tool:knowledge','tool:news'])
const home=homeGraph(layout,resolved,key=>key)
assert.equal(home.nodes.length,3)
assert.equal(home.edges.length,2)
assert(home.edges.every(e=>e.category==='shortcut' && !e.directed))
const folder=homeGraph(layout,resolved,key=>key,'work')
assert.equal(folder.nodes[1].id,ref);assert.equal(folder.nodes[1].label,'Mon idée')
assert.equal(folder.edges[0].target,ref)
const unavailable=homeGraph(layout,new Map(),key=>key,'work')
assert.equal(unavailable.nodes[1].label,'unavailable','A revoked item must not retain a cached custom label')
assert(unavailable.nodes[1].unavailable)
assert.equal(reorder(layout,0,1).entries[0].ref,ref)
assert.equal(layout.entries[0].ref,'tool:knowledge','Reorder must not mutate caller state')
for(const invalid of [null,{}, {...layout,entries:[...layout.entries,layout.entries[0]]}, {...layout,folders:[...layout.folders,layout.folders[0]]}, {...layout,entries:[{ref:'tool:admin',label:'',folder:''}]}, {...layout,entries:[{ref:'document:------------------------------------',label:'',folder:''}]}, {...layout,entries:[{ref,label:'',folder:'missing'}]}]) assert.throws(()=>readHomeLayout(invalid))
const dense=homeGraph({folders:[],entries:Array.from({length:24},(_,i)=>({ref:`document:${String(i).padStart(8,'0')}-0000-4000-a000-000000000000`,folder:'',label:''}))},new Map(),key=>key)
assert.equal(dense.nodes.length,25)
assert(Object.values(dense.positions).every(v=>v.length===3&&v.every(Number.isFinite)))
console.log('D09 HOME MODEL PASS: canonical IDs, folders, private shortcuts, unavailable labels, ordering, validation and bounded geometry')
