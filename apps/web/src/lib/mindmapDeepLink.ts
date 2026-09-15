export type MindMapDeepLink = {
  projectId: string | null
  nodeKey: string
  entityType: 'project' | 'task' | 'document'
  entityId: string
}

const ENTITY_KEY = /^(project|task|document):([^\s:][^\s]*)$/
const MAX_VALUE_LENGTH = 200

function clean(value: string | null): string {
  const normalized = value?.trim() || ''
  return normalized.length <= MAX_VALUE_LENGTH ? normalized : ''
}

export function readMindMapDeepLink(url = new URL(window.location.href)): MindMapDeepLink | null {
  const nodeKey = clean(url.searchParams.get('mindmap'))
  const match = ENTITY_KEY.exec(nodeKey)
  if (!match) return null
  const projectHint = clean(url.searchParams.get('mindmapProject')) || null
  const entityType = match[1] as MindMapDeepLink['entityType']
  return {
    projectId: projectHint || (entityType === 'project' ? match[2] : null),
    nodeKey,
    entityType,
    entityId: match[2],
  }
}

export function replaceMindMapDeepLink(projectId: string | null, nodeKey: string | null) {
  const url = new URL(window.location.href)
  if (nodeKey) {
    url.searchParams.set('mindmap', nodeKey)
    if (projectId) url.searchParams.set('mindmapProject', projectId)
    else url.searchParams.delete('mindmapProject')
  } else {
    url.searchParams.delete('mindmapProject')
    url.searchParams.delete('mindmap')
  }
  window.history.replaceState({}, '', url)
}
