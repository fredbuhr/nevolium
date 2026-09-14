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
  x: string
  y: string
  size: string
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
    x: '31%',
    y: '21%',
    size: '124px',
    tone: 'emerald',
  },
  {
    key: 'projects',
    title: 'Projets',
    description: 'Donner une forme concrète à ce que vous construisez.',
    keywords: ['projet', 'tâches', 'avancer'],
    x: '72%',
    y: '22%',
    size: '132px',
    tone: 'blue',
  },
  {
    key: 'research',
    title: 'Recherche',
    description: 'Explorer une piste et conserver ses sources.',
    keywords: ['sources', 'citations', 'explorer'],
    x: '82%',
    y: '50%',
    size: '116px',
    tone: 'emerald',
  },
  {
    key: 'today',
    title: 'Aujourd’hui',
    description: 'Voir ce qui mérite votre attention maintenant.',
    keywords: ['journée', 'priorités', 'tâches'],
    x: '65%',
    y: '76%',
    size: '126px',
    tone: 'violet',
  },
  {
    key: 'knowledge',
    title: 'Documents',
    description: 'Retrouver une note, un document et son contexte.',
    keywords: ['document', 'note', 'connaissance'],
    x: '31%',
    y: '74%',
    size: '126px',
    tone: 'cyan',
  },
  {
    key: 'news',
    title: 'Actualités',
    description: 'Comprendre ce qui se passe à partir de sources conservées.',
    keywords: ['actualité', 'veille', 'briefing'],
    x: '16%',
    y: '48%',
    size: '112px',
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
  return (
    <div className="mycelium-scene">
      <svg className="mycelium-network" viewBox="0 0 1000 760" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="mycelium-core" cx="48%" cy="43%" r="58%">
            <stop offset="0" stopColor="#16465b" stopOpacity=".76" />
            <stop offset=".48" stopColor="#062031" stopOpacity=".58" />
            <stop offset="1" stopColor="#020b13" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mycelium-strand" x1="90" y1="100" x2="920" y2="690" gradientUnits="userSpaceOnUse">
            <stop stopColor="#78f0ad" />
            <stop offset=".42" stopColor="#2de7e0" />
            <stop offset=".72" stopColor="#5fcaff" />
            <stop offset="1" stopColor="#9782ff" />
          </linearGradient>
          <linearGradient id="mycelium-horizon" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#f0a468" stopOpacity=".46" />
            <stop offset=".36" stopColor="#6f70d6" stopOpacity=".18" />
            <stop offset="1" stopColor="#020b13" stopOpacity="0" />
          </linearGradient>
          <filter id="strand-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="520" cy="360" rx="430" ry="330" fill="url(#mycelium-core)" />
        <g className="network-strands network-strands-back" fill="none" stroke="url(#mycelium-strand)" strokeLinecap="round">
          <path d="M70 365C163 196 269 164 486 353s319 183 445-43" />
          <path d="M103 212c194 6 240 169 398 176 171 7 256-211 414-188" />
          <path d="M128 556c118-155 223-191 381-143 184 56 220 188 387 132" />
          <path d="M287 76c-49 178 79 210 194 310 126 109 116 218 58 312" />
          <path d="M715 64c28 159-107 225-205 318-112 107-93 205-56 301" />
          <path d="M176 118c158 84 207 71 331 257 110 164 235 184 370 242" />
          <path d="M96 625c177-64 286-178 399-238 151-80 286-57 424-190" />
          <path d="M56 468c205 17 259-97 439-75 171 20 286 152 455 112" />
          <path d="M234 38c79 120 50 249 247 338 205 92 267-15 442 78" />
          <path d="M875 78c-90 96-77 230-345 303-227 62-269-21-437 65" />
        </g>
        <g className="network-strands network-strands-front" fill="none" stroke="url(#mycelium-strand)" strokeLinecap="round" filter="url(#strand-glow)">
          <path d="M157 348C293 247 347 257 501 383c140 114 262 86 344-31" />
          <path d="M306 165c77 74 79 147 195 214 124 71 203-55 258-161" />
          <path d="M307 565c56-96 104-151 192-176 114-33 177 72 176 183" />
          <path d="M499 380c-80-36-196-22-279 72M501 382c93-93 243-76 334 31" />
          <path d="M498 383c-29-103-103-188-188-225M503 385c75-86 136-150 230-222" />
        </g>

        <g className="network-seeds" fill="#eaffff" filter="url(#node-glow)">
          <circle cx="125" cy="271" r="3" /><circle cx="198" cy="176" r="4" />
          <circle cx="251" cy="536" r="3" /><circle cx="345" cy="88" r="4" />
          <circle cx="409" cy="240" r="3" /><circle cx="535" cy="111" r="3" />
          <circle cx="594" cy="635" r="4" /><circle cx="706" cy="104" r="3" />
          <circle cx="757" cy="623" r="3" /><circle cx="864" cy="263" r="4" />
          <circle cx="912" cy="484" r="3" /><circle cx="101" cy="491" r="3" />
        </g>

        <rect x="0" y="612" width="1000" height="148" fill="url(#mycelium-horizon)" opacity=".5" />
        <path className="horizon-back" d="M0 694 72 647l52 24 75-83 45 46 80-116 66 92 43-31 60 75 76-118 62 91 52-44 62 76 71-115 76 87 67-28 61 68v89H0Z" />
        <path className="horizon-front" d="M0 723 99 673l55 29 82-55 77 70 85-48 67 54 82-77 72 72 74-35 58 38 82-78 93 80 74-22v59H0Z" />
      </svg>

      <button
        type="button"
        className="mycelium-core-node"
        onClick={() => onOpenSpace('command')}
        aria-label="Ouvrir le cockpit Nevolium"
      >
        <span className="core-node-halo" aria-hidden="true" />
        <img src="/icons/nevolium.svg" alt="" aria-hidden="true" />
        <span className="core-node-caption">Ouvrir</span>
      </button>

      {DESTINATIONS.map((destination) => (
        <button
          key={destination.key}
          type="button"
          data-space={destination.key}
          className={`mycelium-space-node node-tone-${destination.tone}`}
          style={{
            '--node-x': destination.x,
            '--node-y': destination.y,
            '--node-size': destination.size,
          } as CSSProperties}
          onClick={() => onOpenSpace(destination.key)}
          aria-label={`${destination.title} — ${destination.description}`}
        >
          <span className="space-node-orbit" aria-hidden="true" />
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
