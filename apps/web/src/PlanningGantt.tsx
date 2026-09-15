import { useCallback, useMemo, useState, type ComponentProps } from 'react'
import { Gantt, Willow } from '@svar-ui/react-gantt'
import '@svar-ui/react-gantt/all.css'

import { useI18n } from './i18n'

type PlanningGanttTask = {
  id: string
  title: string
  kind: 'task' | 'milestone'
  progress_percent: number
  parent_task_id?: string | null
  planned_start_at?: string | null
  planned_end_at?: string | null
}

type PlanningDependency = {
  id: string
  predecessor_task_id: string
  successor_task_id: string
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF'
  lag_seconds: number
}

type Props = {
  tasks: PlanningGanttTask[]
  dependencies: PlanningDependency[]
  criticalTaskIds?: string[]
  onScheduleProposal: (taskId: string, plannedStartAt: string, plannedEndAt: string) => void
}

type GanttTasks = NonNullable<ComponentProps<typeof Gantt>['tasks']>
type GanttLinks = NonNullable<ComponentProps<typeof Gantt>['links']>
type GanttScales = NonNullable<ComponentProps<typeof Gantt>['scales']>
type GanttInit = NonNullable<ComponentProps<typeof Gantt>['init']>

const LINK_TYPES: Record<PlanningDependency['dependency_type'], 'e2s' | 's2s' | 'e2e' | 's2e'> = {
  FS: 'e2s',
  SS: 's2s',
  FF: 'e2e',
  SF: 's2e',
}

const SCALES: GanttScales = [
  { unit: 'month', step: 1, format: '%M %Y' },
  { unit: 'week', step: 1, format: 'W%w' },
]

function validDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default function PlanningGantt({
  tasks,
  dependencies,
  criticalTaskIds = [],
  onScheduleProposal,
}: Props) {
  const { t } = useI18n()
  const [resetRevision, setResetRevision] = useState(0)

  const mapped = useMemo(() => {
    const critical = new Set(criticalTaskIds)
    const renderable: Array<{ source: PlanningGanttTask; start: Date; end: Date }> = []
    for (const task of tasks) {
      const start = validDate(task.planned_start_at)
      if (!start) continue
      const plannedEnd = validDate(task.planned_end_at)
      if (task.kind === 'milestone') {
        renderable.push({ source: task, start, end: start })
        continue
      }
      if (!plannedEnd || plannedEnd < start) continue
      renderable.push({ source: task, start, end: plannedEnd })
    }

    const ids = new Set(renderable.map(({ source }) => source.id))
    const ganttTasks: GanttTasks = renderable.map(({ source, start, end }) => ({
      id: source.id,
      text: critical.has(source.id) ? `◆ ${source.title}` : source.title,
      start,
      end,
      progress: source.progress_percent,
      type: source.kind === 'milestone' ? 'milestone' : 'task',
      parent: source.parent_task_id && ids.has(source.parent_task_id) ? source.parent_task_id : 0,
      open: true,
    }))
    const ganttLinks: GanttLinks = dependencies
      .filter(
        (dependency) =>
          ids.has(dependency.predecessor_task_id) && ids.has(dependency.successor_task_id),
      )
      .map((dependency) => ({
        id: dependency.id,
        source: dependency.predecessor_task_id,
        target: dependency.successor_task_id,
        type: LINK_TYPES[dependency.dependency_type],
      }))

    return {
      tasks: ganttTasks,
      links: ganttLinks,
      hiddenCount: Math.max(0, tasks.length - ganttTasks.length),
    }
  }, [criticalTaskIds, dependencies, tasks])

  const init = useCallback<GanttInit>((api) => {
    // SVAR remains a renderer/input surface, never the canonical store. Structural actions are
    // blocked; horizontal drag/resize may preview locally, but the final date update is intercepted
    // and handed to Nevolium's preview/validate/apply flow before anything is persisted.
    for (const action of [
      'show-editor',
      'add-task',
      'delete-task',
      'add-link',
      'update-link',
      'delete-link',
      'move-task',
      'copy-task',
      'indent-task',
    ]) {
      api.intercept(action, () => false)
    }
    api.intercept('drag-task', (event) => {
      if (typeof event.top !== 'undefined') return false
    })
    api.intercept('update-task', ({ id, task, inProgress }) => {
      const start = task.start instanceof Date ? task.start : null
      const end = task.end instanceof Date ? task.end : null
      if (!start || !end) return false
      if (inProgress) return undefined

      onScheduleProposal(String(id), start.toISOString(), end.toISOString())
      // Recreate the widget from canonical props immediately after the final gesture, so the local
      // preview cannot survive as parallel state while the user reviews the server-side preview.
      setResetRevision((revision) => revision + 1)
      return false
    })
  }, [onScheduleProposal])

  if (mapped.tasks.length === 0) {
    return (
      <div className="progress-panel planning-gantt-empty">
        <strong>{t('planning.ganttEmpty')}</strong>
        {mapped.hiddenCount > 0 ? (
          <span>{mapped.hiddenCount} {t('planning.ganttHidden')}</span>
        ) : null}
      </div>
    )
  }

  return (
    <section className="planning-gantt" aria-label={t('planning.gantt')}>
      <div className="planning-gantt-note">
        <span>{t('planning.ganttValidatedEdit')}</span>
        {mapped.hiddenCount > 0 ? (
          <small>{mapped.hiddenCount} {t('planning.ganttHidden')}</small>
        ) : null}
      </div>
      <div className="planning-gantt-canvas">
        <Willow>
          <Gantt
            key={resetRevision}
            tasks={mapped.tasks}
            links={mapped.links}
            scales={SCALES}
            init={init}
            autoScale
          />
        </Willow>
      </div>
    </section>
  )
}
