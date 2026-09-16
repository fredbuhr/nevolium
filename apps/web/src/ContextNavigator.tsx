import { useEffect, useRef, useState } from 'react'

import { useWorkspaceMessages } from './workspaceMessages'
import { nevoliumFetch } from './lib/apiClient'
import { usePagedCollection } from './lib/usePagedCollection'
import { useProjectSelection } from './lib/projectSelection'

type EntityType = 'project' | 'task' | 'document'
type Entity = { id: string; name?: string; title?: string; parent_id?: string | null; project_id?: string; summary?: string; description?: string; status: string }
type Focus = { type: EntityType; entity: Entity; projectId: string }
type Relation = { id: string; source_type: string; source_id: string; target_type: string; target_id: string; relation_type: string }
const RESOURCES: Record<EntityType, string> = { project: 'projects', task: 'tasks', document: 'documents' }

/** Inspect existing canonical links. No inferred links, graph projection or mutation. */
export default function ContextNavigator({ apiUrl, onOpenSpace }: {
  apiUrl: string; onOpenSpace: (key: string) => void
}) {
  const w = useWorkspaceMessages()
  const TYPES = { project: w('projectType'), task: w('taskType'), document: w('documentType') }
  const selectedType = { project: w('selectedProjectType'), task: w('selectedTaskType'), document: w('selectedDocumentType') }
  const RELATIONS: Record<string, string> = { contains: w('containsRelation'), related_to: w('relatedRelation'), supports: w('supportsRelation'), derived_from: w('derivedRelation'), depends_on: w('dependsRelation'), references: w('referencesRelation'), informs: w('informsRelation') }
  const title = (entity: Entity) => entity.name || entity.title || w('untitledItem')
  const stateLabel = (state: string) => ({ active: w('activeState'), ready: w('readyState'), todo: w('todoState'), queued: w('queuedState'), running: w('runningState'), completed: w('completedState'), failed: w('failedState'), processing: w('processingState'), pending: w('queuedState') }[state] || state)
  const { selectedProjectId, setSelectedProjectId, setSelectedDocumentId } = useProjectSelection()
  const [focus, setFocus] = useState<Focus | null>(null)
  const [trail, setTrail] = useState<Focus[]>([])
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const scope = useRef(selectedProjectId)
  scope.current = selectedProjectId
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { request.current?.abort(); setOpening(false); setOpenError(null) }, [selectedProjectId])

  const projects = usePagedCollection<Entity>(`${apiUrl}/v1/projects?limit=30`, selectedProjectId ? `${apiUrl}/v1/projects/${selectedProjectId}` : null)
  const project = projects.items.find(item => item.id === selectedProjectId)
  const root: Focus | null = project ? { type: 'project', entity: project, projectId: project.id } : null
  const current = focus?.projectId === selectedProjectId ? focus : root
  const documents = usePagedCollection<Entity>(selectedProjectId ? `${apiUrl}/v1/documents?project_id=${encodeURIComponent(selectedProjectId)}&limit=8` : null)
  const tasks = usePagedCollection<Entity>(selectedProjectId ? `${apiUrl}/v1/tasks?project_id=${encodeURIComponent(selectedProjectId)}&limit=8` : null)
  const relations = usePagedCollection<Relation>(current ? `${apiUrl}/v1/relationships?entity_type=${current.type}&entity_id=${encodeURIComponent(current.entity.id)}&limit=12` : null)

  function visit(next: Focus, record = true) {
    if (record && current && (current.entity.id !== next.entity.id || current.type !== next.type)) {
      setTrail(previous => [...previous.slice(-5), current])
    }
    setFocus(next)
    setSelectedProjectId(next.projectId)
    setOpenError(null)
  }

  async function follow(type: EntityType, id: string, record = true) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const origin = selectedProjectId
    setOpening(true)
    setOpenError(null)
    try {
      const response = await nevoliumFetch(`${apiUrl}/v1/${RESOURCES[type]}/${encodeURIComponent(id)}`, { signal: controller.signal })
      if (!response.ok) throw new Error(response.status === 404 ? w('inaccessibleItem') : w('loadItemFailed'))
      const entity = await response.json() as Entity
      if (controller.signal.aborted || scope.current !== origin) return
      visit({ type, entity, projectId: type === 'project' ? entity.id : entity.project_id || origin }, record)
    } catch (cause) {
      if (!controller.signal.aborted) setOpenError(cause instanceof Error ? cause.message : w('readFailed'))
    } finally {
      if (!controller.signal.aborted) setOpening(false)
    }
  }

  function openCurrent() {
    if (!current) return
    if (current.type === 'document') setSelectedDocumentId(current.entity.id)
    onOpenSpace(current.type === 'document' ? 'knowledge' : 'projects')
  }

  const parentId = current?.type === 'project' ? current.entity.parent_id : current?.projectId
  const errors = [projects.error, documents.error, tasks.error, relations.error].filter(Boolean)
  const reveal = (id: string) => {
    const heading = document.getElementById(id)
    heading?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    heading?.focus({ preventScroll: true })
  }
  return (
    <aside className="context-navigator" aria-label={w('linkedThread')}>
      <div className="thread-heading"><span className="eyebrow">{w('keepThread')}</span><h2>{w('aroundYou')}</h2><p>{w('contextHint')}</p></div>
      <label className="thread-project-picker">{w('yourContext')}
        <select value={selectedProjectId} onChange={event => { setSelectedProjectId(event.target.value); setFocus(null); setTrail([]) }}>
          <option value="">{w('noSelectedProject')}</option>
          {projects.items.map(item => <option key={item.id} value={item.id}>{title(item)}</option>)}
        </select>
      </label>
      {projects.hasMore ? <button type="button" disabled={projects.loading} onClick={() => void projects.loadMore()}>{w('moreProjects')}</button> : null}
      {projects.loading ? <p role="status">{w('loadingContexts')}</p> : null}
      {errors.length ? <div className="thread-error" role="alert"><p>{w('linksError')}</p><button type="button" onClick={() => { void projects.reload(); void documents.reload(); void tasks.reload(); void relations.reload() }}>{w('refreshLinks')}</button></div> : null}
      {current ? <>
        <nav className="relation-compass" aria-label={w('exploreDirections')}>
          <svg viewBox="0 0 260 184" aria-hidden="true" focusable="false">
            <g fill="none" strokeLinecap="round">
              <path d="M129 93C116 80 135 69 126 53S129 33 130 25M129 93C113 105 99 92 82 105S40 109 30 113M129 93C142 108 159 94 174 116S213 136 232 146" stroke="#65d7c2" strokeWidth="1.3" />
              <path d="M133 95C145 69 119 59 130 25M126 88C112 115 82 93 72 115S47 105 30 113M127 89C153 120 177 102 187 130S219 132 232 146M127 69Q138 82 121 98M81 105Q85 116 97 110M175 117Q194 119 199 134" stroke="#8ce5da" strokeWidth=".55" opacity=".6" />
            </g>
            <g fill="#b4f6de"><circle cx="130" cy="25" r="3" /><circle cx="30" cy="113" r="3" /><circle cx="232" cy="146" r="3" /><circle cx="129" cy="93" r="5" /></g>
          </svg>
          <button className="compass-parent" type="button" onClick={() => reveal('thread-parent')} aria-label={w('seeParent')}>{w('origin')}</button>
          <button className="compass-near" type="button" onClick={() => reveal('thread-neighbours')} aria-label={w('seeNeighbours')}>{w('neighbours')}</button>
          <button className="compass-cross" type="button" onClick={() => reveal('thread-crossings')} aria-label={w('seeConnections')}>{w('connections')}</button>
          <span className="compass-center">{w('hereShort')}</span>
        </nav>
        <nav className="thread-trail" aria-label={w('visitedPath')}>
          {trail.length ? <button type="button" onClick={() => {
            const previous = trail.at(-1)!
            setTrail(items => items.slice(0, -1))
            // Re-read on return: never reopen inaccessible data from an old trail.
            void follow(previous.type, previous.entity.id, false)
          }}>{w('previousLink')}</button> : null}
          <span>{selectedType[current.type]}</span>
        </nav>
        <div className="thread-focus" aria-live="polite" aria-busy={opening}>
          <img src="/icons/nevolium.svg" alt="" />
          <strong>{title(current.entity)}</strong>
          <small>{stateLabel(current.entity.status)}</small>
          {current.entity.summary || current.entity.description ? <p>{current.entity.summary || current.entity.description}</p> : null}
          <button type="button" onClick={openCurrent}>{current.type === 'task' ? w('openTaskProject') : w('openItem')} →</button>
        </div>
        {opening ? <p role="status">{w('loadingLink')}</p> : null}
        {openError ? <p className="thread-error" role="alert">{openError}</p> : null}
        <section className="thread-branch thread-vertical" aria-labelledby="thread-parent">
          <h3 id="thread-parent" tabIndex={-1}><span aria-hidden="true">↑</span> {w('whereFrom')}</h3>
          {parentId ? <button type="button" onClick={() => void follow('project', parentId)}>{w('parentProject')} <span aria-hidden="true">↗</span></button> : <p>{w('noParent')}</p>}
        </section>
        <section className="thread-branch thread-horizontal" aria-labelledby="thread-neighbours">
          <h3 id="thread-neighbours" tabIndex={-1}><span aria-hidden="true">↔</span> {w('sameProject')}</h3>
          <p>{w('membershipContext')}</p>
          {[...documents.items.map(entity => ({ type: 'document' as const, entity })), ...tasks.items.map(entity => ({ type: 'task' as const, entity }))]
            .filter(item => item.entity.id !== current.entity.id)
            .map(({ type, entity }) => <button key={`${type}:${entity.id}`} type="button" onClick={() => visit({ type, entity, projectId: selectedProjectId })}><small>{TYPES[type]}</small><span>{title(entity)}</span><span aria-hidden="true">↗</span></button>)}
          {documents.loading || tasks.loading ? <p role="status">{w('loadingNeighbours')}</p> : !documents.items.length && !tasks.items.length && !documents.error && !tasks.error ? <p>{w('noNeighbours')}</p> : null}
          {documents.hasMore ? <button type="button" disabled={documents.loading} onClick={() => void documents.loadMore()}>{w('moreDocuments')}</button> : null}
          {tasks.hasMore ? <button type="button" disabled={tasks.loading} onClick={() => void tasks.loadMore()}>{w('moreTasks')}</button> : null}
        </section>
        <section className="thread-branch thread-transverse" aria-labelledby="thread-crossings">
          <h3 id="thread-crossings" tabIndex={-1}><span aria-hidden="true">⤢</span> {w('crossLinks')}</h3>
          <p>{w('explicitLinks')}</p>
          {relations.loading ? <p role="status">{w('loadingRelations')}</p> : null}
          {!relations.loading && !relations.error && !relations.items.length ? <p>{w('noRelations')}</p> : null}
          {relations.items.map(relation => {
            const outgoing = relation.source_type === current.type && relation.source_id === current.entity.id
            const type = outgoing ? relation.target_type : relation.source_type
            const id = outgoing ? relation.target_id : relation.source_id
            const supported = type in RESOURCES
            const known = [...projects.items, ...documents.items, ...tasks.items].find(item => item.id === id)
            return <button key={relation.id} type="button" disabled={!supported} onClick={() => void follow(type as EntityType, id)}>
              <small>{outgoing ? w('toward') : w('from')} · {RELATIONS[relation.relation_type] || relation.relation_type}</small>
              <span>{known ? title(known) : w('linkedItem')}</span>
              <span aria-hidden="true">{outgoing ? '↗' : '↙'}</span>
              {!supported ? <small>{w('inspectionUnavailable')}</small> : null}
            </button>
          })}
          {relations.hasMore ? <button type="button" disabled={relations.loading} onClick={() => void relations.loadMore()}>{w('moreLinks')}</button> : null}
        </section>
      </> : <div className="thread-empty"><img src="/icons/nevolium.svg" alt="" /><strong>{w('freeStart')}</strong><p>{w('chooseContextHint')}</p><button type="button" onClick={() => onOpenSpace('projects')}>{w('chooseOrCreateProject')}</button></div>}
    </aside>
  )
}
