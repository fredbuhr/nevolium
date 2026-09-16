import { useCallback, useEffect, useRef, useState } from 'react'
import { nevoliumFetch } from '../lib/apiClient'
import { getAuthSnapshot, subscribeAuthSession } from '../lib/authSession'
import { useLayoutPersistence } from '../MindMapWorkspace/useLayoutPersistence'
import { DEFAULT_HOME, HOME_KEY, readHomeLayout, type HomeLayout } from './model'

export function useHomeLayout(apiUrl: string) {
  const [value, setValue] = useState<HomeLayout>(DEFAULT_HOME)
  const [previous, setPrevious] = useState<HomeLayout | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const latest = useRef(value)
  const persistence = useLayoutPersistence<HomeLayout>(apiUrl, HOME_KEY)
  useEffect(() => {
    const controller = new AbortController(), origin = getAuthSnapshot()
    const guard = () => {
      const now = getAuthSnapshot()
      if (now.subject !== origin.subject || now.enabled !== origin.enabled || (origin.enabled && !now.authenticated)) {
        controller.abort(); setReady(false); setValue(DEFAULT_HOME); setPrevious(null); setError(true)
      }
    }
    const unsubscribe = subscribeAuthSession(guard)
    setReady(false); setError(false)
    void nevoliumFetch(`${apiUrl}/v1/ui/workspaces/${HOME_KEY}/layout`, { signal: controller.signal }).then(async response => {
      if (response.status === 404) return structuredClone(DEFAULT_HOME)
      if (!response.ok) throw new Error('Home unavailable')
      const saved = await response.json()
      if (saved.schema_version !== 1) throw new Error('Unknown home layout')
      return readHomeLayout(saved.layout)
    }).then(next => {
      guard()
      if (!controller.signal.aborted) { latest.current = next; setValue(next); setReady(true); setPrevious(null) }
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => { controller.abort(); unsubscribe() }
  }, [apiUrl, revision])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (persistence.writer.dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [persistence.writer])
  const update = useCallback((change: (current: HomeLayout) => HomeLayout) => {
    if (!ready) return
    const next = readHomeLayout(change(latest.current))
    setPrevious(latest.current); latest.current = next; setValue(next); persistence.save(next)
  }, [ready, persistence.save])
  return { value, ready, error, update, persistence, canUndo: Boolean(previous),
    undo: () => { if (previous) update(() => previous) }, reload: () => setRevision(x => x + 1) }
}
