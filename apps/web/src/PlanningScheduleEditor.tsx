import { useEffect, useMemo, useState } from 'react'

import { useI18n } from './i18n'
import { nevoliumFetch } from './lib/apiClient'

type EditableTask = {
  id: string
  title: string
  kind: 'task' | 'milestone'
  planning_version: number
  planned_start_at?: string | null
  planned_end_at?: string | null
  due_at?: string | null
}

type PlanningWindow = {
  planned_start_at?: string | null
  planned_end_at?: string | null
  due_at?: string | null
}

type DependencyFinding = {
  dependency_id: string
  predecessor_task_id: string
  successor_task_id: string
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF'
  lag_seconds: number
  status: 'satisfied' | 'incomplete' | 'violated'
  detail: string
}

type ReplanPreview = {
  project_id: string
  preview_digest: string
  can_apply: boolean
  changed_task_count: number
  changes: Array<{
    task_id: string
    current_version: number
    expected_version: number
    current: PlanningWindow
    proposed: PlanningWindow
    changed_fields: Array<'planned_start_at' | 'planned_end_at' | 'due_at'>
  }>
  dependency_findings: DependencyFinding[]
}

type AppliedTask = {
  task_id: string
  planning_version: number
  changed_fields: Array<'planned_start_at' | 'planned_end_at' | 'due_at'>
}

type Props = {
  apiUrl: string
  projectId: string
  task: EditableTask
  onCancel: () => void
  onApplied: (task: EditableTask & PlanningWindow, result: AppliedTask) => void
}

function localInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function canonicalTimestamp(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : detail?.message
    throw new Error(message || `Nevolium ${response.status}`)
  }
  return body as T
}

export default function PlanningScheduleEditor({
  apiUrl,
  projectId,
  task,
  onCancel,
  onApplied,
}: Props) {
  const { t } = useI18n()
  const [plannedStart, setPlannedStart] = useState(() => localInputValue(task.planned_start_at))
  const [plannedEnd, setPlannedEnd] = useState(() => localInputValue(task.planned_end_at))
  const [due, setDue] = useState(() => localInputValue(task.due_at))
  const [preview, setPreview] = useState<ReplanPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPlannedStart(localInputValue(task.planned_start_at))
    setPlannedEnd(localInputValue(task.planned_end_at))
    setDue(localInputValue(task.due_at))
    setPreview(null)
    setError(null)
  }, [task])

  const proposed = useMemo<PlanningWindow>(() => {
    const start = canonicalTimestamp(plannedStart)
    return {
      planned_start_at: start,
      planned_end_at: task.kind === 'milestone' && start ? start : canonicalTimestamp(plannedEnd),
      due_at: canonicalTimestamp(due),
    }
  }, [due, plannedEnd, plannedStart, task.kind])

  const update = {
    task_id: task.id,
    expected_version: task.planning_version,
    ...proposed,
  }

  function invalidatePreview() {
    setPreview(null)
    setError(null)
  }

  function dependencyStatusLabel(status: DependencyFinding['status']) {
    if (status === 'satisfied') return t('planning.scheduleDependencySatisfied')
    if (status === 'incomplete') return t('planning.scheduleDependencyIncomplete')
    return t('planning.scheduleDependencyViolated')
  }

  async function requestPreview() {
    setPreviewing(true)
    setError(null)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/planning/replan/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: [update] }),
        },
      )
      setPreview(await readJson<ReplanPreview>(response))
    } catch (cause) {
      setPreview(null)
      setError(cause instanceof Error ? cause.message : t('planning.schedulePreviewError'))
    } finally {
      setPreviewing(false)
    }
  }

  async function applyPreview() {
    if (!preview || !preview.can_apply || preview.changed_task_count === 0) return
    setApplying(true)
    setError(null)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/planning/replan/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: [update], preview_digest: preview.preview_digest }),
        },
      )
      const result = await readJson<{ updated: AppliedTask[] }>(response)
      const applied = result.updated.find((item) => item.task_id === task.id)
      if (!applied) throw new Error(t('planning.scheduleApplyError'))
      onApplied({ ...task, ...proposed, planning_version: applied.planning_version }, applied)
    } catch (cause) {
      setPreview(null)
      setError(cause instanceof Error ? cause.message : t('planning.scheduleApplyError'))
    } finally {
      setApplying(false)
    }
  }

  return (
    <section className="planning-schedule-editor" aria-labelledby="planning-schedule-editor-title">
      <div className="planning-schedule-editor-heading">
        <div>
          <span className="eyebrow">{t('planning.scheduleEditorEyebrow')}</span>
          <h3 id="planning-schedule-editor-title">{task.title}</h3>
        </div>
        <span className="run-state">v{task.planning_version}</span>
      </div>

      <div className="planning-schedule-fields">
        <label>
          {t('planning.scheduleStart')}
          <input
            type="datetime-local"
            value={plannedStart}
            onChange={(event) => {
              setPlannedStart(event.target.value)
              if (task.kind === 'milestone') setPlannedEnd(event.target.value)
              invalidatePreview()
            }}
          />
        </label>
        <label>
          {t('planning.scheduleEnd')}
          <input
            type="datetime-local"
            value={task.kind === 'milestone' ? plannedStart : plannedEnd}
            disabled={task.kind === 'milestone'}
            onChange={(event) => {
              setPlannedEnd(event.target.value)
              invalidatePreview()
            }}
          />
        </label>
        <label>
          {t('planning.scheduleDue')}
          <input
            type="datetime-local"
            value={due}
            onChange={(event) => {
              setDue(event.target.value)
              invalidatePreview()
            }}
          />
        </label>
      </div>

      {task.kind === 'milestone' ? <small>{t('planning.scheduleMilestoneHint')}</small> : null}
      {error ? <div className="error-panel">{error}</div> : null}

      {preview ? (
        <div className={`planning-replan-preview${preview.can_apply ? ' is-valid' : ' is-invalid'}`}>
          <strong>
            {preview.can_apply ? t('planning.schedulePreviewValid') : t('planning.schedulePreviewInvalid')}
          </strong>
          <span>
            {preview.changed_task_count} {t('planning.scheduleChangedTasks')} · {' '}
            {preview.dependency_findings.length} {t('planning.scheduleCheckedDependencies')}
          </span>
          {preview.changed_task_count === 0 ? <small>{t('planning.scheduleNoChange')}</small> : null}
          {preview.dependency_findings.length > 0 ? (
            <ul>
              {preview.dependency_findings.map((finding) => (
                <li key={finding.dependency_id} data-status={finding.status}>
                  <strong>{finding.dependency_type}</strong> · {dependencyStatusLabel(finding.status)}
                  {finding.lag_seconds > 0 ? ` · +${finding.lag_seconds}s` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <small>{t('planning.schedulePreviewRequired')}</small>
      )}

      <div className="planning-schedule-actions">
        <button type="button" onClick={onCancel} disabled={previewing || applying}>
          {t('planning.cancel')}
        </button>
        <button type="button" onClick={() => void requestPreview()} disabled={previewing || applying}>
          {previewing ? t('planning.schedulePreviewing') : t('planning.schedulePreview')}
        </button>
        <button
          type="button"
          onClick={() => void applyPreview()}
          disabled={!preview?.can_apply || preview.changed_task_count === 0 || previewing || applying}
        >
          {applying ? t('planning.scheduleApplying') : t('planning.scheduleApply')}
        </button>
      </div>
    </section>
  )
}
