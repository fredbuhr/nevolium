import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'

import type { CockpitAmbience } from './lib/cockpitDevice'
import type { CockpitDeviceClass, CockpitProfile } from './CockpitShell'
import { MyceliumField } from './MyceliumField'
import { createMyceliumGeometry } from './lib/myceliumGeometry'

export type MyceliumDestinationKey =
  | 'command'
  | 'news'
  | 'research'
  | 'today'
  | 'projects'
  | 'knowledge'
  | 'model-settings'

type Destination = {
  key: Exclude<MyceliumDestinationKey, 'model-settings'>
  title: string
  description: string
  keywords: string[]
  tone: 'cyan' | 'blue' | 'emerald' | 'violet'
}

type MyceliumHomeProps = {
  ambience: CockpitAmbience
  deviceClass: CockpitDeviceClass
  installAvailable: boolean
  isAdmin: boolean
  online: boolean
  profile: CockpitProfile
  sessionName: string
  onAmbienceChange: (ambience: CockpitAmbience) => void
  onInstall: () => void
  onOpenSpace: (key: MyceliumDestinationKey) => void
  onProfileChange: (profile: CockpitProfile) => void
}

const DESTINATIONS: Destination[] = [
  {
    key: 'command',
    title: 'Assistant',
    description: 'Approfondir une question sans perdre votre direction.',
    keywords: ['conversation', 'commande', 'idée'],
    tone: 'emerald',
  },
  {
    key: 'projects',
    title: 'Projets',
    description: 'Donner une forme concrète à ce que vous construisez.',
    keywords: ['projet', 'tâches', 'avancer'],
    tone: 'blue',
  },
  {
    key: 'research',
    title: 'Recherche',
    description: 'Explorer une piste et conserver ses sources.',
    keywords: ['sources', 'citations', 'explorer'],
    tone: 'emerald',
  },
  {
    key: 'today',
    title: 'Aujourd’hui',
    description: 'Voir ce qui mérite votre attention maintenant.',
    keywords: ['journée', 'priorités', 'tâches'],
    tone: 'violet',
  },
  {
    key: 'knowledge',
    title: 'Documents',
    description: 'Retrouver une note, un document et son contexte.',
    keywords: ['document', 'note', 'connaissance'],
    tone: 'cyan',
  },
  {
    key: 'news',
    title: 'Actualités',
    description: 'Comprendre ce qui se passe à partir de sources conservées.',
    keywords: ['actualité', 'veille', 'briefing'],
    tone: 'blue',
  },
]

const PROFILE_LABELS: Record<CockpitProfile, string> = {
  balanced: 'Équilibré',
  focus: 'Concentration',
  review: 'Revue',
}

const AMBIENCE_LABELS: Record<CockpitAmbience, string> = {
  neural: 'Neurale',
  calm: 'Calme',
  minimal: 'Minimale',
}

function SpaceIcon({ name }: { name: Destination['key'] | 'home' | 'spaces' | 'settings' }) {
  if (name === 'command') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.2 15.4a6.3 6.3 0 1 1 7.6 0c-1 .7-1.5 1.5-1.6 2.4H9.8c-.1-.9-.6-1.7-1.6-2.4Z" />
        <path d="M9.8 21h4.4M9.7 18h4.6" />
      </svg>
    )
  }
  if (name === 'news') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4.5h12.5A1.5 1.5 0 0 1 19 6v13H6.5A1.5 1.5 0 0 1 5 17.5v-13Z" />
        <path d="M8 8h7M8 11h7M8 14h4M19 8h1v9.5a1.5 1.5 0 0 1-1.5 1.5" />
      </svg>
    )
  }
  if (name === 'research') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.7" cy="10.7" r="6.3" />
        <path d="m15.3 15.3 4.4 4.4" />
      </svg>
    )
  }
  if (name === 'today') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="14" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3v3H8z" />
      </svg>
    )
  }
  if (name === 'projects') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 7.5h6l1.8 2H20a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" />
        <path d="M4 7.5V6A1.5 1.5 0 0 1 5.5 4.5h4l2 2H18" />
      </svg>
    )
  }
  if (name === 'knowledge') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h8l4 4v13H6z" />
        <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
      </svg>
    )
  }
  if (name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
      </svg>
    )
  }
  if (name === 'spaces') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" />
    </svg>
  )
}

function MyceliumScene({ onOpenSpace }: Pick<MyceliumHomeProps, 'onOpenSpace'>) {
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const [bounds, setBounds] = useState({ width: 960, height: 690 })
  useEffect(() => {
    const element = sceneRef.current
    if (!element) return
    const update = () => {
      const width = Math.round(element.clientWidth)
      const height = Math.round(element.clientHeight)
      if (width < 200 || height < 200) return
      setBounds(previous => previous.width === width && previous.height === height ? previous : { width, height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const geometry = useMemo(
    () => createMyceliumGeometry(bounds.width, bounds.height),
    [bounds.width, bounds.height],
  )
  const position = (key: string): CSSProperties => {
    const node = geometry.nodes.find(candidate => candidate.key === key)!
    return { left: node.x, top: node.y, width: node.radius * 1.76, height: node.radius * 1.76 }
  }
  return (
    <div ref={sceneRef} className="mycelium-scene" data-geometry-width={bounds.width}>
      <MyceliumField geometry={geometry} />
      <button
        type="button"
        className="mycelium-core-node"
        style={position('core')}
        onClick={() => onOpenSpace('command')}
        aria-label="Ouvrir le cockpit Nevolium"
      >
        <img src="/icons/nevolium.svg" alt="" aria-hidden="true" />
        <span className="core-node-caption">Ouvrir</span>
      </button>
      {DESTINATIONS.map((destination) => (
        <button
          key={destination.key}
          type="button"
          data-space={destination.key}
          className={`mycelium-space-node node-tone-${destination.tone}`}
          style={position(destination.key)}
          onClick={() => onOpenSpace(destination.key)}
          aria-label={`${destination.title} — ${destination.description}`}
        >
          <SpaceIcon name={destination.key} />
          <strong>{destination.title}</strong>
        </button>
      ))}
    </div>
  )
}

export default function MyceliumHome({
  ambience,
  deviceClass,
  installAvailable,
  isAdmin,
  online,
  profile,
  sessionName,
  onAmbienceChange,
  onInstall,
  onOpenSpace,
  onProfileChange,
}: MyceliumHomeProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIndex, setSearchIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchDialogRef = useRef<HTMLElement | null>(null)
  const searchReturnFocusRef = useRef<HTMLElement | null>(null)

  const searchableDestinations = useMemo(
    () => [
      ...DESTINATIONS,
      ...(isAdmin
        ? [{
            key: 'model-settings' as const,
            title: 'Réglages API',
            description: 'Configurer le fournisseur et le modèle de cette instance.',
            keywords: ['fournisseur', 'modèle', 'administrateur'],
            x: '0',
            y: '0',
            size: '0',
            tone: 'violet' as const,
          }]
        : []),
    ],
    [isAdmin],
  )

  const filteredDestinations = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('fr')
    if (!query) return searchableDestinations
    return searchableDestinations.filter((destination) =>
      [destination.title, destination.description, ...destination.keywords]
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(query),
    )
  }, [searchQuery, searchableDestinations])

  const openSearch = () => {
    const active = document.activeElement
    searchReturnFocusRef.current = active instanceof HTMLElement ? active : null
    setSearchOpen(true)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    window.setTimeout(() => searchReturnFocusRef.current?.focus(), 0)
  }

  const openDestination = (index: number) => {
    const destination = filteredDestinations[index]
    if (!destination) return
    closeSearch()
    onOpenSpace(destination.key)
  }

  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      } else if (event.key === 'Escape' && searchOpen) {
        event.preventDefault()
        closeSearch()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    setSearchIndex(0)
    window.setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [searchOpen])

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filteredDestinations.length) {
        setSearchIndex((index) => Math.min(index + 1, filteredDestinations.length - 1))
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSearchIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openDestination(searchIndex)
    }
  }

  const handleDialogKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeSearch()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      searchDialogRef.current?.querySelectorAll<HTMLElement>(
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

  return (
    <section className="mycelium-home" aria-labelledby="mycelium-home-title">
      <header className="home-header">
        <div className="home-brand-lockup">
          <img src="/icons/nevolium.svg" alt="" aria-hidden="true" />
          <div>
            <h1>Nevolium</h1>
            <span>Penser · relier · avancer</span>
          </div>
        </div>
        <button
          className="home-global-search"
          type="button"
          onClick={openSearch}
          aria-label="Rechercher dans Nevolium"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <SpaceIcon name="research" />
          <span>Rechercher dans Nevolium…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="home-session">
          <span className={`connection-state ${online ? 'is-online' : 'is-offline'}`}>
            <i aria-hidden="true" />
            {online ? 'En ligne' : 'Hors connexion'}
          </span>
          <span className="home-session-identity">
            <strong>{sessionName}</strong>
            <small>{isAdmin ? 'administrateur' : 'utilisateur'}</small>
          </span>
          <span className="home-session-avatar" aria-hidden="true">
            {sessionName.trim().charAt(0).toLocaleUpperCase('fr') || 'N'}
          </span>
        </div>
      </header>

      {!online ? (
        <div className="offline-banner home-offline-banner" role="status">
          Vos espaces restent accessibles, mais leurs données et actions nécessitent une connexion.
        </div>
      ) : null}

      <div className="home-layout">
        <nav className="home-rail" aria-label="Navigation principale">
          <button className="is-active" type="button" aria-current="page">
            <SpaceIcon name="home" />
            <span>Accueil</span>
          </button>
          {DESTINATIONS.map((destination) => (
            <button
              key={destination.key}
              type="button"
              onClick={() => onOpenSpace(destination.key)}
            >
              <SpaceIcon name={destination.key} />
              <span>{destination.title}</span>
            </button>
          ))}
          {isAdmin ? (
            <button type="button" onClick={() => onOpenSpace('model-settings')}>
              <SpaceIcon name="settings" />
              <span>Réglages API</span>
            </button>
          ) : null}
          <p>Des idées mieux reliées pour avancer avec plus de clarté.</p>
        </nav>

        <section className="home-stage" aria-label="Espaces reliés de Nevolium">
          <div className="home-introduction">
            <span className="eyebrow">VOTRE ESPACE DE PENSÉE ET D’ACTION</span>
            <h2 id="mycelium-home-title">Où reprendre le fil&nbsp;?</h2>
            <p>
              Commencez par une idée, une source ou un projet. Nevolium garde le contexte pendant
              que vous avancez.
            </p>
            <button type="button" onClick={() => onOpenSpace('command')}>
              <SpaceIcon name="command" />
              Parler à Nevolium
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <MyceliumScene onOpenSpace={onOpenSpace} />

          <div className="home-principle" aria-label="Principe Nevolium">
            <span aria-hidden="true" />
            <p>Votre intelligence, accompagnée. Jamais remplacée.</p>
          </div>
        </section>

        <aside className="home-aside" aria-label="Reprendre votre activité">
          <section className="home-glass-card home-resume-card">
            <div className="home-card-heading">
              <div>
                <span className="eyebrow">À REPRENDRE</span>
                <h2>Gardez le fil</h2>
              </div>
              <span>{deviceClass === 'desktop' ? 'Bureau' : deviceClass === 'tablet' ? 'Tablette' : 'Téléphone'}</span>
            </div>
            <button type="button" onClick={() => onOpenSpace('today')}>
              <SpaceIcon name="today" />
              <span><strong>Aujourd’hui</strong><small>Voir ce qui demande votre attention</small></span>
              <b aria-hidden="true">→</b>
            </button>
            <button type="button" onClick={() => onOpenSpace('projects')}>
              <SpaceIcon name="projects" />
              <span><strong>Projets</strong><small>Reprendre ce que vous construisez</small></span>
              <b aria-hidden="true">→</b>
            </button>
            <button type="button" onClick={() => onOpenSpace('knowledge')}>
              <SpaceIcon name="knowledge" />
              <span><strong>Documents</strong><small>Retrouver une source ou une note</small></span>
              <b aria-hidden="true">→</b>
            </button>
          </section>

          <section className="home-glass-card home-explore-card">
            <div className="home-card-heading">
              <div>
                <span className="eyebrow">EXPLORER</span>
                <h2>Faire apparaître les liens</h2>
              </div>
            </div>
            <button type="button" onClick={() => onOpenSpace('research')}>
              <SpaceIcon name="research" />
              <span><strong>Éclairer une question</strong><small>Explorer et conserver les sources</small></span>
              <b aria-hidden="true">→</b>
            </button>
            <button type="button" onClick={() => onOpenSpace('news')}>
              <SpaceIcon name="news" />
              <span><strong>Comprendre ce qui change</strong><small>Ouvrir votre espace Actualités</small></span>
              <b aria-hidden="true">→</b>
            </button>
            <button type="button" onClick={() => onOpenSpace('command')}>
              <SpaceIcon name="command" />
              <span><strong>Faire évoluer une idée</strong><small>Réfléchir avec l’Assistant</small></span>
              <b aria-hidden="true">→</b>
            </button>
          </section>

          <details className="home-glass-card home-preferences">
            <summary>
              <span>
                <small>VOTRE ENVIRONNEMENT</small>
                <strong>{PROFILE_LABELS[profile]} · {AMBIENCE_LABELS[ambience]}</strong>
              </span>
              <b>Ajuster</b>
            </summary>
            <div className="home-preferences-fields">
              <label>
                Profil
                <select
                  value={profile}
                  onChange={(event) => onProfileChange(event.target.value as CockpitProfile)}
                >
                  <option value="balanced">Équilibré</option>
                  <option value="focus">Concentration</option>
                  <option value="review">Revue</option>
                </select>
              </label>
              <label>
                Ambiance
                <select
                  value={ambience}
                  onChange={(event) => onAmbienceChange(event.target.value as CockpitAmbience)}
                >
                  <option value="neural">Neurale</option>
                  <option value="calm">Calme</option>
                  <option value="minimal">Minimale</option>
                </select>
              </label>
              {installAvailable ? (
                <button type="button" onClick={onInstall}>Installer l’application</button>
              ) : null}
            </div>
          </details>
        </aside>
      </div>

      <nav className="home-dock" aria-label="Accès essentiels">
        <button type="button" onClick={() => onOpenSpace('command')}>
          <SpaceIcon name="command" />
          <span>Assistant</span>
        </button>
        <button type="button" onClick={() => onOpenSpace('research')}>
          <SpaceIcon name="research" />
          <span>Recherche</span>
        </button>
        <span className="home-dock-mark" aria-hidden="true">
          <img src="/icons/nevolium.svg" alt="" />
        </span>
        <button type="button" onClick={() => onOpenSpace('today')}>
          <SpaceIcon name="today" />
          <span>Aujourd’hui</span>
        </button>
        <button type="button" onClick={openSearch}>
          <SpaceIcon name="spaces" />
          <span>Espaces</span>
        </button>
      </nav>

      {searchOpen ? (
        <div className="command-palette-backdrop" role="presentation" onMouseDown={closeSearch}>
          <section
            ref={searchDialogRef}
            className="command-palette home-space-search"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-space-search-title"
            onKeyDown={handleDialogKey}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-palette-heading">
              <div>
                <span className="eyebrow">ACCÈS RAPIDE</span>
                <h2 id="home-space-search-title">Ouvrir un espace</h2>
              </div>
              <button type="button" onClick={closeSearch} aria-label="Fermer">Échap</button>
            </div>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchIndex(0)
              }}
              onKeyDown={handleSearchKey}
              placeholder="Projet, conversation, journée, document…"
              aria-label="Rechercher un espace"
              aria-controls="home-space-search-results"
              aria-activedescendant={
                filteredDestinations.length ? `home-space-option-${searchIndex}` : undefined
              }
            />
            <div id="home-space-search-results" className="command-palette-results" role="listbox">
              {filteredDestinations.length ? (
                filteredDestinations.map((destination, index) => (
                  <button
                    key={destination.key}
                    id={`home-space-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === searchIndex}
                    className={index === searchIndex ? 'is-selected' : ''}
                    onMouseEnter={() => setSearchIndex(index)}
                    onClick={() => openDestination(index)}
                  >
                    <span>{destination.title}</span>
                    <small>{destination.description}</small>
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
    </section>
  )
}
