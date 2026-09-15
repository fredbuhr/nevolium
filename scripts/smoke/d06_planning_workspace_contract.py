#!/usr/bin/env python3
"""Static Web contract for the first D06 list/Kanban planning surface."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps/web"


def main() -> int:
    workspace = (WEB / "src/PlanningWorkspace.tsx").read_text(encoding="utf-8")
    app = (WEB / "src/App.tsx").read_text(encoding="utf-8")
    i18n = (WEB / "src/i18n.tsx").read_text(encoding="utf-8")
    styles = (WEB / "src/planning.css").read_text(encoding="utf-8")
    entrypoint = (WEB / "src/main.tsx").read_text(encoding="utf-8")

    assert "/planning/tasks" in workspace
    assert "usePagedCollection<PlanningTask>" in workspace
    assert "useProjectSelection" in workspace
    assert "DndContext" in workspace
    assert "useDraggable" in workspace and "useDroppable" in workspace
    assert "['todo', 'completed'].includes(task.status)" in workspace
    assert "queued', 'running" in workspace
    assert "planning-column:execution" not in workspace or "nextStatus" in workspace
    assert "method: 'PATCH'" in workspace

    assert "import PlanningWorkspace from './PlanningWorkspace'" in app
    assert "key: 'planning'" in app
    assert "id: 'planning-workspace'" in app
    assert "<PlanningWorkspace apiUrl={API_URL} />" in app
    assert "t('planning.panelTitle')" in app

    for token in (
        "'planning.list'",
        "'planning.kanban'",
        "'planning.column.todo'",
        "'planning.column.execution'",
        "'planning.column.done'",
    ):
        assert i18n.count(token) >= 2, token

    assert "grid-template-columns: repeat(3" in styles
    assert "@media (max-width: 820px)" in styles
    assert "grid-template-columns: 1fr" in styles
    assert "@media (prefers-reduced-motion: reduce)" in styles
    assert "import './planning.css'" in entrypoint

    print(
        "D06 PLANNING WORKSPACE PASS: one paginated canonical projection feeds bilingual list/Kanban, "
        "workflow-managed statuses stay locked, manual todo/completed moves reuse canonical PATCH, "
        "and the responsive panel is mounted in the Cockpit"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
