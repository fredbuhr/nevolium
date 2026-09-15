import { useEffect, useRef, useState } from 'react'

import { nevoliumFetch } from './lib/apiClient'
import { usePagedCollection } from './lib/usePagedCollection'
import { useProjectSelection } from './lib/projectSelection'

type EntityType = 'project' | 'task' | 'document'
type Entity = { id: string; name?: string; title?: string; parent_id?: string | null; project_id?: string; summary?: string; description?: string; status: string }
type Focus = { type: EntityType; entity: Entity; projectId: string }
type Relation = { id: string; source_type: string; source_id: string; target_type: string; target_id: string; relation_type: string }
const TYPES: Record<EntityType, string> = { project: 'Projet', task: 'Action', document: 'Document' }
const RESOURCES: Record<EntityType, string> = { project: 'projects', task: 'tasks', document: 'documents' }
const RELATIONS: Record<string, string> = { contains: 'contient', related_to: 'est relié à', supports: 'étaye', derived_from: 'provient de', depends_on: 'dépend de', references: 'fait référence à', informs: 'éclaire' }
const title = (entity: Entity) => entity.name || entity.title || 'Élément sans titre'
const stateLabel = (state: string) => ({ active: 'Actif', ready: 'Prêt', todo: 'À faire', queued: 'En attente', running: 'En cours', completed: 'Terminé', failed: 'En échec', processing: 'En traitement', pending: 'En attente' }[state] || state)

/** Inspect existing canonical links. No inferred links, graph projection or mutation. */
export default function ContextNavigator({ apiUrl, onOpenSpace }: {
  apiUrl: string; onOpenSpace: (key: string) => void
}) {
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
      if (!response.ok) throw new Error(response.status === 404 ? 'Cet élément n’est plus accessible.' : 'Impossible de lire cet élément. Réessayez le lien.')
      const entity = await response.json() as Entity
      if (controller.signal.aborted || scope.current !== origin) return
      visit({ type, entity, projectId: type === 'project' ? entity.id : entity.project_id || origin }, record)
    } catch (cause) {
      if (!controller.signal.aborted) setOpenError(cause instanceof Error ? cause.message : 'Lecture impossible.')
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
    <aside className="context-navigator" aria-label="Fil relié">
      <div className="thread-heading"><span className="eyebrow">GARDER LE FIL</span><h2>Autour de vous</h2><p>Un contexte, plusieurs chemins.</p></div>
      <label className="thread-project-picker">Votre contexte
        <select value={selectedProjectId} onChange={event => { setSelectedProjectId(event.target.value); setFocus(null); setTrail([]) }}>
          <option value="">Sans projet sélectionné</option>
          {projects.items.map(item => <option key={item.id} value={item.id}>{title(item)}</option>)}
        </select>
      </label>
      {projects.hasMore ? <button type="button" disabled={projects.loading} onClick={() => void projects.loadMore()}>Autres projets</button> : null}
      {projects.loading ? <p role="status">Lecture de vos contextes…</p> : null}
      {errors.length ? <div className="thread-error" role="alert"><p>Certains liens n’ont pas pu être lus. Ils ne sont pas nécessairement absents.</p><button type="button" onClick={() => { void projects.reload(); void documents.reload(); void tasks.reload(); void relations.reload() }}>Actualiser les liens</button></div> : null}
      {current ? <>
        <nav className="relation-compass" aria-label="Explorer les directions du lien">
          <svg viewBox="0 0 260 184" aria-hidden="true" focusable="false">
            <g fill="none" strokeLinecap="round">
              <path d="M129 93C116 80 135 69 126 53S129 33 130 25M129 93C113 105 99 92 82 105S40 109 30 113M129 93C142 108 159 94 174 116S213 136 232 146" stroke="#65d7c2" strokeWidth="1.3" />
              <path d="M133 95C145 69 119 59 130 25M126 88C112 115 82 93 72 115S47 105 30 113M127 89C153 120 177 102 187 130S219 132 232 146M127 69Q138 82 121 98M81 105Q85 116 97 110M175 117Q194 119 199 134" stroke="#8ce5da" strokeWidth=".55" opacity=".6" />
            </g>
            <g fill="#b4f6de"><circle cx="130" cy="25" r="3" /><circle cx="30" cy="113" r="3" /><circle cx="232" cy="146" r="3" /><circle cx="129" cy="93" r="5" /></g>
          </svg>
          <button className="compass-parent" type="button" onClick={() => reveal('thread-parent')} aria-label="Voir le contexte parent">Origine</button>
          <button className="compass-near" type="button" onClick={() => reveal('thread-neighbours')} aria-label="Voir le voisinage du projet">Voisinage</button>
          <button className="compass-cross" type="button" onClick={() => reveal('thread-crossings')} aria-label="Voir les liens transversaux">Connexions</button>
          <span className="compass-center">Ici</span>
        </nav>
        <nav className="thread-trail" aria-label="Chemin parcouru">
          {trail.length ? <button type="button" onClick={() => {
            const previous = trail.at(-1)!
            setTrail(items => items.slice(0, -1))
            // Re-read on return: never reopen inaccessible data from an old trail.
            void follow(previous.type, previous.entity.id, false)
          }}>← Revenir au lien précédent</button> : null}
          <span>{TYPES[current.type]} sélectionné</span>
        </nav>
        <div className="thread-focus" aria-live="polite" aria-busy={opening}>
          <img src="/icons/nevolium.svg" alt="" />
          <strong>{title(current.entity)}</strong>
          <small>{stateLabel(current.entity.status)}</small>
          {current.entity.summary || current.entity.description ? <p>{current.entity.summary || current.entity.description}</p> : null}
          <button type="button" onClick={openCurrent}>{current.type === 'task' ? 'Ouvrir le projet de cette action' : 'Ouvrir cet élément'} →</button>
        </div>
        {opening ? <p role="status">Lecture du lien…</p> : null}
        {openError ? <p className="thread-error" role="alert">{openError}</p> : null}
        <section className="thread-branch thread-vertical" aria-labelledby="thread-parent">
          <h3 id="thread-parent" tabIndex={-1}><span aria-hidden="true">↑</span> D’où cela vient</h3>
          {parentId ? <button type="button" onClick={() => void follow('project', parentId)}>Revenir au projet parent <span aria-hidden="true">↗</span></button> : <p>Ce projet n’a pas de parent.</p>}
        </section>
        <section className="thread-branch thread-horizontal" aria-labelledby="thread-neighbours">
          <h3 id="thread-neighbours" tabIndex={-1}><span aria-hidden="true">↔</span> Dans le même projet</h3>
          <p>Liés par leur appartenance au projet.</p>
          {[...documents.items.map(entity => ({ type: 'document' as const, entity })), ...tasks.items.map(entity => ({ type: 'task' as const, entity }))]
            .filter(item => item.entity.id !== current.entity.id)
            .map(({ type, entity }) => <button key={`${type}:${entity.id}`} type="button" onClick={() => visit({ type, entity, projectId: selectedProjectId })}><small>{TYPES[type]}</small><span>{title(entity)}</span><span aria-hidden="true">↗</span></button>)}
          {documents.loading || tasks.loading ? <p role="status">Lecture du voisinage…</p> : !documents.items.length && !tasks.items.length && !documents.error && !tasks.error ? <p>Aucun document ni action dans cette page.</p> : null}
          {documents.hasMore ? <button type="button" disabled={documents.loading} onClick={() => void documents.loadMore()}>Autres documents</button> : null}
          {tasks.hasMore ? <button type="button" disabled={tasks.loading} onClick={() => void tasks.loadMore()}>Autres actions</button> : null}
        </section>
        <section className="thread-branch thread-transverse" aria-labelledby="thread-crossings">
          <h3 id="thread-crossings" tabIndex={-1}><span aria-hidden="true">⤢</span> Les liens transversaux</h3>
          <p>Relations explicites de cet élément, entrantes et sortantes.</p>
          {relations.loading ? <p role="status">Lecture des relations…</p> : null}
          {!relations.loading && !relations.error && !relations.items.length ? <p>Aucun lien enregistré dans cette page. Nevolium n’en invente pas.</p> : null}
          {relations.items.map(relation => {
            const outgoing = relation.source_type === current.type && relation.source_id === current.entity.id
            const type = outgoing ? relation.target_type : relation.source_type
            const id = outgoing ? relation.target_id : relation.source_id
            const supported = type in RESOURCES
            const known = [...projects.items, ...documents.items, ...tasks.items].find(item => item.id === id)
            return <button key={relation.id} type="button" disabled={!supported} onClick={() => void follow(type as EntityType, id)}>
              <small>{outgoing ? 'Vers' : 'Depuis'} · {RELATIONS[relation.relation_type] || relation.relation_type}</small>
              <span>{known ? title(known) : `${TYPES[type as EntityType] || type} lié`}</span>
              <span aria-hidden="true">{outgoing ? '↗' : '↙'}</span>
              {!supported ? <small>Inspection non disponible pour ce type.</small> : null}
            </button>
          })}
          {relations.hasMore ? <button type="button" disabled={relations.loading} onClick={() => void relations.loadMore()}>Autres liens</button> : null}
        </section>
      </> : <div className="thread-empty"><img src="/icons/nevolium.svg" alt="" /><strong>Votre pensée peut commencer librement.</strong><p>Choisissez un projet pour voir ses documents, ses actions et ses liens. Aucun projet n’est nécessaire pour ouvrir l’assistant.</p><button type="button" onClick={() => onOpenSpace('projects')}>Choisir ou créer un projet</button></div>}
    </aside>
  )
}
