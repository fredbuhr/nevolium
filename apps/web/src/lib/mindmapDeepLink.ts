export type MindMapDeepLink = {
  projectId: string
  nodeKey: string
}

const ENTITY_KEY = /^(project|task|document):[^\s:][^\s]*$/
const MAX_VALUE_LENGTH = 200

function clean(value: string | null): string {
  const normalized = value?.trim() || ''
  return normalized.length <= MAX_VALUE_LENGTH ? normalized : ''
}

export function readMindMapDeepLink(url = new URL(window.location.href)): MindMapDeepLink | null {
  const projectId = clean(url.searchParams.get('mindmapProject'))
  const nodeKey = clean(url.searchParams.get('mindmap'))
  if (!projectId || !nodeKey || !ENTITY_KEY.test(nodeKey)) return null
  return { projectId, nodeKey }
}

export function replaceMindMapDeepLink(projectId: string | null, nodeKey: string | null) {
  const url = new URL(window.location.href)
  if (projectId && nodeKey) {
    url.searchParams.set('mindmapProject', projectId)
    url.searchParams.set('mindmap', nodeKey)
  } else {
    url.searchParams.delete('mindmapProject')
    url.searchParams.delete('mindmap')
  }
  window.history.replaceState({}, '', url)
}
