import { useEffect, useMemo, useRef, useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher'
import SpatialWorkspace from './Mycelium3D'
import { useI18n } from './i18n'
import { useWorkspaceMessages } from './workspaceMessages'
import { layoutSaveCopy } from './MindMapWorkspace/useLayoutPersistence'
import { nevoliumFetch } from './lib/apiClient'
import { getAuthSnapshot, subscribeAuthSession } from './lib/authSession'
import { useProjectSelection } from './lib/projectSelection'
import { usePanelVisibility } from './lib/panelVisibility'
import type { CockpitAmbience } from './lib/cockpitDevice'
import type { CockpitProfile, CockpitDeviceClass } from './CockpitShell'
import Customize from './MyceliumHome/Customize'
import { useHomeLayout } from './MyceliumHome/useHomeLayout'
import { useHomeMessages } from './MyceliumHome/messages'
import { DesktopBackground, BackgroundSettings } from './MyceliumHome/DesktopBackground'
import { useSelectionDetails } from './MyceliumHome/useSelectionDetails'
import { DEFAULT_BACKGROUND, TOOLS, MAX_ENTRIES, homeGraph, type BrowserNode, type BrowserPage, type ToolKey } from './MyceliumHome/model'
import './MyceliumHome/home.css'

export type MyceliumDestinationKey = ToolKey

type Props = {
  apiUrl: string; active: boolean; isAdmin: boolean; online: boolean; sessionName: string;
  ambience: CockpitAmbience; deviceClass: CockpitDeviceClass; profile: CockpitProfile;
  installAvailable: boolean; onInstall: () => void;
  onAmbienceChange: (value: CockpitAmbience) => void; onProfileChange: (value: CockpitProfile) => void;
  onOpenSpace: (key: ToolKey) => void; onOpenConversation: (id: string) => void;
}
type Place = { ref: string | null; folder: string; cursor: string | null }
const ROOT: Place = { ref: null, folder: '', cursor: null }
const neighbourhoodUrl = (base: string, ref: string) => `${base}/v1/mycelium/${ref.replace(':', '/')}`

export default function MyceliumHome(props: Props) {
  const m = useHomeMessages(), w = useWorkspaceMessages(), { language } = useI18n()
  const layout = useHomeLayout(props.apiUrl)
  const panelVisible = usePanelVisibility()
  const [customizing, setCustomizing] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)
  const [place, setPlace] = useState<Place>(ROOT), [history, setHistory] = useState<Place[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [page, setPage] = useState<BrowserPage | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(false)
  const [resolved, setResolved] = useState(new Map<string, BrowserNode>()), [pinsError, setPinsError] = useState(false)
  const [authEpoch, setAuthEpoch] = useState(0)
  const [revision, setRevision] = useState(0), [filter, setFilter] = useState('')
  const [fileUrl, setFileUrl] = useState<string | null>(null), [fileError, setFileError] = useState(false), [fileBusy, setFileBusy] = useState(false)
  const toolsMenu = useRef<HTMLDetailsElement | null>(null)
  const detailsPanel = useRef<HTMLElement | null>(null)
  const selectionOrigin = useRef<HTMLElement | null>(null)
  const fileRequest = useRef<AbortController | null>(null)
  const { setSelectedProjectId, setSelectedDocumentId, setSelectedTaskId } = useProjectSelection()
  const pins = layout.value.entries.filter(entry => !entry.ref.startsWith('tool:')).map(entry => entry.ref).sort().join('|')
  const details = useSelectionDetails(props.apiUrl, selectedId, props.active, revision + authEpoch)
  const background = layout.value.background || DEFAULT_BACKGROUND

  useEffect(() => {
    if (!layout.ready || !props.active) return
    const controller = new AbortController()
    setPinsError(false)
    void Promise.all(pins.split('|').filter(Boolean).map(async ref => {
      const response = await nevoliumFetch(`${neighbourhoodUrl(props.apiUrl, ref)}?limit=1`, { signal: controller.signal })
      if (response.status === 404) return [ref, null] as const
      if (!response.ok) throw new Error('Pin unavailable')
      const result = await response.json() as BrowserPage
      return [ref, result.nodes.find(node => node.id === ref) || null] as const
    })).then(rows => {
      if (!controller.signal.aborted) setResolved(new Map(rows.filter((row): row is readonly [string, BrowserNode] => row[1] !== null)))
    }).catch(() => { if (!controller.signal.aborted) setPinsError(true) })
    return () => controller.abort()
  }, [props.apiUrl, props.active, pins, layout.ready, revision, authEpoch])

  useEffect(() => {
    const controller = new AbortController()
    if (!props.active) return
    setError(false); setLoading(Boolean(place.ref))
    if (place.ref) void nevoliumFetch(`${neighbourhoodUrl(props.apiUrl, place.ref)}?limit=36${place.cursor ? `&cursor=${encodeURIComponent(place.cursor)}` : ''}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Neighbourhood unavailable'); return response.json() as Promise<BrowserPage> })
      .then(result => { if (!controller.signal.aborted) { setPage(result); setSelectedId(current => result.nodes.some(node => node.id === current) ? current : result.focus); setLoading(false) } })
      .catch(() => { if (!controller.signal.aborted) { setError(true); setLoading(false) } })
    return () => controller.abort()
  }, [props.apiUrl, props.active, place.ref, place.cursor, revision, authEpoch])

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (props.active && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); if (toolsMenu.current) { toolsMenu.current.open = true; toolsMenu.current.querySelector('button')?.focus() }
      }
      if (event.key === 'Escape' && props.active && !customizing) {
        if (toolsMenu.current?.open) { toolsMenu.current.open = false; toolsMenu.current.querySelector('summary')?.focus() }
        else { setSelectedId(''); selectionOrigin.current?.focus() }
      }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [props.active, customizing])
  useEffect(() => {
    const refresh = () => { if (props.active && !document.hidden) setRevision(value => value + 1) }
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh) }
  }, [props.active])
  useEffect(() => {
    const origin = getAuthSnapshot()
    return subscribeAuthSession(() => {
      const now = getAuthSnapshot()
      if (origin.subject !== now.subject || origin.enabled !== now.enabled || (origin.enabled && !now.authenticated)) {
        setAuthEpoch(value => value + 1); setResolved(new Map()); setPage(null); setPlace(ROOT); setHistory([]); setSelectedId(''); setCustomizing(false); fileRequest.current?.abort()
      }
    })
  }, [])
  useEffect(() => { fileRequest.current?.abort(); setFileUrl(null); setFileError(false); setFileBusy(false) }, [selectedId])
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl) }, [fileUrl])
  useEffect(() => () => fileRequest.current?.abort(), [])
  useEffect(() => {
    if (selectedId && props.active) detailsPanel.current?.focus({ preventScroll: true })
  }, [selectedId, props.active])

  const home = useMemo(() => homeGraph(layout.value, resolved, key => m(key), place.folder), [layout.value, resolved, place.folder, language])
  const graph = place.ref ? (page?.focus === place.ref ? page : { nodes: [], edges: [] }) : home
  const selected = graph.nodes.find(node => node.id === selectedId)
  const neighbours = graph.nodes.filter(node => node.id !== (place.ref || home.root))
  const saveCopy = layoutSaveCopy[language]
  const saveStatus = <div className="home-save-status"><span role="status">{saveCopy[layout.persistence.status]}</span>
    {layout.persistence.status === 'error' ? <button type="button" onClick={layout.persistence.retry}>{saveCopy.retry}</button> : null}</div>
  function closeDetails() { setSelectedId(''); selectionOrigin.current?.focus() }
  function visit(next: Place) { setHistory(value => [...value.slice(-39), place]); setPlace(next); setSelectedId(''); setFilter('') }
  function activate(node: BrowserNode) {
    selectionOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (node.unavailable) { setSelectedId(node.id); return }
    if (node.entityType === 'tool') { props.onOpenSpace(node.id.slice(5) as ToolKey); return }
    if (node.entityType === 'folder') { visit({ ref: null, folder: node.id.slice(7), cursor: null }); return }
    if (node.entityType === 'home') { setPlace(ROOT); return }
    setSelectedId(node.id)
  }
  function explore(node: BrowserNode) { if (!node.unavailable) visit({ ref: node.id, folder: '', cursor: null }) }
  function open(node: BrowserNode) {
    if (node.projectId) setSelectedProjectId(node.projectId)
    if (node.entityType === 'document') { setSelectedDocumentId(node.entityId || node.id.split(':')[1]); props.onOpenSpace('knowledge') }
    else if (node.entityType === 'project') props.onOpenSpace('projects')
    else if (node.entityType === 'task') { setSelectedTaskId(node.entityId || node.id.split(':')[1]); props.onOpenSpace('planning') }
    else if (node.entityType === 'conversation') props.onOpenConversation(node.entityId || node.id.split(':')[1])
    else activate(node)
  }
  async function loadFile(node: BrowserNode, download: boolean) {
    fileRequest.current?.abort()
    const controller = new AbortController(); fileRequest.current = controller
    setFileBusy(true); setFileError(false)
    try {
      const response = await nevoliumFetch(`${props.apiUrl}/v1/assets/${node.entityId || node.id.split(':')[1]}/content`, { signal: controller.signal })
      if (!response.ok) throw new Error('File unavailable')
      const blob = await response.blob()
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      if (download) {
        const link = document.createElement('a'); link.href = url; link.download = node.label; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else setFileUrl(url)
    } catch { if (!controller.signal.aborted) setFileError(true) }
    finally { if (!controller.signal.aborted) setFileBusy(false) }
  }
  return <section className={`mycelium-home home-browser${props.active ? '' : ' is-background'}`} aria-labelledby="mycelium-home-title" inert={!props.active} aria-hidden={!props.active || undefined}>
    <DesktopBackground apiUrl={props.apiUrl} value={background} onError={setBackgroundError} />
    <div className="home-interface home-topbar">
    <header className="app-header">
      <div className="brand-lockup"><img className="mycelium-mark" src="/icons/nevolium.svg" alt="" /><div><span className="eyebrow">{w('brandMotto')}</span><h1>Nevolium</h1></div></div>
      <div className="app-header-actions"><span className={`connection-state ${props.online ? 'is-online' : 'is-offline'}`}><i aria-hidden="true" />{props.online ? w('online') : w('offline')}</span>
        <div className="session-summary"><span>{props.sessionName}</span><small>{props.isAdmin ? w('administrator') : w('regularUser')}</small></div><LanguageSwitcher /></div>
    </header>
    <div className="home-section-heading"><div><h2 id="mycelium-home-title">{m('title')}</h2><p>{m('subtitle')}</p></div>
      <button type="button" disabled={!layout.ready} aria-expanded={customizing} onClick={() => setCustomizing(value => !value)}>{m('customize')}</button></div>
    {layout.error ? <p role="alert">{m('loadError')} <button type="button" onClick={layout.reload}>{m('retry')}</button></p> : null}
    <div className="home-navigation"><button type="button" disabled={!history.length} onClick={() => { setPlace(history.at(-1) || ROOT); setHistory(value => value.slice(0, -1)); setSelectedId('') }}>← {m('back')}</button>
      <button type="button" onClick={() => { setPlace(ROOT); setHistory([]); setSelectedId('') }}>{m('home')}</button>
      <details ref={toolsMenu} className="home-tools"><summary aria-keyshortcuts="Control+K Meta+K">{m('browseTools')}</summary><div>{[...TOOLS, ...(props.isAdmin ? ['model-settings' as const] : [])].map(key =>
        <button type="button" key={key} data-space={key} onClick={() => props.onOpenSpace(key)}>{m(key)}</button>)}</div></details>
      <button type="button" onClick={() => setRevision(value => value + 1)}>{m('refresh')}</button>
      {saveStatus}
    </div>
    {backgroundError ? <p role="status">{m('backgroundUnavailable')}</p> : null}
    </div>
    {customizing && layout.ready ? <Customize apiUrl={props.apiUrl} layout={layout.value} update={layout.update} resolved={resolved} onDone={() => setCustomizing(false)} undo={layout.undo} canUndo={layout.canUndo} saveStatus={saveStatus}>
      <BackgroundSettings apiUrl={props.apiUrl} value={background} update={next => layout.update(value => ({ ...value, background: next }))} />
      <details className="home-preferences-simple"><summary>{m('otherSettings')}</summary><div className="home-controls">
        <label>{w('profile')}<select value={props.profile} onChange={event => props.onProfileChange(event.target.value as CockpitProfile)}>
          {(['balanced', 'focus', 'review'] as const).map(key => <option key={key} value={key}>{w(key === 'focus' ? 'focusProfile' : key)}</option>)}
        </select></label><label>{w('ambience')}<select value={props.ambience} onChange={event => props.onAmbienceChange(event.target.value as CockpitAmbience)}>
          {(['neural', 'calm', 'minimal'] as const).map(key => <option key={key} value={key}>{w(key)}</option>)}
        </select></label>{props.installAvailable ? <button type="button" onClick={props.onInstall}>{w('installApp')}</button> : null}
      </div></details>
    </Customize> : null}
    {pinsError || error ? <p role="alert">{m('error')} <button type="button" onClick={() => setRevision(value => value + 1)}>{m('retry')}</button></p> : null}
    {loading ? <p role="status">{m('loading')}</p> : null}
    <div className={`home-browser-body${selected ? ' has-selection' : ''}`}>
      <div className="home-network-area">
        <p className="home-legend">{place.ref ? m('actualLinks') : m('shortcuts')}</p>
        {graph.nodes.length ? <SpatialWorkspace key={place.ref || home.root} apiUrl={props.apiUrl} projectId="" workspaceKey={`mycelium.home.camera.${(place.ref || home.root).replaceAll(':', '.')}`}
          rootId={place.ref || home.root} defaultView="3d" compact paused={!props.active || customizing || props.ambience !== 'neural'} interactive={props.active && !customizing} graph={graph} nodes={graph.nodes} selected={selectedId ? [selectedId] : []} groups={[]}
          positions={place.ref ? undefined : home.positions} onSelect={id => { const node = graph.nodes.find(item => item.id === id); if (node) activate(node); else setSelectedId('') }} onOpen={() => { if (selected) open(selected) }}>
          <ul className="home-simple-list" aria-label={m('browse')}>{neighbours.map(node => <li key={node.id}><button type="button" data-node={node.id}
            onClick={() => activate(node)}><span>{node.label}</span><small>{m(node.kind)}</small></button></li>)}</ul>
        </SpatialWorkspace> : null}
        <details className="home-browse-list home-interface"><summary>{m('browse')} · {neighbours.length}</summary>
          <label>{m('search')}<input value={filter} onChange={event => setFilter(event.target.value)} /></label>
          <ul className="home-simple-list">{neighbours.filter(node => node.label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(node => <li key={node.id}>
            <button type="button" onClick={() => activate(node)}><span>{node.label}</span><small>{m(node.kind)}</small></button></li>)}</ul>
        </details>
        {place.ref && page && !page.edges.length && !page.next_cursor ? <p>{m('noLinks')}</p> : null}
        {!place.ref && !neighbours.length ? <p>{m('noPins')}</p> : null}
        {place.ref && page?.focus === place.ref && page.next_cursor ? <button type="button" onClick={() => visit({ ...place, cursor: page.next_cursor })}>{m('more')}</button> : null}
      </div>
      {selected ? <aside ref={detailsPanel} tabIndex={-1} className="home-item-details home-interface" aria-label={selected.label}>
        <div className="home-details-heading"><span className="eyebrow">{m(selected.kind)}</span><button type="button" onClick={closeDetails} aria-label={m('close')}>×</button></div><h2>{selected.label}</h2>
        {selected.unavailable ? <p>{m('unavailableHelp')}</p> : <>
          <div className="home-controls"><button type="button" onClick={() => explore(selected)} disabled={selected.id === place.ref}>{m('explore')}</button>
            {['project', 'task', 'document', 'conversation'].includes(selected.entityType) ? <button type="button" onClick={() => open(selected)}>{m('open')}</button> : null}
            <button type="button" disabled={!layout.ready || layout.value.entries.length >= MAX_ENTRIES || layout.value.entries.some(entry => entry.ref === selected.id)}
              onClick={() => layout.update(value => ({ ...value, entries: [...value.entries, { ref: selected.id, label: '', folder: '' }] }))}>{m('pin')}</button></div>
          {selected.citingGeneration ? <p>{m('citingVersion')} {selected.citingGeneration}</p> : null}
          {selected.sourceGeneration ? <p>{m('sourceVersion')} {selected.sourceGeneration}</p> : null}
          {selected.summary ? <pre className="home-item-preview">{selected.summary}</pre> : null}
          {selected.url ? <a href={selected.url} target="_blank" rel="noopener noreferrer">{selected.url}</a> : null}
          {selected.entityType === 'asset' ? <div className="home-controls">
            <button type="button" disabled={fileBusy} onClick={() => void loadFile(selected, true)}>{m('download')}</button>
            {/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(selected.mediaType || '') ? <button type="button" disabled={fileBusy} onClick={() => void loadFile(selected, false)}>{m('preview')}</button> : null}
            {fileUrl ? <img className="home-file-preview" src={fileUrl} alt={selected.label} /> : null}
            {fileError ? <p role="alert">{m('error')}</p> : null}
          </div> : null}
          <h3>{m('links')}</h3>
          {details.loading ? <p role="status">{m('loading')}</p> : null}
          {details.error ? <p role="alert">{m('error')} <button type="button" onClick={() => setRevision(value => value + 1)}>{m('retry')}</button></p> : null}
          {!details.loading && !details.error && details.page && !details.page.edges.length ? <p>{m('noLinks')}</p> : null}
          <ul className="home-relations">{(details.page?.edges || []).filter(edge => edge.source === selected.id || edge.target === selected.id).map(edge => {
            const source = details.page?.nodes.find(node => node.id === edge.source), target = details.page?.nodes.find(node => node.id === edge.target)
            const other = selected.id === edge.source ? target : source
            return <li key={edge.id}><span>{source?.label} — {m(edge.relation)} {edge.directed ? '→' : '↔'} {target?.label}{edge.dependencyType ? ` (${m(edge.dependencyType)}${edge.lagSeconds ? `, +${edge.lagSeconds} s` : ''})` : ''}</span>{other ? <button type="button" onClick={() => explore(other)}>{m('explore')} : {other.label}</button> : null}</li>
          })}</ul>
          <div className="home-controls">{details.cursor ? <button type="button" disabled={details.loading} onClick={details.first}>{m('back')}</button> : null}
            {details.page?.next_cursor ? <button type="button" disabled={details.loading} onClick={details.more}>{m('more')}</button> : null}</div>
        </>}
      </aside> : null}
    </div>
    {!panelVisible ? null : <span className="sr-only">{w(props.deviceClass)}</span>}
  </section>
}
