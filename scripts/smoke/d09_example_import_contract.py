#!/usr/bin/env python3
"""Exercise import payloads, file bytes and interrupted-response behavior against a fake HTTP transport.

The separate PostgreSQL contract exercises the real query and ownership implementation.
"""
import hashlib
import importlib.util
import json
import tempfile
import uuid
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
import httpx
from nevolium_core.schemas import ProjectCreate, TaskCreate, RelationshipCreate
from nevolium_core.editable_knowledge import AuthoredKnowledgeCreate, AuthoredKnowledgeVersionCreate, DocumentAssetLinkCreate
from nevolium_core.planning_structure_schemas import TaskPlanningStructureUpdate, TaskDependencyCreate

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('mycelium_importer',ROOT/'scripts/examples/import_mycelium.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
data,corpus_hash=module.load_corpus()

class Server:
    def __init__(self):
        self.rows={};self.files={};self.edges=[];self.writes=0;self.home=None;self.lose_response=False
    def __call__(self, request):
        p=request.url.path;method=request.method
        if method=='GET':
            if p=='/v1/ui/workspaces/mycelium.home.navigation/layout': return httpx.Response(200,json=self.home) if self.home else httpx.Response(404,json={})
            if p.endswith('/content'): return httpx.Response(200,content=self.files[p.split('/')[3]])
            if p.startswith('/v1/mycelium/'):
                parts=p.split('/');focus=f'{parts[3]}:{parts[4]}'
                edges=[e for e in self.edges if focus in (e['source'],e['target'])]
                offset=int(request.url.params.get('cursor','0'));limit=int(request.url.params['limit'])
                page=edges[offset:offset+limit];ids={focus,*[k for e in page for k in (e['source'],e['target'])]}
                return httpx.Response(200,json={'focus':focus,'nodes':[{'id':k} for k in ids],'edges':page,'next_cursor':str(offset+limit) if offset+limit<len(edges) else None})
            row=self.rows.get(p)
            return httpx.Response(200,json=row) if row else httpx.Response(404,json={})
        self.writes+=1
        identity=str(uuid.uuid4())
        if p=='/v1/assets':
            message=BytesParser(policy=default).parsebytes(('Content-Type: '+request.headers['content-type']+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+request.content)
            parts={part.get_param('name',header='content-disposition'):part for part in message.iter_parts()}
            raw=parts['file'].get_payload(decode=True);self.files[identity]=raw
            result={'id':identity,'sha256':hashlib.sha256(raw).hexdigest()}
        else:
            payload=json.loads(request.content)
            schema=ProjectCreate if p=='/v1/projects' else TaskCreate if p=='/v1/tasks' else RelationshipCreate if p=='/v1/relationships' else AuthoredKnowledgeCreate if p=='/v1/knowledge/items' else AuthoredKnowledgeVersionCreate if p.endswith('/versions') else DocumentAssetLinkCreate if p.endswith('/assets') else TaskPlanningStructureUpdate if p.endswith('/planning-structure') else TaskDependencyCreate if p.endswith('/task-dependencies') else None
            if schema:schema.model_validate(payload)
            result={'id':identity,**payload}
            if p=='/v1/knowledge/items': result['version']={'id':str(uuid.uuid4())}
            if p=='/v1/relationships':self.edges.append({'id':'relationship:'+identity,'source':payload['source_type']+':'+payload['source_id'],'target':payload['target_type']+':'+payload['target_id']})
            if p.endswith('/task-dependencies'):self.edges.append({'id':'dependency:'+identity,'source':'task:'+payload['successor_task_id'],'target':'task:'+payload['predecessor_task_id']})
            if p.endswith('/layout'):self.home=payload
        route='/v1/documents' if p=='/v1/knowledge/items' else p
        self.rows[route+'/'+identity]=result
        if self.lose_response:
            self.lose_response=False
            raise httpx.ReadTimeout('Simulated lost response',request=request)
        return httpx.Response(201,json=result)

with tempfile.TemporaryDirectory() as directory:
    server=Server();path=Path(directory)/'journal.json'
    binding={'server':'http://local.test','account':'test-account','corpus':corpus_hash,'profile':'recherche'}
    with httpx.Client(base_url='http://local.test',transport=httpx.MockTransport(server)) as client:
        importer=module.Importer(client,path,binding);importer.run(data,'recherche')
        writes=server.writes
        module.Importer(client,path,binding).run(data,'recherche')
        assert server.writes==writes,'Repeated import duplicated writes'
        assert len(server.files)==12 and len(server.edges)==41
        assert server.home['layout']['entries'][0]['ref'].startswith('project:')
        try:module.Importer(client,path,{**binding,'account':'another-account'})
        except RuntimeError:pass
        else:raise AssertionError('Cross-account journal reuse')
        interrupted_path=Path(directory)/'interrupted.json';interrupted=module.Importer(client,interrupted_path,binding)
        server.lose_response=True
        try:interrupted.mutate('project:lost','POST','/v1/projects',json={'name':'Lost response'})
        except httpx.ReadTimeout:pass
        else:raise AssertionError('Failure was not injected')
        before=server.writes
        try:module.Importer(client,interrupted_path,binding)
        except RuntimeError:pass
        else:raise AssertionError('Ambiguous write replay permitted')
        assert server.writes==before
    # Existing user home is preserved, never replaced by a sample profile.
    preserved=Server();preserved.home={'schema_version':1,'layout':{'custom':'personal'}}
    with httpx.Client(base_url='http://local.test',transport=httpx.MockTransport(preserved)) as client:
        module.Importer(client,Path(directory)/'preserved.json',binding).run(data,'recherche')
        assert preserved.home=={'schema_version':1,'layout':{'custom':'personal'}}
print('D09 IMPORT PASS: complete corpus, canonical request schemas, 12 file readbacks, pagination, no duplicate replay, account binding, interrupted writes and personal home preservation')
