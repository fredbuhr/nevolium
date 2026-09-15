#!/usr/bin/env python3
"""Real PostgreSQL proof for the D07 editable-knowledge exit path."""
from __future__ import annotations

import asyncio
import uuid
from fastapi import HTTPException
from sqlalchemy import delete, select

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.document_models import Document, DocumentChunk, DocumentVersion
from nevolium_core.editable_knowledge import (
    AuthoredKnowledgeCreate, AuthoredKnowledgeRestore, AuthoredKnowledgeVersionCreate,
    CitationCreate, DocumentAssetLinkCreate, DocumentMetadataUpdate,
    create_authored_knowledge, create_authored_version, create_document_asset_link,
    list_version_citations, restore_authored_version, update_authored_metadata,
)
from nevolium_core.knowledge import search_knowledge
from nevolium_core.knowledge_exchange import (
    KnowledgeImportRequest, export_knowledge, import_knowledge,
)
from nevolium_core.models import Asset, Project


def user(subject: str) -> Principal:
    return Principal(subject=subject, username=subject, email=None,
                     roles=frozenset({"nevolium-user"}), claims={})


async def rejected(code: int, awaitable) -> None:
    try:
        await awaitable
    except HTTPException as exc:
        assert exc.status_code == code, (code, exc.status_code, exc.detail)
        return
    raise AssertionError(f"expected HTTP {code}")


async def main() -> None:
    owner, foreign = user("d07-owner"), user("d07-foreign")
    async with SessionFactory() as session:
        p_source = Project(name="D07 source", owner_subject=owner.subject)
        p_decision = Project(name="D07 decision", owner_subject=owner.subject)
        p_foreign = Project(name="D07 foreign", owner_subject=foreign.subject)
        session.add_all([p_source, p_decision, p_foreign]); await session.flush()
        source_project_id, decision_project_id = p_source.id, p_decision.id
        foreign_project_id = p_foreign.id

        asset = Asset(project_id=source_project_id, bucket="d07-proof",
                      object_key=f"proof-{uuid.uuid4()}.txt", mime_type="text/plain",
                      size_bytes=10, sha256="3" * 64,
                      metadata_json={"owner_subject": owner.subject})
        foreign_asset = Asset(project_id=foreign_project_id, bucket="d07-proof",
                              object_key=f"foreign-{uuid.uuid4()}.txt", mime_type="text/plain",
                              size_bytes=10, sha256="4" * 64,
                              metadata_json={"owner_subject": foreign.subject})
        session.add_all([asset, foreign_asset]); await session.flush()
        asset_id, foreign_asset_id = asset.id, foreign_asset.id
        await session.commit()

        imported = await import_knowledge(
            KnowledgeImportRequest(
                project_id=source_project_id, format="markdown", title="Architecture source",
                kind="note", epistemic_status="supported",
                payload="# Architecture evidence\n\nUse a modular architecture with explicit ownership."),
            owner, session)
        assert imported.generation == 1 and imported.version.search_status == "ready"
        source_id, source_version_id = imported.id, imported.version.id
        source_chunk = await session.scalar(select(DocumentChunk).where(
            DocumentChunk.document_version_id == source_version_id).order_by(DocumentChunk.ordinal))
        assert source_chunk is not None
        source_chunk_id = source_chunk.id

        first = await create_authored_knowledge(
            AuthoredKnowledgeCreate(
                project_id=decision_project_id, title="Architecture decision", kind="decision",
                epistemic_status="supported", content_json={"text": "modular"},
                content_text="Choose modular architecture for the Nevolium workspace.",
                citations=[CitationCreate(source_document_id=source_id,
                    source_document_version_id=source_version_id, source_chunk_id=source_chunk_id,
                    label="Architecture evidence")]), owner, session)
        assert first.generation == 1 and first.version.content_sha256
        doc_id, v1 = first.id, first.version.id
        cites = await list_version_citations(v1, owner, session)
        assert len(cites) == 1 and cites[0].source_chunk_id == source_chunk_id

        found = await search_knowledge(q="modular architecture", project_id=None, offset=0,
                                       limit=20, principal=owner, session=session)
        assert any(r.document_id == doc_id and r.document_project_id == decision_project_id for r in found)
        scoped = await search_knowledge(q="Nevolium workspace", project_id=source_project_id, offset=0,
                                        limit=20, principal=owner, session=session)
        assert doc_id not in {r.document_id for r in scoped}
        hidden = await search_knowledge(q="modular architecture", project_id=None, offset=0,
                                        limit=20, principal=foreign, session=session)
        assert doc_id not in {r.document_id for r in hidden}
        await rejected(404, search_knowledge(q="modular architecture", project_id=decision_project_id,
                                             offset=0, limit=20, principal=foreign, session=session))
        await session.rollback()

        second = await create_authored_version(doc_id, AuthoredKnowledgeVersionCreate(
            expected_generation=1, content_json={"text": "modular-v2"},
            content_text="Keep modular architecture and record provenance.",
            citations=[CitationCreate(source_document_id=source_id,
                source_document_version_id=source_version_id, source_chunk_id=source_chunk_id)]),
            owner, session)
        assert second.generation == 2
        await rejected(409, create_authored_version(doc_id, AuthoredKnowledgeVersionCreate(
            expected_generation=1, content_json={}, content_text="stale"), owner, session))
        await session.rollback()

        third = await update_authored_metadata(doc_id, DocumentMetadataUpdate(
            expected_generation=2, title="Architecture decision — approved",
            epistemic_status="verified"), owner, session)
        assert third.generation == 3 and third.version.content_text == second.version.content_text
        restored = await restore_authored_version(doc_id, v1,
                                                   AuthoredKnowledgeRestore(expected_generation=3),
                                                   owner, session)
        assert restored.generation == 4 and restored.version.content_text == first.version.content_text
        assert restored.title.endswith("approved") and restored.epistemic_status == "verified"
        assert restored.version.metadata_json["restored_from_version_id"] == str(v1)

        linked = await create_document_asset_link(doc_id, DocumentAssetLinkCreate(
            asset_id=asset_id, role="attachment", label="Evidence"), owner, session)
        assert linked.asset_id == asset_id
        await rejected(404, create_document_asset_link(doc_id, DocumentAssetLinkCreate(
            asset_id=foreign_asset_id, role="attachment"), owner, session))
        await session.rollback()
        await rejected(404, create_authored_version(doc_id, AuthoredKnowledgeVersionCreate(
            expected_generation=4, content_json={}, content_text="foreign"), foreign, session))
        await session.rollback()

        broken = await session.get(DocumentVersion, restored.version.id, with_for_update=True)
        assert broken is not None
        broken_id = broken.id
        broken.search_status, broken.search_error = "failed", "forced D07 projection failure"
        await session.execute(delete(DocumentChunk).where(DocumentChunk.document_version_id == broken_id))
        await session.commit()
        canonical = await session.get(DocumentVersion, broken_id)
        assert canonical is not None
        assert canonical.content_text == first.version.content_text and canonical.search_status == "failed"
        assert len(await list_version_citations(broken_id, owner, session)) == 1
        missing = await search_knowledge(q="Nevolium workspace", project_id=None, offset=0,
                                         limit=20, principal=owner, session=session)
        assert doc_id not in {r.document_id for r in missing}

        recovered = await restore_authored_version(doc_id, v1,
                                                    AuthoredKnowledgeRestore(expected_generation=4),
                                                    owner, session)
        assert recovered.generation == 5 and recovered.version.search_status == "ready"
        found_again = await search_knowledge(q="Nevolium workspace", project_id=None, offset=0,
                                             limit=20, principal=owner, session=session)
        assert doc_id in {r.document_id for r in found_again}

        exported = await export_knowledge(doc_id, "nevolium-json", owner, session)
        assert exported.lossless and exported.media_type == "application/vnd.nevolium.knowledge+json"
        copied = await import_knowledge(KnowledgeImportRequest(
            project_id=source_project_id, format="nevolium-json", payload=exported.content,
            title="Architecture decision copy"), owner, session)
        assert copied.generation == 1 and copied.version.content_text == recovered.version.content_text
        assert len(await list_version_citations(copied.version.id, owner, session)) == 1

        versions = list((await session.execute(select(DocumentVersion).where(
            DocumentVersion.document_id == doc_id).order_by(DocumentVersion.generation))).scalars())
        assert [v.generation for v in versions] == [1, 2, 3, 4, 5]
        assert versions[2].metadata_json["title"] == "Architecture decision — approved"
        assert versions[3].search_status == "failed" and versions[4].search_status == "ready"
        owned_copy = await session.scalar(select(Document).where(
            Document.id == copied.id,
            Document.metadata_json["owner_subject"].astext == owner.subject))
        assert owned_copy is not None

    await engine.dispose()
    print("D07 POSTGRES PASS: import, sourced decision, global search, version restore, Assets, isolation, projection recovery and lossless export/import")


if __name__ == "__main__":
    asyncio.run(main())
