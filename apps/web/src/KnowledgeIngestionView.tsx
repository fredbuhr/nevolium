import type { FormEvent } from 'react'
import { useWorkspaceMessages } from './workspaceMessages'

type Props = {
  selectedFile: File | null
  importing: boolean
  importError: string | null
  trackingDocumentId: string | null
  trackingError: string | null
  onSelectFile: (file: File | null) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function KnowledgeIngestionView({
  selectedFile,
  importing,
  importError,
  trackingDocumentId,
  trackingError,
  onSelectFile,
  onSubmit,
}: Props) {
  const w = useWorkspaceMessages()
  return (
    <>
      <form className="news-form" onSubmit={onSubmit}>
        <label className="query-field">
          <span>{w('importDocument')}</span>
          <input
            type="file"
            onChange={(event) => onSelectFile(event.target.files?.[0] || null)}
            disabled={importing}
          />
        </label>
        <div className="news-controls">
          <button type="submit" disabled={importing || !selectedFile}>
            {importing ? w('importing') : w('importAction')}
          </button>
        </div>
      </form>

      {importError && <div className="error-panel">{importError}</div>}
      {trackingError && <div className="error-panel">{w('trackingImport')} · {trackingError}</div>}
      {trackingDocumentId && !trackingError && (
        <div className="progress-panel">
          <strong>{w('preparingDocument')}</strong>
          <span>{w('preparingHint')}</span>
        </div>
      )}
    </>
  )
}
