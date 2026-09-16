import { useI18n } from './i18n'
import { useKnowledgeMessages } from './knowledgeMessages'
import { useWorkspaceMessages } from './workspaceMessages'
import { MAX_CHUNK_PREVIEW_ITEMS } from './knowledgeChunkInspection'
import type { CanonicalDocument, DocumentChunk, DocumentVersion } from './knowledgeTypes'

const MAX_CHUNK_PREVIEW_CHARS = 1200

function useInspectorMessages() {
  const w = useWorkspaceMessages()
  const m = useKnowledgeMessages()
  const { language } = useI18n()
  const statusLabel = (status: string) => ({
    pending: w('queuedState'), queued: w('queuedState'), processing: w('processingState'),
    completed: w('completedState'), ready: w('readyState'), failed: w('failedState'),
  }[status] || status)
  const kindLabel = (kind: string) => ['note', 'idea', 'decision', 'hypothesis', 'supported', 'contested', 'verified'].includes(kind)
    ? m(kind as 'note' | 'idea' | 'decision' | 'hypothesis' | 'supported' | 'contested' | 'verified') : kind
  return { w, statusLabel, kindLabel, formatDate: (value?: string | null) => formatDate(value, language) }
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function chunkExcerpt(text: string) {
  const value = text.trim()
  if (value.length <= MAX_CHUNK_PREVIEW_CHARS) return value
  return `${value.slice(0, MAX_CHUNK_PREVIEW_CHARS - 1)}…`
}

type DocumentsProps = {
  documents: CanonicalDocument[]
  selectedDocument: CanonicalDocument | null
  trackingDocumentId: string | null
  openingSource: boolean
  reingesting: boolean
  sourceError: string | null
  reingestError: string | null
  onSelectDocument: (documentId: string) => void
  onOpenSource: () => void
  onReingest: () => void
}

export function KnowledgeDocumentsView({
  documents,
  selectedDocument,
  trackingDocumentId,
  openingSource,
  reingesting,
  sourceError,
  reingestError,
  onSelectDocument,
  onOpenSource,
  onReingest,
}: DocumentsProps) {
  const { w, statusLabel, kindLabel, formatDate } = useInspectorMessages()
  const selectedSource = Boolean(
    selectedDocument?.kind === 'source' && selectedDocument.asset_id,
  )

  return (
    <>
      <section className="sources" aria-label={w('selectedProjectDocuments')}>
        <div className="sources-title">
          <strong>{w('projectDocs')}</strong>
          <span>{documents.length} {w('documentCount')}</span>
        </div>
        <div className="source-list">
          {documents.length === 0 && (
            <div className="source-card">
              <span className="source-id">0</span>
              <div>
                <strong>{w('noDocuments')}</strong>
                <small>{w('addDocumentHint')}</small>
              </div>
            </div>
          )}

          {documents.map((document) => (
            <div className="source-card" key={document.id}>
              <span className="source-id">{statusLabel(document.status)}</span>
              <div>
                <strong>{document.title}</strong>
                <small>{document.kind === 'source' ? document.media_type || w('unknownMedia') : kindLabel(document.kind)}</small>
                <small>
                  {formatDate(document.created_at)
                    ? `${w('createdOn')} ${formatDate(document.created_at)}`
                    : w('noDate')}
                  {formatDate(document.updated_at)
                    ? ` · ${w('updatedOn')} ${formatDate(document.updated_at)}`
                    : ''}
                </small>
                {document.source_sha256 && (
                  <small>Source SHA-256 · {document.source_sha256.slice(0, 16)}…</small>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {documents.length > 0 && (
        <>
          <div className="news-controls">
            <label>
              <span>{w('currentDocument')}</span>
              <select
                value={selectedDocument?.id || ''}
                onChange={(event) => onSelectDocument(event.target.value)}
              >
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title} · {statusLabel(document.status)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => onOpenSource()}
              disabled={openingSource || !selectedSource}
            >
              {openingSource ? w('openingSource') : w('openSource')}
            </button>
            <button
              type="button"
              onClick={() => onReingest()}
              disabled={
                reingesting ||
                Boolean(trackingDocumentId) ||
                !selectedSource ||
                ['pending', 'processing'].includes(selectedDocument?.status || '')
              }
            >
              {reingesting ? w('rereading') : w('rereadDocument')}
            </button>
          </div>

          {sourceError && <div className="error-panel">{sourceError}</div>}
          {reingestError && <div className="error-panel">{reingestError}</div>}

          {selectedDocument && (
            <article className="briefing" aria-label={w('documentDetails')}>
              <div className="briefing-topline">
                <div>
                  <span className="eyebrow">{w('selectedDocumentHeading')}</span>
                  <h3>{selectedDocument.title}</h3>
                </div>
                <span className={`run-state run-state-${selectedDocument.status}`}>
                  {statusLabel(selectedDocument.status)}
                </span>
              </div>
              <div className="brief-summary">
                {selectedDocument.kind === 'source'
                  ? selectedDocument.media_type || w('unknownMedia')
                  : `${kindLabel(selectedDocument.kind)}${selectedDocument.epistemic_status ? ` · ${kindLabel(selectedDocument.epistemic_status)}` : ''}`}
              </div>
            </article>
          )}
        </>
      )}
    </>
  )
}

type VersionsProps = {
  selectedDocument: CanonicalDocument | null
  versions: DocumentVersion[]
  selectedVersion: DocumentVersion | null
  loadingVersions: boolean
  versionError: string | null
  loadingChunks: boolean
  onSelectVersion: (versionId: string) => void
  onLoadChunks: () => void
}

export function KnowledgeVersionsView({
  selectedDocument,
  versions,
  selectedVersion,
  loadingVersions,
  versionError,
  loadingChunks,
  onSelectVersion,
  onLoadChunks,
}: VersionsProps) {
  const { w, statusLabel, formatDate } = useInspectorMessages()
  return (
    <>
      {versionError && <div className="error-panel">{versionError}</div>}

      {loadingVersions && !versionError && (
        <div className="progress-panel">
          <strong>{w('loadingVersions')}</strong>
          <span>{w('loadExcerptsHint')}</span>
        </div>
      )}

      {!loadingVersions && !versionError && selectedDocument && (
        <section className="sources" aria-label={w('selectedDocVersions')}>
          <div className="sources-title">
            <strong>{w('documentVersions')}</strong>
            <span>{versions.length} {w('versionsCount')}</span>
          </div>
          <div className="source-list">
            {versions.length === 0 && (
              <div className="source-card">
                <span className="source-id">0</span>
                <div>
                  <strong>{w('noVersions')}</strong>
                  <small>{w('noReadyVersion')}</small>
                </div>
              </div>
            )}

            {versions.map((version) => (
              <div className="source-card" key={version.id}>
                <span className="source-id">v{version.generation}</span>
                <div>
                  <strong>
                    {version.parser}
                    {version.parser_version ? ` ${version.parser_version}` : ''}
                    {' · '}
                    {statusLabel(version.status)}
                  </strong>
                  <small>{version.chunk_count} {w('passagesCount')}</small>
                  <small>
                    {formatDate(version.created_at)
                      ? `${w('createdOn')} ${formatDate(version.created_at)}`
                      : w('noDate')}
                    {formatDate(version.completed_at)
                      ? ` · ${w('completedOn')} ${formatDate(version.completed_at)}`
                      : ''}
                  </small>
                  {version.source_sha256 && (
                    <small>Source SHA-256 · {version.source_sha256.slice(0, 16)}…</small>
                  )}
                  {version.search_status && <small>{w('research')} · {statusLabel(version.search_status)}</small>}
                  {version.last_error && <small>{w('errorLabel')} · {version.last_error}</small>}
                  {version.search_error && <small>Index · {version.search_error}</small>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {versions.length > 0 && (
        <div className="news-controls">
          <label>
            <span>{w('selectedVersion')}</span>
            <select
              value={selectedVersion?.id || ''}
              onChange={(event) => onSelectVersion(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.generation} · {version.parser} · {statusLabel(version.status)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onLoadChunks()}
            disabled={loadingChunks || !selectedVersion}
          >
            {loadingChunks ? w('loading') : w('loadExcerpt')}
          </button>
        </div>
      )}
    </>
  )
}

type ChunksProps = {
  selectedVersion: DocumentVersion | null
  chunks: DocumentChunk[]
  chunksLoaded: boolean
  chunkOffset: number
  focusedChunkId: string | null
  loadingChunks: boolean
  chunkError: string | null
  chunkPageStart: number
  chunkPageEnd: number
  canPreviousChunkPage: boolean
  canNextChunkPage: boolean
  onLoadPage: (offset: number) => void
}

export function KnowledgeChunksView({
  selectedVersion,
  chunks,
  chunksLoaded,
  chunkOffset,
  focusedChunkId,
  loadingChunks,
  chunkError,
  chunkPageStart,
  chunkPageEnd,
  canPreviousChunkPage,
  canNextChunkPage,
  onLoadPage,
}: ChunksProps) {
  const { w, statusLabel, kindLabel, formatDate } = useInspectorMessages()
  return (
    <>
      {chunkError && <div className="error-panel">{chunkError}</div>}

      {selectedVersion && !chunksLoaded && !loadingChunks && !chunkError && (
        <div className="progress-panel">
          <strong>{w('excerptsNotLoaded')}</strong>
          <span>{w('chooseVersionHint')}</span>
        </div>
      )}

      {chunksLoaded && !chunkError && selectedVersion && (
        <>
          <div className="news-controls" aria-label={w('passagePages')}>
            <button
              type="button"
              onClick={() => onLoadPage(chunkOffset - MAX_CHUNK_PREVIEW_ITEMS)}
              disabled={loadingChunks || !canPreviousChunkPage}
            >
              {w('previousPage')}
            </button>
            <span className="route-chip">
              {chunkPageStart === 0
                ? `${w('passages')} 0 ${w('of')} ${selectedVersion.chunk_count}`
                : `${w('passages')} ${chunkPageStart}–${chunkPageEnd} ${w('of')} ${selectedVersion.chunk_count}`}
            </span>
            <button
              type="button"
              onClick={() => onLoadPage(chunkOffset + MAX_CHUNK_PREVIEW_ITEMS)}
              disabled={loadingChunks || !canNextChunkPage}
            >
              {w('nextPage')}
            </button>
          </div>

          <section className="sources" aria-label={w('passagePreview')}>
            <div className="sources-title">
              <strong>{w('excerptHeading')} · v{selectedVersion.generation}</strong>
              <span>{chunks.length} {w('passagesPage')}</span>
            </div>
            <div className="source-list">
              {chunks.length === 0 && (
                <div className="source-card">
                  <span className="source-id">0</span>
                  <div>
                    <strong>{w('noPassages')}</strong>
                    <small>{w('noContent')}</small>
                  </div>
                </div>
              )}

              {chunks.map((chunk) => (
                <div
                  className="source-card"
                  id={`knowledge-chunk-${chunk.id}`}
                  key={chunk.id}
                >
                  <span className="source-id">#{chunk.ordinal}</span>
                  <div>
                    <strong>
                      {chunk.id === focusedChunkId
                        ? `${w('passage')} ${chunk.ordinal} · ${w('selectedResult')}`
                        : `${w('passage')} ${chunk.ordinal}`}
                    </strong>
                    <small>{chunkExcerpt(chunk.text)}</small>
                    <small>
                      {formatDate(chunk.created_at)
                        ? `${w('createdOn')} ${formatDate(chunk.created_at)}`
                        : w('noDate')}
                      {' · '}
                      SHA-256 {chunk.content_sha256.slice(0, 16)}…
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
