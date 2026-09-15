#!/usr/bin/env python3
"""Static Web contract for D07 editable knowledge."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EDITOR = ROOT / "apps/web/src/KnowledgeEditor.tsx"
WORKSPACE = ROOT / "apps/web/src/KnowledgeWorkspace.tsx"
SEARCH = ROOT / "apps/web/src/KnowledgeSearchPanel.tsx"
TYPES = ROOT / "apps/web/src/knowledgeTypes.ts"
MESSAGES = ROOT / "apps/web/src/knowledgeMessages.ts"
ACTIONS = ROOT / "apps/web/src/knowledgeDocumentActions.ts"
MAIN = ROOT / "apps/web/src/main.tsx"
CSS = ROOT / "apps/web/src/knowledge.css"


def main() -> int:
    editor = EDITOR.read_text(encoding="utf-8")
    workspace = WORKSPACE.read_text(encoding="utf-8")
    search = SEARCH.read_text(encoding="utf-8")
    types = TYPES.read_text(encoding="utf-8")
    messages = MESSAGES.read_text(encoding="utf-8")
    actions = ACTIONS.read_text(encoding="utf-8")
    main = MAIN.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    # Lexical is the editing surface, while Core DocumentVersion remains canonical.
    for marker in (
        "LexicalComposer",
        "RichTextPlugin",
        "OnChangePlugin",
        "editorState.toJSON()",
        "$getRoot().getTextContent()",
    ):
        assert marker in editor, marker
    assert "content_json: draftJson" in editor
    assert "content_text: draftText" in editor
    assert "expected_generation: latest.generation" in editor
    assert "/versions/${selectedVersion.id}/restore" in editor
    assert "/v1/knowledge/versions/${latest.id}/citations" in editor
    assert "/v1/knowledge/import" in editor
    assert "/export?format=" in editor
    assert "KnowledgeEditor" in workspace and "<KnowledgeEditor" in workspace

    # Authored documents coexist with imported sources; no fake Asset is invented.
    assert "asset_id: string | null" in types
    assert "kind: KnowledgeKind" in types
    assert "content_json?: Record<string, unknown> | null" in types
    assert "search_status?: 'pending' | 'ready' | 'failed'" in types
    assert "!selectedDocument.asset_id" in actions
    assert "selectedDocument.kind !== 'source'" in actions

    # D07 search is owner-wide by default and only adds project_id for an explicit scope.
    assert "const [projectOnly, setProjectOnly] = useState(false)" in search
    assert "if (scoped && selectedProjectId) params.set('project_id', selectedProjectId)" in search
    assert "if (!selectedProjectId || searchQuery.length" not in search
    assert "searchAll" in search and "searchProject" in search

    # New D07 UI strings participate in the D06 FR/EN language foundation.
    assert "fr:" in messages and "en:" in messages
    assert "useI18n" in messages
    assert "Write, source and version your ideas and decisions." in messages
    assert "Écrivez, sourcez et versionnez vos idées et décisions." in messages

    assert "import './knowledge.css'" in main
    assert ".knowledge-editor-content" in css
    assert "@media(max-width:620px)" in css

    print(
        "D07 KNOWLEDGE WEB PASS: Lexical serializes into canonical version payloads, optimistic "
        "generations and restore are explicit, universal search is owner-wide by default, source "
        "actions stay Asset-bound, and new surfaces are bilingual/responsive"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
