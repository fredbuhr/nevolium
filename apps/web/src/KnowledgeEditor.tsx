import { useEffect, useMemo, useState } from 'react'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  FORMAT_TEXT_COMMAND,
  type EditorState,
} from 'lexical'

import { readKnowledgeJson } from './knowledgeApi'
import { useKnowledgeMessages } from './knowledgeMessages'
import type {
  AuthoredKnowledgeKind,
  AuthoredKnowledgeRead,
  CanonicalDocument,
  DocumentVersion,
  EpistemicStatus,
  KnowledgeCitation,
  KnowledgeExchangeFormat,
  KnowledgeExchangeRead,
} from './knowledgeTypes'
import { nevoliumFetch } from './lib/apiClient'

type CitationDraft = {
  source_url?: string | null
  source_document_id?: string | null
  source_document_version_id?: string | null
  source_chunk_id?: string | null
  label?: string | null
  excerpt?: string | null
}

type Props = {
  apiUrl: string
  projectId: string
  selectedDocument: CanonicalDocument | null
  versions: DocumentVersion[]
  selectedVersion: DocumentVersion | null
  onChanged: (documentId: string) => void
}

function latestVersion(versions: DocumentVersion[]) {
  return [...versions].sort((a, b) => b.generation - a.generation)[0] || null
}

function editorStateFrom(version: DocumentVersion | null) {
  const rich = version?.content_json
  if (rich && typeof rich === 'object' && rich.root && typeof rich.root === 'object') {
    return JSON.stringify(rich)
  }
  const text = version?.content_text || ''
  return () => {
    const root = $getRoot()
    root.clear()
    const paragraph = $createParagraphNode()
    if (text) paragraph.append($createTextNode(text))
    root.append(paragraph)
  }
}

function Toolbar({ label }: { label: (key: 'bold' | 'italic' | 'underline') => string }) {
  const [editor] = useLexicalComposerContext()
  const controls = [
    ['bold', 'B'],
    ['italic', 'I'],
    ['underline', 'U'],
  ] as const
  return (
    <div className="knowledge-editor-toolbar" aria-label="Formatting">
      {controls.map(([format, glyph]) => (
        <button
          type="button"
          key={format}
          title={label(format)}
          aria-label={label(format)}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
        >
          {glyph}
        </button>
      ))}
    </div>
  )
}

function extensionFormat(name: string): KnowledgeExchangeFormat {
  const lower = name.toLocaleLowerCase()
  if (lower.endsWith('.nevolium.json') || lower.endsWith('.json')) return 'nevolium-json'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown'
  return 'plain'
}

function withoutCitationIdentity(citation: KnowledgeCitation): CitationDraft {
  return {
    source_url: citation.source_url,
    source_document_id: citation.source_document_id,
    source_document_version_id: citation.source_document_version_id,
    source_chunk_id: citation.source_chunk_id,
    label: citation.label,
    excerpt: citation.excerpt,
  }
}

export default function KnowledgeEditor({
  apiUrl,
  projectId,
  selectedDocument,
  versions,
  selectedVersion,
  onChanged,
}: Props) {
  const m = useKnowledgeMessages()
  const latest = useMemo(() => latestVersion(versions), [versions])
  const authored = Boolean(selectedDocument && selectedDocument.kind !== 'source' && !selectedDocument.asset_id)

  const [newTitle, setNewTitle] = useState('')
  const [newKind, setNewKind] = useState<AuthoredKnowledgeKind>('note')
  const [newEpistemic, setNewEpistemic] = useState<EpistemicStatus | ''>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [draftJson, setDraftJson] = useState<Record<string, unknown>>(
    () => (latest?.content_json as Record<string, unknown> | null) || {},
  )
  const [draftText, setDraftText] = useState(latest?.content_text || '')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [metadataTitle, setMetadataTitle] = useState(selectedDocument?.title || '')
  const [metadataKind, setMetadataKind] = useState<AuthoredKnowledgeKind>('note')
  const [metadataEpistemic, setMetadataEpistemic] = useState<EpistemicStatus | ''>('')
  const [metadataBusy, setMetadataBusy] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const [citations, setCitations] = useState<CitationDraft[]>([])
  const [citationUrl, setCitationUrl] = useState('')
  const [citationLabel, setCitationLabel] = useState('')
  const [citationExcerpt, setCitationExcerpt] = useState('')
  const [citationError, setCitationError] = useState<string | null>(null)

  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setMetadataTitle(selectedDocument?.title || '')
    setMetadataKind(
      selectedDocument?.kind === 'idea' || selectedDocument?.kind === 'decision'
        ? selectedDocument.kind
        : 'note',
    )
    setMetadataEpistemic(selectedDocument?.epistemic_status || '')
  }, [selectedDocument?.id, selectedDocument?.title, selectedDocument?.kind, selectedDocument?.epistemic_status])

  useEffect(() => {
    setDraftJson((latest?.content_json as Record<string, unknown> | null) || {})
    setDraftText(latest?.content_text || '')
    setSaveMessage(null)
  }, [latest?.id])

  useEffect(() => {
    if (!authored || !latest?.id) {
      setCitations([])
      return
    }
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await nevoliumFetch(
          `${apiUrl}/v1/knowledge/versions/${latest.id}/citations`,
          { signal: controller.signal },
        )
        const rows = await readKnowledgeJson<KnowledgeCitation[]>(response)
        if (!controller.signal.aborted) setCitations(rows.map(withoutCitationIdentity))
      } catch (cause) {
        if (!controller.signal.aborted) {
          setCitationError(cause instanceof Error ? cause.message : m('saveError'))
        }
      }
    })()
    return () => controller.abort()
  }, [apiUrl, authored, latest?.id])

  async function postJson<T>(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
    const response = await nevoliumFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return readKnowledgeJson<T>(response)
  }

  async function createItem() {
    if (!newTitle.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const created = await postJson<AuthoredKnowledgeRead>(
        `${apiUrl}/v1/knowledge/items`,
        'POST',
        {
          project_id: projectId,
          title: newTitle.trim(),
          kind: newKind,
          epistemic_status: newEpistemic || null,
          content_json: {},
          content_text: '',
          citations: [],
        },
      )
      setNewTitle('')
      onChanged(created.id)
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : m('createError'))
    } finally {
      setCreating(false)
    }
  }

  function onEditorChange(editorState: EditorState) {
    setDraftJson(editorState.toJSON() as unknown as Record<string, unknown>)
    setDraftText(editorState.read(() => $getRoot().getTextContent()))
    setSaveMessage(null)
  }

  async function saveVersion() {
    if (!selectedDocument || !latest || saving) return
    setSaving(true)
    setSaveMessage(null)
    try {
      const saved = await postJson<AuthoredKnowledgeRead>(
        `${apiUrl}/v1/knowledge/items/${selectedDocument.id}/versions`,
        'POST',
        {
          expected_generation: latest.generation,
          content_json: draftJson,
          content_text: draftText,
          citations,
        },
      )
      setSaveMessage(m('saved'))
      onChanged(saved.id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : m('saveError')
      setSaveMessage(message.includes('generation') ? m('conflict') : message)
    } finally {
      setSaving(false)
    }
  }

  async function saveMetadata() {
    if (!selectedDocument || !latest || metadataBusy) return
    const body: Record<string, unknown> = { expected_generation: latest.generation }
    if (metadataTitle.trim() !== selectedDocument.title) body.title = metadataTitle.trim()
    if (metadataKind !== selectedDocument.kind) body.kind = metadataKind
    if ((metadataEpistemic || null) !== (selectedDocument.epistemic_status || null)) {
      body.epistemic_status = metadataEpistemic || null
    }
    if (Object.keys(body).length === 1) return
    setMetadataBusy(true)
    setMetadataError(null)
    try {
      const saved = await postJson<AuthoredKnowledgeRead>(
        `${apiUrl}/v1/knowledge/items/${selectedDocument.id}/metadata`,
        'PATCH',
        body,
      )
      onChanged(saved.id)
    } catch (cause) {
      setMetadataError(cause instanceof Error ? cause.message : m('metadataError'))
    } finally {
      setMetadataBusy(false)
    }
  }

  async function restoreVersion() {
    if (!selectedDocument || !latest || !selectedVersion || restoring) return
    if (selectedVersion.generation >= latest.generation) return
    setRestoring(true)
    setRestoreError(null)
    try {
      const restored = await postJson<AuthoredKnowledgeRead>(
        `${apiUrl}/v1/knowledge/items/${selectedDocument.id}/versions/${selectedVersion.id}/restore`,
        'POST',
        { expected_generation: latest.generation },
      )
      onChanged(restored.id)
    } catch (cause) {
      setRestoreError(cause instanceof Error ? cause.message : m('restoreError'))
    } finally {
      setRestoring(false)
    }
  }

  function addUrlCitation() {
    const url = citationUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      setCitationError('URL')
      return
    }
    setCitationError(null)
    setCitations((current) => [...current, {
      source_url: url,
      label: citationLabel.trim() || null,
      excerpt: citationExcerpt.trim() || null,
    }])
    setCitationUrl('')
    setCitationLabel('')
    setCitationExcerpt('')
  }

  async function exportItem(format: KnowledgeExchangeFormat) {
    if (!selectedDocument) return
    setExchangeError(null)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/knowledge/items/${selectedDocument.id}/export?format=${encodeURIComponent(format)}`,
      )
      const exported = await readKnowledgeJson<KnowledgeExchangeRead>(response)
      const url = URL.createObjectURL(new Blob([exported.content], { type: exported.media_type }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exported.filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (cause) {
      setExchangeError(cause instanceof Error ? cause.message : m('exportError'))
    }
  }

  async function importItem(file: File | null) {
    if (!file || importing) return
    setImporting(true)
    setExchangeError(null)
    try {
      const payload = await file.text()
      const format = extensionFormat(file.name)
      const imported = await postJson<AuthoredKnowledgeRead>(
        `${apiUrl}/v1/knowledge/import`,
        'POST',
        {
          project_id: projectId,
          format,
          payload,
          ...(format === 'nevolium-json'
            ? {}
            : { title: file.name.replace(/\.(md|markdown|txt)$/i, '') || file.name, kind: 'note' }),
        },
      )
      onChanged(imported.id)
    } catch (cause) {
      setExchangeError(cause instanceof Error ? cause.message : m('importError'))
    } finally {
      setImporting(false)
    }
  }

  const initialEditorState = useMemo(() => editorStateFrom(latest), [latest?.id])

  return (
    <section className="knowledge-editor-shell" aria-labelledby="knowledge-editor-heading">
      <div className="news-heading">
        <div>
          <span className="eyebrow">{m('eyebrow')}</span>
          <h2 id="knowledge-editor-heading">{m('heading')}</h2>
        </div>
        {latest && <span className="run-state">{m('generation')} {latest.generation}</span>}
      </div>

      <div className="knowledge-create-row">
        <label><span>{m('title')}</span><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={320} /></label>
        <label><span>{m('kind')}</span><select value={newKind} onChange={(e) => setNewKind(e.target.value as AuthoredKnowledgeKind)}><option value="note">{m('note')}</option><option value="idea">{m('idea')}</option><option value="decision">{m('decision')}</option></select></label>
        <label><span>{m('epistemic')}</span><select value={newEpistemic} onChange={(e) => setNewEpistemic(e.target.value as EpistemicStatus | '')}><option value="">{m('none')}</option><option value="hypothesis">{m('hypothesis')}</option><option value="supported">{m('supported')}</option><option value="contested">{m('contested')}</option><option value="verified">{m('verified')}</option></select></label>
        <button type="button" disabled={!newTitle.trim() || creating} onClick={() => void createItem()}>{creating ? m('creating') : m('create')}</button>
      </div>
      {createError && <div className="error-panel">{createError}</div>}

      {selectedDocument && !authored && <div className="progress-panel"><strong>{selectedDocument.title}</strong><span>{m('importedSource')}</span></div>}

      {selectedDocument && authored && latest && (
        <>
          <section className="knowledge-metadata-panel">
            <strong>{m('metadata')}</strong>
            <div className="knowledge-create-row">
              <label><span>{m('title')}</span><input value={metadataTitle} onChange={(e) => setMetadataTitle(e.target.value)} maxLength={320} /></label>
              <label><span>{m('kind')}</span><select value={metadataKind} onChange={(e) => setMetadataKind(e.target.value as AuthoredKnowledgeKind)}><option value="note">{m('note')}</option><option value="idea">{m('idea')}</option><option value="decision">{m('decision')}</option></select></label>
              <label><span>{m('epistemic')}</span><select value={metadataEpistemic} onChange={(e) => setMetadataEpistemic(e.target.value as EpistemicStatus | '')}><option value="">{m('none')}</option><option value="hypothesis">{m('hypothesis')}</option><option value="supported">{m('supported')}</option><option value="contested">{m('contested')}</option><option value="verified">{m('verified')}</option></select></label>
              <button type="button" disabled={metadataBusy || !metadataTitle.trim()} onClick={() => void saveMetadata()}>{m('applyMetadata')}</button>
            </div>
            {metadataError && <div className="error-panel">{metadataError}</div>}
          </section>

          <LexicalComposer key={`${selectedDocument.id}:${latest.id}`} initialConfig={{
            namespace: `nevolium-knowledge-${selectedDocument.id}`,
            editorState: initialEditorState,
            onError: (error: Error) => console.error(error),
            theme: {
              paragraph: 'knowledge-editor-paragraph',
              text: { bold: 'knowledge-editor-bold', italic: 'knowledge-editor-italic', underline: 'knowledge-editor-underline' },
            },
          }}>
            <div className="knowledge-editor-card">
              <Toolbar label={(key) => m(key)} />
              <RichTextPlugin
                contentEditable={<ContentEditable className="knowledge-editor-content" aria-label={m('editor')} />}
                placeholder={<div className="knowledge-editor-placeholder">{m('placeholder')}</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <OnChangePlugin onChange={onEditorChange} ignoreSelectionChange />
            </div>
          </LexicalComposer>

          <div className="knowledge-editor-actions">
            <button type="button" disabled={saving} onClick={() => void saveVersion()}>{saving ? m('saving') : m('save')}</button>
            {saveMessage && <span className="route-chip">{saveMessage}</span>}
          </div>

          <section className="knowledge-citations-panel">
            <strong>{m('citations')}</strong>
            <span>{citations.length ? m('citationPending') : m('noCitation')}</span>
            {citations.map((citation, index) => (
              <div className="knowledge-citation-row" key={`${citation.source_url || citation.source_chunk_id || 'citation'}-${index}`}>
                <span>{citation.label || citation.source_url || citation.source_document_id}</span>
                <button type="button" onClick={() => setCitations((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{m('remove')}</button>
              </div>
            ))}
            <div className="knowledge-create-row">
              <label><span>{m('citationUrl')}</span><input type="url" value={citationUrl} onChange={(e) => setCitationUrl(e.target.value)} /></label>
              <label><span>{m('citationLabel')}</span><input value={citationLabel} onChange={(e) => setCitationLabel(e.target.value)} maxLength={320} /></label>
              <label><span>{m('citationExcerpt')}</span><input value={citationExcerpt} onChange={(e) => setCitationExcerpt(e.target.value)} maxLength={4000} /></label>
              <button type="button" disabled={!citationUrl.trim()} onClick={addUrlCitation}>{m('addCitation')}</button>
            </div>
            {citationError && <div className="error-panel">{citationError}</div>}
          </section>

          <section className="knowledge-exchange-panel">
            <strong>{m('importExport')}</strong>
            <div className="knowledge-editor-actions">
              <label className="knowledge-file-control"><span>{importing ? m('importing') : m('importFile')}</span><input type="file" accept=".nevolium.json,.json,.md,.markdown,.txt,application/json,text/markdown,text/plain" disabled={importing} onChange={(e) => void importItem(e.target.files?.[0] || null)} /></label>
              <button type="button" onClick={() => void exportItem('nevolium-json')}>{m('exportJson')}</button>
              <button type="button" onClick={() => void exportItem('markdown')}>{m('exportMarkdown')}</button>
              <button type="button" onClick={() => void exportItem('plain')}>{m('exportText')}</button>
            </div>
            <small>{m('exportJson')} · {m('lossless')} · {m('exportMarkdown')}/{m('exportText')} · {m('projected')}</small>
            {exchangeError && <div className="error-panel">{exchangeError}</div>}
          </section>

          {selectedVersion && selectedVersion.generation < latest.generation && (
            <section className="knowledge-restore-panel">
              <strong>v{selectedVersion.generation}</strong>
              <span>{m('restoreHint')}</span>
              <button type="button" disabled={restoring} onClick={() => void restoreVersion()}>{restoring ? m('restoring') : m('restore')}</button>
              {restoreError && <div className="error-panel">{restoreError}</div>}
            </section>
          )}
        </>
      )}
    </section>
  )
}
