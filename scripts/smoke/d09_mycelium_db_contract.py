#!/usr/bin/env python3
"""Real PostgreSQL: every canonical neighbourhood, pagination, provenance and isolation.

All fixture writes live in one rolled-back transaction. No worker or model is invoked.
"""
import asyncio
import uuid
from fastapi import HTTPException
from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.models import Project, Task, Asset, Artifact, WorkflowExecution, RelationshipRecord
from nevolium_core.document_models import Document, DocumentVersion, DocumentCitation, DocumentAssetLink
from nevolium_core.command_models import Conversation, ConversationMessage, CommandRecord
from nevolium_core.autonomy_models import ApprovalRequest
from nevolium_core.planning_models import TaskPlanningProfile, TaskDependency
from nevolium_core.mycelium import get_neighbourhood, read_node


def principal(subject):
    return Principal(subject=subject, username=subject, email=None, roles=frozenset({'nevolium-user'}), claims={})


async def rejected(code, coroutine):
    try: await coroutine
    except HTTPException as error:
        assert error.status_code == code
    else: raise AssertionError(f'Expected {code}')


async def main():
    owner, stranger = principal('mycelium-proof-owner'), principal('mycelium-proof-stranger')
    async with SessionFactory() as session:
        async def add(row):
            session.add(row); await session.flush(); return row
        project = await add(Project(name='Atelier', owner_subject=owner.subject))
        child = await add(Project(name='Archives', owner_subject=owner.subject, parent_id=project.id))
        foreign = await add(Project(name='Secret', owner_subject=stranger.subject))
        empty = await add(Project(name='Empty', owner_subject=owner.subject))
        task = await add(Task(project_id=project.id, title='Comparer', owner_ref=owner.subject))
        second = await add(Task(project_id=project.id, title='Vérifier', owner_ref=owner.subject))
        await add(TaskPlanningProfile(task_id=second.id, parent_task_id=task.id))
        dependency = await add(TaskDependency(predecessor_task_id=task.id, successor_task_id=second.id))
        asset = await add(Asset(project_id=project.id, bucket='fixture', object_key=str(uuid.uuid4()), mime_type='image/svg+xml', metadata_json={'owner_subject': owner.subject, 'filename':'diagramme.svg'}))
        document = await add(Document(project_id=project.id, title='Idée', kind='idea', asset_id=asset.id, metadata_json={'owner_subject': owner.subject}))
        source = await add(Document(project_id=child.id, title='Source', kind='note', metadata_json={'owner_subject': owner.subject}))
        secret = await add(Document(project_id=foreign.id, title='Secret note', kind='note', metadata_json={'owner_subject': stranger.subject}))
        version = await add(DocumentVersion(document_id=document.id, generation=1, task_id=task.id, content_text='Première version'))
        current = await add(DocumentVersion(document_id=document.id, generation=2, content_text='Version courante'))
        source_version = await add(DocumentVersion(document_id=source.id, generation=1))
        citation = await add(DocumentCitation(document_version_id=version.id, source_document_id=source.id, source_document_version_id=source_version.id, label='Preuve', excerpt='Observation'))
        stale_citation = await add(DocumentCitation(document_version_id=current.id, source_document_id=secret.id, label='Secret source', excerpt='Secret excerpt'))
        attached = await add(DocumentAssetLink(document_id=document.id, asset_id=asset.id, role='whiteboard'))
        execution = await add(WorkflowExecution(task_id=task.id, workflow_id=str(uuid.uuid4()), correlation_id=uuid.uuid4(), status='completed'))
        result = await add(Artifact(project_id=project.id, task_id=task.id, workflow_execution_id=execution.id, kind='note', title='Résultat'))
        approval = await add(ApprovalRequest(task_id=task.id, workflow_execution_id=execution.id, requested_by=owner.subject, action='Review', resource_type='task', authority_level=1, reason='Fixture'))
        conversation = await add(Conversation(subject_ref=owner.subject, title='Conversation'))
        # Core table insert intentionally avoids the memory projection listener in this fixture.
        message_id = uuid.uuid4()
        await session.execute(ConversationMessage.__table__.insert().values(id=message_id, conversation_id=conversation.id, role='user', content='Comparer', metadata_json={}))
        command = await add(CommandRecord(conversation_id=conversation.id, message_id=message_id, task_id=task.id, workflow_execution_id=execution.id, correlation_id=uuid.uuid4()))
        cross = await add(RelationshipRecord(owner_subject=owner.subject, source_type=' Document ', source_id=document.id, relation_type='supports', target_type='document', target_id=source.id))
        hidden = await add(RelationshipRecord(owner_subject=owner.subject, source_type='document', source_id=document.id, relation_type='supports', target_type='document', target_id=secret.id))
        dangling = await add(RelationshipRecord(owner_subject=owner.subject, source_type='document', source_id=document.id, relation_type='references', target_type='document', target_id=uuid.uuid4()))
        invisible = await add(RelationshipRecord(owner_subject=stranger.subject, source_type='document', source_id=document.id, relation_type='references', target_type='document', target_id=source.id))
        alias = await add(RelationshipRecord(owner_subject=owner.subject, source_type='approval-request', source_id=approval.id, relation_type='related_to', target_type='execution', target_id=execution.id))
        all_edges = {}
        identities = [('project', project.id), ('project', child.id), ('task', task.id), ('task', second.id), ('asset', asset.id), ('document', document.id), ('document', source.id), ('citation', citation.id), ('artifact', result.id), ('workflow_execution', execution.id), ('approval', approval.id), ('conversation', conversation.id)]
        for kind, identity in identities:
            cursor, seen, local_edges = None, set(), set()
            while True:
                page = await get_neighbourhood(kind, identity, limit=2, cursor=cursor, principal=owner, session=session)
                assert page.focus == f'{kind}:{identity}'
                assert len(page.edges) <= 2 and len(page.nodes) <= 3
                nodes = {node.id:node for node in page.nodes}
                assert all(edge.source in nodes and edge.target in nodes for edge in page.edges)
                assert 'Secret' not in page.model_dump_json()
                for edge in page.edges:
                    assert edge.id not in local_edges, 'Repeated edge between cursor pages'
                    local_edges.add(edge.id); all_edges[edge.id] = edge
                if not page.next_cursor: break
                assert page.next_cursor not in seen
                seen.add(page.next_cursor); cursor = page.next_cursor
            await rejected(404, get_neighbourhood(kind, identity, limit=2, cursor=None, principal=stranger, session=session))
        expected = {f'document-processing:{version.id}', f'project-parent:{child.id}', f'project-task:{task.id}', f'project-document:{document.id}', f'project-asset:{asset.id}', f'project-artifact:{result.id}', f'task-parent:{second.id}', f'dependency:{dependency.id}', f'source-file:{document.id}', f'document-file:{attached.id}', f'citation:{citation.id}', f'citation-source:{citation.id}', f'task-execution:{execution.id}', f'task-approval:{approval.id}', f'execution-approval:{approval.id}', f'task-result:{result.id}', f'execution-result:{result.id}', f'conversation-task:{command.id}', f'conversation-execution:{command.id}', f'relationship:{cross.id}', f'relationship:{alias.id}'}
        assert expected <= set(all_edges), expected - set(all_edges)
        assert not {f'relationship:{r.id}' for r in [hidden,dangling,invisible]} & set(all_edges)
        assert all_edges[f'dependency:{dependency.id}'].dependencyType == "FS"
        assert all_edges[f'dependency:{dependency.id}'].lagSeconds == 0
        assert all_edges[f'dependency:{dependency.id}'].source == f'task:{second.id}'
        assert all_edges[f'dependency:{dependency.id}'].target == f'task:{task.id}'
        assert not all_edges[f'relationship:{alias.id}'].directed
        found = await read_node(session,'citation',citation.id,owner)
        assert found.citingGeneration == 1 and found.sourceGeneration == 1
        assert (await read_node(session,'document',document.id,owner,preview=True)).summary == 'Version courante'
        assert await read_node(session,'citation',stale_citation.id,owner) is None
        page = await get_neighbourhood('project', empty.id, limit=2, cursor=None, principal=owner, session=session)
        assert len(page.nodes) == 1 and page.edges == [] and page.next_cursor is None
        page = await get_neighbourhood('project', project.id, limit=1, cursor=None, principal=owner, session=session)
        await rejected(422, get_neighbourhood('task',task.id,limit=1,cursor=page.next_cursor,principal=owner,session=session))
        await rejected(422, get_neighbourhood('project',project.id,limit=1,cursor='invalid',principal=owner,session=session))
        # An ownership change hides both the source and its historical citation.
        source.metadata_json={'owner_subject':stranger.subject}; await session.flush()
        assert await read_node(session,'citation',citation.id,owner) is None
        # Document ownership alone cannot bypass the enclosing project's rights.
        document.project_id=foreign.id; await session.flush()
        assert await read_node(session,'document',document.id,owner) is None
        await session.rollback()
    await engine.dispose()
    print('D09 MYCELIUM DB PASS: 9 entity types, canonical edge families, aliases, page bounds, history and owner isolation')


if __name__ == '__main__': asyncio.run(main())
