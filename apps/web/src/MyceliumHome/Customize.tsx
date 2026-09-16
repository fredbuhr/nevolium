import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePagedCollection } from '../lib/usePagedCollection'
import { MAX_ENTRIES, TOOLS, reorder, type HomeLayout, type BrowserNode } from './model'
import { useHomeMessages } from './messages'

type Item = { id: string; name?: string; title?: string; kind?: string; metadata_json?: { filename?: string } }
type Props = { apiUrl: string; layout: HomeLayout; resolved: Map<string, BrowserNode>;
  update: (change: (layout: HomeLayout) => HomeLayout) => void; onDone: () => void; undo: () => void; canUndo: boolean;
  children?: ReactNode; saveStatus: ReactNode }

export default function Customize(props: Props) {
  const m = useHomeMessages()
  const [source, setSource] = useState('tools'), [filter, setFilter] = useState(''), [folder, setFolder] = useState('')
  const [dragged, setDragged] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  const page = usePagedCollection<Item>(source === 'tools' ? null : `${props.apiUrl}/v1/${source}?limit=30`)
  const options = source === 'tools' ? TOOLS.map(tool => ({ ref: `tool:${tool}`, label: m(tool) }))
    : page.items.map(item => ({ ref: `${({ projects: 'project', documents: 'document', tasks: 'task', assets: 'asset' } as Record<string, string>)[source]}:${item.id}`,
      label: item.name || item.title || item.metadata_json?.filename || item.id }))
  const add = (ref: string) => props.update(layout => ({ ...layout, entries: [...layout.entries, { ref, label: '', folder: '' }] }))
  return <dialog ref={dialog} className="home-customize" aria-label={m('customize')} onCancel={props.onDone}>
    <div className="home-section-heading"><h2>{m('customize')}</h2><button type="button" onClick={props.onDone}>{m('done')}</button></div>
    {props.saveStatus}
    {props.children}
    <details className="home-organization"><summary>{m('organize')}</summary>
    <p>{m('folderHelp')}</p>
    <div className="home-controls">
      <label>{m('folderName')}<input value={folder} maxLength={80} onChange={event => setFolder(event.target.value)} /></label>
      <button type="button" disabled={!folder.trim() || props.layout.folders.length >= 8} onClick={() => {
        props.update(layout => ({ ...layout, folders: [...layout.folders, { id: crypto.randomUUID(), label: folder.trim() }] })); setFolder('')
      }}>{m('newFolder')}</button>
      <button type="button" disabled={!props.canUndo} onClick={props.undo}>{m('undo')}</button>
    </div>
    {props.layout.folders.map(item => <div className="home-folder-editor" key={item.id}>
      <label>{m('folderName')}<input key={item.label} maxLength={80} defaultValue={item.label} onBlur={event => props.update(layout => ({ ...layout, folders: layout.folders.map(value => value.id === item.id ? { ...value, label: event.target.value.trim() || value.label } : value) }))} /></label><button type="button" onClick={() => props.update(layout => ({
        ...layout, folders: layout.folders.filter(value => value.id !== item.id),
        entries: layout.entries.map(entry => entry.folder === item.id ? { ...entry, folder: '' } : entry),
      }))}>{m('removeFolder')}</button>
    </div>)}
    <ol className="home-entry-editor">
      {props.layout.entries.map((entry, i) => <li key={entry.ref} draggable onDragStart={() => setDragged(i)} onDragEnd={() => setDragged(null)}
        onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragged !== null) props.update(layout => reorder(layout, dragged, i)); setDragged(null) }}>
        <label>{m('label')}<input aria-label={`${m('label')} ${i + 1}`} maxLength={120} value={entry.label}
          placeholder={entry.ref.startsWith('tool:') ? m(entry.ref.slice(5)) : props.resolved.get(entry.ref)?.label || m('unavailable')}
          onChange={event => props.update(layout => ({ ...layout, entries: layout.entries.map(item => item.ref === entry.ref ? { ...item, label: event.target.value } : item) }))} /></label>
        <label>{m('folder')}<select aria-label={`${m('folder')} ${i + 1}`} value={entry.folder}
          onChange={event => props.update(layout => ({ ...layout, entries: layout.entries.map(item => item.ref === entry.ref ? { ...item, folder: event.target.value } : item) }))}>
          <option value="">{m('root')}</option>{props.layout.folders.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <div className="home-controls"><button type="button" aria-label={`${m('up')} ${i + 1}`} disabled={!i} onClick={() => props.update(layout => reorder(layout, i, i - 1))}>↑</button>
          <button type="button" aria-label={`${m('down')} ${i + 1}`} disabled={i === props.layout.entries.length - 1} onClick={() => props.update(layout => reorder(layout, i, i + 1))}>↓</button>
          <button type="button" onClick={() => props.update(layout => ({ ...layout, entries: layout.entries.filter(item => item.ref !== entry.ref) }))}>{m('remove')}</button></div>
      </li>)}
    </ol>
    </details>
    <div className="home-controls">
      <label>{m('choose')}<select value={source} onChange={event => { setSource(event.target.value); setFilter('') }}>
        {['tools', 'projects', 'documents', 'tasks', 'assets'].map(key => <option key={key} value={key}>{m(key)}</option>)}
      </select></label>
      <label>{m('search')}<input value={filter} onChange={event => setFilter(event.target.value)} /></label>
    </div>
    {props.layout.entries.length >= MAX_ENTRIES ? <p role="status">{m('limit')}</p> : null}
    {page.error ? <p role="alert">{m('error')} <button type="button" onClick={() => void page.reload()}>{m('retry')}</button></p> : null}
    {source !== 'tools' && page.loading ? <p role="status">{m('loading')}</p> : null}
    <ul className="home-picker">{options.filter(item => item.label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(item => <li key={item.ref}>
      <span>{item.label}</span><button type="button" aria-label={`${m('add')} : ${item.label}`}
        disabled={props.layout.entries.length >= MAX_ENTRIES || props.layout.entries.some(entry => entry.ref === item.ref)} onClick={() => add(item.ref)}>{m('add')}</button>
    </li>)}</ul>
    {page.hasMore ? <button type="button" disabled={page.loading} onClick={() => void page.loadMore()}>{m('more')}</button> : null}
  </dialog>
}
