import { useEffect, useRef, useState } from 'react'
import { nevoliumFetch } from '../lib/apiClient'
import { getAuthSnapshot, subscribeAuthSession } from '../lib/authSession'
import { useHomeMessages } from './messages'
import type { DesktopBackground as Background } from './model'

const IMAGE_TYPES = /^image\/(png|jpeg|webp)$/
const MAX_BYTES = 8 * 1024 * 1024

// Only an owned Asset ID is persisted. Blob URLs never enter WorkspaceLayout or localStorage.
export function DesktopBackground({ apiUrl, value, onError }: { apiUrl: string; value: Background; onError: (error: boolean) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController(), origin = getAuthSnapshot()
    let objectUrl: string | null = null
    const clear = () => { setUrl(null); if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null }
    const unsubscribe = subscribeAuthSession(() => {
      const now = getAuthSnapshot()
      if (now.subject !== origin.subject || now.enabled !== origin.enabled || (origin.enabled && !now.authenticated)) {
        controller.abort(); clear()
      }
    })
    clear(); onError(false)
    if (value.kind === 'image' && value.assetId) void (async () => {
      const response = await nevoliumFetch(`${apiUrl}/v1/assets/${value.assetId}/content`, { signal: controller.signal })
      if (!response.ok) throw new Error('Background unavailable')
      const blob = await response.blob()
      if (!IMAGE_TYPES.test(blob.type) || blob.size > MAX_BYTES) throw new Error('Unsupported background')
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    })().catch(() => { if (!controller.signal.aborted) onError(true) })
    return () => { controller.abort(); unsubscribe(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [apiUrl, value.kind, value.assetId, onError])
  const image = value.kind === 'neural' ? '/mycelium-quiet.webp' : value.kind === 'image' ? url : null
  return <div className="desktop-wallpaper" aria-hidden="true" data-wallpaper-kind={value.kind} data-wallpaper-loaded={Boolean(image)}
    style={{ backgroundColor: value.color, backgroundImage: image ? `linear-gradient(rgba(0,0,0,${value.dim}), rgba(0,0,0,${value.dim})), url("${image}")` : 'none' }} />
}

export function BackgroundSettings({ apiUrl, value, update }: { apiUrl: string; value: Background; update: (next: Background) => void }) {
  const m = useHomeMessages(), request = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(false)
  useEffect(() => {
    const origin = getAuthSnapshot()
    const unsubscribe = subscribeAuthSession(() => {
      const now = getAuthSnapshot()
      if (now.subject !== origin.subject || now.enabled !== origin.enabled || (origin.enabled && !now.authenticated)) request.current?.abort()
    })
    return () => { request.current?.abort(); unsubscribe() }
  }, [])
  async function upload(file: File) {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setBusy(true); setError(false)
    try {
      if (!IMAGE_TYPES.test(file.type) || file.size > MAX_BYTES) throw new Error('Unsupported background')
      const bitmap = await createImageBitmap(file)
      const pixels = bitmap.width * bitmap.height; bitmap.close()
      if (pixels > 24_000_000) throw new Error('Background too large')
      if (controller.signal.aborted) return
      const body = new FormData(); body.append('file', file)
      const response = await nevoliumFetch(`${apiUrl}/v1/assets`, { method: 'POST', body, signal: controller.signal })
      if (!response.ok) throw new Error('Upload failed')
      const asset = await response.json()
      if (!controller.signal.aborted) update({ ...value, kind: 'image', assetId: asset.id })
    } catch { if (!controller.signal.aborted) setError(true) }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return <fieldset className="home-background-settings"><legend>{m('background')}</legend>
    <div className="home-controls">
      <label>{m('backgroundKind')}<select value={value.kind} disabled={busy} onChange={event => update({ ...value, kind: event.target.value as Background['kind'] })}>
        <option value="solid">{m('solidBackground')}</option><option value="neural">{m('neuralBackground')}</option>
        {value.assetId ? <option value="image">{m('personalBackground')}</option> : null}
      </select></label>
      <label>{m('backgroundColor')}<input type="color" value={value.color} disabled={busy} onChange={event => update({ ...value, color: event.target.value })} /></label>
      <label>{m('uploadBackground')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file) }} /></label>
    </div>
    <p className="home-field-help">{m('backgroundHelp')}</p>
    {value.kind !== 'solid' ? <label>{m('backgroundDim')}<input type="range" min="0" max="0.85" step="0.05" value={value.dim} disabled={busy}
      onChange={event => update({ ...value, dim: Number(event.target.value) })} /></label> : null}
    {busy ? <p role="status">{m('uploadingBackground')}</p> : null}
    {error ? <p role="alert">{m('backgroundUploadError')}</p> : null}
  </fieldset>
}
