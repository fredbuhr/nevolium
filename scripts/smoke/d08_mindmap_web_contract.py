#!/usr/bin/env python3
"""Static Web contract for the D08 XYFlow mindmap surface."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKSPACE = ROOT / "apps/web/src/MindMapWorkspace/index.tsx"
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
    persistence = (WORKSPACE.parent / "useLayoutPersistence.ts").read_text(encoding="utf-8")
    cockpit = (ROOT / "apps/web/src/CockpitShell.tsx").read_text(encoding="utf-8")
    stability = (ROOT / "scripts/smoke/d08_mindmap_stability.mjs").read_text(encoding="utf-8")
    runner = (ROOT / "scripts/smoke/d08_mindmap_browser_qualification.mjs").read_text(encoding="utf-8")

    # Canonical projection in, layout projection out: no business copy in Web.
    assert "/v1/projects/${encodeURIComponent(selectedProjectId)}/mindmap" in workspace
    assert "/v1/ui/workspaces/${encodeURIComponent(nextSnapshot.layout_workspace_key)}/layout" in workspace
    assert "schema_version: 1" in persistence
    assert "positions: Record<string, SavedPosition>" in workspace
    assert "groups?: Record<string" in workspace
    assert "buildRadialMindMapLayout" in workspace
    assert "@nevolium/graph" in workspace
    assert "@nevolium/graph" in vite
    assert "@nevolium/graph" in tsconfig
    assert '"baseUrl"' not in tsconfig
    assert "COPY packages/graph ./packages/graph" in dockerfile
    assert "Math.random" not in graph

    # Internal measurement changes must never feed a controlled React loop.
    assert "<ReactFlow" in workspace
    assert "defaultNodes={renderedNodes}" in workspace
    assert "defaultEdges={renderedEdges}" in workspace
    assert "useNodesState" not in workspace
    assert "onNodesChange=" not in workspace
    assert "nodes={renderedNodes" not in workspace
    assert "nodes={visibleNodes.map" not in workspace
    assert "edges={visibleEdges.map" not in workspace
    assert "const DEFAULT_VIEWPORT" in workspace
    assert "const FIT_VIEW_OPTIONS" in workspace
    assert "const PRO_OPTIONS" in workspace
    assert "const collapsedGroups = useMemo(" in workspace
    assert "const renderedNodes = useMemo<FlowNode[]>" in workspace
    assert "const renderedEdges = useMemo<Edge[]>" in workspace
    assert "key={flowKey}" in workspace

    assert "onNodeDragStop" in workspace
    assert "onMoveEnd" in workspace
    assert "selectionOnDrag" in workspace
    assert 'multiSelectionKeyCode="Shift"' in workspace
    assert "async function undo()" in workspace
    assert "async function redo()" in workspace
    assert "type HistoryEntry" in workspace
    assert "type FilterMode" in workspace
    assert 'type="search"' in workspace
    assert "window.history.replaceState" in workspace

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

    assert "type MindMapGroup" in workspace
    assert "crypto.randomUUID()" in workspace
    assert "function createGroup()" in workspace
    assert "function toggleGroup(" in workspace
    assert "function deleteGroup(" in workspace
    assert "layout-group:${groupId}" in workspace
    assert "mindmap-node-group" in workspace
    assert "/convert-to-task`" in workspace
    assert "async function convertSelectedIdea()" in workspace
    assert "await refreshSnapshot(taskKey)" in workspace
    assert "task:${conversion.task_id}" in workspace

    assert "function exportMindMap()" in workspace
    assert "schema: 'nevolium-mindmap-v1'" in workspace
    assert "relationships: snapshot.edges" in workspace
    assert "layout," in workspace
    assert "nevolium-mindmap-${snapshot.project_id}.json" in workspace
    assert "import MindMapWorkspace from './MindMapWorkspace'" in app
    assert "key: 'mindmap'" in app
    assert "content: <MindMapWorkspace apiUrl={API_URL} />" in app
    assert "./mindmap.css" in main_tsx

    for key in (
        "mindmap.panelTitle", "mindmap.heading", "mindmap.projectRequired",
        "mindmap.search", "mindmap.filter", "mindmap.undo", "mindmap.redo", "mindmap.export",
        "mindmap.linkEditor", "mindmap.linkSource", "mindmap.linkTarget", "mindmap.linkRelation",
        "mindmap.useSelection", "mindmap.groups", "mindmap.groupCreate", "mindmap.convertIdea",
        "mindmap.kind.idea", "mindmap.status.supported", "mindmap.relation.converted_to",
    ):
        assert i18n.count(f"'{key}'") == 2, key

    # Locale is presentation, not a workspace restore trigger. Runtime proof below
    # verifies the same mounted workspace, project and local history survive.
    assert "restoreAndAttachRef.current(event.api)" in cockpit
    assert "panel.api.setTitle(definition.title)" in cockpit
    assert "apiRef.current === api" in cockpit
    assert "tRef.current('mindmap.loadError')" in workspace
    assert "}, [apiUrl, selectedProjectId, replaceLayout])" in workspace
    assert "onSelectionDragStart" in workspace and "onSelectionDragStop" in workspace
    assert "for (const node of affected)" in workspace
    assert "recordLayout({ ...current, positions }, before)" in workspace
    assert "data-save-state={persistence.status}" in workspace
    assert "onClick={persistence.retry}" in workspace
    assert "if (this.inFlight) return" in persistence
    assert "this.acknowledged = revision" in persistence
    assert "this.publish('error'" in persistence
    assert "Disposition non enregistrée" in persistence and "Layout not saved" in persistence
    assert "await qualifyMindMapStability(" in runner
    for marker in (
        "stability:joint-drag", "stability:locale-with-history",
        "stability:joint-undo-redo-after-locale", "stability:save-failure-retains-local-layout",
        "stability:serialized-latest-snapshot", "stability:reload-both-positions",
    ):
        assert marker in stability, marker

    print(
        "D08 WEB CONTRACT PASS: canonical uncontrolled XYFlow, typed links, export, "
        "FR/EN, stable cockpit lifetime, whole-selection history and acknowledged serial saves"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
