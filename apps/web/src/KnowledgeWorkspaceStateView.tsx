import { useWorkspaceMessages } from './workspaceMessages'

type Props = {
  loading: boolean
  error: string | null
  selectedProjectId: string | null
}

export default function KnowledgeWorkspaceStateView({
  loading,
  error,
  selectedProjectId,
}: Props) {
  const w = useWorkspaceMessages()
  return (
    <>
      {error && <div className="error-panel">{error}</div>}

      {loading && !error && (
        <div className="progress-panel">
          <strong>{w('loadingDocuments')}</strong>
          <span>{w('scopedDocuments')}</span>
        </div>
      )}

      {!loading && !error && !selectedProjectId && (
        <div className="progress-panel">
          <strong>{w('noProject')}</strong>
          <span>{w('chooseProject')}</span>
        </div>
      )}
    </>
  )
}
