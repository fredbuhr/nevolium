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
DOCKERFILE = ROOT / "apps/web/Dockerfile"
GRAPH = ROOT / "packages/graph/src/mindmap.ts"


def main() -> int:
    workspace = WORKSPACE.read_text(encoding="utf-8")
    app = APP.read_text(encoding="utf-8")
    main_tsx = MAIN.read_text(encoding="utf-8")
    i18n = I18N.read_text(encoding="utf-8")
    vite = VITE.read_text(encoding="utf-8")
    tsconfig = TSCONFIG.read_text(encoding="utf-8")
    dockerfile = DOCKERFILE.read_text(encoding="utf-8")
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
    assert '"baseUrl"' not in tsconfig
    assert "COPY packages/graph ./packages/graph" in dockerfile
    assert "Math.random" not in graph

    # Renderer/input capabilities required by the D08 slice.
    assert "<ReactFlow" in workspace
    assert "useNodesState" in workspace
    assert "onNodeDragStop" in workspace
    assert "onMoveEnd" in workspace
    assert "selectionOnDrag" in workspace
    assert 'multiSelectionKeyCode="Shift"' in workspace
    assert "async function undo()" in workspace
    assert "async function redo()" in workspace
    assert "type HistoryEntry" in workspace
    assert "type FilterMode" in workspace
    assert "type=\"search\"" in workspace
    assert "window.history.replaceState" in workspace

    # Link editing is explicit/touch-usable and reuses Core mutations rather than XYFlow truth.
    assert "/mindmap/relationships`" in workspace
    assert "/mindmap/relationships/${encodeURIComponent(edge.id)}`" in workspace
    assert "async function createLink()" in workspace
    assert "async function deleteSelectedLink()" in workspace
    assert "function useSelectionForLink()" in workspace
    assert "function swapLinkDirection()" in workspace
    assert "metadata_json.surface === 'mindmap'" in workspace
    assert "selectedEdge.relation_type !== 'converted_to'" in workspace
    assert "selectedEdge.metadata_json.conversion !== true" in workspace
    assert "linkSourceKey" in workspace
    assert "linkTargetKey" in workspace
    assert "linkRelation" in workspace

    # Layout-only groups stay in WorkspaceLayout; collapsed groups are presentation nodes only.
    assert "type MindMapGroup" in workspace
    assert "crypto.randomUUID()" in workspace
    assert "function createGroup()" in workspace
    assert "function toggleGroup(" in workspace
    assert "function deleteGroup(" in workspace
    assert "layout-group:${groupId}" in workspace
    assert "mindmap-node-group" in workspace

    # Idea conversion hits the atomic Core endpoint and reloads canonical data afterward.
    assert "/convert-to-task`" in workspace
    assert "async function convertSelectedIdea()" in workspace
    assert "await refreshSnapshot(taskKey)" in workspace
    assert "task:${conversion.task_id}" in workspace

    # Export preserves canonical node ids, relationships and user layout in one documented payload.
    assert "function exportMindMap()" in workspace
    assert "schema: 'nevolium-mindmap-v1'" in workspace
    assert "relationships: snapshot.edges" in workspace
    assert "layout," in workspace
    assert "nevolium-mindmap-${snapshot.project_id}.json" in workspace

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
        "mindmap.export",
        "mindmap.linkEditor",
        "mindmap.linkSource",
        "mindmap.linkTarget",
        "mindmap.linkRelation",
        "mindmap.useSelection",
        "mindmap.groups",
        "mindmap.groupCreate",
        "mindmap.convertIdea",
        "mindmap.kind.idea",
        "mindmap.status.supported",
        "mindmap.relation.converted_to",
    ):
        assert i18n.count(f"'{key}'") == 2, key

    print(
        "D08 WEB CONTRACT PASS: Core identities feed XYFlow; layout/groups stay presentation-only; "
        "typed links, export, deep links and idea conversion are explicit and FR/EN"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
