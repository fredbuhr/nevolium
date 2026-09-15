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
  return (
    <>
      {error && <div className="error-panel">{error}</div>}

      {loading && !error && (
        <div className="progress-panel">
          <strong>Chargement de vos documents.</strong>
          <span>Seuls les documents du projet sélectionné sont affichés.</span>
        </div>
      )}

      {!loading && !error && !selectedProjectId && (
        <div className="progress-panel">
          <strong>Aucun projet sélectionné.</strong>
          <span>Sélectionnez un projet dans Projets ou Recherche pour afficher ses documents.</span>
        </div>
      )}
    </>
  )
}
