import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import Scene from '../Mycelium3D/Scene'
import { QUALITY_SETTINGS, type CameraCommand, type CameraPose, type Quality, type SceneMetrics } from '../Mycelium3D/presentation'
import { CASES, fixture, recordSample, summarize, type CaseId, type Recording } from './d09-measurements'
import '../Mycelium3D/spatial.css'
import './d09-hardware.css'

declare const __D09_BUILD__: { source_commit: string; checkout_commit: string; dirty: boolean; built_at: string }
type Event = { at_ms: number; kind: string; detail?: string }
type Run = Recording & {
  configuration: { case_id: CaseId; nodes: number; edges: number; quality: Quality; reduced_motion: boolean }
  device: { model: string; gpu_class: string; power: string }
}
class Boundary extends Component<{ children: ReactNode; fail: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.fail() }
  render() { return this.state.failed ? null : this.props.children }
}
function App() {
  const [caseId, setCaseId] = useState<CaseId>('default')
  const [quality, setQuality] = useState<Quality>('eco')
  const [duration, setDuration] = useState(600)
  const [device, setDevice] = useState({ model: '', gpu_class: 'unknown', power: 'unknown' })
  const [notes, setNotes] = useState('')
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(!document.hidden)
  const [intersecting, setIntersecting] = useState(false)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<Run | null>(null)
  const [metrics, setMetrics] = useState<SceneMetrics | null>(null)
  const [camera, setCamera] = useState<CameraPose | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [command, setCommand] = useState<CameraCommand | null>(null)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const viewport = useRef<HTMLDivElement>(null)
  const labels = useRef(new Map<string, HTMLButtonElement>())
  const recording = useRef<Run | null>(null)
  const recordingNow = useRef(false)
  const started = useRef(0)
  const segment = useRef(0)
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cycle = useRef(0)
  const events = useRef<Event[]>([])
  const renderers = useRef<{ segment: number; renderer: string; vendor: string; version: string }[]>([])
  const data = useMemo(() => fixture(caseId), [caseId])
  const active = enabled && visible && intersecting && !paused && !failed
  const activeNow = useRef(active)
  activeNow.current = active
  const event = useCallback((kind: string, detail?: string) => {
    if (recording.current && events.current.length < 200) events.current.push({ at_ms: performance.now() - started.current, kind, detail })
  }, [])
  useEffect(() => {
    const onVisible = () => { setVisible(!document.hidden); event(document.hidden ? 'document-hidden' : 'document-visible') }
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => { setReducedMotion(media.matches); event('reduced-motion', String(media.matches)) }
    const onError = (value: ErrorEvent) => event('javascript-error', String(value.message).slice(0, 300))
    const onRejection = () => event('unhandled-rejection')
    document.addEventListener('visibilitychange', onVisible)
    media.addEventListener('change', onMotion)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    const observer = new IntersectionObserver(entries => setIntersecting(entries.some(entry => entry.isIntersecting)), { threshold: 0.01 })
    observer.observe(viewport.current!)
    return () => {
      observer.disconnect(); document.removeEventListener('visibilitychange', onVisible)
      media.removeEventListener('change', onMotion); window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      if (pauseTimer.current) clearTimeout(pauseTimer.current)
    }
  }, [event])
  useEffect(() => {
    if (active) segment.current++
    else setCommand(null)
    event(active ? 'scene-mounted' : 'scene-unmounted')
  }, [active, event])
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    if (running) window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [running])
  const stop = useCallback(() => {
    recordingNow.current = false; setRunning(false); setEnabled(false); event('recording-stopped')
  }, [event])
  const fail = useCallback(() => { event('webgl-or-scene-failure'); setFailed(true); stop() }, [event, stop])
  const pause = useCallback(() => {
    if (pauseTimer.current) return
    setPaused(true); event('pause-requested')
    pauseTimer.current = setTimeout(() => { pauseTimer.current = null; setPaused(false) }, 2000)
  }, [event])
  const onMetrics = useCallback((value: SceneMetrics) => {
    setMetrics(value)
    const current = recording.current
    if (!recordingNow.current || !activeNow.current || !current) return
    const canvas = viewport.current?.querySelector('canvas')
    const gl = canvas?.getContext('webgl2')
    if (gl && renderers.current.length < 200 && !renderers.current.some(item => item.segment === segment.current)) {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      renderers.current.push({ segment: segment.current,
        renderer: String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
        vendor: String(gl.getParameter(info ? info.UNMASKED_VENDOR_WEBGL : gl.VENDOR)), version: String(gl.getParameter(gl.VERSION)) })
    }
    const rect = viewport.current!.getBoundingClientRect()
    const updated = { ...current, ...recordSample(current, { ...value, at_ms: performance.now() - started.current,
      segment: segment.current, heap_bytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null,
      viewport: { width: Math.round(rect.width), height: Math.round(rect.height), device_dpr: devicePixelRatio,
        buffer_width: gl?.drawingBufferWidth ?? null, buffer_height: gl?.drawingBufferHeight ?? null } }) }
    recording.current = updated; setRun(updated)
    if (updated.active_ms >= updated.target_ms) { event('duration-reached'); stop() }
    else if (updated.active_ms >= (cycle.current + 1) * 120_000) { cycle.current++; pause() }
  }, [event, pause, stop])
  function start() {
    started.current = performance.now(); events.current = []; renderers.current = []; cycle.current = 0
    const next: Run = { started_at: new Date().toISOString(), target_ms: duration * 1000, active_ms: 0, samples: [], gaps: [],
      configuration: { case_id: caseId, nodes: data.nodes.length, edges: data.edges.length, quality, reduced_motion: reducedMotion }, device: { ...device } }
    recording.current = next; recordingNow.current = true; setRun(next); setRunning(true)
    setFailed(false); setEnabled(true); setObservations({}); setNotes(''); event('recording-started')
    viewport.current?.scrollIntoView({ block: 'center' })
  }
  function issue(action: CameraCommand['action']) {
    setCommand({ action, sequence: performance.now() }); event(`camera-${action}`)
  }
  const handled = useCallback(() => setCommand(null), [])
  const select = useCallback((id: string, additive: boolean) => {
    setSelected(previous => !id ? [] : additive ? previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id] : [id])
    event('selection')
  }, [event])
  const cameraChanged = useCallback((pose: CameraPose) => { setCamera(pose); event('camera-changed') }, [event])
  function download() {
    const value = recording.current
    if (!value) return
    const report = { schema: 1, lot: 'D09', qualification_status: 'needs_review', build: __D09_BUILD__,
      scope: 'Actual Nevolium Scene renderer; synthetic local graph; no Core API, authentication, 2D workspace or server persistence',
      exported_at: new Date().toISOString(), recording_in_progress: recordingNow.current,
      environment: { user_agent: navigator.userAgent, hardware_concurrency: navigator.hardwareConcurrency,
        device_memory_gb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
        touch_points: navigator.maxTouchPoints, renderers: renderers.current },
      ...value, summary: summarize(value), events: events.current, observations, notes,
      limits: ['FPS are renderer windows, not individual frame-time percentiles.',
        'JS heap may be unavailable or approximate; it excludes GPU and process memory.',
        'Duration complete does not establish performance acceptance or absence of leaks.',
        'This recorder retains up to 1000 samples and 200 events; its own memory is included.'] }
    const blob = new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `nevolium-d09-${value.configuration.case_id}-${value.started_at.replaceAll(':', '-')}.json`
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const labelNodes = [...data.nodes].sort((a, b) => {
    const priority = (id: string) => selected.includes(id) ? 0 : id === 'project:hardware' ? 1 : 2
    return priority(a.id) - priority(b.id) || a.id.localeCompare(b.id)
  }).slice(0, QUALITY_SETTINGS[metrics?.tier || 'eco'].labels)
  const summary = run ? summarize(run) : null
  return <main className="hardware spatial-workspace">
    <header><p className="eyebrow">NEVOLIUM · D09</p><h1>Essai matériel Mycelium 3D</h1>
      <p>Le moteur 3D de Nevolium, avec des objets synthétiques. Tout reste dans ce navigateur. Aucun compte requis.</p>
      <p className="muted">Build {__D09_BUILD__.source_commit.slice(0, 12)}{__D09_BUILD__.dirty ? ' · sources locales modifiées' : ''}. Ce banc mesure le rendu ; les parcours métier restent à vérifier dans le cockpit.</p></header>
    <details><summary>Mode d’emploi</summary><ol>
      <li>Renseigner l’appareil et vérifier le GPU utilisé dans les réglages du navigateur ou du système.</li>
      <li>Commencer par 201 objets, profil économique, dix minutes. Garder la scène visible ; la mesure s’interrompt quand elle est masquée.</li>
      <li>Manipuler la scène : glisser pour tourner, molette/pincement pour zoomer, sélectionner puis centrer. Le banc la démonte deux secondes toutes les deux minutes mesurées.</li>
      <li>Après la campagne, noter les observations et exporter le JSON. Refaire l’essai en mode automatique puis sur la tablette ; 501 objets est un stress supplémentaire.</li>
    </ol><p>Un temps de mesure atteint ne valide pas automatiquement D09. Joindre la mémoire du processus relevée avec l’outil système au début et à la fin ; la mémoire JavaScript seule ne couvre pas le GPU.</p></details>
    <fieldset disabled={running}><legend>Conditions de l’essai</legend><div className="hardware-grid">
      <label>Appareil et système<input value={device.model} placeholder="Modèle · OS · version" onChange={e => setDevice({ ...device, model: e.target.value })} /></label>
      <label>GPU vérifié<select aria-label="GPU vérifié" value={device.gpu_class} onChange={e => setDevice({ ...device, gpu_class: e.target.value })}>
        <option value="unknown">À identifier</option><option value="integrated">GPU intégré</option><option value="tablet">GPU de tablette</option><option value="discrete">GPU dédié</option><option value="software">Rendu logiciel</option></select></label>
      <label>Alimentation<select aria-label="Alimentation" value={device.power} onChange={e => setDevice({ ...device, power: e.target.value })}>
        <option value="unknown">À renseigner</option><option value="plugged">Secteur</option><option value="battery">Batterie</option></select></label>
      <label>Jeu synthétique<select aria-label="Jeu synthétique" value={caseId} onChange={e => { setCaseId(e.target.value as CaseId); setCamera(null); setSelected([]); setEnabled(false) }}>
        {Object.entries(CASES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      <label>Qualité<select aria-label="Qualité" value={quality} onChange={e => setQuality(e.target.value as Quality)}>
        <option value="eco">Économique</option><option value="auto">Automatique</option><option value="balanced">Équilibrée</option><option value="high">Élevée</option></select></label>
      <label>Durée mesurée<select aria-label="Durée mesurée" value={duration} onChange={e => setDuration(Number(e.target.value))}>
        <option value={600}>10 minutes — campagne</option><option value={60}>1 minute — prise en main</option></select></label>
    </div></fieldset>
    <div className="spatial-toolbar"><button onClick={start} disabled={running}>Démarrer la mesure</button>
      <button onClick={stop} disabled={!running}>Arrêter</button><button onClick={download} disabled={!run}>Exporter le rapport JSON</button>
      <output data-recording={running ? 'running' : run ? 'stopped' : 'idle'} data-active-ms={Math.round(run?.active_ms || 0)}>
        {run ? `${Math.floor(run.active_ms / 1000)} / ${run.target_ms / 1000} s mesurées${summary?.duration_complete ? ' · durée atteinte, résultats à examiner' : ''}` : 'Prêt · 3D désactivée au démarrage'}</output></div>
    {failed ? <p role="alert">WebGL indisponible ou interrompu. La mesure est arrêtée. <button onClick={() => { setFailed(false); setEnabled(true) }}>Réessayer la scène</button></p> : null}
    <div className="hardware-stage">
      <div className="spatial-navigation"><label>Sélectionner un objet<select aria-label="Sélectionner un objet" value={selected[0] || ''} onChange={e => select(e.target.value, false)}>
        <option value="">Aucun</option>{data.nodes.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <button disabled={!active || !selected.length} onClick={() => issue('focus')}>Centrer</button>
        <button disabled={!active} onClick={() => issue('reset')}>Vue d’ensemble</button>
        <button disabled={!active} aria-label="Zoom avant" onClick={() => issue('in')}>+</button>
        <button disabled={!active} aria-label="Zoom arrière" onClick={() => issue('out')}>−</button>
        <button disabled={!active} onClick={pause}>Masquer 2 s</button></div>
      <div ref={viewport} className="spatial-viewport" data-active={active}>
        {active ? <Boundary fail={fail}><Scene graph={data} nodes={data.nodes} groups={data.groups} rootId="project:hardware"
          selected={selected} quality={quality} camera={camera} command={command} reducedMotion={reducedMotion} labels={labels}
          onSelect={select} onCamera={cameraChanged} onCommandHandled={handled} onFailure={fail} onMetrics={onMetrics} /></Boundary>
          : <p className="spatial-placeholder">{failed ? 'Scène indisponible' : enabled ? 'Scène en pause' : 'Démarrer pour activer la 3D'}</p>}
        <div className="spatial-labels">{active ? labelNodes.map(node => <button key={node.id}
          ref={element => { if (element) labels.current.set(node.id, element); else labels.current.delete(node.id) }}
          aria-pressed={selected.includes(node.id)} onClick={() => select(node.id, false)}>{node.label}</button>) : null}</div>
      </div>
      <p className="hardware-live" aria-live="off">{metrics ? `Dernière fenêtre : ${metrics.fps} FPS · profil ${metrics.tier} · ${metrics.calls} appels de rendu · ${metrics.geometries} géométries` : 'Les mesures apparaîtront après les premières images.'}
        {running ? ` · ${Math.floor((run?.active_ms || 0) / 1000)} s mesurées` : ''}{reducedMotion ? ' · mouvement réduit actif : rendu à la demande' : ''}</p>
    </div>
    <details open={Boolean(run && !running)}><summary>Observations à joindre au rapport</summary><div className="hardware-grid">
      {['Orbite et zoom', 'Sélection et centrage', 'Gestes tactiles', 'Retour après masquage'].map(label => <label key={label}>{label}
        <select aria-label={label} value={observations[label] || 'not-tested'} onChange={e => setObservations({ ...observations, [label]: e.target.value })}>
          <option value="not-tested">Non testé</option><option value="ok">Satisfaisant</option><option value="issue">Problème observé</option><option value="not-applicable">Non applicable</option></select></label>)}
    </div><label>Ressenti, incidents, GPU exact, mémoire système au début et à la fin (outil et unité)<textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <p>Le fichier exporté contient les conditions, le GPU annoncé par le navigateur, les fenêtres FPS, la mémoire JS disponible et les interruptions. Il ne déclare jamais seul le matériel « validé ».</p>
      <button onClick={download} disabled={!run}>Exporter le rapport JSON</button></details>
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
