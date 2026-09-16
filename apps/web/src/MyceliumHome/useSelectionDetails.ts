import { useEffect, useState } from 'react'
import { nevoliumFetch } from '../lib/apiClient'
import { getAuthSnapshot, subscribeAuthSession } from '../lib/authSession'
import { ENTITY_REF, type BrowserPage } from './model'

// A selected item's first bounded neighbourhood is useful without a second navigation gesture.
export function useSelectionDetails(apiUrl: string, selected: string, active: boolean, revision: number) {
  const [page, setPage] = useState<BrowserPage | null>(null)
  const [position, setPosition] = useState<{ ref: string; cursor: string | null }>({ ref: '', cursor: null })
  const [loading, setLoading] = useState(false), [error, setError] = useState(false)
  const cursor = position.ref === selected ? position.cursor : null
  useEffect(() => {
    if (!active || !ENTITY_REF.test(selected)) return
    const controller = new AbortController(), origin = getAuthSnapshot()
    const unsubscribe = subscribeAuthSession(() => {
      const now = getAuthSnapshot()
      if (origin.subject !== now.subject || origin.enabled !== now.enabled || (origin.enabled && !now.authenticated)) {
        controller.abort(); setPage(null)
      }
    })
    setLoading(true); setError(false)
    void nevoliumFetch(`${apiUrl}/v1/mycelium/${selected.replace(':', '/')}?limit=36${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Details unavailable'); return await response.json() as BrowserPage })
      .then(next => { if (!controller.signal.aborted) { setPage(next); setLoading(false) } })
      .catch(() => { if (!controller.signal.aborted) { setPage(null); setError(true); setLoading(false) } })
    return () => { controller.abort(); unsubscribe() }
  }, [apiUrl, selected, active, cursor, revision])
  return { page: page?.focus === selected ? page : null, loading, error, cursor,
    more: () => { if (page?.focus === selected && page.next_cursor) setPosition({ ref: selected, cursor: page.next_cursor }) },
    first: () => setPosition({ ref: selected, cursor: null }) }
}
