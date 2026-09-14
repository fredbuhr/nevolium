import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'

import { nevoliumFetch } from './lib/apiClient'

export type CockpitSlots = {
  command: ReactNode
  news: ReactNode
  research: ReactNode
}

export type CockpitExtraPanel = {
  key: string
  id: string
  title: string
  content: ReactNode
  keywords?: string[]
  minimumWidth?: number
  minimumHeight?: number
}

export type CockpitProfile = 'balanced' | 'focus' | 'review'
export type CockpitDeviceClass = 'phone' | 'tablet' | 'desktop'

type CockpitShellProps = {
  apiUrl?: string
  deviceClass: CockpitDeviceClass
  extraPanels?: CockpitExtraPanel[]
  legacyWorkspaceKeys?: string[]
  profile: CockpitProfile
  slots: CockpitSlots
  workspaceKey: string
}

type WorkspaceLayoutEnvelope = {
  schema_version: number
  layout: unknown
}

type CockpitApi = DockviewReadyEvent['api']
type CockpitPanelKey = 'command' | 'news' | 'research'
type CockpitContent = CockpitSlots & { extras: Record<string, ReactNode> }
type LayoutState = 'loading' | 'ready' | 'saving' | 'saved' | 'error'
type LayoutRetry = 'restore' | 'save' | null

const CockpitContentContext = createContext<CockpitContent | null>(null)
const dockPanelStyle = { height: '100%', overflow: 'auto' } as const
const LAYOUT_SCHEMA_VERSION = 1
const DEFAULT_API_URL = (import.meta.env.VITE_NEVOLIUM_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
)
const SAVE_DEBOUNCE_MS = 700

const PANEL_DEFINITIONS = {
  command: {
    id: 'command-center',
    component: 'command',
    title: 'Command',
    minimumWidth: 240,
    minimumHeight: 220,
  },
  news: {
    id: 'news-intelligence',
    component: 'news',
    title: 'News',
    minimumWidth: 260,
    minimumHeight: 220,
  },
  research: {
    id: 'research',
    component: 'research',
    title: 'Research',
    minimumWidth: 260,
    minimumHeight: 240,
  },
} as const

const PANEL_KEYWORDS: Record<CockpitPanelKey, string[]> = {
  command: ['conversation', 'assistant', 'commande'],
  news: ['actualités', 'briefing', 'veille'],
  research: ['recherche', 'sources', 'citations'],
}

const RESERVED_PANEL_IDS = new Set<string>(Object.values(PANEL_DEFINITIONS).map((item) => item.id))
const RESERVED_PANEL_KEYS = new Set(['command', 'news', 'research', 'extra'])

function normalizeExtraPanels(extraPanels: CockpitExtraPanel[]): CockpitExtraPanel[] {
  const keys = new Set<string>()
  const ids = new Set<string>()
  return extraPanels.filter((panel) => {
    const key = panel.key.trim()
    const id = panel.id.trim()
    const title = panel.title.trim()
    const invalid =
      !key ||
      !id ||
      !title ||
      RESERVED_PANEL_KEYS.has(key) ||
      RESERVED_PANEL_IDS.has(id) ||
      keys.has(key) ||
      ids.has(id)
    if (invalid) {
      console.warn('Nevolium Cockpit ignored invalid or duplicate extra panel', panel)
      return false
    }
    keys.add(key)
    ids.add(id)
    return true
  })
}

function useCockpitContent() {
  const value = useContext(CockpitContentContext)
  if (!value) throw new Error('Cockpit panels must render inside CockpitShell')
  return value
}

function CommandPanel(_props: IDockviewPanelProps) {
  return <div style={dockPanelStyle}>{useCockpitContent().command}</div>
}

function NewsPanel(_props: IDockviewPanelProps) {
  return <div style={dockPanelStyle}>{useCockpitContent().news}</div>
}

function ResearchPanel(_props: IDockviewPanelProps) {
  return <div style={dockPanelStyle}>{useCockpitContent().research}</div>
}

function ExtraPanel(props: IDockviewPanelProps) {
  const { extras } = useCockpitContent()
  const rawParams = props.params as { panelKey?: unknown } | undefined
  const panelKey = typeof rawParams?.panelKey === 'string' ? rawParams.panelKey : ''
  const content = panelKey ? extras[panelKey] : undefined
  return (
    <div style={dockPanelStyle}>
      {content ?? (
        <div className="state-panel state-panel-empty">
          <strong>Panneau indisponible</strong>
          <span>Cette disposition référence un module absent de la version courante.</span>
        </div>
      )}
    </div>
  )
}

const components = {
  command: CommandPanel,
  news: NewsPanel,
  research: ResearchPanel,
  extra: ExtraPanel,
}

function addPanelWithin(api: CockpitApi, definition: (typeof PANEL_DEFINITIONS)[CockpitPanelKey]) {
  const reference = api.activePanel
  return api.addPanel({
    ...definition,
    ...(reference
      ? { position: { referencePanel: reference, direction: 'within' as const } }
      : {}),
  })
}

function addExtraWithin(api: CockpitApi, panel: CockpitExtraPanel) {
  const reference = api.activePanel
  return api.addPanel({
    id: panel.id,
    component: 'extra',
    title: panel.title,
    minimumWidth: panel.minimumWidth ?? 240,
    minimumHeight: panel.minimumHeight ?? 220,
    params: { panelKey: panel.key },
    ...(reference
      ? { position: { referencePanel: reference, direction: 'within' as const } }
      : {}),
  })
}

function createDefaultLayout(
  api: CockpitApi,
  profile: CockpitProfile,
  deviceClass: CockpitDeviceClass,
  extraPanels: CockpitExtraPanel[],
) {
  if (profile === 'focus') {
    api.addPanel(PANEL_DEFINITIONS.command)
    return
  }
  if (profile === 'review') {
    const reviewPanels = ['today', 'projects', 'knowledge']
      .map((key) => extraPanels.find((panel) => panel.key === key))
      .filter((panel): panel is CockpitExtraPanel => Boolean(panel))
    if (reviewPanels.length === 0) {
      api.addPanel(PANEL_DEFINITIONS.command)
      return
    }
    for (const panel of reviewPanels) addExtraWithin(api, panel)
    api.getPanel(reviewPanels[0].id)?.api.setActive()
    return
  }

  api.addPanel(PANEL_DEFINITIONS.command)
  if (deviceClass === 'phone') {
    addPanelWithin(api, PANEL_DEFINITIONS.news)
    addPanelWithin(api, PANEL_DEFINITIONS.research)
    api.getPanel(PANEL_DEFINITIONS.command.id)?.api.setActive()
    return
  }
  api.addPanel({
    ...PANEL_DEFINITIONS.news,
    position: { referencePanel: PANEL_DEFINITIONS.command.id, direction: 'right' },
  })
  api.addPanel({
    ...PANEL_DEFINITIONS.research,
    position: { referencePanel: PANEL_DEFINITIONS.news.id, direction: 'below' },
  })
}

function openPanel(api: CockpitApi, key: CockpitPanelKey, deviceClass: CockpitDeviceClass) {
  const definition = PANEL_DEFINITIONS[key]
  const existing = api.getPanel(definition.id)
  if (existing) {
    existing.api.setActive()
    return
  }
  const created =
    deviceClass === 'phone' ? addPanelWithin(api, definition) : api.addPanel(definition)
  created.api.setActive()
}

function openExtraPanel(
  api: CockpitApi,
  panel: CockpitExtraPanel,
  deviceClass: CockpitDeviceClass,
) {
  const existing = api.getPanel(panel.id)
  if (existing) {
    existing.api.setActive()
    return
  }
  const created =
    deviceClass === 'phone'
      ? addExtraWithin(api, panel)
      : api.addPanel({
          id: panel.id,
          component: 'extra',
          title: panel.title,
          minimumWidth: panel.minimumWidth ?? 240,
          minimumHeight: panel.minimumHeight ?? 220,
          params: { panelKey: panel.key },
        })
  created.api.setActive()
}

async function loadWorkspaceLayout(apiUrl: string, workspaceKey: string) {
  const response = await nevoliumFetch(
    `${apiUrl}/v1/ui/workspaces/${encodeURIComponent(workspaceKey)}/layout`,
  )
  if (response.status === 404) return { kind: 'missing' as const }
  if (!response.ok) throw new Error(`lecture impossible (${response.status})`)
  const value = (await response.json()) as WorkspaceLayoutEnvelope
  if (
    value.schema_version !== LAYOUT_SCHEMA_VERSION ||
    typeof value.layout !== 'object' ||
    value.layout === null ||
    Array.isArray(value.layout)
  ) {
    throw new Error('version de disposition incompatible')
  }
  return { kind: 'found' as const, layout: value.layout }
}

async function saveWorkspaceLayout(apiUrl: string, workspaceKey: string, layout: unknown) {
  const response = await nevoliumFetch(
    `${apiUrl}/v1/ui/workspaces/${encodeURIComponent(workspaceKey)}/layout`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema_version: LAYOUT_SCHEMA_VERSION, layout }),
    },
  )
  if (!response.ok) throw new Error(`sauvegarde impossible (${response.status})`)
}

export default function CockpitShell({
  apiUrl = DEFAULT_API_URL,
  deviceClass,
  extraPanels = [],
  legacyWorkspaceKeys = [],
  profile,
  slots,
  workspaceKey,
}: CockpitShellProps) {
  const disposedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const apiRef = useRef<CockpitApi | null>(null)
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())
  const paletteInputRef = useRef<HTMLInputElement | null>(null)
  const paletteDialogRef = useRef<HTMLElement | null>(null)
  const paletteReturnFocusRef = useRef<HTMLElement | null>(null)
  const [ready, setReady] = useState(false)
  const [layoutState, setLayoutState] = useState<LayoutState>('loading')
  const [layoutRetry, setLayoutRetry] = useState<LayoutRetry>(null)
  const [layoutMessage, setLayoutMessage] = useState('Restauration de la disposition…')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)

  const normalizedExtras = useMemo(() => normalizeExtraPanels(extraPanels), [extraPanels])
  const cockpitContent = useMemo<CockpitContent>(
    () => ({
      ...slots,
      extras: Object.fromEntries(normalizedExtras.map((panel) => [panel.key, panel.content])),
    }),
    [slots, normalizedExtras],
  )
  const paletteItems = useMemo(
    () => [
      ...Object.entries(PANEL_DEFINITIONS).map(([key, definition]) => ({
        key,
        title: definition.title,
        keywords: PANEL_KEYWORDS[key as CockpitPanelKey],
        open: (api: CockpitApi) => openPanel(api, key as CockpitPanelKey, deviceClass),
      })),
      ...normalizedExtras.map((panel) => ({
        key: panel.key,
        title: panel.title,
        keywords: panel.keywords ?? [],
        open: (api: CockpitApi) => openExtraPanel(api, panel, deviceClass),
      })),
    ],
    [deviceClass, normalizedExtras],
  )
  const filteredPaletteItems = useMemo(() => {
    const query = paletteQuery.trim().toLocaleLowerCase('fr')
    if (!query) return paletteItems
    return paletteItems.filter((item) =>
      [item.title, item.key, ...item.keywords].join(' ').toLocaleLowerCase('fr').includes(query),
    )
  }, [paletteItems, paletteQuery])

  const openPalette = useCallback(() => {
    const active = document.activeElement
    paletteReturnFocusRef.current = active instanceof HTMLElement ? active : null
    setPaletteOpen(true)
  }, [])

  const closePalette = useCallback(() => {
    setPaletteOpen(false)
    setPaletteQuery('')
    window.setTimeout(() => paletteReturnFocusRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      apiRef.current = null
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openPalette()
      }
      if (event.key === 'Escape' && paletteOpen) closePalette()
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [closePalette, openPalette, paletteOpen])

  useEffect(() => {
    if (!paletteOpen) return
    setPaletteIndex(0)
    window.setTimeout(() => paletteInputRef.current?.focus(), 0)
  }, [paletteOpen])

  const queueLayoutSave = useCallback(
    (api: CockpitApi) => {
      const snapshot = api.toJSON()
      setLayoutState('saving')
      setLayoutRetry(null)
      setLayoutMessage('Synchronisation…')
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(() => saveWorkspaceLayout(apiUrl, workspaceKey, snapshot))
        .then(() => {
          if (!disposedRef.current) {
            setLayoutState('saved')
            setLayoutMessage('Disposition synchronisée')
          }
        })
        .catch((error: unknown) => {
          if (!disposedRef.current) {
            setLayoutState('error')
            setLayoutRetry('save')
            setLayoutMessage(error instanceof Error ? error.message : 'sauvegarde impossible')
          }
        })
    },
    [apiUrl, workspaceKey],
  )

  const attachPersistence = useCallback(
    (api: CockpitApi) => {
      let saveTimer: number | undefined
      const disposable = api.onDidLayoutChange(() => {
        if (saveTimer) window.clearTimeout(saveTimer)
        setLayoutState('saving')
        setLayoutRetry(null)
        setLayoutMessage('Modifications en attente…')
        saveTimer = window.setTimeout(() => {
          saveTimer = undefined
          queueLayoutSave(api)
        }, SAVE_DEBOUNCE_MS)
      })
      cleanupRef.current = () => {
        disposable.dispose()
        if (saveTimer) {
          window.clearTimeout(saveTimer)
          saveTimer = undefined
          queueLayoutSave(api)
        }
      }
    },
    [queueLayoutSave],
  )

  const restoreAndAttach = useCallback(
    async (api: CockpitApi) => {
      cleanupRef.current?.()
      cleanupRef.current = null
      setLayoutState('loading')
      setLayoutRetry(null)
      setLayoutMessage('Restauration de la disposition…')
      try {
        let saved = await loadWorkspaceLayout(apiUrl, workspaceKey)
        let restoredLegacyLayout = false
        for (const legacyWorkspaceKey of legacyWorkspaceKeys) {
          if (saved.kind !== 'missing' || legacyWorkspaceKey === workspaceKey) break
          saved = await loadWorkspaceLayout(apiUrl, legacyWorkspaceKey)
          restoredLegacyLayout = saved.kind === 'found'
        }
        if (disposedRef.current) return
        if (saved.kind === 'found') {
          api.clear()
          api.fromJSON(saved.layout as ReturnType<typeof api.toJSON>)
        } else if (!api.activePanel) {
          createDefaultLayout(api, profile, deviceClass, normalizedExtras)
        }
        attachPersistence(api)
        if (restoredLegacyLayout) {
          queueLayoutSave(api)
        } else {
          setLayoutState('ready')
          setLayoutRetry(null)
          setLayoutMessage(
            saved.kind === 'found' ? 'Disposition restaurée' : 'Nouvelle disposition locale',
          )
        }
      } catch (error) {
        if (disposedRef.current) return
        if (!api.activePanel) createDefaultLayout(api, profile, deviceClass, normalizedExtras)
        setLayoutState('error')
        setLayoutRetry('restore')
        setLayoutMessage(
          `${error instanceof Error ? error.message : 'lecture impossible'} — synchronisation suspendue`,
        )
      } finally {
        if (!disposedRef.current) setReady(true)
      }
    },
    [
      apiUrl,
      attachPersistence,
      deviceClass,
      legacyWorkspaceKeys,
      normalizedExtras,
      profile,
      workspaceKey,
    ],
  )

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api
      void restoreAndAttach(event.api)
    },
    [restoreAndAttach],
  )

  const choosePaletteItem = (index: number) => {
    const api = apiRef.current
    const item = filteredPaletteItems[index]
    if (!api || !item) return
    item.open(api)
    closePalette()
  }

  const handlePaletteKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filteredPaletteItems.length) {
        setPaletteIndex((index) => Math.min(index + 1, filteredPaletteItems.length - 1))
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPaletteIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choosePaletteItem(paletteIndex)
    }
  }

  const handlePaletteDialogKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closePalette()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      paletteDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const resetLayout = () => {
    const api = apiRef.current
    if (!api) return
    api.clear()
    createDefaultLayout(api, profile, deviceClass, normalizedExtras)
  }

  const detachActivePanel = async () => {
    const api = apiRef.current
    const activePanel = api?.activePanel
    if (!api || !activePanel) {
      setLayoutState('error')
      setLayoutRetry(null)
      setLayoutMessage('Sélectionnez un panneau avant de le détacher.')
      return
    }
    try {
      const opened = await api.addPopoutGroup(activePanel)
      if (!opened) throw new Error('La fenêtre a été refusée par le navigateur.')
      setLayoutState('ready')
      setLayoutRetry(null)
      setLayoutMessage('Panneau détaché — déplacez sa fenêtre vers l’écran souhaité.')
    } catch (error) {
      setLayoutState('error')
      setLayoutRetry(null)
      setLayoutMessage(
        error instanceof Error ? error.message : 'Impossible de détacher ce panneau.',
      )
    }
  }

  return (
    <CockpitContentContext.Provider value={cockpitContent}>
      <section className="cockpit-shell" aria-label="Cockpit Nevolium">
        <nav className="cockpit-toolbar" aria-label="Navigation du cockpit">
          <button
            className="quick-access-button"
            type="button"
            disabled={!ready}
            onClick={openPalette}
            aria-keyshortcuts="Control+K Meta+K"
          >
            <span>Accès rapide</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="cockpit-panel-buttons" aria-label="Panneaux principaux">
            {paletteItems.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={!ready}
                onClick={() => {
                  const api = apiRef.current
                  if (api) item.open(api)
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            {deviceClass !== 'phone' ? (
              <button
                type="button"
                disabled={!ready}
                onClick={() => void detachActivePanel()}
                title="Ouvrir le panneau actif dans une fenêtre déplaçable sur un autre écran"
              >
                Détacher
              </button>
            ) : null}
            <button type="button" disabled={!ready} onClick={resetLayout}>
              Réinitialiser
            </button>
          </div>
        </nav>

        <div className={`layout-state layout-state-${layoutState}`} aria-live="polite">
          <span className="layout-state-dot" aria-hidden="true" />
          <span>{layoutMessage}</span>
          {layoutState === 'error' && layoutRetry ? (
            <button
              type="button"
              onClick={() => {
                const api = apiRef.current
                if (!api) return
                if (layoutRetry === 'save') queueLayoutSave(api)
                else void restoreAndAttach(api)
              }}
            >
              {layoutRetry === 'save' ? 'Réessayer la sauvegarde' : 'Réessayer la lecture'}
            </button>
          ) : null}
        </div>

        <div className="cockpit-dock">
          <DockviewReact
            className="dockview-theme-abyss"
            components={components}
            disableDnd={deviceClass === 'phone'}
            disableFloatingGroups
            onReady={onReady}
            scrollbars="native"
            singleTabMode={deviceClass === 'phone' ? 'fullwidth' : 'default'}
          />
        </div>
      </section>

      {paletteOpen ? (
        <div
          className="command-palette-backdrop"
          role="presentation"
          onMouseDown={closePalette}
        >
          <section
            ref={paletteDialogRef}
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            onKeyDown={handlePaletteDialogKey}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-palette-heading">
              <div>
                <span className="eyebrow">ACCÈS RAPIDE</span>
                <h2 id="command-palette-title">Ouvrir un espace</h2>
              </div>
              <button type="button" onClick={closePalette} aria-label="Fermer">
                Échap
              </button>
            </div>
            <input
              ref={paletteInputRef}
              type="search"
              value={paletteQuery}
              onChange={(event) => {
                setPaletteQuery(event.target.value)
                setPaletteIndex(0)
              }}
              onKeyDown={handlePaletteKey}
              placeholder="Projet, conversation, Today, document…"
              aria-label="Rechercher un espace"
              aria-controls="command-palette-results"
              aria-activedescendant={
                filteredPaletteItems.length
                  ? `command-palette-option-${paletteIndex}`
                  : undefined
              }
            />
            <div id="command-palette-results" className="command-palette-results" role="listbox">
              {filteredPaletteItems.length ? (
                filteredPaletteItems.map((item, index) => (
                  <button
                    key={item.key}
                    id={`command-palette-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === paletteIndex}
                    className={index === paletteIndex ? 'is-selected' : ''}
                    onMouseEnter={() => setPaletteIndex(index)}
                    onClick={() => choosePaletteItem(index)}
                  >
                    <span>{item.title}</span>
                    <small>{item.keywords.slice(0, 2).join(' · ')}</small>
                  </button>
                ))
              ) : (
                <div className="state-panel state-panel-empty">
                  <strong>Aucun espace trouvé</strong>
                  <span>Essayez un nom de module ou une action plus courte.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </CockpitContentContext.Provider>
  )
}
