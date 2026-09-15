import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AppLanguage = 'fr' | 'en'

type LanguageConfig = {
  language: AppLanguage
  locale: string
  newsLanguage: string
  label: string
  shortLabel: string
}

const LANGUAGE_STORAGE_KEY = 'nevolium.language.v1'

export const LANGUAGE_CONFIG: Record<AppLanguage, LanguageConfig> = {
  fr: {
    language: 'fr',
    locale: 'fr-FR',
    newsLanguage: 'fr',
    label: 'Français',
    shortLabel: 'FR',
  },
  en: {
    language: 'en',
    locale: 'en-GB',
    newsLanguage: 'en',
    label: 'English',
    shortLabel: 'EN',
  },
}

const messages = {
  fr: {
    'language.label': 'Langue',
    'language.change': 'Changer la langue de Nevolium',
    'language.french': 'Français',
    'language.english': 'English',
    'planning.panelTitle': 'Planification',
    'planning.eyebrow': 'PLANIFICATION',
    'planning.heading': 'Organisez les mêmes tâches en liste ou en Kanban.',
    'planning.projectRequired': 'Sélectionnez d’abord un projet dans l’espace Projets.',
    'planning.list': 'Liste',
    'planning.kanban': 'Kanban',
    'planning.taskCount': 'tâche(s) affichée(s)',
    'planning.loadMore': 'Charger la suite',
    'planning.loading': 'Chargement du plan du projet…',
    'planning.empty': 'Aucune tâche dans ce projet.',
    'planning.column.todo': 'À faire',
    'planning.column.execution': 'En cours',
    'planning.column.done': 'Terminé',
    'planning.executionLocked': 'Pilotée par Nevolium',
    'planning.failed': 'Échec',
    'planning.milestone': 'Jalon',
    'planning.task': 'Tâche',
    'planning.priority': 'Priorité',
    'planning.progress': 'Progression',
    'planning.due': 'Échéance',
    'planning.planned': 'Planifié',
    'planning.noDate': 'Sans date',
    'planning.recurring': 'Récurrente',
    'planning.parent': 'Sous-tâche',
    'planning.dragHint': 'Glissez une tâche entre À faire et Terminé.',
    'planning.errorUpdate': 'Impossible de mettre à jour la tâche.',
  },
  en: {
    'language.label': 'Language',
    'language.change': 'Change Nevolium language',
    'language.french': 'Français',
    'language.english': 'English',
    'planning.panelTitle': 'Planning',
    'planning.eyebrow': 'PLANNING',
    'planning.heading': 'Organise the same tasks as a list or Kanban board.',
    'planning.projectRequired': 'Select a project in the Projects space first.',
    'planning.list': 'List',
    'planning.kanban': 'Kanban',
    'planning.taskCount': 'task(s) shown',
    'planning.loadMore': 'Load more',
    'planning.loading': 'Loading the project plan…',
    'planning.empty': 'There are no tasks in this project.',
    'planning.column.todo': 'To do',
    'planning.column.execution': 'In progress',
    'planning.column.done': 'Done',
    'planning.executionLocked': 'Managed by Nevolium',
    'planning.failed': 'Failed',
    'planning.milestone': 'Milestone',
    'planning.task': 'Task',
    'planning.priority': 'Priority',
    'planning.progress': 'Progress',
    'planning.due': 'Due',
    'planning.planned': 'Planned',
    'planning.noDate': 'No date',
    'planning.recurring': 'Recurring',
    'planning.parent': 'Subtask',
    'planning.dragHint': 'Drag a task between To do and Done.',
    'planning.errorUpdate': 'Unable to update the task.',
  },
} as const

export type TranslationKey = keyof (typeof messages)['fr']

type LocaleContextValue = {
  language: AppLanguage
  locale: string
  newsLanguage: string
  setLanguage: (language: AppLanguage) => void
  t: (key: TranslationKey) => string
  lower: (value: string) => string
  formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'fr' || value === 'en'
}

function browserLanguage(): AppLanguage {
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const candidate of candidates) {
    const base = candidate?.toLowerCase().split('-')[0]
    if (isSupportedLanguage(base)) return base
  }
  return 'fr'
}

export function getInitialLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isSupportedLanguage(saved)) return saved
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. Browser language remains safe.
  }
  return browserLanguage()
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getInitialLanguage())
  const config = LANGUAGE_CONFIG[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dataset.language = language
  }, [language])

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      // The preference remains valid for the current tab even when persistent storage is blocked.
    }
  }

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    locale: config.locale,
    newsLanguage: config.newsLanguage,
    setLanguage,
    t: (key) => messages[language][key],
    lower: (text) => text.toLocaleLowerCase(config.locale),
    formatDateTime: (input, options) => new Intl.DateTimeFormat(config.locale, options).format(
      typeof input === 'string' ? new Date(input) : input,
    ),
  }), [config.locale, config.newsLanguage, language])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useI18n must be used inside LocaleProvider')
  return value
}
