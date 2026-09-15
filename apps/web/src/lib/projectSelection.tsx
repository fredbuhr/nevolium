import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { nevoliumFetch } from './apiClient'
import { readMindMapDeepLink } from './mindmapDeepLink'

const API_URL = (import.meta.env.VITE_NEVOLIUM_API_URL || 'http://localhost:8000').replace(/\/$/, '')

type ProjectSelectionContextValue = {
  selectedProjectId: string
  setSelectedProjectId: Dispatch<SetStateAction<string>>
  selectedDocumentId: string
  setSelectedDocumentId: Dispatch<SetStateAction<string>>
}

const ProjectSelectionContext = createContext<ProjectSelectionContextValue | null>(null)

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const [deepLink] = useState(() => readMindMapDeepLink())
  const [selectedProjectId, setSelectedProjectId] = useState(() => deepLink?.projectId || '')
  const [selectedDocumentId, setSelectedDocumentId] = useState('')

  useEffect(() => {
    if (!deepLink || deepLink.projectId || deepLink.entityType === 'project') return
    const controller = new AbortController()
    const endpoint = deepLink.entityType === 'task'
      ? `${API_URL}/v1/tasks/${encodeURIComponent(deepLink.entityId)}`
      : `${API_URL}/v1/documents/${encodeURIComponent(deepLink.entityId)}`

    void nevoliumFetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{ project_id?: unknown }>
      })
      .then((entity) => {
        if (controller.signal.aborted || !entity || typeof entity.project_id !== 'string') return
        setSelectedProjectId((current) => current || entity.project_id as string)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.warn('Nevolium could not resolve mindmap deep link', error)
      })

    return () => controller.abort()
  }, [deepLink])

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
