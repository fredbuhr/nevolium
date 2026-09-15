import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  buildRadialMindMapLayout,
  type NevoliumGraphSnapshot,
} from '@nevolium/graph'

import { useI18n } from './i18n'
import { nevoliumFetch } from './lib/apiClient'
import { useProjectSelection } from './lib/projectSelection'

type MindMapEntityType = 'project' | 'task' | 'document'
type MindMapKind = 'project' | 'task' | 'source' | 'note' | 'idea' | 'decision' | string

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
type MindMapLayout = {
  positions: Record<string, SavedPosition>
  viewport?: Viewport
  groups?: Record<string, { label: string; node_ids: string[]; collapsed?: boolean }>
}

type WorkspaceLayoutRead = {
  workspace_key: string
  schema_version: number
  layout: MindMapLayout
}

type FilterMode = 'all' | 'task' | 'document' | 'idea' | 'decision' | 'note' | 'source'

type Props = { apiUrl: string }

const EMPTY_LAYOUT: MindMapLayout = { positions: {}, groups: {} }

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

function buildFlowNodes(snapshot: MindMapSnapshot, layout: MindMapLayout): Node[] {
  const fallback = buildRadialMindMapLayout(graphSnapshot(snapshot), {
    rootId: `project:${snapshot.project_id}`,
  })
  const fallbackById = new Map(fallback.placements.map((item) => [item.id, item]))
  return snapshot.nodes.map((node) => {
    const saved = layout.positions[node.key]
    const generated = fallbackById.get(node.key)
    const position = saved || {
      x: generated?.x ?? 0,
      y: generated?.y ?? 0,
    }
    return {
      id: node.key,
      position,
      className: nodeClassName(node),
      data: {
        label: (
          <div className="mindmap-node-content">
            <span>{node.kind}</span>
            <strong>{node.label}</strong>
            <small>{node.epistemic_status || node.status}</small>
          </div>
        ),
      },
    }
  })
}

function buildFlowEdges(snapshot: MindMapSnapshot): Edge[] {
  return snapshot.edges.map((edge) => ({
    id: edge.id,
    source: edge.source_key,
    target: edge.target_key,
    label: edge.relation_type.replaceAll('_', ' '),
    type: 'bezier',
    className: edge.metadata_json.surface === 'mindmap'
      ? 'mindmap-edge is-editable'
      : 'mindmap-edge is-canonical',
    markerEnd: edge.directed ? { type: MarkerType.ArrowClosed } : undefined,
  }))
}

function positionsFromNodes(nodes: Node[]): Record<string, SavedPosition> {
  return Object.fromEntries(
    nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]),
  )
}

export default function MindMapWorkspace({ apiUrl }: Props) {
  const { selectedProjectId } = useProjectSelection()
  const { lower, t } = useI18n()
  const [snapshot, setSnapshot] = useState<MindMapSnapshot | null>(null)
  const [layout, setLayout] = useState<MindMapLayout>(EMPTY_LAYOUT)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectionCount, setSelectionCount] = useState(0)
  const [past, setPast] = useState<MindMapLayout[]>([])
  const [future, setFuture] = useState<MindMapLayout[]>([])

  const persistLayout = useCallback(async (
    workspaceKey: string,
    next: MindMapLayout,
  ) => {
    setSaving(true)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/ui/workspaces/${encodeURIComponent(workspaceKey)}/layout`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema_version: 1, layout: next }),
        },
      )
      await readJson<WorkspaceLayoutRead>(response)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('mindmap.saveError'))
    } finally {
      setSaving(false)
    }
  }, [apiUrl, t])

  const applyLayout = useCallback((
    next: MindMapLayout,
    options: { recordHistory?: boolean; persist?: boolean } = {},
  ) => {
    if (!snapshot) return
    if (options.recordHistory !== false) {
      setPast((items) => [...items.slice(-39), layout])
      setFuture([])
    }
    setLayout(next)
    setNodes((current) => current.map((node) => ({
      ...node,
      position: next.positions[node.id] || node.position,
    })))
    if (options.persist !== false) {
      void persistLayout(snapshot.layout_workspace_key, next)
    }
  }, [layout, persistLayout, setNodes, snapshot])

  useEffect(() => {
    if (!selectedProjectId) {
      setSnapshot(null)
      setNodes([])
      setEdges([])
      setLayout(EMPTY_LAYOUT)
      setPast([])
      setFuture([])
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setSelectionCount(0)

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
        setSnapshot(nextSnapshot)
        setLayout(nextLayout)
        setNodes(buildFlowNodes(nextSnapshot, nextLayout))
        setEdges(buildFlowEdges(nextSnapshot))
        setPast([])
        setFuture([])
      } catch (loadError) {
        if (controller.signal.aborted) return
        setError(loadError instanceof Error ? loadError.message : t('mindmap.loadError'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [apiUrl, selectedProjectId, setNodes, t])

  const apiNodeByKey = useMemo(
    () => new Map((snapshot?.nodes || []).map((node) => [node.key, node])),
    [snapshot],
  )

  const visibleNodes = useMemo(() => {
    const normalized = lower(query.trim())
    return nodes.filter((node) => {
      const source = apiNodeByKey.get(node.id)
      if (!source) return false
      if (source.entity_type === 'project') return true
      const matchesFilter = filter === 'all'
        || (filter === 'document' && source.entity_type === 'document')
        || source.kind === filter
      if (!matchesFilter) return false
      return !normalized || lower(`${source.label} ${source.kind} ${source.status}`).includes(normalized)
    })
  }, [apiNodeByKey, filter, lower, nodes, query])

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  )
  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds],
  )

  function commitNodePositions(nextNodes: Node[]) {
    if (!snapshot) return
    const next = { ...layout, positions: positionsFromNodes(nextNodes) }
    applyLayout(next)
  }

  function undo() {
    const previous = past.at(-1)
    if (!previous) return
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [layout, ...items].slice(0, 40))
    applyLayout(previous, { recordHistory: false })
  }

  function redo() {
    const next = future[0]
    if (!next) return
    setFuture((items) => items.slice(1))
    setPast((items) => [...items.slice(-39), layout])
    applyLayout(next, { recordHistory: false })
  }

  function updateDeepLink(nodeId: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('mindmap', nodeId)
    window.history.replaceState({}, '', url)
  }

  if (!selectedProjectId) {
    return (
      <section className="mindmap-workspace state-panel">
        <span className="eyebrow">{t('mindmap.eyebrow')}</span>
        <h2>{t('mindmap.panelTitle')}</h2>
        <p>{t('mindmap.projectRequired')}</p>
      </section>
    )
  }

  if (loading || !snapshot) {
    return (
      <section className="mindmap-workspace state-panel" aria-busy="true">
        <span className="eyebrow">{t('mindmap.eyebrow')}</span>
        <p>{error || t('mindmap.loading')}</p>
      </section>
    )
  }

  return (
    <section className="mindmap-workspace">
      <header className="mindmap-toolbar">
        <div>
          <span className="eyebrow">{t('mindmap.eyebrow')}</span>
          <h2>{t('mindmap.panelTitle')}</h2>
          <p>{t('mindmap.heading')}</p>
        </div>
        <div className="mindmap-toolbar-actions">
          <button type="button" onClick={undo} disabled={past.length === 0}>
            {t('mindmap.undo')}
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0}>
            {t('mindmap.redo')}
          </button>
          <span className="mindmap-save-state" aria-live="polite">
            {saving ? t('mindmap.saving') : t('mindmap.saved')}
          </span>
        </div>
      </header>

      <div className="mindmap-controls-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('mindmap.search')}
          aria-label={t('mindmap.search')}
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterMode)}
          aria-label={t('mindmap.filter')}
        >
          <option value="all">{t('mindmap.filterAll')}</option>
          <option value="task">{t('mindmap.filterTasks')}</option>
          <option value="document">{t('mindmap.filterDocuments')}</option>
          <option value="idea">{t('mindmap.filterIdeas')}</option>
          <option value="decision">{t('mindmap.filterDecisions')}</option>
          <option value="note">{t('mindmap.filterNotes')}</option>
          <option value="source">{t('mindmap.filterSources')}</option>
        </select>
        <span>{visibleNodes.length} {t('mindmap.nodes')}</span>
        <span>{visibleEdges.length} {t('mindmap.links')}</span>
        <span>{selectionCount} {t('mindmap.selected')}</span>
      </div>

      {(snapshot.tasks_truncated || snapshot.documents_truncated || snapshot.relationships_truncated) ? (
        <div className="mindmap-warning" role="status">{t('mindmap.truncated')}</div>
      ) : null}
      {error ? <div className="mindmap-error" role="alert">{error}</div> : null}

      <div className="mindmap-canvas">
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onNodeDragStop={() => commitNodePositions(nodes)}
          onNodeClick={(_, node) => updateDeepLink(node.id)}
          onSelectionChange={({ nodes: selected }) => setSelectionCount(selected.length)}
          onMoveEnd={(_, viewport) => {
            const next = { ...layout, viewport }
            setLayout(next)
            void persistLayout(snapshot.layout_workspace_key, next)
          }}
          defaultViewport={layout.viewport || { x: 0, y: 0, zoom: 1 }}
          fitView={!layout.viewport}
          fitViewOptions={{ padding: 0.2, maxZoom: 1.15 }}
          minZoom={0.15}
          maxZoom={1.8}
          selectionOnDrag
          multiSelectionKeyCode="Shift"
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={32} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  )
}
