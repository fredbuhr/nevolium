import { useMemo, useSyncExternalStore } from 'react'
import { nevoliumFetch } from '../lib/apiClient'
import type { AppLanguage } from '../i18n'

export type LayoutSaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type SaveSnapshot = { status: LayoutSaveStatus; error: string | null }

/** One in-flight PUT per workspace, with a retained latest complete snapshot.
 * This orders this mounted client's writes; it is not cross-client concurrency control.
 * Failed snapshots stay dirty until an explicit retry or a new local edit succeeds.
 */
export class LatestLayoutWriter<T> {
  private revision = 0
  private acknowledged = 0
  private latest: T | undefined
  private inFlight = false
  private snapshot: SaveSnapshot = { status: 'idle', error: null }
  private listeners = new Set<() => void>()
  private readonly persist: (value: T) => Promise<void>

  constructor(persist: (value: T) => Promise<void>) { this.persist = persist }

  getSnapshot = (): SaveSnapshot => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  get dirty() { return this.revision > this.acknowledged }

  private publish(status: LayoutSaveStatus, error: string | null = null) {
    this.snapshot = { status, error }
    this.listeners.forEach(listener => listener())
  }

  enqueue = (value: T) => {
    this.latest = structuredClone(value)
    this.revision += 1
    this.publish('saving')
    void this.drain()
  }

  retry = () => {
    if (!this.dirty || this.inFlight) return
    this.publish('saving')
    void this.drain()
  }

  private async drain() {
    if (this.inFlight) return
    this.inFlight = true
    try {
      while (this.dirty) {
        const revision = this.revision
        const value = this.latest as T
        try {
          await this.persist(value)
        } catch (error) {
          this.publish('error', error instanceof Error ? error.message : 'Layout save failed')
          return
        }
        this.acknowledged = revision
        // Never advertise a saved state for an older response while a newer edit waits.
      }
      this.publish('saved')
    } finally {
      this.inFlight = false
    }
  }
}

export function useLayoutPersistence<T>(apiUrl: string, workspaceKey: string | null) {
  const writer = useMemo(() => new LatestLayoutWriter<T>(async layout => {
    if (!workspaceKey) throw new Error('Workspace is not loaded')
    const response = await nevoliumFetch(
      `${apiUrl}/v1/ui/workspaces/${encodeURIComponent(workspaceKey)}/layout`,
      {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_version: 1, layout }),
      },
    )
    if (!response.ok) throw new Error(`Nevolium ${response.status}`)
  }), [apiUrl, workspaceKey])
  const state = useSyncExternalStore(writer.subscribe, writer.getSnapshot, writer.getSnapshot)
  return { ...state, save: writer.enqueue, retry: writer.retry, writer }
}

// Namespaced FR/EN catalogue for the persistence controls; adding a language is data-only.
export const layoutSaveCopy: Record<AppLanguage, Record<LayoutSaveStatus | 'retry', string>> = {
  fr: {
    idle: 'Disposition prête', saving: 'Enregistrement…', saved: 'Disposition enregistrée',
    error: 'Disposition non enregistrée', retry: 'Réessayer la sauvegarde',
  },
  en: {
    idle: 'Layout ready', saving: 'Saving…', saved: 'Layout saved',
    error: 'Layout not saved', retry: 'Retry saving',
  },
}
