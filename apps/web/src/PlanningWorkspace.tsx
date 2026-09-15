import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

import { useI18n } from './i18n'
import { nevoliumFetch } from './lib/apiClient'
import { usePagedCollection } from './lib/usePagedCollection'
import { useProjectSelection } from './lib/projectSelection'

type PlanningTask = {
  id: string
  project_id: string
  title: string
  description?: string | null
  status: string
  priority: number
  planned_start_at?: string | null
  planned_end_at?: string | null
  due_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  parent_task_id?: string | null
  kind: 'task' | 'milestone'
  progress_percent: number
  planning_version: number
  recurrence_rule?: string | null
  recurrence_timezone?: string | null
}

type Props = {
  apiUrl: string
}

type ViewMode = 'list' | 'kanban'
type KanbanColumnKey = 'todo' | 'execution' | 'done'

const COLUMN_ORDER: KanbanColumnKey[] = ['todo', 'execution', 'done']

function columnForStatus(status: string): KanbanColumnKey {
  if (status === 'todo') return 'todo'
  if (status === 'queued' || status === 'running') return 'execution'
  return 'done'
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

function DraggableTaskCard({
  task,
  disabled,
  children,
}: {
  task: PlanningTask
  disabled: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled,
  })
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.55 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  return (
    <article
      ref={setNodeRef}
      className="planning-card"
      style={style}
      {...(!disabled ? attributes : {})}
      {...(!disabled ? listeners : {})}
    >
      {children}
    </article>
  )
}

function KanbanColumn({
  id,
  title,
  tasks,
  renderTask,
}: {
  id: KanbanColumnKey
  title: string
  tasks: PlanningTask[]
  renderTask: (task: PlanningTask) => ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `planning-column:${id}` })
  return (
    <section
      ref={setNodeRef}
      className={`planning-column${isOver ? ' is-over' : ''}`}
      aria-label={title}
    >
      <div className="planning-column-heading">
        <strong>{title}</strong>
        <span>{tasks.length}</span>
      </div>
      <div className="planning-column-body">{tasks.map(renderTask)}</div>
    </section>
  )
}

export default function PlanningWorkspace({ apiUrl }: Props) {
  const { selectedProjectId } = useProjectSelection()
  const { t, formatDateTime } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const page = usePagedCollection<PlanningTask>(
    selectedProjectId
      ? `${apiUrl}/v1/projects/${encodeURIComponent(selectedProjectId)}/planning/tasks`
      : null,
  )

  const grouped = useMemo(() => {
    const result: Record<KanbanColumnKey, PlanningTask[]> = {
      todo: [],
      execution: [],
      done: [],
    }
    for (const task of page.items) result[columnForStatus(task.status)].push(task)
    return result
  }, [page.items])

  function statusLabel(status: string) {
    if (status === 'todo') return t('planning.column.todo')
    if (status === 'queued' || status === 'running') return t('planning.column.execution')
    if (status === 'failed') return t('planning.failed')
    return t('planning.column.done')
  }

  function formatPlanningDate(value?: string | null) {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return formatDateTime(parsed, { dateStyle: 'medium', timeStyle: 'short' })
  }

  function timingLabel(task: PlanningTask) {
    const due = formatPlanningDate(task.due_at)
    if (due) return `${t('planning.due')} · ${due}`
    const start = formatPlanningDate(task.planned_start_at)
    const end = formatPlanningDate(task.planned_end_at)
    if (start && end) return `${t('planning.planned')} · ${start} → ${end}`
    if (start) return `${t('planning.planned')} · ${start}`
    return t('planning.noDate')
  }

  async function updateManualStatus(task: PlanningTask, status: 'todo' | 'completed') {
    if (task.status === status) return
    setSavingTaskId(task.id)
    setMutationError(null)
    try {
      const response = await nevoliumFetch(`${apiUrl}/v1/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const updated = await readJson<PlanningTask>(response)
      page.setItems((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: updated.status,
                started_at: updated.started_at,
                completed_at: updated.completed_at,
                updated_at: updated.updated_at,
              }
            : item,
        ),
      )
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : t('planning.errorUpdate'))
    } finally {
      setSavingTaskId(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const task = page.items.find((item) => item.id === String(event.active.id))
    const target = event.over?.id ? String(event.over.id) : ''
    if (!task || !target.startsWith('planning-column:')) return
    const column = target.slice('planning-column:'.length) as KanbanColumnKey
    const nextStatus = column === 'todo' ? 'todo' : column === 'done' ? 'completed' : null
    if (!nextStatus) return
    if (!['todo', 'completed'].includes(task.status)) return
    void updateManualStatus(task, nextStatus)
  }

  function renderTaskCard(task: PlanningTask) {
    const workflowManaged = ['queued', 'running'].includes(task.status)
    const disabled = workflowManaged || task.status === 'failed' || savingTaskId === task.id
    return (
      <DraggableTaskCard key={task.id} task={task} disabled={disabled}>
        <div className="planning-card-topline">
          <span className="source-id">P{task.priority}</span>
          <span>{task.kind === 'milestone' ? t('planning.milestone') : t('planning.task')}</span>
        </div>
        <strong>{task.title}</strong>
        {task.description ? <small>{task.description}</small> : null}
        <small>{timingLabel(task)}</small>
        <div className="planning-card-meta">
          <span>{t('planning.progress')} · {task.progress_percent}%</span>
          {task.parent_task_id ? <span>{t('planning.parent')}</span> : null}
          {task.recurrence_rule ? <span>{t('planning.recurring')}</span> : null}
          {workflowManaged ? <span>{t('planning.executionLocked')}</span> : null}
        </div>
      </DraggableTaskCard>
    )
  }

  if (!selectedProjectId) {
    return (
      <section className="news-workspace planning-workspace" aria-labelledby="planning-heading">
        <div className="news-heading">
          <div>
            <span className="eyebrow">{t('planning.eyebrow')}</span>
            <h2 id="planning-heading">{t('planning.heading')}</h2>
          </div>
        </div>
        <div className="progress-panel"><strong>{t('planning.projectRequired')}</strong></div>
      </section>
    )
  }

  return (
    <section className="news-workspace planning-workspace" aria-labelledby="planning-heading">
      <div className="news-heading">
        <div>
          <span className="eyebrow">{t('planning.eyebrow')}</span>
          <h2 id="planning-heading">{t('planning.heading')}</h2>
        </div>
        <span className="run-state">{page.items.length} {t('planning.taskCount')}</span>
      </div>

      <div className="planning-toolbar" role="group" aria-label={t('planning.panelTitle')}>
        <button
          type="button"
          className={viewMode === 'list' ? 'is-active' : ''}
          aria-pressed={viewMode === 'list'}
          onClick={() => setViewMode('list')}
        >
          {t('planning.list')}
        </button>
        <button
          type="button"
          className={viewMode === 'kanban' ? 'is-active' : ''}
          aria-pressed={viewMode === 'kanban'}
          onClick={() => setViewMode('kanban')}
        >
          {t('planning.kanban')}
        </button>
        {viewMode === 'kanban' ? <small>{t('planning.dragHint')}</small> : null}
      </div>

      {(mutationError || page.error) ? <div className="error-panel">{mutationError || page.error}</div> : null}
      {page.loading && page.items.length === 0 ? (
        <div className="progress-panel"><strong>{t('planning.loading')}</strong></div>
      ) : null}
      {!page.loading && page.items.length === 0 && !page.error ? (
        <div className="progress-panel"><strong>{t('planning.empty')}</strong></div>
      ) : null}

      {viewMode === 'list' && page.items.length > 0 ? (
        <div className="planning-list-wrap">
          <table className="planning-list">
            <thead>
              <tr>
                <th>{t('planning.task')}</th>
                <th>{t('planning.priority')}</th>
                <th>{t('planning.progress')}</th>
                <th>{t('planning.planned')}</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <small>{statusLabel(task.status)} · {task.kind === 'milestone' ? t('planning.milestone') : t('planning.task')}</small>
                  </td>
                  <td>P{task.priority}</td>
                  <td>{task.progress_percent}%</td>
                  <td>{timingLabel(task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {viewMode === 'kanban' && page.items.length > 0 ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="planning-kanban">
            {COLUMN_ORDER.map((column) => (
              <KanbanColumn
                key={column}
                id={column}
                title={t(`planning.column.${column}` as 'planning.column.todo' | 'planning.column.execution' | 'planning.column.done')}
                tasks={grouped[column]}
                renderTask={renderTaskCard}
              />
            ))}
          </div>
        </DndContext>
      ) : null}

      {page.hasMore ? (
        <button type="button" disabled={page.loading} onClick={() => void page.loadMore()}>
          {t('planning.loadMore')}
        </button>
      ) : null}
    </section>
  )
}
