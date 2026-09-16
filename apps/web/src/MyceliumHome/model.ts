import type { NevoliumGraphSnapshot } from '@nevolium/graph'
import type { SpatialNode } from '../Mycelium3D/presentation'

export const TOOLS = ['command', 'projects', 'research', 'today', 'knowledge', 'news', 'planning', 'mindmap'] as const
export type ToolKey = typeof TOOLS[number] | 'model-settings'
export type EntityType = 'project' | 'task' | 'document' | 'asset' | 'artifact' | 'conversation' | 'workflow_execution' | 'approval' | 'citation'
export type BrowserNode = SpatialNode & { entityType: EntityType | 'tool' | 'folder' | 'home'; entityId?: string;
  citingGeneration?: number | null; sourceGeneration?: number | null; summary?: string; url?: string | null; mediaType?: string | null; unavailable?: boolean }
export type BrowserEdge = NevoliumGraphSnapshot['edges'][number] & { category?: string; dependencyType?: string | null; lagSeconds?: number | null }
export type BrowserPage = { focus: string; nodes: BrowserNode[]; edges: BrowserEdge[]; next_cursor: string | null }
export type HomeEntry = { ref: string; label: string; folder: string }
export type HomeFolder = { id: string; label: string }
export type HomeLayout = { entries: HomeEntry[]; folders: HomeFolder[] }
export const HOME_KEY = 'mycelium.home.navigation'
export const MAX_ENTRIES = 24
export const ENTITY_REF = /^(project|task|document|asset|artifact|conversation|workflow_execution|approval|citation):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const validRef = (value: string) => ENTITY_REF.test(value) || TOOLS.some(tool => value === `tool:${tool}`)
export const DEFAULT_HOME: HomeLayout = { entries: ['command', 'projects', 'research', 'today', 'knowledge', 'news']
  .map(tool => ({ ref: `tool:${tool}`, label: '', folder: '' })), folders: [] }

export function readHomeLayout(value: unknown): HomeLayout {
  if (!value || typeof value !== 'object') throw new Error('Invalid home layout')
  const data = value as HomeLayout
  if (!Array.isArray(data.entries) || !Array.isArray(data.folders) || data.entries.length > MAX_ENTRIES || data.folders.length > 8) {
    throw new Error('Invalid home layout')
  }
  const folders = data.folders.map(folder => {
    if (!folder || typeof folder.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(folder.id)
      || typeof folder.label !== 'string' || !folder.label.trim() || folder.label.length > 80) throw new Error('Invalid home folder')
    return { id: folder.id, label: folder.label.trim() }
  })
  const ids = new Set(folders.map(folder => folder.id))
  const refs = new Set<string>()
  const entries = data.entries.map(entry => {
    if (!entry || typeof entry.ref !== 'string' || !validRef(entry.ref) || refs.has(entry.ref)
      || typeof entry.label !== 'string' || entry.label.length > 120 || typeof entry.folder !== 'string'
      || (entry.folder !== '' && !ids.has(entry.folder))) throw new Error('Invalid home entry')
    refs.add(entry.ref)
    return { ref: entry.ref, label: entry.label, folder: entry.folder }
  })
  if (ids.size !== folders.length) throw new Error('Duplicate home folder')
  return { entries, folders }
}

export function reorder(layout: HomeLayout, from: number, to: number): HomeLayout {
  const entries = [...layout.entries]
  if (from < 0 || to < 0 || from >= entries.length || to >= entries.length) return layout
  entries.splice(to, 0, entries.splice(from, 1)[0])
  return { ...layout, entries }
}

export function homeGraph(layout: HomeLayout, resolved: Map<string, BrowserNode>, label: (key: string) => string, folder = '') {
  const root = folder ? `folder:${folder}` : 'home:root'
  const nodes: BrowserNode[] = [{ id: root, entityType: folder ? 'folder' : 'home', label: folder
    ? layout.folders.find(item => item.id === folder)?.label || label('home') : 'Nevolium', kind: 'home', status: 'ready' }]
  if (!folder) for (const item of layout.folders) nodes.push({ id: `folder:${item.id}`, entityType: 'folder', label: item.label, kind: 'folder', status: 'ready' })
  for (const entry of layout.entries.filter(item => item.folder === folder)) {
    const node = entry.ref.startsWith('tool:')
      ? { id: entry.ref, entityType: 'tool' as const, kind: 'tool', status: 'ready', label: label(entry.ref.slice(5)) }
      : resolved.get(entry.ref) || { id: entry.ref, entityType: entry.ref.split(':')[0] as EntityType,
        kind: 'unavailable', status: 'unavailable', label: label('unavailable'), unavailable: true }
    nodes.push({ ...node, label: node.unavailable ? label('unavailable') : entry.label || node.label })
  }
  const edges: BrowserEdge[] = nodes.slice(1).map(node => ({ id: `shortcut:${root}:${node.id}`, source: root,
    target: node.id, relation: 'shortcut', directed: false, category: 'shortcut' }))
  // Stable user-controlled ordering. The shared renderer supplies the organic bodies and filaments.
  const positions: Record<string, [number, number, number]> = { [root]: [0, 0, 0] }
  nodes.slice(1).forEach((node, i) => {
    const angle = i * Math.PI * 2 / Math.max(1, nodes.length - 1) - Math.PI / 2
    const radius = nodes.length < 9 ? 5 : 7
    positions[node.id] = [Math.cos(angle) * radius, Math.sin(angle) * radius * .62, Math.sin(i * 2.3) * 1.3]
  })
  return { root, nodes, edges, positions }
}
