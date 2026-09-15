#!/usr/bin/env python3
"""Static Web contract for the D06 list/Kanban/Gantt planning surface."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps/web"


def main() -> int:
    workspace = (WEB / "src/PlanningWorkspace.tsx").read_text(encoding="utf-8")
    gantt = (WEB / "src/PlanningGantt.tsx").read_text(encoding="utf-8")
    schedule_editor = (WEB / "src/PlanningScheduleEditor.tsx").read_text(encoding="utf-8")
    critical_hook = (WEB / "src/lib/usePlanningCriticalPath.ts").read_text(encoding="utf-8")
    app = (WEB / "src/App.tsx").read_text(encoding="utf-8")
    i18n = (WEB / "src/i18n.tsx").read_text(encoding="utf-8")
    styles = (WEB / "src/planning.css").read_text(encoding="utf-8")
    entrypoint = (WEB / "src/main.tsx").read_text(encoding="utf-8")

    assert "/planning/tasks" in workspace
    assert "usePagedCollection<PlanningTask>" in workspace
    assert "usePagedCollection<TaskDependency>" in workspace
    assert "/task-dependencies?limit=100" in workspace
    assert "useProjectSelection" in workspace
    assert "usePlanningCriticalPath" in workspace
    assert "criticalTaskIds" in workspace
    assert "planning-critical-summary" in workspace
    assert "planning-critical-badge" in workspace
    assert "PlanningScheduleEditor" in workspace
    assert "setEditingTaskId(task.id)" in workspace
    assert "criticalPath.refresh()" in workspace
    assert "DndContext" in workspace
    assert "useDraggable" in workspace and "useDroppable" in workspace
    assert "['todo', 'completed'].includes(task.status)" in workspace
    assert "queued', 'running" in workspace
    assert "planning-column:execution" not in workspace or "nextStatus" in workspace
    # Legacy PATCH remains for manual todo/completed status only; schedule dates use replan preview/apply.
    assert "body: JSON.stringify({ status })" in workspace
    assert "planned_start_at" not in workspace.split("body: JSON.stringify({ status })")[0].split("method: 'PATCH'")[-1]
    assert "criticalTaskIds={criticalPath.data?.critical_task_ids || []}" in workspace

    assert "/planning/replan/preview" in schedule_editor
    assert "/planning/replan/apply" in schedule_editor
    assert "preview_digest: preview.preview_digest" in schedule_editor
    assert "!preview?.can_apply" in schedule_editor
    assert "preview.changed_task_count === 0" in schedule_editor
    assert "setPreview(null)" in schedule_editor
    assert "onCancel" in schedule_editor
    assert "planning_version: applied.planning_version" in schedule_editor
    assert "/v1/tasks/" not in schedule_editor
    assert "type=\"datetime-local\"" in schedule_editor
    assert "canonicalTimestamp" in schedule_editor

    assert "/planning/critical-path" in critical_hook
    assert "critical_task_ids" in critical_hook
    assert "AbortController" in critical_hook
    assert "const refresh = useCallback" in critical_hook

    assert "import { Gantt, Willow } from '@svar-ui/react-gantt'" in gantt
    assert "@svar-ui/react-gantt/all.css" in gantt
    assert "ComponentProps<typeof Gantt>" in gantt
    assert "readonly" in gantt
    assert "FS: 'e2s'" in gantt
    assert "SS: 's2s'" in gantt
    assert "FF: 'e2e'" in gantt
    assert "SF: 's2e'" in gantt
    assert "if (!plannedEnd || plannedEnd < start) continue" in gantt
    assert "source.kind === 'milestone'" in gantt
    assert "criticalTaskIds" in gantt
    assert "`◆ ${source.title}`" in gantt

    assert "import PlanningWorkspace from './PlanningWorkspace'" in app
    assert "key: 'planning'" in app
    assert "id: 'planning-workspace'" in app
    assert "<PlanningWorkspace apiUrl={API_URL} />" in app
    assert "t('planning.panelTitle')" in app

    for token in (
        "'planning.list'",
        "'planning.kanban'",
        "'planning.gantt'",
        "'planning.column.todo'",
        "'planning.column.execution'",
        "'planning.column.done'",
        "'planning.ganttReadonly'",
        "'planning.critical'",
        "'planning.criticalPath'",
        "'planning.networkIncomplete'",
        "'planning.editSchedule'",
        "'planning.schedulePreview'",
        "'planning.scheduleApply'",
        "'planning.cancel'",
    ):
        assert i18n.count(token) >= 2, token

    assert "grid-template-columns: repeat(3" in styles
    assert ".planning-gantt-canvas" in styles
    assert ".planning-card.is-critical" in styles
    assert ".planning-list tr.is-critical" in styles
    assert ".planning-critical-summary" in styles
    assert ".planning-schedule-editor" in styles
    assert ".planning-replan-preview.is-invalid" in styles
    assert ".planning-schedule-actions" in styles
    assert "@media (max-width: 820px)" in styles
    assert "grid-template-columns: 1fr" in styles
    assert "@media (prefers-reduced-motion: reduce)" in styles
    assert "import './planning.css'" in entrypoint

    print(
        "D06 PLANNING WORKSPACE PASS: one canonical projection feeds bilingual List/Kanban/"
        "read-only Gantt, workflow-managed statuses stay locked, Core critical-path results are "
        "surfaced, and schedule mutations require cancellable preview/validate/apply instead of "
        "writing dates directly through the legacy Task PATCH"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
