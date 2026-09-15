#!/usr/bin/env python3
"""Real PostgreSQL proof for the D08 bounded project mindmap projection and mutations."""
from __future__ import annotations

import asyncio

from fastapi import HTTPException, Response
from sqlalchemy import select

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.document_models import Document
from nevolium_core.mindmap import (
    convert_mindmap_idea_to_task,
    create_mindmap_relationship,
    delete_mindmap_relationship,
    get_project_mindmap,
)
from nevolium_core.mindmap_schemas import MindMapIdeaToTaskCreate, MindMapRelationshipCreate
from nevolium_core.models import AuditRecord, OutboxEvent, Project, RelationshipRecord, Task
from nevolium_core.planning_projection import list_project_planning_tasks


def user(subject: str) -> Principal:
    return Principal(
        subject=subject,
        username=subject,
        email=None,
        roles=frozenset({"nevolium-user"}),
        claims={},
    )


async def rejected(code: int, awaitable) -> None:
    try:
        await awaitable
    except HTTPException as exc:
        assert exc.status_code == code, (code, exc.status_code, exc.detail)
        return
    raise AssertionError(f"expected HTTP {code}")


async def main() -> None:
    owner = user("d08-owner")
    foreign = user("d08-foreign")

    async with SessionFactory() as session:
        project = Project(name="D08 map", status="active", owner_subject=owner.subject)
        other_project = Project(name="D08 other", status="active", owner_subject=owner.subject)
        foreign_project = Project(name="D08 foreign", status="active", owner_subject=foreign.subject)
        session.add_all([project, other_project, foreign_project])
        await session.flush()
        project_id = project.id
        other_project_id = other_project.id
        foreign_project_id = foreign_project.id

        task_a = Task(project_id=project_id, title="Task A", owner_ref=owner.subject)
        task_b = Task(project_id=project_id, title="Task B", owner_ref=owner.subject)
        other_task = Task(project_id=other_project_id, title="Other task", owner_ref=owner.subject)
        foreign_task = Task(
            project_id=foreign_project_id,
            title="Foreign task",
            owner_ref=foreign.subject,
        )
        session.add_all([task_a, task_b, other_task, foreign_task])
        await session.flush()
        task_a_id, task_b_id = task_a.id, task_b.id
        other_task_id, foreign_task_id = other_task.id, foreign_task.id

        idea = Document(
            project_id=project_id,
            title="Idea A",
            status="ready",
            kind="idea",
            epistemic_status="supported",
            metadata_json={"owner_subject": owner.subject},
        )
        note = Document(
            project_id=project_id,
            title="Note B",
            status="ready",
            kind="note",
            metadata_json={"owner_subject": owner.subject},
        )
        wrong_owner_document = Document(
            project_id=project_id,
            title="Wrong owner",
            status="ready",
            kind="note",
            metadata_json={"owner_subject": foreign.subject},
        )
        other_idea = Document(
            project_id=other_project_id,
            title="Other idea",
            status="ready",
            kind="idea",
            metadata_json={"owner_subject": owner.subject},
        )
        foreign_note = Document(
            project_id=foreign_project_id,
            title="Foreign note",
            status="ready",
            kind="note",
            metadata_json={"owner_subject": foreign.subject},
        )
        session.add_all([idea, note, wrong_owner_document, other_idea, foreign_note])
        await session.flush()
        idea_id, note_id = idea.id, note.id
        wrong_owner_document_id = wrong_owner_document.id
        other_idea_id, foreign_note_id = other_idea.id, foreign_note.id

        idea_to_task = RelationshipRecord(
            owner_subject=owner.subject,
            source_type="document",
            source_id=idea_id,
            relation_type="supports",
            target_type="task",
            target_id=task_a_id,
            metadata_json={},
        )
        project_to_note = RelationshipRecord(
            owner_subject=owner.subject,
            source_type="project",
            source_id=project_id,
            relation_type="contains",
            target_type="document",
            target_id=note_id,
            metadata_json={},
        )
        cross_project = RelationshipRecord(
            owner_subject=owner.subject,
            source_type="document",
            source_id=idea_id,
            relation_type="related_to",
            target_type="document",
            target_id=other_idea_id,
            metadata_json={},
        )
        stale_wrong_owner = RelationshipRecord(
            owner_subject=owner.subject,
            source_type="document",
            source_id=idea_id,
            relation_type="related_to",
            target_type="document",
            target_id=wrong_owner_document_id,
            metadata_json={},
        )
        foreign_relation = RelationshipRecord(
            owner_subject=foreign.subject,
            source_type="document",
            source_id=foreign_note_id,
            relation_type="supports",
            target_type="task",
            target_id=foreign_task_id,
            metadata_json={},
        )
        session.add_all(
            [
                idea_to_task,
                project_to_note,
                cross_project,
                stale_wrong_owner,
                foreign_relation,
            ]
        )
        await session.flush()
        idea_to_task_id = idea_to_task.id
        project_to_note_id = project_to_note.id
        cross_project_id = cross_project.id
        stale_wrong_owner_id = stale_wrong_owner.id
        foreign_relation_id = foreign_relation.id
        await session.commit()

        snapshot = await get_project_mindmap(
            project_id=project_id,
            task_limit=10,
            document_limit=10,
            relationship_limit=10,
            principal=owner,
            session=session,
        )
        node_keys = {node.key for node in snapshot.nodes}
        assert snapshot.layout_workspace_key == f"mindmap.project.{project_id}"
        assert f"project:{project_id}" in node_keys
        assert f"task:{task_a_id}" in node_keys and f"task:{task_b_id}" in node_keys
        assert f"document:{idea_id}" in node_keys and f"document:{note_id}" in node_keys
        assert f"task:{other_task_id}" not in node_keys
        assert f"document:{other_idea_id}" not in node_keys
        assert f"document:{wrong_owner_document_id}" not in node_keys
        assert f"task:{foreign_task_id}" not in node_keys
        assert f"document:{foreign_note_id}" not in node_keys

        edge_ids = {edge.id for edge in snapshot.edges}
        assert idea_to_task_id in edge_ids
        assert project_to_note_id in edge_ids
        assert cross_project_id not in edge_ids
        assert stale_wrong_owner_id not in edge_ids
        assert foreign_relation_id not in edge_ids
        assert all(edge.directed for edge in snapshot.edges)
        assert snapshot.task_count == 2
        assert snapshot.document_count == 2
        assert snapshot.relationship_count == 2
        assert not snapshot.tasks_truncated
        assert not snapshot.documents_truncated
        assert not snapshot.relationships_truncated

        created = await create_mindmap_relationship(
            project_id=project_id,
            body=MindMapRelationshipCreate(
                source_type="task",
                source_id=task_a_id,
                relation_type="depends_on",
                target_type="task",
                target_id=task_b_id,
            ),
            principal=owner,
            session=session,
        )
        assert created.source_key == f"task:{task_a_id}"
        assert created.target_key == f"task:{task_b_id}"
        assert created.relation_type == "depends_on"
        assert created.directed
        assert created.metadata_json["surface"] == "mindmap"
        assert created.metadata_json["project_id"] == str(project_id)

        related = await create_mindmap_relationship(
            project_id=project_id,
            body=MindMapRelationshipCreate(
                source_type="document",
                source_id=idea_id,
                relation_type="related_to",
                target_type="document",
                target_id=note_id,
            ),
            principal=owner,
            session=session,
        )
        assert not related.directed

        await rejected(
            409,
            create_mindmap_relationship(
                project_id=project_id,
                body=MindMapRelationshipCreate(
                    source_type="task",
                    source_id=task_a_id,
                    relation_type="depends_on",
                    target_type="task",
                    target_id=task_b_id,
                ),
                principal=owner,
                session=session,
            ),
        )
        await rejected(
            404,
            create_mindmap_relationship(
                project_id=project_id,
                body=MindMapRelationshipCreate(
                    source_type="task",
                    source_id=task_a_id,
                    relation_type="related_to",
                    target_type="task",
                    target_id=other_task_id,
                ),
                principal=owner,
                session=session,
            ),
        )
        await rejected(
            409,
            delete_mindmap_relationship(
                project_id=project_id,
                relationship_id=project_to_note_id,
                principal=owner,
                session=session,
            ),
        )

        response = await delete_mindmap_relationship(
            project_id=project_id,
            relationship_id=created.id,
            principal=owner,
            session=session,
        )
        assert response.status_code == 204
        assert await session.get(RelationshipRecord, created.id) is None

        response = await delete_mindmap_relationship(
            project_id=project_id,
            relationship_id=related.id,
            principal=owner,
            session=session,
        )
        assert response.status_code == 204
        assert await session.get(RelationshipRecord, related.id) is None

        conversion = await convert_mindmap_idea_to_task(
            project_id=project_id,
            document_id=idea_id,
            body=MindMapIdeaToTaskCreate(
                title="Converted idea task",
                description="Created explicitly from the D08 idea.",
                priority=1,
            ),
            principal=owner,
            session=session,
        )
        assert conversion.document_id == idea_id
        assert conversion.task_title == "Converted idea task"
        assert conversion.relationship.relation_type == "converted_to"
        assert conversion.relationship.source_key == f"document:{idea_id}"
        assert conversion.relationship.target_key == f"task:{conversion.task_id}"
        assert conversion.relationship.metadata_json["conversion"] is True

        converted_task = await session.get(Task, conversion.task_id)
        assert converted_task is not None
        assert converted_task.project_id == project_id
        assert converted_task.status == "todo"
        assert converted_task.owner_ref == owner.subject
        assert converted_task.priority == 1
        assert converted_task.description == "Created explicitly from the D08 idea."

        planning_response = Response()
        planning_tasks = await list_project_planning_tasks(
            project_id=project_id,
            response=planning_response,
            limit=50,
            cursor=None,
            principal=owner,
            session=session,
        )
        converted_projection = next(
            item for item in planning_tasks if item.id == conversion.task_id
        )
        assert converted_projection.kind == "task"
        assert converted_projection.planning_version == 1
        assert converted_projection.progress_percent == 0

        conversion_snapshot = await get_project_mindmap(
            project_id=project_id,
            task_limit=10,
            document_limit=10,
            relationship_limit=20,
            principal=owner,
            session=session,
        )
        assert f"task:{conversion.task_id}" in {node.key for node in conversion_snapshot.nodes}
        assert conversion.relationship.id in {edge.id for edge in conversion_snapshot.edges}

        conversion_events = list(
            (
                await session.execute(
                    select(OutboxEvent).where(
                        OutboxEvent.aggregate_id.in_(
                            [conversion.task_id, conversion.relationship.id]
                        )
                    )
                )
            ).scalars()
        )
        assert {event.event_type for event in conversion_events} == {
            "task.created",
            "relationship.created",
        }
        assert len({event.correlation_id for event in conversion_events}) == 1

        conversion_audits = list(
            (
                await session.execute(
                    select(AuditRecord).where(
                        AuditRecord.resource_id.in_(
                            [str(conversion.task_id), str(conversion.relationship.id)]
                        )
                    )
                )
            ).scalars()
        )
        assert {audit.action for audit in conversion_audits} == {
            "task.create",
            "relationship.create",
        }
        assert len({audit.correlation_id for audit in conversion_audits}) == 1

        await rejected(
            409,
            convert_mindmap_idea_to_task(
                project_id=project_id,
                document_id=idea_id,
                body=MindMapIdeaToTaskCreate(),
                principal=owner,
                session=session,
            ),
        )
        await rejected(
            409,
            convert_mindmap_idea_to_task(
                project_id=project_id,
                document_id=note_id,
                body=MindMapIdeaToTaskCreate(),
                principal=owner,
                session=session,
            ),
        )
        await rejected(
            404,
            convert_mindmap_idea_to_task(
                project_id=project_id,
                document_id=other_idea_id,
                body=MindMapIdeaToTaskCreate(),
                principal=owner,
                session=session,
            ),
        )
        await rejected(
            404,
            convert_mindmap_idea_to_task(
                project_id=project_id,
                document_id=idea_id,
                body=MindMapIdeaToTaskCreate(),
                principal=foreign,
                session=session,
            ),
        )
        await rejected(
            409,
            delete_mindmap_relationship(
                project_id=project_id,
                relationship_id=conversion.relationship.id,
                principal=owner,
                session=session,
            ),
        )

        after_delete = await get_project_mindmap(
            project_id=project_id,
            task_limit=10,
            document_limit=10,
            relationship_limit=20,
            principal=owner,
            session=session,
        )
        assert created.id not in {edge.id for edge in after_delete.edges}
        assert related.id not in {edge.id for edge in after_delete.edges}
        assert conversion.relationship.id in {edge.id for edge in after_delete.edges}

        small = await get_project_mindmap(
            project_id=project_id,
            task_limit=1,
            document_limit=1,
            relationship_limit=1,
            principal=owner,
            session=session,
        )
        assert small.task_count == 1 and small.tasks_truncated
        assert small.document_count == 1 and small.documents_truncated
        assert small.relationship_count <= 1

        relationship_limited = await get_project_mindmap(
            project_id=project_id,
            task_limit=10,
            document_limit=10,
            relationship_limit=1,
            principal=owner,
            session=session,
        )
        assert relationship_limited.relationship_count == 1
        assert relationship_limited.relationships_truncated

        await rejected(
            404,
            get_project_mindmap(
                project_id=project_id,
                task_limit=10,
                document_limit=10,
                relationship_limit=10,
                principal=foreign,
                session=session,
            ),
        )
        await rejected(
            404,
            delete_mindmap_relationship(
                project_id=project_id,
                relationship_id=idea_to_task_id,
                principal=foreign,
                session=session,
            ),
        )

    await engine.dispose()
    print(
        "D08 POSTGRES PASS: bounded owner-scoped map, typed links and atomic idea conversion "
        "produce canonical Tasks visible through Planning while provenance remains durable"
    )


if __name__ == "__main__":
    asyncio.run(main())
