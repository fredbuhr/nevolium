import { useCallback, useEffect, useState } from 'react'

import { nevoliumFetch } from './apiClient'

export type CriticalPathView = {
  project_id: string
  basis: 'elapsed_seconds'
  network_complete: boolean
  project_duration_seconds: number
  project_task_count: number
  eligible_task_count: number
  dependency_count: number
  critical_task_ids: string[]
  critical_dependency_ids: string[]
  excluded_task_ids: string[]
  excluded_dependency_ids: string[]
  tasks: Array<{
    task_id: string
    earliest_start_seconds: number
    earliest_finish_seconds: number
    latest_start_seconds: number
    latest_finish_seconds: number
    slack_seconds: number
    critical: boolean
  }>
}

export function usePlanningCriticalPath(apiUrl: string, projectId: string | null) {
  const [data, setData] = useState<CriticalPathView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((current) => current + 1), [])

  useEffect(() => {
    setData(null)
    setError(null)
    if (!projectId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    void (async () => {
      try {
        const response = await nevoliumFetch(
          `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/planning/critical-path`,
          { signal: controller.signal },
        )
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          const detail = body?.detail
          throw new Error(typeof detail === 'string' ? detail : detail?.message || `Nevolium ${response.status}`)
        }
        if (!controller.signal.aborted) setData(body as CriticalPathView)
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Critical path unavailable.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [apiUrl, projectId, revision])

  return { data, loading, error, refresh }
}
