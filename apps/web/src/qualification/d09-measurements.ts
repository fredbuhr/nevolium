import type { SceneMetrics, SpatialNode } from '../Mycelium3D/presentation'
import type { NevoliumGraphEdge } from '@nevolium/graph'

export const CASES = {
  small: { nodes: 51, edges: 50, label: '51 objets / 50 liens' },
  default: { nodes: 201, edges: 300, label: '201 objets / 300 liens — limite Web par défaut' },
  maximum: { nodes: 401, edges: 1000, label: '401 objets / 1 000 liens — limite Core' },
  stress: { nodes: 501, edges: 1500, label: '501 objets / 1 500 liens — stress hors capacité produit' },
} as const
export type CaseId = keyof typeof CASES

export function fixture(id: CaseId) {
  const size = CASES[id]
  const nodes: SpatialNode[] = Array.from({ length: size.nodes }, (_, i) => ({
    id: i === 0 ? 'project:hardware' : `${i % 2 ? 'task' : 'document'}:hardware-${i}`,
    entityType: i === 0 ? 'project' : i % 2 ? 'task' : 'document',
    projectId: 'hardware', label: i === 0 ? 'Nevolium' : `Objet ${i}`,
    kind: i === 0 ? 'project' : i % 2 ? 'task' : 'idea',
    status: i % 2 && i < 17 ? 'running' : 'ready',
  }))
  const edges: NevoliumGraphEdge[] = []
  const pairs = new Set<string>()
  function add(from: number, to: number) {
    const pair = `${Math.min(from, to)}:${Math.max(from, to)}`
    if (from === to || pairs.has(pair)) return
    pairs.add(pair)
    edges.push({ id: `hardware-edge-${edges.length}`, source: nodes[from].id,
      target: nodes[to].id, relation: 'related_to', directed: true })
  }
  for (let i = 1; i < size.nodes; i++) add(Math.floor((i - 1) / 3), i)
  for (let distance = 1; edges.length < size.edges; distance++) {
    for (let i = 1; i < size.nodes && edges.length < size.edges; i++) add(i, (i + distance) % size.nodes)
  }
  const groups = [0, 1, 2].map(i => ({ id: `group-${i}`, label: `Groupe ${i + 1}`,
    nodeIds: nodes.slice(1 + i * 5, 6 + i * 5).map(node => node.id) }))
  return { nodes, edges, groups }
}

export type Sample = SceneMetrics & {
  at_ms: number; segment: number; heap_bytes: number | null
  viewport: { width: number; height: number; device_dpr: number; buffer_width: number | null; buffer_height: number | null }
}
export type Recording = {
  started_at: string; target_ms: number; active_ms: number
  samples: Sample[]; gaps: { at_ms: number; duration_ms: number }[]
}
export function recordSample(recording: Recording, sample: Sample): Recording {
  // First-frame zero FPS and windows spanning an unmount never become measured time.
  if (sample.frames <= 1 || !Number.isFinite(sample.fps) || sample.fps < 0 || recording.samples.length >= 1000) return recording
  const last = recording.samples.at(-1)
  const delta = last && last.segment === sample.segment ? sample.at_ms - last.at_ms : 0
  const gap = delta > 5000
  return { ...recording, active_ms: recording.active_ms + (delta > 0 && !gap ? delta : 0),
    samples: [...recording.samples, sample],
    gaps: gap ? [...recording.gaps, { at_ms: sample.at_ms, duration_ms: delta }].slice(-100) : recording.gaps }
}
export function summarize(recording: Recording) {
  const fps = recording.samples.map(sample => sample.fps).sort((a, b) => a - b)
  const heaps = recording.samples.flatMap(sample => sample.heap_bytes === null ? [] : [sample.heap_bytes])
  const quantile = (p: number) => fps.length ? fps[Math.floor((fps.length - 1) * p)] : null
  return {
    duration_complete: recording.active_ms >= recording.target_ms,
    sample_count: fps.length, measured_active_ms: Math.round(recording.active_ms),
    fps_window_min: fps[0] ?? null, fps_window_p10: quantile(0.1), fps_window_median: quantile(0.5),
    heap_first_bytes: heaps[0] ?? null, heap_last_bytes: heaps.at(-1) ?? null,
    heap_peak_bytes: heaps.length ? Math.max(...heaps) : null,
    long_gap_count: recording.gaps.length,
  }
}
