import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  buildRadialMindMapLayout,
  type NevoliumGraphSnapshot,
} from '@nevolium/graph'

import { useI18n } from '../i18n'
import { nevoliumFetch } from '../lib/apiClient'
import { useProjectSelection } from '../lib/projectSelection'
import { layoutSaveCopy, useLayoutPersistence } from './useLayoutPersistence'

type MindMapEntityType = 'project' | 'task' | 'document'
type MindMapKind = 'project' | 'task' | 'source' | 'note' | 'idea' | 'decision' | string
type MindMapRelationType =
  | 'related_to'
  | 'supports'
  | 'contradicts'
  | 'depends_on'
  | 'references'
  | 'derived_from'
  | 'converted_to'

type MindMapApiNode = {
  key: string
  entity_type: MindMapEntityType
  entity_id: string
  project_id: string
  label: string
  kind: MindMapKind
  status: string
  epistemic_status?: string | null
  priority?: number | null
}

type MindMapApiEdge = {
  id: string
  source_key: string
  target_key: string
  source_type: MindMapEntityType
  source_id: string
  relation_type: string
  target_type: MindMapEntityType
  target_id: string
  directed: boolean
  metadata_json: Record<string, unknown>
  created_at: string
}

type MindMapSnapshot = {
  project_id: string
  layout_workspace_key: string
  nodes: MindMapApiNode[]
  edges: MindMapApiEdge[]
  task_count: number
  document_count: number
  relationship_count: number
  tasks_truncated: boolean
  documents_truncated: boolean
  relationships_truncated: boolean
}

type SavedPosition = { x: number; y: number }
type MindMapGroup = { label: string; node_ids: string[]; collapsed?: boolean }
type MindMapLayout = {
  positions: Record<string, SavedPosition>
  viewport?: Viewport
  groups?: Record<string, MindMapGroup>
}

type WorkspaceLayoutRead = {
  workspace_key: string
  schema_version: number
  layout: MindMapLayout
}

type IdeaConversionRead = {
  document_id: string
  task_id: string
  task_title: string
  relationship: MindMapApiEdge
}

type HistoryEntry =
  | { kind: 'layout'; before: MindMapLayout; after: MindMapLayout }
  | { kind: 'link-created'; edge: MindMapApiEdge }
  | { kind: 'link-deleted'; edge: MindMapApiEdge }

type FilterMode = 'all' | 'task' | 'document' | 'idea' | 'decision' | 'note' | 'source'
type Props = { apiUrl: string }
type FlowNode = Node<{ label: ReactNode }>

const EMPTY_LAYOUT: MindMapLayout = { positions: {}, groups: {} }
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }
const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1.15 } as const
const PRO_OPTIONS = { hideAttribution: true } as const
const RELATION_TYPES: MindMapRelationType[] = [
  'related_to',
  'supports',
  'contradicts',
  'depends_on',
  'references',
  'derived_from',
]

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : detail?.message
    throw new Error(message || `Nevolium ${response.status}`)
  }
  return body as T
}

function nodeClassName(node: MindMapApiNode) {
  return `mindmap-node mindmap-node-${node.kind.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}`
}

function graphSnapshot(snapshot: MindMapSnapshot): NevoliumGraphSnapshot {
  return {
    nodes: snapshot.nodes.map((node) => ({
      id: node.key,
      entityType: node.entity_type,
      label: node.label,
      projectId: node.project_id,
    })),
    edges: snapshot.edges.map((edge) => ({
      id: edge.id,
      source: edge.source_key,
      target: edge.target_key,
      relation: edge.relation_type,
      directed: edge.directed,
    })),
  }
}

function averageGroupPosition(group: MindMapGroup, positions: Map<string, SavedPosition>): SavedPosition {
  const members = group.node_ids.map((id) => positions.get(id)).filter(Boolean) as SavedPosition[]
  if (members.length === 0) return { x: 0, y: 0 }
  return {
    x: members.reduce((sum, item) => sum + item.x, 0) / members.length,
    y: members.reduce((sum, item) => sum + item.y, 0) / members.length,
  }
}

export default function MindMapWorkspace({ apiUrl }: Props) {
  const { selectedProjectId } = useProjectSelection()
  const { t } = useI18n()
  if (!selectedProjectId) {
    return (
      <section className="mindmap-workspace state-panel">
        <span className="eyebrow">{t('mindmap.eyebrow')}</span>
        <h2>{t('mindmap.panelTitle')}</h2>
        <p>{t('mindmap.projectRequired')}</p>
      </section>
    )
  }
  // Project changes isolate async responses, save queues and history. Locale changes do not.
  return <ProjectMindMap key={`${apiUrl}:${selectedProjectId}`} apiUrl={apiUrl} selectedProjectId={selectedProjectId} />
}

function ProjectMindMap({ apiUrl, selectedProjectId }: Props & { selectedProjectId: string }) {
  const { language, lower, t } = useI18n()
  const tRef = useRef(t)
  tRef.current = t
  const [snapshot, setSnapshot] = useState<MindMapSnapshot | null>(null)
  const [layout, setLayout] = useState<MindMapLayout>(EMPTY_LAYOUT)
  const layoutRef = useRef<MindMapLayout>(EMPTY_LAYOUT)
  const dragBeforeRef = useRef<MindMapLayout | null>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [linkSourceKey, setLinkSourceKey] = useState('')
  const [linkTargetKey, setLinkTargetKey] = useState('')
  const [linkRelation, setLinkRelation] = useState<MindMapRelationType>('related_to')
  const [groupLabel, setGroupLabel] = useState('')
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [renderRevision, setRenderRevision] = useState(0)
  const persistence = useLayoutPersistence<MindMapLayout>(apiUrl, snapshot?.layout_workspace_key ?? null)
  const saveCopy = layoutSaveCopy[language]

  const replaceLayout = useCallback((next: MindMapLayout) => {
    // Pointer/viewport events can arrive before React commits. Merge against this
    // synchronous ref rather than overwriting a newer layout with an old render.
    layoutRef.current = next
    setLayout(next)
  }, [])

  const relationLabel = useCallback((relation: MindMapRelationType) => {
    switch (relation) {
      case 'supports': return t('mindmap.relation.supports')
      case 'contradicts': return t('mindmap.relation.contradicts')
      case 'depends_on': return t('mindmap.relation.depends_on')
      case 'references': return t('mindmap.relation.references')
      case 'derived_from': return t('mindmap.relation.derived_from')
      case 'converted_to': return t('mindmap.relation.converted_to')
      default: return t('mindmap.relation.related_to')
    }
  }, [t])

  const kindLabel = useCallback((kind: string) => {
    switch (kind) {
      case 'project': return t('mindmap.kind.project')
      case 'task': return t('mindmap.kind.task')
      case 'source': return t('mindmap.kind.source')
      case 'note': return t('mindmap.kind.note')
      case 'idea': return t('mindmap.kind.idea')
      case 'decision': return t('mindmap.kind.decision')
      default: return kind
    }
  }, [t])

  const stateLabel = useCallback((node: MindMapApiNode) => {
    const value = node.epistemic_status || node.status
    switch (value) {
      case 'active': return t('mindmap.status.active')
      case 'todo': return t('mindmap.status.todo')
      case 'queued': return t('mindmap.status.queued')
      case 'running': return t('mindmap.status.running')
      case 'completed': return t('mindmap.status.completed')
      case 'failed': return t('mindmap.status.failed')
      case 'pending': return t('mindmap.status.pending')
      case 'ready': return t('mindmap.status.ready')
      case 'hypothesis': return t('mindmap.status.hypothesis')
      case 'supported': return t('mindmap.status.supported')
      case 'contested': return t('mindmap.status.contested')
      case 'verified': return t('mindmap.status.verified')
      default: return value
    }
  }, [t])

  const applyLayout = useCallback((next: MindMapLayout, persist = true) => {
    if (!snapshot) return
    replaceLayout(next)
    setRenderRevision((value) => value + 1)
    if (persist) persistence.save(next)
  }, [persistence.save, replaceLayout, snapshot])

  const recordLayout = useCallback((next: MindMapLayout, before = layoutRef.current) => {
    setPast((items) => [...items.slice(-39), { kind: 'layout', before, after: next }])
    setFuture([])
    applyLayout(next)
  }, [applyLayout])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const snapshotResponse = await nevoliumFetch(
          `${apiUrl}/v1/projects/${encodeURIComponent(selectedProjectId)}/mindmap`,
          { signal: controller.signal },
        )
        const nextSnapshot = await readJson<MindMapSnapshot>(snapshotResponse)
        let nextLayout = EMPTY_LAYOUT
        const layoutResponse = await nevoliumFetch(
          `${apiUrl}/v1/ui/workspaces/${encodeURIComponent(nextSnapshot.layout_workspace_key)}/layout`,
          { signal: controller.signal },
        )
        if (layoutResponse.ok) {
          const saved = await readJson<WorkspaceLayoutRead>(layoutResponse)
          nextLayout = {
            positions: saved.layout?.positions || {},
            viewport: saved.layout?.viewport,
            groups: saved.layout?.groups || {},
          }
        } else if (layoutResponse.status !== 404) {
          await readJson<WorkspaceLayoutRead>(layoutResponse)
        }
        if (controller.signal.aborted) return
        const linkedNode = new URL(window.location.href).searchParams.get('mindmap')
        setSnapshot(nextSnapshot)
        replaceLayout(nextLayout)
        setSelectedNodeIds(nextSnapshot.nodes.some(node => node.key === linkedNode) ? [linkedNode!] : [])
        setPast([])
        setFuture([])
        setRenderRevision((value) => value + 1)
      } catch (loadError) {
        if (controller.signal.aborted) return
        setError(loadError instanceof Error ? loadError.message : tRef.current('mindmap.loadError'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
    // Translation is presentation, not a reason to reload data or discard local edits/history.
  }, [apiUrl, selectedProjectId, replaceLayout])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!persistence.writer.dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [persistence.writer])

  const apiNodeByKey = useMemo(
    () => new Map((snapshot?.nodes || []).map((node) => [node.key, node])),
    [snapshot],
  )
  const apiEdgeById = useMemo(
    () => new Map((snapshot?.edges || []).map((edge) => [edge.id, edge])),
    [snapshot],
  )
  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    const ids = selected.map(node => node.id).filter(id => apiNodeByKey.has(id))
    setSelectedNodeIds(previous => previous.length === ids.length && previous.every((id, i) => id === ids[i]) ? previous : ids)
  }, [apiNodeByKey])

  async function refreshSnapshot(selectKey?: string) {
    if (!snapshot) return
    const response = await nevoliumFetch(
      `${apiUrl}/v1/projects/${encodeURIComponent(snapshot.project_id)}/mindmap`,
    )
    const nextSnapshot = await readJson<MindMapSnapshot>(response)
    setSnapshot(nextSnapshot)
    setSelectedNodeIds(selectKey ? [selectKey] : [])
    setRenderRevision((value) => value + 1)
  }

  function addEdgeLocal(edge: MindMapApiEdge) {
    setSnapshot((current) => current ? {
      ...current,
      edges: [edge, ...current.edges.filter((item) => item.id !== edge.id)],
      relationship_count: current.relationship_count + (current.edges.some(item => item.id === edge.id) ? 0 : 1),
    } : current)
    setRenderRevision((value) => value + 1)
  }

  function removeEdgeLocal(edgeId: string) {
    setSnapshot((current) => current ? {
      ...current,
      edges: current.edges.filter((item) => item.id !== edgeId),
      relationship_count: Math.max(0, current.relationship_count - 1),
    } : current)
    setSelectedEdgeId((current) => current === edgeId ? null : current)
    setRenderRevision((value) => value + 1)
  }

  async function postRelationship(
    source: MindMapApiNode,
    target: MindMapApiNode,
    relation: MindMapRelationType,
  ) {
    if (!snapshot) throw new Error(t('mindmap.mutationError'))
    const response = await nevoliumFetch(
      `${apiUrl}/v1/projects/${encodeURIComponent(snapshot.project_id)}/mindmap/relationships`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: source.entity_type,
          source_id: source.entity_id,
          relation_type: relation,
          target_type: target.entity_type,
          target_id: target.entity_id,
        }),
      },
    )
    return readJson<MindMapApiEdge>(response)
  }

  async function recreateRelationship(edge: MindMapApiEdge) {
    if (!snapshot) throw new Error(t('mindmap.mutationError'))
    const response = await nevoliumFetch(
      `${apiUrl}/v1/projects/${encodeURIComponent(snapshot.project_id)}/mindmap/relationships`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: edge.source_type,
          source_id: edge.source_id,
          relation_type: edge.relation_type,
          target_type: edge.target_type,
          target_id: edge.target_id,
        }),
      },
    )
    return readJson<MindMapApiEdge>(response)
  }

  async function deleteRelationshipRemote(edge: MindMapApiEdge) {
    if (!snapshot) throw new Error(t('mindmap.mutationError'))
    const response = await nevoliumFetch(
      `${apiUrl}/v1/projects/${encodeURIComponent(snapshot.project_id)}/mindmap/relationships/${encodeURIComponent(edge.id)}`,
      { method: 'DELETE' },
    )
    if (!response.ok) await readJson(response)
  }

  const selectedEdge = selectedEdgeId ? apiEdgeById.get(selectedEdgeId) || null : null
  const selectedIdea = selectedNodeIds.length === 1 ? apiNodeByKey.get(selectedNodeIds[0]) || null : null
  const canConvertIdea = selectedIdea?.kind === 'idea'
  const canDeleteEdge = Boolean(
    selectedEdge
      && selectedEdge.metadata_json.surface === 'mindmap'
      && selectedEdge.relation_type !== 'converted_to'
      && selectedEdge.metadata_json.conversion !== true,
  )

  async function createLink() {
    const source = apiNodeByKey.get(linkSourceKey)
    const target = apiNodeByKey.get(linkTargetKey)
    if (!source || !target || source.key === target.key) return
    setMutating(true)
    setError(null)
    try {
      const edge = await postRelationship(source, target, linkRelation)
      addEdgeLocal(edge)
      setSelectedEdgeId(edge.id)
      setPast((items) => [...items.slice(-39), { kind: 'link-created', edge }])
      setFuture([])
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t('mindmap.mutationError'))
    } finally { setMutating(false) }
  }

  async function deleteSelectedLink() {
    if (!selectedEdge || !canDeleteEdge) return
    setMutating(true)
    setError(null)
    try {
      await deleteRelationshipRemote(selectedEdge)
      removeEdgeLocal(selectedEdge.id)
      setPast((items) => [...items.slice(-39), { kind: 'link-deleted', edge: selectedEdge }])
      setFuture([])
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t('mindmap.mutationError'))
    } finally { setMutating(false) }
  }

  async function convertSelectedIdea() {
    if (!snapshot || !selectedIdea || !canConvertIdea) return
    setMutating(true)
    setError(null)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/projects/${encodeURIComponent(snapshot.project_id)}/mindmap/ideas/${encodeURIComponent(selectedIdea.entity_id)}/convert-to-task`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      )
      const conversion = await readJson<IdeaConversionRead>(response)
      const taskKey = `task:${conversion.task_id}`
      await refreshSnapshot(taskKey)
      updateDeepLink(taskKey)
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t('mindmap.mutationError'))
    } finally { setMutating(false) }
  }

  async function undo() {
    const entry = past.at(-1)
    if (!entry || mutating) return
    if (entry.kind === 'layout') {
      setPast((items) => items.slice(0, -1))
      setFuture((items) => [entry, ...items].slice(0, 40))
      applyLayout(entry.before)
      return
    }
    setMutating(true)
    setError(null)
    try {
      if (entry.kind === 'link-created') {
        await deleteRelationshipRemote(entry.edge)
        removeEdgeLocal(entry.edge.id)
        setPast((items) => items.slice(0, -1))
        setFuture((items) => [entry, ...items].slice(0, 40))
      } else {
        const restored = await recreateRelationship(entry.edge)
        addEdgeLocal(restored)
        setPast((items) => items.slice(0, -1))
        setFuture((items) => [{ kind: 'link-deleted', edge: restored }, ...items].slice(0, 40) as HistoryEntry[])
      }
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : t('mindmap.mutationError'))
    } finally { setMutating(false) }
  }

  async function redo() {
    const entry = future[0]
    if (!entry || mutating) return
    if (entry.kind === 'layout') {
      setFuture((items) => items.slice(1))
      setPast((items) => [...items.slice(-39), entry])
      applyLayout(entry.after)
      return
    }
    setMutating(true)
    setError(null)
    try {
      if (entry.kind === 'link-created') {
        const restored = await recreateRelationship(entry.edge)
        addEdgeLocal(restored)
        setFuture((items) => items.slice(1))
        setPast((items) => [...items.slice(-39), { kind: 'link-created', edge: restored }])
      } else {
        await deleteRelationshipRemote(entry.edge)
        removeEdgeLocal(entry.edge.id)
        setFuture((items) => items.slice(1))
        setPast((items) => [...items.slice(-39), entry])
      }
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : t('mindmap.mutationError'))
    } finally { setMutating(false) }
  }

  function captureDrag(affected: Node[]) {
    const before = layoutRef.current
    const positions = { ...before.positions }
    for (const node of affected) {
      if (!apiNodeByKey.has(node.id)) continue
      const position = positionById.get(node.id) || node.position
      positions[node.id] = { x: position.x, y: position.y }
    }
    dragBeforeRef.current = { ...before, positions }
  }

  function commitDraggedNodes(affected: Node[]) {
    const current = layoutRef.current
    const before = dragBeforeRef.current || current
    dragBeforeRef.current = null
    const positions = { ...current.positions }
    let changed = false
    for (const node of affected) {
      if (!apiNodeByKey.has(node.id)) continue
      const old = before.positions[node.id] || positionById.get(node.id)
      const next = { x: node.position.x, y: node.position.y }
      if (!old || old.x !== next.x || old.y !== next.y) changed = true
      positions[node.id] = next
    }
    if (changed) recordLayout({ ...current, positions }, before)
  }

  function useSelectionForLink() {
    if (selectedNodeIds.length !== 2) return
    setLinkSourceKey(selectedNodeIds[0])
    setLinkTargetKey(selectedNodeIds[1])
  }

  function swapLinkDirection() {
    setLinkSourceKey(linkTargetKey)
    setLinkTargetKey(linkSourceKey)
  }

  function createGroup() {
    const label = groupLabel.trim()
    if (!snapshot || !label || selectedNodeIds.length < 2) return
    const id = crypto.randomUUID()
    const current = layoutRef.current
    const next: MindMapLayout = {
      ...current,
      groups: {
        ...(current.groups || {}),
        [id]: { label, node_ids: [...selectedNodeIds], collapsed: false },
      },
    }
    setGroupLabel('')
    recordLayout(next)
  }

  function toggleGroup(groupId: string) {
    const current = layoutRef.current
    const group = current.groups?.[groupId]
    if (!group) return
    recordLayout({
      ...current,
      groups: { ...(current.groups || {}), [groupId]: { ...group, collapsed: !group.collapsed } },
    })
  }

  function deleteGroup(groupId: string) {
    const current = layoutRef.current
    if (!current.groups?.[groupId]) return
    const nextGroups = { ...(current.groups || {}) }
    delete nextGroups[groupId]
    recordLayout({ ...current, groups: nextGroups })
  }

  function exportMindMap() {
    if (!snapshot) return
    const payload = {
      schema: 'nevolium-mindmap-v1',
      exported_at: new Date().toISOString(),
      project_id: snapshot.project_id,
      nodes: snapshot.nodes,
      relationships: snapshot.edges,
      layout,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `nevolium-mindmap-${snapshot.project_id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function updateDeepLink(nodeId: string | null) {
    const url = new URL(window.location.href)
    if (nodeId) url.searchParams.set('mindmap', nodeId)
    else url.searchParams.delete('mindmap')
    window.history.replaceState({}, '', url)
  }

  const positionById = useMemo(() => {
    if (!snapshot) return new Map<string, SavedPosition>()
    const fallback = buildRadialMindMapLayout(graphSnapshot(snapshot), { rootId: `project:${snapshot.project_id}` })
    const generated = new Map(fallback.placements.map((item) => [item.id, { x: item.x, y: item.y }]))
    for (const [id, position] of Object.entries(layout.positions)) generated.set(id, position)
    return generated
  }, [layout.positions, snapshot])

  const collapsedGroups = useMemo(
    () => Object.entries(layout.groups || {}).filter(([, group]) => group.collapsed), [layout.groups],
  )
  const collapsedMemberIds = useMemo(
    () => new Set(collapsedGroups.flatMap(([, group]) => group.node_ids)), [collapsedGroups],
  )
  const groupedMemberIds = useMemo(
    () => new Set(Object.values(layout.groups || {}).flatMap((group) => group.node_ids)), [layout.groups],
  )

  const renderedNodes = useMemo<FlowNode[]>(() => {
    if (!snapshot) return []
    const normalized = lower(query.trim())
    const canonical = snapshot.nodes
      .filter((source) => !collapsedMemberIds.has(source.key))
      .filter((source) => {
        if (source.entity_type === 'project') return true
        const matchesFilter = filter === 'all'
          || (filter === 'document' && source.entity_type === 'document') || source.kind === filter
        if (!matchesFilter) return false
        return !normalized || lower(`${source.label} ${source.kind} ${source.status}`).includes(normalized)
      })
      .map((source): FlowNode => ({
        id: source.key,
        position: positionById.get(source.key) || { x: 0, y: 0 },
        selected: selectedNodeIds.includes(source.key),
        className: `${nodeClassName(source)}${groupedMemberIds.has(source.key) ? ' is-grouped' : ''}`,
        data: {
          label: (
            <div className="mindmap-node-content">
              <span>{kindLabel(source.kind)}</span>
              <strong>{source.label}</strong>
              <small>{stateLabel(source)}</small>
            </div>
          ),
        },
      }))
    const groups = collapsedGroups.map(([groupId, group]): FlowNode => ({
      id: `layout-group:${groupId}`,
      position: averageGroupPosition(group, positionById),
      draggable: false,
      selectable: false,
      className: 'mindmap-node mindmap-node-group',
      data: {
        label: (
          <div className="mindmap-node-content">
            <span>{t('mindmap.group')}</span>
            <strong>{group.label}</strong>
            <small>{group.node_ids.length} {t('mindmap.nodes')}</small>
          </div>
        ),
      },
    }))
    return [...canonical, ...groups]
  }, [collapsedGroups, collapsedMemberIds, filter, groupedMemberIds, kindLabel, lower, positionById, query, selectedNodeIds, snapshot, stateLabel, t])

  const visibleCanonicalIds = useMemo(
    () => new Set(renderedNodes.filter((node) => !node.id.startsWith('layout-group:')).map((node) => node.id)), [renderedNodes],
  )
  const renderedEdges = useMemo<Edge[]>(() => {
    if (!snapshot) return []
    return snapshot.edges
      .filter((edge) => visibleCanonicalIds.has(edge.source_key) && visibleCanonicalIds.has(edge.target_key))
      .map((edge) => ({
        id: edge.id,
        source: edge.source_key,
        target: edge.target_key,
        type: 'bezier',
        label: RELATION_TYPES.includes(edge.relation_type as MindMapRelationType) || edge.relation_type === 'converted_to'
          ? relationLabel(edge.relation_type as MindMapRelationType) : edge.relation_type.replaceAll('_', ' '),
        className: edge.metadata_json.surface === 'mindmap' ? 'mindmap-edge is-editable' : 'mindmap-edge is-canonical',
        markerEnd: edge.directed ? { type: MarkerType.ArrowClosed } : undefined,
        selected: edge.id === selectedEdgeId,
      }))
  }, [relationLabel, selectedEdgeId, snapshot, visibleCanonicalIds])

  const flowKey = `${snapshot?.project_id || 'empty'}:${renderRevision}:${language}:${filter}:${query}`
  if (loading || !snapshot) {
    return (
      <section className="mindmap-workspace state-panel" aria-busy="true">
        <span className="eyebrow">{t('mindmap.eyebrow')}</span>
        <p>{error || t('mindmap.loading')}</p>
      </section>
    )
  }

  return (
    <section className="mindmap-workspace" data-project-id={snapshot.project_id}>
      <header className="mindmap-toolbar">
        <div>
          <span className="eyebrow">{t('mindmap.eyebrow')}</span>
          <h2>{t('mindmap.panelTitle')}</h2>
          <p>{t('mindmap.heading')}</p>
        </div>
        <div className="mindmap-toolbar-actions">
          <button type="button" onClick={() => void undo()} disabled={past.length === 0 || mutating}>{t('mindmap.undo')}</button>
          <button type="button" onClick={() => void redo()} disabled={future.length === 0 || mutating}>{t('mindmap.redo')}</button>
          <button type="button" onClick={exportMindMap}>{t('mindmap.export')}</button>
          <span className="mindmap-save-state" data-save-state={persistence.status} aria-live="polite">{saveCopy[persistence.status]}</span>
          {persistence.status === 'error' ? <button type="button" onClick={persistence.retry}>{saveCopy.retry}</button> : null}
        </div>
      </header>

      <div className="mindmap-controls-row">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('mindmap.search')} aria-label={t('mindmap.search')} />
        <select value={filter} onChange={(event) => setFilter(event.target.value as FilterMode)} aria-label={t('mindmap.filter')}>
          <option value="all">{t('mindmap.filterAll')}</option>
          <option value="task">{t('mindmap.filterTasks')}</option>
          <option value="document">{t('mindmap.filterDocuments')}</option>
          <option value="idea">{t('mindmap.filterIdeas')}</option>
          <option value="decision">{t('mindmap.filterDecisions')}</option>
          <option value="note">{t('mindmap.filterNotes')}</option>
          <option value="source">{t('mindmap.filterSources')}</option>
        </select>
        <span>{visibleCanonicalIds.size} {t('mindmap.nodes')}</span>
        <span>{renderedEdges.length} {t('mindmap.links')}</span>
        <span>{selectedNodeIds.length} {t('mindmap.selected')}</span>
      </div>

      <div className="mindmap-editors">
        <section className="mindmap-editor-card" aria-label={t('mindmap.linkEditor')}>
          <strong>{t('mindmap.linkEditor')}</strong>
          <div className="mindmap-editor-grid">
            <label>{t('mindmap.linkSource')}<select value={linkSourceKey} onChange={(event) => setLinkSourceKey(event.target.value)}>
              <option value="">—</option>{snapshot.nodes.map((node) => <option key={`source-${node.key}`} value={node.key}>{kindLabel(node.kind)} · {node.label}</option>)}
            </select></label>
            <label>{t('mindmap.linkRelation')}<select value={linkRelation} onChange={(event) => setLinkRelation(event.target.value as MindMapRelationType)}>
              {RELATION_TYPES.map((relation) => <option key={relation} value={relation}>{relationLabel(relation)}</option>)}
            </select></label>
            <label>{t('mindmap.linkTarget')}<select value={linkTargetKey} onChange={(event) => setLinkTargetKey(event.target.value)}>
              <option value="">—</option>{snapshot.nodes.map((node) => <option key={`target-${node.key}`} value={node.key}>{kindLabel(node.kind)} · {node.label}</option>)}
            </select></label>
          </div>
          <div className="mindmap-editor-actions">
            <button type="button" onClick={useSelectionForLink} disabled={selectedNodeIds.length !== 2 || mutating}>{t('mindmap.useSelection')}</button>
            <button type="button" onClick={swapLinkDirection} disabled={!linkSourceKey || !linkTargetKey || mutating}>{t('mindmap.swapDirection')}</button>
            <button type="button" onClick={() => void createLink()} disabled={!linkSourceKey || !linkTargetKey || linkSourceKey === linkTargetKey || mutating}>{t('mindmap.linkCreate')}</button>
            <button type="button" onClick={() => void deleteSelectedLink()} disabled={!canDeleteEdge || mutating}>{t('mindmap.linkDelete')}</button>
          </div>
          {selectedEdge ? <small>{t('mindmap.selectedLink')} · {relationLabel(selectedEdge.relation_type as MindMapRelationType)}</small> : null}
        </section>

        <section className="mindmap-editor-card" aria-label={t('mindmap.groups')}>
          <strong>{t('mindmap.groups')}</strong>
          <div className="mindmap-editor-actions">
            <input value={groupLabel} onChange={(event) => setGroupLabel(event.target.value)} placeholder={t('mindmap.groupName')} aria-label={t('mindmap.groupName')} />
            <button type="button" onClick={createGroup} disabled={!groupLabel.trim() || selectedNodeIds.length < 2 || mutating}>{t('mindmap.groupCreate')}</button>
          </div>
          <div className="mindmap-group-list">
            {Object.entries(layout.groups || {}).map(([groupId, group]) => (
              <div key={groupId} className="mindmap-group-row">
                <span>{group.label} · {group.node_ids.length}</span>
                <button type="button" onClick={() => toggleGroup(groupId)}>{group.collapsed ? t('mindmap.groupExpand') : t('mindmap.groupCollapse')}</button>
                <button type="button" onClick={() => deleteGroup(groupId)}>{t('mindmap.groupDelete')}</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {canConvertIdea ? (
        <div className="mindmap-conversion-bar">
          <span>{t('mindmap.ideaSelected')} · {selectedIdea?.label}</span>
          <button type="button" onClick={() => void convertSelectedIdea()} disabled={mutating}>{mutating ? t('mindmap.converting') : t('mindmap.convertIdea')}</button>
        </div>
      ) : null}

      {(snapshot.tasks_truncated || snapshot.documents_truncated || snapshot.relationships_truncated) ? <div className="mindmap-warning" role="status">{t('mindmap.truncated')}</div> : null}
      {persistence.status === 'error' ? <div className="mindmap-error" role="alert">{t('mindmap.saveError')} {persistence.error}</div> : null}
      {error ? <div className="mindmap-error" role="alert">{error}</div> : null}

      <div className="mindmap-canvas">
        <ReactFlow
          key={flowKey}
          defaultNodes={renderedNodes}
          defaultEdges={renderedEdges}
          onNodeDragStart={(_, node, affected) => captureDrag(affected.length ? affected : [node])}
          onNodeDragStop={(_, node, affected) => commitDraggedNodes(affected.length ? affected : [node])}
          onSelectionDragStart={(_, affected) => captureDrag(affected)}
          onSelectionDragStop={(_, affected) => commitDraggedNodes(affected)}
          onNodeClick={(_, node) => { if (!node.id.startsWith('layout-group:')) updateDeepLink(node.id) }}
          onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
          onPaneClick={() => { updateDeepLink(null); setSelectedEdgeId(null); setSelectedNodeIds([]) }}
          onSelectionChange={onSelectionChange}
          onMoveEnd={(event, viewport) => {
            // Programmatic fitView/remount is not a user edit and must not retry a failed save.
            if (!event) return
            const current = layoutRef.current
            if (current.viewport?.x === viewport.x && current.viewport?.y === viewport.y && current.viewport?.zoom === viewport.zoom) return
            const next = { ...current, viewport }
            replaceLayout(next)
            persistence.save(next)
          }}
          defaultViewport={layout.viewport || DEFAULT_VIEWPORT}
          fitView={!layout.viewport}
          fitViewOptions={FIT_VIEW_OPTIONS}
          minZoom={0.15}
          maxZoom={1.8}
          selectionOnDrag
          multiSelectionKeyCode="Shift"
          deleteKeyCode={null}
          proOptions={PRO_OPTIONS}
        >
          <Background gap={32} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  )
}
