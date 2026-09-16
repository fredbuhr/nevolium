import { useCallback, useEffect, useRef, useState } from 'react'
import { useLayoutPersistence } from '../MindMapWorkspace/useLayoutPersistence'
import { nevoliumFetch } from '../lib/apiClient'
import { getAuthSnapshot, subscribeAuthSession } from '../lib/authSession'
import { DEFAULT_PRESENTATION, readPresentation, type SpatialPresentation } from './presentation'

export function useSpatialPresentation(apiUrl: string, projectId: string, options?: { workspaceKey?: string; defaultView?: '2d' | '3d' }) {
  const workspaceKey = options?.workspaceKey || `mycelium3d.project.${projectId}`
  const defaultView = options?.defaultView || '2d'
  const persistence = useLayoutPersistence<SpatialPresentation>(apiUrl, workspaceKey)
  const [value, setValue] = useState(DEFAULT_PRESENTATION)
  const valueRef = useRef(value)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const origin = getAuthSnapshot()
    const guard = () => {
      const current = getAuthSnapshot()
      if (current.subject !== origin.subject || current.enabled !== origin.enabled
        || (origin.enabled && !current.authenticated)) {
        controller.abort(); setReady(false); setLoadError(true)
      }
    }
    const unsubscribe = subscribeAuthSession(guard)
    setReady(false); setLoadError(false)
    void (async () => {
      try {
        const response = await nevoliumFetch(
          `${apiUrl}/v1/ui/workspaces/${encodeURIComponent(workspaceKey)}/layout`,
          { signal: controller.signal },
        )
        let next = { ...DEFAULT_PRESENTATION, view: defaultView }
        if (response.status !== 404) {
          if (!response.ok) throw new Error('Spatial layout unavailable')
          const saved = await response.json()
          if (saved.schema_version !== 1) throw new Error('Unsupported spatial layout')
          next = readPresentation(saved.layout)
        }
        guard()
        if (controller.signal.aborted) return
        // Phone starts in 2D. Enabling 3D is always an explicit, reversible choice there.
        if (window.matchMedia('(max-width: 600px)').matches) next = { ...next, view: '2d' }
        valueRef.current = next; setValue(next); setReady(true)
      } catch {
        if (!controller.signal.aborted) setLoadError(true)
      }
    })()
    return () => { controller.abort(); unsubscribe() }
  }, [apiUrl, workspaceKey, defaultView, revision])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (persistence.writer.dirty) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [persistence.writer])

  const update = useCallback((patch: Partial<SpatialPresentation>) => {
    if (!ready) return
    const next = readPresentation({ ...valueRef.current, ...patch })
    valueRef.current = next; setValue(next); persistence.save(next)
  }, [ready, persistence.save])

  return {
    value, ready, loadError, persistence, update, unavailable,
    view: ready && !unavailable ? value.view : '2d',
    restore: () => setRevision(current => current + 1),
    fail: useCallback(() => setUnavailable(true), []),
    retry3d: () => { setUnavailable(false); update({ view: '3d' }) },
  }
}
