import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { readMindMapDeepLink } from './mindmapDeepLink'

type ProjectSelectionContextValue = {
  selectedProjectId: string
  setSelectedProjectId: Dispatch<SetStateAction<string>>
  selectedDocumentId: string
  setSelectedDocumentId: Dispatch<SetStateAction<string>>
}

const ProjectSelectionContext = createContext<ProjectSelectionContextValue | null>(null)

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => readMindMapDeepLink()?.projectId || '',
  )
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const value = useMemo(
    () => ({ selectedProjectId, setSelectedProjectId, selectedDocumentId, setSelectedDocumentId }),
    [selectedProjectId, selectedDocumentId],
  )

  return (
    <ProjectSelectionContext.Provider value={value}>
      {children}
    </ProjectSelectionContext.Provider>
  )
}

export function useProjectSelection(): ProjectSelectionContextValue {
  const value = useContext(ProjectSelectionContext)
  if (!value) {
    throw new Error('Project selection must be used inside ProjectSelectionProvider')
  }
  return value
}
