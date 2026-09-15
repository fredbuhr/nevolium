import { useState } from 'react'

import KnowledgeSearchPanel from './KnowledgeSearchPanel'
import KnowledgeWorkspace from './KnowledgeWorkspace'
import type { KnowledgeInspectionTarget } from './knowledgeTypes'
import { useProjectSelection } from './lib/projectSelection'

type Props = {
  apiUrl: string
}

export default function KnowledgePanel({ apiUrl }: Props) {
  const {
    selectedDocumentId,
    selectedProjectId,
    setSelectedDocumentId,
    setSelectedProjectId,
  } = useProjectSelection()
  const [inspectionTarget, setInspectionTarget] = useState<KnowledgeInspectionTarget | null>(null)

  return (
    <>
      <KnowledgeSearchPanel
        apiUrl={apiUrl}
        onInspectResult={(target) => {
          if (target.projectId !== selectedProjectId) setSelectedProjectId(target.projectId)
          setSelectedDocumentId(target.documentId)
          setInspectionTarget(target)
        }}
      />
      <KnowledgeWorkspace
        apiUrl={apiUrl}
        selectedDocumentId={selectedDocumentId}
        onSelectedDocumentIdChange={setSelectedDocumentId}
        inspectionTarget={inspectionTarget}
      />
    </>
  )
}
