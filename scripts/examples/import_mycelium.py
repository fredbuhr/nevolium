#!/usr/bin/env python3
"""Import the versioned fictional corpus through public APIs; preview by default.

Run with the locked Core Python environment (httpx is already a Core dependency).
Never dispatches Tasks, ingests Documents, or calls a model/provider.
"""
from __future__ import annotations

import argparse
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

import httpx

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / 'examples/mycelium'


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_corpus():
    data = json.loads((CORPUS / 'manifest.json').read_text())
    assert data['schema_version'] == 1
    groups = {'project': 'projects', 'document': 'documents', 'asset': 'assets', 'task': 'tasks'}
    refs = {f'{kind}:{item["key"]}' for kind, group in groups.items() for item in data[group]}
    assert len(refs) == sum(len(data[g]) for g in groups.values()), 'Duplicate example key'
    for group in ('assets', 'documents', 'tasks'):
        for item in data[group]:
            assert f'project:{item["project"]}' in refs
    seen = set()
    for item in data['projects']:
        assert not item.get('parent') or item['parent'] in seen, 'Parents must precede children'
        seen.add(item['key'])
    seen = set()
    for item in data['documents']:
        assert all(c['document'] in seen for c in item['citations']), 'Citations must target earlier sources'
        assert all(f'asset:{a["asset"]}' in refs for a in item['attachments'])
        seen.add(item['key'])
    for item in data['relationships']:
        assert item['source'] in refs and item['target'] in refs
    for item in data['dependencies']:
        assert all(f'task:{item[k]}' in refs for k in ('predecessor', 'successor'))
    for profile in data['home_profiles'].values():
        assert all(e['ref'].startswith('tool:') or e['ref'] in refs for e in profile['entries'])
    content = json.dumps(data, sort_keys=True, ensure_ascii=False).encode()
    for item in data['assets']:
        file = (CORPUS / item['path']).resolve()
        assert file.is_relative_to(CORPUS.resolve()) and file.is_file()
        content += file.read_bytes()
    return data, digest(content)


class Importer:
    def __init__(self, client, state_path: Path, binding: dict):
        self.client, self.path = client, state_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.state = json.loads(self.path.read_text()) if self.path.exists() else {**binding, 'operations': {}, 'pending': None}
        if any(self.state.get(k) != v for k, v in binding.items()):
            raise RuntimeError('Journal belongs to another account, server, corpus or home profile.')
        if self.state['pending']:
            raise RuntimeError(f'Interrupted mutation: {self.state["pending"]}. Inspect the server result before reconciling the journal; do not repeat blindly.')

    def save(self):
        temporary = self.path.with_suffix(self.path.suffix + '.tmp')
        with temporary.open('w', encoding='utf-8') as stream:
            os.chmod(temporary, 0o600)
            json.dump(self.state, stream, ensure_ascii=False, indent=2)
            stream.flush(); os.fsync(stream.fileno())
        temporary.replace(self.path)

    def request(self, method, path, **kwargs):
        response = self.client.request(method, path, **kwargs)
        if not response.is_success:
            # Deliberately don't print response bodies, credentials or source content.
            raise RuntimeError(f'{method} {path}: HTTP {response.status_code}')
        return response.json()

    def mutate(self, key, method, path, **kwargs):
        if key in self.state['operations']:
            return self.state['operations'][key]
        self.state['pending'] = key
        self.save()  # A lost response can never lead to an automatic duplicate POST.
        result = self.request(method, path, **kwargs)
        self.state['operations'][key] = result
        self.state['pending'] = None
        self.save()
        print('CREATED', key)
        return result

    def row(self, kind, key):
        return self.state['operations'][f'{kind}:{key}']

    def identity(self, kind, key):
        return self.row(kind, key)['id']

    def ref(self, ref):
        kind, key = ref.split(':', 1)
        return ref if kind == 'tool' else f'{kind}:{self.identity(kind, key)}'

    def verify_existing(self):
        routes = {'project': 'projects', 'task': 'tasks', 'asset': 'assets', 'document': 'documents'}
        for key, row in self.state['operations'].items():
            kind = key.split(':')[0]
            if kind in routes:
                self.request('GET', f'/v1/{routes[kind]}/{row["id"]}')

    def run(self, data, home_profile=None):
        # Validate access to all previous objects before making a resumed import's writes.
        self.verify_existing()
        for item in data['projects']:
            payload = {k: item[k] for k in ('name', 'summary')}
            if item.get('parent'): payload['parent_id'] = self.identity('project', item['parent'])
            self.mutate('project:'+item['key'], 'POST', '/v1/projects', json=payload)
        for item in data['assets']:
            raw = (CORPUS / item['path']).read_bytes()
            result = self.mutate('asset:'+item['key'], 'POST', '/v1/assets',
                data={'project_id': self.identity('project', item['project'])},
                files={'file': (Path(item['path']).name, raw, item['mime_type'])})
            if result['sha256'] != digest(raw): raise RuntimeError('Uploaded file digest mismatch')
        for item in data['documents']:
            citations = [{'source_document_id': self.identity('document', c['document']),
                'source_document_version_id': self.row('document', c['document'])['version']['id'],
                'label': c['label'], 'excerpt': c['excerpt']} for c in item['citations']]
            payload = {k: item[k] for k in ('title', 'kind', 'epistemic_status', 'content_text')}
            payload.update(project_id=self.identity('project', item['project']), citations=citations)
            result = self.mutate('document:'+item['key'], 'POST', '/v1/knowledge/items', json=payload)
            identity = result['id']
            for attachment in item['attachments']:
                self.mutate(f'attachment:{item["key"]}:{attachment["asset"]}', 'POST', f'/v1/knowledge/items/{identity}/assets',
                    json={'asset_id': self.identity('asset', attachment['asset']), 'role': attachment['role']})
            if item.get('revision'):
                self.mutate('revision:'+item['key'], 'POST', f'/v1/knowledge/items/{identity}/versions',
                    json={'expected_generation': 1, 'content_text': item['revision'], 'citations': citations})
        for item in data['tasks']:
            result = self.mutate('task:'+item['key'], 'POST', '/v1/tasks', json={
                'project_id': self.identity('project', item['project']), 'title': item['title'],
                'description': item['description'], 'authority_ceiling': 1})
            if item.get('parent') or item.get('milestone'):
                payload = {'expected_version': 1, 'kind': 'milestone' if item.get('milestone') else 'task'}
                if item.get('parent'): payload['parent_task_id'] = self.identity('task', item['parent'])
                self.mutate('structure:'+item['key'], 'PATCH', f'/v1/tasks/{result["id"]}/planning-structure', json=payload)
        for i, item in enumerate(data['dependencies']):
            project_id = self.identity('project', item['project'])
            self.mutate(f'dependency:{i}', 'POST', f'/v1/projects/{project_id}/task-dependencies', json={
                'predecessor_task_id': self.identity('task', item['predecessor']),
                'successor_task_id': self.identity('task', item['successor']),
                'dependency_type': item['dependency_type'], 'lag_seconds': item['lag_seconds']})
        for i, item in enumerate(data['relationships']):
            source_type, source_id = self.ref(item['source']).split(':')
            target_type, target_id = self.ref(item['target']).split(':')
            self.mutate(f'relationship:{i}', 'POST', '/v1/relationships', json={
                'source_type': source_type, 'source_id': source_id, 'relation_type': item['relation'],
                'target_type': target_type, 'target_id': target_id, 'metadata': {'example_corpus': data['id']}})
        if home_profile:
            path = '/v1/ui/workspaces/mycelium.home.navigation/layout'
            if 'home' not in self.state['operations']:
                existing = self.client.get(path)
                if existing.status_code == 404:
                    profile = data['home_profiles'][home_profile]
                    self.mutate('home', 'PUT', path, json={'schema_version': 1, 'layout': {
                        'folders': profile['folders'], 'entries': [{**e, 'ref': self.ref(e['ref'])} for e in profile['entries']]}})
                elif existing.is_success:
                    print('HOME_PRESERVED existing personal home')
                    self.state['operations']['home'] = {'preserved': True}; self.save()
                else: raise RuntimeError(f'Home read: HTTP {existing.status_code}')
        self.verify(data)

    def verify(self, data):
        self.verify_existing()
        for item in data['assets']:
            identity = self.identity('asset', item['key'])
            response = self.client.get(f'/v1/assets/{identity}/content')
            if not response.is_success or digest(response.content) != digest((CORPUS / item['path']).read_bytes()):
                raise RuntimeError('File readback mismatch: '+item['key'])
        observed = set()
        # Visit every imported object; limit=3 deliberately exercises pagination.
        for kind, group in [('project','projects'), ('document','documents'), ('asset','assets'), ('task','tasks')]:
            for item in data[group]:
                path = f'/v1/mycelium/{kind}/{self.identity(kind, item["key"])}'
                cursor, seen = None, set()
                while True:
                    page = self.request('GET', path, params={'limit': 3, **({'cursor': cursor} if cursor else {})})
                    node_ids = {n['id'] for n in page['nodes']}
                    assert page['focus'] in node_ids and len(page['edges']) <= 3
                    assert all(e['source'] in node_ids and e['target'] in node_ids for e in page['edges'])
                    observed.update(e['id'] for e in page['edges'])
                    cursor = page['next_cursor']
                    if not cursor: break
                    assert cursor not in seen, 'Cursor loop'
                    seen.add(cursor)
        for key, row in self.state['operations'].items():
            if key.startswith(('relationship:', 'dependency:')):
                prefix = key.split(':')[0]
                assert f'{prefix}:{row["id"]}' in observed, f'Missing canonical edge: {key}'
        print('VERIFIED files, owned objects, canonical relationships and paginated navigation')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-url', default='http://127.0.0.1:8000')
    parser.add_argument('--apply', action='store_true', help='Create the examples in the authenticated account')
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--development', action='store_true', help='Explicit unauthenticated localhost development mode')
    parser.add_argument('--home-profile', choices=['crypto', 'journalisme', 'recherche'])
    parser.add_argument('--state', type=Path, default=ROOT/'artifacts/mycelium-import-state.json')
    args = parser.parse_args()
    data, corpus_hash = load_corpus()
    print(json.dumps({'corpus': data['id'], **{g: len(data[g]) for g in ('projects','documents','assets','tasks','dependencies','relationships')}, 'mode': 'apply' if args.apply else 'verify' if args.verify_only else 'preview'}, ensure_ascii=False))
    if not args.apply and not args.verify_only: return
    parsed = urlsplit(args.api_url)
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
        raise RuntimeError('Use an API origin without credentials, query, fragment or path.')
    if parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in ('localhost','127.0.0.1','::1')):
        raise RuntimeError('HTTPS is required except on localhost.')
    token = os.environ.get('NEVOLIUM_ACCESS_TOKEN', '')
    if args.development:
        if token or parsed.hostname not in ('localhost','127.0.0.1','::1'):
            raise RuntimeError('Development mode requires localhost and no token.')
        account = 'local-development-user'
    else:
        if not token: raise RuntimeError('Set NEVOLIUM_ACCESS_TOKEN in the environment.')
        try:
            part = token.split('.')[1]
            claims = json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
            account = digest((claims['iss']+'|'+claims['sub']).encode())
        except (IndexError, KeyError, ValueError):
            raise RuntimeError('JWT with issuer and subject required for journal binding.') from None
        # This decoding is only a journal identity; the server validates the token.
    binding = {'server': args.api_url.rstrip('/'), 'account': account, 'corpus': corpus_hash, 'profile': args.home_profile}
    with httpx.Client(base_url=binding['server'], headers={'Authorization': 'Bearer '+token} if token else {}, timeout=30, follow_redirects=False) as client:
        check = client.get('/v1/projects', params={'limit': 1})
        if not check.is_success: raise RuntimeError(f'Access check: HTTP {check.status_code}')
        if args.verify_only and not args.state.exists(): raise RuntimeError('Verification requires the import journal.')
        args.state.parent.mkdir(parents=True, exist_ok=True)
        with args.state.with_suffix(args.state.suffix + '.lock').open('a') as lock:
            try: fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError: raise RuntimeError('Another import holds this journal.') from None
            importer = Importer(client, args.state, binding)
            if args.verify_only: importer.verify(data)
            else: importer.run(data, args.home_profile)


if __name__ == '__main__':
    try: main()
    except (RuntimeError, AssertionError, httpx.HTTPError) as exc:
        raise SystemExit(f'IMPORT STOPPED: {exc}') from None
