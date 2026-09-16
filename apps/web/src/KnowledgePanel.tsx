import { useState } from 'react'

import KnowledgeSearchPanel from './KnowledgeSearchPanel'
import KnowledgeWorkspace from './KnowledgeWorkspace'
import type { KnowledgeInspectionTarget } from './knowledgeTypes'
import { useProjectSelection } from './lib/projectSelection'
import { usePagedCollection } from './lib/usePagedCollection'
import { useWorkspaceMessages } from './workspaceMessages'

type Props = {
  apiUrl: string
}

export default function KnowledgePanel({ apiUrl }: Props) {
  const w = useWorkspaceMessages()
  const {
    selectedDocumentId,
    selectedProjectId,
    setSelectedDocumentId,
    setSelectedProjectId,
  } = useProjectSelection()
  const projects = usePagedCollection<{ id: string; name: string }>(
    `${apiUrl}/v1/projects?limit=30`, selectedProjectId ? `${apiUrl}/v1/projects/${encodeURIComponent(selectedProjectId)}` : null,
  )
  const [inspectionTarget, setInspectionTarget] = useState<KnowledgeInspectionTarget | null>(null)

  return (
    <>
      <label className="knowledge-document-picker">{w('yourContext')}
        <select aria-label={w('yourContext')} value={selectedProjectId} onChange={event => { setSelectedProjectId(event.target.value); setInspectionTarget(null) }}>
          <option value="">{w('chooseProject')}</option>
          {projects.items.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      {projects.hasMore && <button type="button" disabled={projects.loading} onClick={() => void projects.loadMore()}>{w('moreProjects')}</button>}
      {projects.error && <p role="alert">{w('readFailed')}</p>}
      <details className="workspace-details knowledge-search-disclosure"><summary>{w('searchKnowledge')}</summary>
      <KnowledgeSearchPanel
        apiUrl={apiUrl}
        onInspectResult={(target) => {
          if (target.projectId !== selectedProjectId) setSelectedProjectId(target.projectId)
          setSelectedDocumentId(target.documentId)
          setInspectionTarget(target)
        }}
      />
      </details>
      <KnowledgeWorkspace
        apiUrl={apiUrl}
        selectedDocumentId={selectedDocumentId}
        onSelectedDocumentIdChange={setSelectedDocumentId}
        inspectionTarget={inspectionTarget}
      />
    </>
  )
}
