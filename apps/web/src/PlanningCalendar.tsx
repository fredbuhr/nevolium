import { useEffect, useMemo, useState } from 'react'

import { useI18n } from './i18n'
import { nevoliumFetch } from './lib/apiClient'

type CalendarTask = {
  id: string
  source_task_id?: string
  title: string
  kind: 'task' | 'milestone'
  status: string
  planned_start_at?: string | null
  planned_end_at?: string | null
  due_at?: string | null
  recurrence_rule?: string | null
  planning_version?: number
}

type VirtualOccurrence = {
  id: string
  source_task_id: string
  project_id: string
  number: number
  title: string
  status: string
  kind: 'task' | 'milestone'
  timezone: string
  planning_version: number
  start_at: string
  end_at?: string | null
  due_at?: string | null
  virtual: true
}

type Props = {
  apiUrl: string
  projectId: string
  tasks: CalendarTask[]
  onEditSchedule: (taskId: string) => void
}

type CalendarEntry = {
  task: CalendarTask
  kind: 'planned' | 'due'
}

function validDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function entriesForDay(tasks: CalendarTask[], day: Date): CalendarEntry[] {
  const start = startOfLocalDay(day)
  const end = addDays(start, 1)
  const result: CalendarEntry[] = []
  for (const task of tasks) {
    const plannedStart = validDate(task.planned_start_at)
    const plannedEnd = validDate(task.planned_end_at)
    if (plannedStart) {
      const pointInDay = !plannedEnd || plannedEnd.getTime() === plannedStart.getTime()
        ? plannedStart >= start && plannedStart < end
        : false
      const rangeOverlapsDay = plannedEnd && plannedEnd > plannedStart
        ? plannedStart < end && plannedEnd > start
        : false
      if (pointInDay || rangeOverlapsDay) result.push({ task, kind: 'planned' })
    }
    const due = validDate(task.due_at)
    if (due && due >= start && due < end) result.push({ task, kind: 'due' })
  }
  return result.sort((left, right) => {
    const leftTime = validDate(
      left.kind === 'due' ? left.task.due_at : left.task.planned_start_at,
    )?.getTime() ?? 0
    const rightTime = validDate(
      right.kind === 'due' ? right.task.due_at : right.task.planned_start_at,
    )?.getTime() ?? 0
    return leftTime - rightTime || left.task.title.localeCompare(right.task.title)
  })
}

function editTaskId(task: CalendarTask) {
  return task.source_task_id || task.id
}

export default function PlanningCalendar({ apiUrl, projectId, tasks, onEditSchedule }: Props) {
  const { locale, t, formatDateTime } = useI18n()
  const today = useMemo(() => startOfLocalDay(new Date()), [])
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDay, setSelectedDay] = useState(today)
  const [occurrences, setOccurrences] = useState<VirtualOccurrence[]>([])
  const [recurrenceLoading, setRecurrenceLoading] = useState(false)
  const [recurrenceError, setRecurrenceError] = useState(false)

  const gridDays = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const mondayOffset = (first.getDay() + 6) % 7
    const gridStart = addDays(first, -mondayOffset)
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [visibleMonth])

  const windowBounds = useMemo(() => ({
    start: startOfLocalDay(gridDays[0]),
    end: addDays(startOfLocalDay(gridDays[gridDays.length - 1]), 1),
  }), [gridDays])
  const recurringTasks = tasks.filter((task) => Boolean(task.recurrence_rule))
  const hasRecurringTasks = recurringTasks.length > 0
  const recurrenceRevision = recurringTasks
    .map((task) => `${task.id}:${task.planning_version || 1}:${task.recurrence_rule}`)
    .sort()
    .join('|')

  useEffect(() => {
    setOccurrences([])
    setRecurrenceError(false)
    if (!hasRecurringTasks) {
      setRecurrenceLoading(false)
      return
    }

    const controller = new AbortController()
    setRecurrenceLoading(true)
    void (async () => {
      try {
        const collected: VirtualOccurrence[] = []
        let cursor = ''
        for (let page = 0; page < 10; page += 1) {
          const params = new URLSearchParams({
            from: windowBounds.start.toISOString(),
            to: windowBounds.end.toISOString(),
            limit: '1000',
          })
          if (cursor) params.set('cursor', cursor)
          const response = await nevoliumFetch(
            `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/planning/occurrences?${params}`,
            { signal: controller.signal },
          )
          if (!response.ok) throw new Error(`Nevolium ${response.status}`)
          const body = await response.json() as VirtualOccurrence[]
          collected.push(...body)
          cursor = response.headers.get('X-Nevolium-Next-Cursor') || ''
          if (!cursor) break
        }
        if (!controller.signal.aborted) setOccurrences(collected)
      } catch {
        if (!controller.signal.aborted) setRecurrenceError(true)
      } finally {
        if (!controller.signal.aborted) setRecurrenceLoading(false)
      }
    })()

    return () => controller.abort()
  }, [apiUrl, hasRecurringTasks, projectId, recurrenceRevision, windowBounds])

  const calendarTasks = useMemo<CalendarTask[]>(() => [
    ...tasks,
    ...occurrences.map((occurrence) => ({
      id: occurrence.id,
      source_task_id: occurrence.source_task_id,
      title: occurrence.title,
      kind: occurrence.kind,
      status: occurrence.status,
      planned_start_at: occurrence.start_at,
      planned_end_at: occurrence.end_at,
      due_at: occurrence.due_at,
      recurrence_rule: 'virtual',
      planning_version: occurrence.planning_version,
    })),
  ], [occurrences, tasks])

  const weekdays = useMemo(() => {
    const monday = new Date(2026, 8, 14)
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    return Array.from({ length: 7 }, (_, index) => formatter.format(addDays(monday, index)))
  }, [locale])

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth)
  const selectedEntries = entriesForDay(calendarTasks, selectedDay)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  function changeMonth(delta: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1)
    setVisibleMonth(next)
  }

  function goToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(today)
  }

  return (
    <section className="planning-calendar" aria-label={t('planning.calendar')}>
      <div className="planning-calendar-toolbar">
        <div>
          <strong>{monthLabel}</strong>
          <small>{t('planning.calendarTimezone')} · {timezone}</small>
        </div>
        <div className="planning-calendar-nav">
          <button type="button" onClick={() => changeMonth(-1)} aria-label={t('planning.calendarPrevious')}>
            ‹
          </button>
          <button type="button" onClick={goToday}>{t('planning.calendarToday')}</button>
          <button type="button" onClick={() => changeMonth(1)} aria-label={t('planning.calendarNext')}>
            ›
          </button>
        </div>
      </div>

      {recurrenceLoading ? <small>{t('planning.calendarRecurrenceLoading')}</small> : null}
      {recurrenceError ? <div className="error-panel">{t('planning.calendarRecurrenceError')}</div> : null}

      <div className="planning-calendar-scroll">
        <div className="planning-calendar-weekdays" aria-hidden="true">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="planning-calendar-grid">
          {gridDays.map((day) => {
            const entries = entriesForDay(calendarTasks, day)
            const key = dayKey(day)
            const currentMonth = day.getMonth() === visibleMonth.getMonth()
            const selected = key === dayKey(selectedDay)
            const current = key === dayKey(today)
            return (
              <div
                key={key}
                className={`planning-calendar-day${currentMonth ? '' : ' is-outside'}${selected ? ' is-selected' : ''}`}
              >
                <button
                  type="button"
                  className="planning-calendar-date"
                  aria-current={current ? 'date' : undefined}
                  aria-pressed={selected}
                  onClick={() => setSelectedDay(day)}
                >
                  {day.getDate()}
                </button>
                <div className="planning-calendar-events">
                  {entries.slice(0, 3).map((entry, index) => (
                    <button
                      key={`${entry.task.id}:${entry.kind}:${index}`}
                      type="button"
                      className={`planning-calendar-event is-${entry.kind}`}
                      onClick={() => {
                        setSelectedDay(day)
                        onEditSchedule(editTaskId(entry.task))
                      }}
                      title={entry.task.title}
                    >
                      {entry.task.source_task_id ? '↻ ' : entry.kind === 'due' ? '◇ ' : ''}
                      {entry.task.title}
                    </button>
                  ))}
                  {entries.length > 3 ? <small>+{entries.length - 3}</small> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="planning-calendar-agenda">
        <div>
          <span className="eyebrow">{t('planning.calendarAgenda')}</span>
          <strong>{formatDateTime(selectedDay, { dateStyle: 'full' })}</strong>
        </div>
        {selectedEntries.length === 0 ? (
          <small>{t('planning.calendarEmptyDay')}</small>
        ) : (
          <div className="planning-calendar-agenda-list">
            {selectedEntries.map((entry, index) => {
              const timestamp = entry.kind === 'due'
                ? entry.task.due_at
                : entry.task.planned_start_at
              return (
                <button
                  key={`${entry.task.id}:${entry.kind}:${index}`}
                  type="button"
                  onClick={() => onEditSchedule(editTaskId(entry.task))}
                >
                  <span>
                    <strong>{entry.task.title}</strong>
                    <small>
                      {entry.kind === 'due' ? t('planning.due') : t('planning.planned')}
                      {entry.task.recurrence_rule ? ` · ${t('planning.recurring')}` : ''}
                    </small>
                  </span>
                  <span>
                    {timestamp ? formatDateTime(timestamp, { timeStyle: 'short' }) : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
