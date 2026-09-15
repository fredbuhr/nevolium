import type { NevoliumGraphNode } from '@nevolium/graph'

export type SpatialNode = NevoliumGraphNode & { kind: string; status: string }
export type Quality = 'auto' | 'eco' | 'balanced' | 'high'
export type Tier = Exclude<Quality, 'auto'>
export type CameraPose = { position: [number, number, number]; target: [number, number, number] }
export type SpatialPresentation = { view: '2d' | '3d'; quality: Quality; camera: CameraPose | null }
export type SpatialGroup = { id: string; label: string; nodeIds: string[] }
export type CameraCommand = { sequence: number; action: 'focus' | 'reset' | 'in' | 'out' }
export type SceneMetrics = { frames: number; fps: number; geometries: number; textures: number; calls: number; triangles: number; tier: Tier }

export const DEFAULT_PRESENTATION: SpatialPresentation = { view: '2d', quality: 'auto', camera: null }
export const QUALITY_SETTINGS = {
  eco: { dpr: 1, detail: 1, segments: 6, strands: 1, labels: 3 },
  balanced: { dpr: 1.35, detail: 2, segments: 10, strands: 2, labels: 5 },
  high: { dpr: 1.75, detail: 3, segments: 14, strands: 3, labels: 7 },
} as const

export function isQuality(value: unknown): value is Quality {
  return value === 'auto' || value === 'eco' || value === 'balanced' || value === 'high'
}

function vector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3
    && value.every(item => typeof item === 'number' && Number.isFinite(item) && Math.abs(item) <= 10_000)
}

export function readCamera(value: unknown): CameraPose | null {
  if (!value || typeof value !== 'object') return null
  const camera = value as CameraPose
  if (!vector(camera.position) || !vector(camera.target)) return null
  const distance = Math.hypot(...camera.position.map((item, i) => item - camera.target[i]))
  if (distance < 1 || distance > 5000) return null
  return { position: [...camera.position], target: [...camera.target] }
}

export function readPresentation(value: unknown): SpatialPresentation {
  if (!value || typeof value !== 'object') throw new Error('Invalid spatial presentation')
  const data = value as Partial<SpatialPresentation>
  if ((data.view !== '2d' && data.view !== '3d') || !isQuality(data.quality)) {
    throw new Error('Invalid spatial presentation')
  }
  // Untrusted JSON is presentation only. Never retain arbitrary nodes, edges or permissions.
  return { view: data.view, quality: data.quality, camera: readCamera(data.camera) }
}

export function initialTier(cores: number, memory?: number, compact = false): Tier {
  return compact || cores <= 4 || (memory !== undefined && memory <= 4) ? 'eco' : 'balanced'
}

export type QualityWindow = { tier: Tier; low: number; high: number }
export function observeQuality(current: QualityWindow, fps: number): QualityWindow {
  if (!Number.isFinite(fps) || fps < 0) return current
  const low = fps < 35 ? current.low + 1 : 0
  const high = fps > 57 ? current.high + 1 : 0
  if (low >= 2) return { tier: current.tier === 'high' ? 'balanced' : 'eco', low: 0, high: 0 }
  if (high >= 4) return { tier: current.tier === 'eco' ? 'balanced' : 'high', low: 0, high: 0 }
  return { ...current, low, high }
}
