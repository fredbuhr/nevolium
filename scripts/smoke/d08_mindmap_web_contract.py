#!/usr/bin/env python3
"""Static Web contract for the D08 XYFlow mindmap surface."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKSPACE = ROOT / "apps/web/src/MindMapWorkspace.tsx"
APP = ROOT / "apps/web/src/App.tsx"
MAIN = ROOT / "apps/web/src/main.tsx"
I18N = ROOT / "apps/web/src/i18n.tsx"
VITE = ROOT / "apps/web/vite.config.ts"
TSCONFIG = ROOT / "apps/web/tsconfig.json"
GRAPH = ROOT / "packages/graph/src/mindmap.ts"


def main() -> int:
    workspace = WORKSPACE.read_text(encoding="utf-8")
    app = APP.read_text(encoding="utf-8")
    main_tsx = MAIN.read_text(encoding="utf-8")
    i18n = I18N.read_text(encoding="utf-8")
    vite = VITE.read_text(encoding="utf-8")
    tsconfig = TSCONFIG.read_text(encoding="utf-8")
    graph = GRAPH.read_text(encoding="utf-8")

    # Canonical projection in, layout projection out: no business copy in Web.
    assert "/v1/projects/${encodeURIComponent(selectedProjectId)}/mindmap" in workspace
    assert "/v1/ui/workspaces/${encodeURIComponent(nextSnapshot.layout_workspace_key)}/layout" in workspace
    assert "schema_version: 1" in workspace
    assert "positions: Record<string, SavedPosition>" in workspace
    assert "groups?: Record<string" in workspace
    assert "buildRadialMindMapLayout" in workspace
    assert "@nevolium/graph" in workspace
    assert "@nevolium/graph" in vite
    assert "@nevolium/graph" in tsconfig
    assert "Math.random" not in graph

    # Renderer/input capabilities required by the D08 slice.
    assert "<ReactFlow" in workspace
    assert "useNodesState" in workspace
    assert "onNodeDragStop" in workspace
    assert "onMoveEnd" in workspace
    assert "selectionOnDrag" in workspace
    assert 'multiSelectionKeyCode="Shift"' in workspace
    assert "function undo()" in workspace
    assert "function redo()" in workspace
    assert "type FilterMode" in workspace
    assert "type=\"search\"" in workspace
    assert "window.history.replaceState" in workspace
    assert "mindmap" in workspace

    # Mindmap is a cockpit panel, not a D05 home-geometry rewrite.
    assert "import MindMapWorkspace from './MindMapWorkspace'" in app
    assert "key: 'mindmap'" in app
    assert "content: <MindMapWorkspace apiUrl={API_URL} />" in app
    assert "./mindmap.css" in main_tsx

    # All new user-visible D08 strings use the central FR/EN catalogue.
    for key in (
        "mindmap.panelTitle",
        "mindmap.heading",
        "mindmap.projectRequired",
        "mindmap.search",
        "mindmap.filter",
        "mindmap.undo",
        "mindmap.redo",
        "mindmap.truncated",
        "mindmap.relation.converted_to",
    ):
        assert i18n.count(f"'{key}'") == 2, key

    print(
        "D08 WEB CONTRACT PASS: Core identities feed XYFlow, deterministic fallback/layout remain "
        "presentation-only, and the new surface is FR/EN with search, selection and undo/redo"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
