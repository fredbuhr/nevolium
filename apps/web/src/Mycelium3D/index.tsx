import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { NevoliumGraphSnapshot } from '@nevolium/graph'
import { useI18n } from '../i18n'
import { layoutSaveCopy } from '../MindMapWorkspace/useLayoutPersistence'
import { usePanelVisibility } from '../lib/panelVisibility'
import { useSpatialMessages } from './messages'
import { QUALITY_SETTINGS, type CameraCommand, type SceneMetrics, type SpatialGroup, type SpatialNode } from './presentation'
import { useSpatialPresentation } from './useSpatialPresentation'
import './spatial.css'

const Scene = lazy(() => import('./Scene'))

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { console.error('Nevolium 3D scene unavailable', error); this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

type Props = {
  apiUrl: string; projectId: string; graph: NevoliumGraphSnapshot
  nodes: SpatialNode[]; selected: string[]; groups: SpatialGroup[]
  onSelect: (id: string, additive: boolean) => void
  onOpen: () => void
  children: ReactNode
  workspaceKey?: string
  rootId?: string
  defaultView?: '2d' | '3d'
  positions?: Record<string, [number, number, number]>
  compact?: boolean
  compactActions?: ReactNode
  controlsVisible?: boolean
  onViewChange?: (view: '2d' | '3d') => void
  paused?: boolean
  interactive?: boolean
}

export default function SpatialWorkspace(props: Props) {
  const m = useSpatialMessages()
  const { language } = useI18n()
  const state = useSpatialPresentation(props.apiUrl, props.projectId, props)
  const panelVisible = usePanelVisibility()
  const viewport = useRef<HTMLDivElement>(null)
  const display = useRef<HTMLDetailsElement>(null)
  const labels = useRef(new Map<string, HTMLButtonElement>())
  const [intersecting, setIntersecting] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(!document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [animate, setAnimate] = useState(true)
  const [command, setCommand] = useState<CameraCommand | null>(null)
  const commandSequence = useRef(0)
  const commandHandled = useCallback(() => setCommand(null), [])
  const [metrics, setMetrics] = useState<SceneMetrics | null>(null)
  const cameraSave = useCallback((camera: Parameters<typeof state.update>[0]['camera']) => state.update({ camera }), [state.update])
  const active = panelVisible && documentVisible && intersecting && state.view === '3d'
  const motionPaused = reducedMotion || !animate || Boolean(props.paused)
  const saveCopy = layoutSaveCopy[language]
  useEffect(() => {
    const visible = () => setDocumentVisible(!document.hidden)
    document.addEventListener('visibilitychange', visible)
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => setReducedMotion(motion.matches)
    motion.addEventListener('change', changed)
    return () => { document.removeEventListener('visibilitychange', visible); motion.removeEventListener('change', changed) }
  }, [])
  useEffect(() => {
    const element = viewport.current
    if (!element || state.view !== '3d') { setIntersecting(false); return }
    const observer = new IntersectionObserver(entries => setIntersecting(entries.some(entry => entry.isIntersecting)), { threshold: 0.01 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [state.view])
  useEffect(() => { if (!panelVisible || !documentVisible) setCommand(null) }, [panelVisible, documentVisible])
  useEffect(() => { props.onViewChange?.(state.view) }, [props.onViewChange, state.view])
  const visibleLabels = useMemo(() => {
    const limit = props.compact ? 12 : QUALITY_SETTINGS[metrics?.tier || 'eco'].labels
    return [...props.nodes].sort((a, b) => {
      const priority = (node: SpatialNode) => props.selected.includes(node.id) ? 0 : node.entityType === 'project' ? 1 : 2
      return priority(a) - priority(b) || a.id.localeCompare(b.id)
    }).slice(0, limit)
  }, [props.nodes, props.selected, props.compact, metrics?.tier])
  function issue(action: CameraCommand['action']) {
    setCommand({ sequence: ++commandSequence.current, action })
    if (!props.compact) viewport.current?.scrollIntoView({ block: 'nearest' })
  }

  const qualityControls = state.view === '3d' ? <>
    <label>{m.quality}<select aria-label={m.quality} value={state.value.quality}
      onChange={event => state.update({ quality: event.target.value as typeof state.value.quality })}>
      {(['auto', 'eco', 'balanced', 'high'] as const).map(value => <option key={value} value={value}>{m[value]}</option>)}
    </select></label>
    <button type="button" aria-pressed={animate && !reducedMotion} disabled={reducedMotion}
      onClick={() => setAnimate(value => !value)}>{m.animate}</button>
  </> : null
  const navigation = <div className="spatial-navigation">
    {!props.compact ? <label>{m.select}<select aria-label={m.select} value={props.selected[0] || ''} onChange={event => props.onSelect(event.target.value, false)}>
      <option value="">{m.none}</option>{props.nodes.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}
    </select></label> : null}
    <button type="button" disabled={!props.selected.length} onClick={() => issue('focus')}>{m.focus}</button>
    <button type="button" onClick={() => issue('reset')}>{m.reset}</button>
    <button type="button" aria-label={m.zoomIn} onClick={() => issue('in')}>+</button>
    <button type="button" aria-label={m.zoomOut} onClick={() => issue('out')}>−</button>
    {!props.compact ? <button type="button" disabled={!props.selected.length} onClick={props.onOpen}>{m.open}</button> : null}
  </div>

  function selectView(view: '2d' | '3d') {
    if (view === '3d') state.retry3d()
    else state.update({ view })
    if (props.compact && display.current) display.current.open = false
  }
  const viewTabs = <div className="spatial-tabs" aria-label={m.title}>
    <button type="button" aria-pressed={state.view === '2d'} disabled={!state.ready} onClick={() => selectView('2d')}>{m.view2d}</button>
    <button type="button" aria-pressed={state.view === '3d'} disabled={!state.ready} onClick={() => selectView('3d')}>{m.view3d}</button>
  </div>
  const saveControls = <>
    <span className="spatial-save" data-spatial-save={state.persistence.status} aria-live="polite">{saveCopy[state.persistence.status]}</span>
    {state.persistence.status === 'error' ? <button type="button" onClick={state.persistence.retry}>{saveCopy.retry}</button> : null}
  </>

  return <div className={`spatial-workspace${props.compact ? ' spatial-home' : ''}`} data-spatial-view={state.view}>
    {props.controlsVisible === false ? null : props.compact ? <div className="spatial-toolbar">
      <details ref={display} className="spatial-display">
        <summary aria-label={`${m.display} : ${state.view === '3d' ? m.mode3d : m.mode2d}`}>
          <span>{m.display}</span><strong>{state.view === '3d' ? m.mode3d : m.mode2d}</strong>
        </summary>
        <div className="spatial-display-panel">
          {viewTabs}
          {qualityControls}
          {state.view === '3d' ? navigation : null}
          {props.compactActions ? <div className="spatial-display-actions">{props.compactActions}</div> : null}
          <div className="spatial-display-status">{saveControls}</div>
        </div>
      </details>
    </div> : <div className="spatial-toolbar">
      {viewTabs}{qualityControls}{saveControls}
    </div>}
    {state.loadError ? <p role="alert">{m.loadError} <button type="button" onClick={state.restore}>{m.restore}</button></p> : null}
    {state.unavailable ? <p role="status">{m.fallback} <button type="button" onClick={state.retry3d}>{m.retry}</button></p> : null}
    {state.view === '3d' ? <>
      {reducedMotion || !animate ? <p role="status">{reducedMotion ? m.motionReduced : m.motionPaused}</p> : null}
      {!props.compact ? navigation : null}
      {!props.compact ? <p className="spatial-hint">{m.hint} {m.lifeHint}</p> : null}
      <div ref={viewport} className="spatial-viewport" aria-label={m.title}
        data-spatial-active={active} data-spatial-reduced-motion={motionPaused} data-spatial-background={Boolean(props.paused)}
        data-spatial-metrics={metrics ? JSON.stringify(metrics) : ''} data-spatial-nodes={props.nodes.length}>
        {active ? <SceneBoundary onFailure={state.fail}>
          <Suspense fallback={<p className="spatial-placeholder">{m.loading}</p>}>
            <Scene {...props} rootId={props.rootId || `project:${props.projectId}`} camera={state.value.camera}
              command={command} onCommandHandled={commandHandled} quality={state.value.quality} reducedMotion={motionPaused}
              transparent={props.compact} interactive={props.interactive !== false}
              labels={labels} onCamera={cameraSave} onFailure={state.fail} onMetrics={setMetrics} />
          </Suspense>
        </SceneBoundary> : <p className="spatial-placeholder">{m.paused}</p>}
        <div className="spatial-labels" aria-label={m.selected}>
          {active ? visibleLabels.map(node => <button type="button" key={node.id}
            ref={element => { if (element) labels.current.set(node.id, element); else labels.current.delete(node.id) }}
            data-spatial-node={node.id} aria-pressed={props.selected.includes(node.id)}
            onClick={event => props.onSelect(node.id, event.shiftKey)}>{node.label}</button>) : null}
        </div>
      </div>
      {props.groups.length ? <p className="spatial-group-summary">{m.group} · {props.groups.map(group => group.label).join(' · ')}</p> : null}
    </> : props.children}
  </div>
}
