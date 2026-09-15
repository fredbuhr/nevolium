import { type FormEvent, useEffect, useState } from 'react'

import { readKnowledgeJson } from './knowledgeApi'
import { useKnowledgeMessages } from './knowledgeMessages'
import type { KnowledgeInspectionTarget, KnowledgeSearchResult } from './knowledgeTypes'
import { nevoliumFetch } from './lib/apiClient'
import { useProjectSelection } from './lib/projectSelection'

type Props = {
  apiUrl: string
  onInspectResult: (target: KnowledgeInspectionTarget) => void
}

const KNOWLEDGE_SEARCH_PAGE_SIZE = 20

export default function KnowledgeSearchPanel({ apiUrl, onInspectResult }: Props) {
  const { selectedProjectId } = useProjectSelection()
  const m = useKnowledgeMessages()
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [projectOnly, setProjectOnly] = useState(false)
  const [activeProjectOnly, setActiveProjectOnly] = useState(false)
  const [results, setResults] = useState<KnowledgeSearchResult[]>([])
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedProjectId) setProjectOnly(false)
    setActiveQuery('')
    setResults([])
    setSearchOffset(0)
    setHasMore(false)
    setSearched(false)
    setError(null)
  }, [selectedProjectId])

  async function loadKnowledgeSearchPage(searchQuery: string, offset: number, scoped: boolean) {
    if (searchQuery.length < 2 || searching || (scoped && !selectedProjectId)) return

    const normalizedOffset = Math.max(0, offset)
    setSearching(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        offset: String(normalizedOffset),
        limit: String(KNOWLEDGE_SEARCH_PAGE_SIZE + 1),
      })
      if (scoped && selectedProjectId) params.set('project_id', selectedProjectId)
      const response = await nevoliumFetch(`${apiUrl}/v1/knowledge/search?${params.toString()}`)
      const loaded = await readKnowledgeJson<KnowledgeSearchResult[]>(response)
      setActiveQuery(searchQuery)
      setActiveProjectOnly(scoped)
      setResults(loaded.slice(0, KNOWLEDGE_SEARCH_PAGE_SIZE))
      setSearchOffset(normalizedOffset)
      setHasMore(loaded.length > KNOWLEDGE_SEARCH_PAGE_SIZE)
      setSearched(true)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : m('searchError'))
    } finally {
      setSearching(false)
    }
  }

  async function submitKnowledgeSearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2 || searching || (projectOnly && !selectedProjectId)) return

    setResults([])
    setSearchOffset(0)
    setHasMore(false)
    setSearched(false)
    await loadKnowledgeSearchPage(trimmed, 0, projectOnly)
  }

  const pageStart = searched && results.length > 0 ? searchOffset + 1 : 0
  const pageEnd = searched ? searchOffset + results.length : 0

  return (
    <section className="news-workspace" aria-labelledby="knowledge-search-heading">
      <div className="news-heading">
        <div>
          <span className="eyebrow">{m('searchEyebrow')}</span>
          <h2 id="knowledge-search-heading">{m('searchHeading')}</h2>
        </div>
        {searched && (
          <span className="run-state">
            {pageStart === 0 ? `0 ${m('result')}` : `${m('results')} ${pageStart}–${pageEnd}`}
          </span>
        )}
      </div>

      <form className="news-form" onSubmit={submitKnowledgeSearch}>
        <label className="query-field">
          <span>{m('searchLabel')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
            maxLength={400}
            placeholder={m('searchPlaceholder')}
          />
        </label>
        <div className="news-controls">
          <label>
            <span>{m('searchProject')}</span>
            <input
              type="checkbox"
              checked={projectOnly}
              disabled={!selectedProjectId}
              onChange={(event) => setProjectOnly(event.target.checked)}
            />
          </label>
          <span className="route-chip">{projectOnly ? m('searchProject') : m('searchAll')}</span>
          <button
            type="submit"
            disabled={searching || query.trim().length < 2 || (projectOnly && !selectedProjectId)}
          >
            {searching ? m('searching') : m('searchButton')}
          </button>
        </div>
      </form>

      {error && <div className="error-panel">{error}</div>}

      {searched && !error && (
        <section className="sources" aria-label={m('searchResults')}>
          <div className="sources-title">
            <strong>{m('searchResults')}</strong>
            <span>20 · {m('searchLatest')} · {activeProjectOnly ? m('searchProject') : m('searchAll')}</span>
          </div>

          <div className="news-controls" aria-label={m('searchResults')}>
            <button
              type="button"
              onClick={() => void loadKnowledgeSearchPage(
                activeQuery,
                Math.max(0, searchOffset - KNOWLEDGE_SEARCH_PAGE_SIZE),
                activeProjectOnly,
              )}
              disabled={searching || searchOffset === 0 || !activeQuery}
            >
              ← {m('previousPage')}
            </button>
            <span className="route-chip">
              {pageStart === 0 ? m('noResultPage') : `${pageStart}–${pageEnd}`}
            </span>
            <button
              type="button"
              onClick={() => void loadKnowledgeSearchPage(
                activeQuery,
                searchOffset + KNOWLEDGE_SEARCH_PAGE_SIZE,
                activeProjectOnly,
              )}
              disabled={searching || !hasMore || !activeQuery}
            >
              {m('nextPage')} →
            </button>
          </div>

          <div className="source-list">
            {results.length === 0 && (
              <div className="source-card">
                <span className="source-id">0</span>
                <div>
                  <strong>{m('searchEmpty')}</strong>
                  <small>{m('searchEmptyHint')}</small>
                </div>
              </div>
            )}
            {results.map((result) => (
              <div className="source-card" key={result.chunk_id}>
                <span className="source-id">#{result.ordinal}</span>
                <div>
                  <strong>{result.document_title}</strong>
                  <small>{result.excerpt}</small>
                  <small>
                    v{result.generation} · score {result.rank.toFixed(3)} · SHA-256{' '}
                    {result.content_sha256.slice(0, 16)}…
                  </small>
                  <button
                    type="button"
                    onClick={() => onInspectResult({
                      documentId: result.document_id,
                      documentVersionId: result.document_version_id,
                      chunkId: result.chunk_id,
                      ordinal: result.ordinal,
                    })}
                  >
                    {m('inspect')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
