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
    'planning.heading': 'Organisez les mêmes tâches en liste, Kanban, Gantt ou calendrier.',
    'planning.projectRequired': 'Sélectionnez d’abord un projet dans l’espace Projets.',
    'planning.list': 'Liste',
    'planning.kanban': 'Kanban',
    'planning.gantt': 'Gantt',
    'planning.calendar': 'Calendrier',
    'planning.calendarTimezone': 'Fuseau',
    'planning.calendarPrevious': 'Mois précédent',
    'planning.calendarNext': 'Mois suivant',
    'planning.calendarToday': 'Aujourd’hui',
    'planning.calendarAgenda': 'Agenda',
    'planning.calendarEmptyDay': 'Aucune tâche planifiée ou échéance ce jour.',
    'planning.calendarRecurrenceLoading': 'Chargement des occurrences récurrentes…',
    'planning.calendarRecurrenceError': 'Impossible de charger les occurrences récurrentes.',
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
    'planning.ganttReadonly': 'Glissez ou redimensionnez une barre pour proposer un nouveau créneau ; Nevolium rétablit les dates canoniques puis exige un aperçu validé avant application.',
    'planning.ganttEmpty': 'Aucune tâche ne possède encore un créneau complet à afficher dans le Gantt.',
    'planning.ganttHidden': 'tâche(s) sans créneau complet restent visibles en Liste et Kanban.',
    'planning.critical': 'Critique',
    'planning.criticalPath': 'Chemin critique',
    'planning.criticalTasks': 'tâche(s) critique(s)',
    'planning.criticalDuration': 'Durée minimale du réseau',
    'planning.networkIncomplete': 'Le réseau critique est partiel : certaines dépendances touchent des tâches non planifiées.',
    'planning.editSchedule': 'Modifier le créneau',
    'planning.scheduleEditorEyebrow': 'CRÉNEAU',
    'planning.scheduleStart': 'Début planifié',
    'planning.scheduleEnd': 'Fin planifiée',
    'planning.scheduleDue': 'Échéance',
    'planning.scheduleMilestoneHint': 'Un jalon reste ponctuel : sa fin suit automatiquement son début.',
    'planning.schedulePreview': 'Prévisualiser',
    'planning.schedulePreviewing': 'Vérification…',
    'planning.schedulePreviewRequired': 'Prévisualisez les changements avant de pouvoir les appliquer.',
    'planning.schedulePreviewValid': 'Aperçu valide',
    'planning.schedulePreviewInvalid': 'Conflit de planification',
    'planning.scheduleChangedTasks': 'tâche(s) modifiée(s)',
    'planning.scheduleCheckedDependencies': 'dépendance(s) vérifiée(s)',
    'planning.scheduleNoChange': 'Aucune modification à appliquer.',
    'planning.scheduleSuggestedHeading': 'Effets aval proposés',
    'planning.scheduleSuggestedHint': 'Ces décalages ne sont pas appliqués automatiquement. Incluez-les puis relancez la validation avant application.',
    'planning.scheduleIncludeEffects': 'Inclure les effets et revalider',
    'planning.scheduleRechecking': 'Revalidation…',
    'planning.scheduleApply': 'Appliquer',
    'planning.scheduleApplying': 'Application…',
    'planning.schedulePreviewError': 'Impossible de prévisualiser la replanification.',
    'planning.scheduleApplyError': 'Impossible d’appliquer la replanification.',
    'planning.scheduleDependencySatisfied': 'satisfaite',
    'planning.scheduleDependencyIncomplete': 'incomplète',
    'planning.scheduleDependencyViolated': 'en conflit',
    'planning.cancel': 'Annuler',
    'mindmap.panelTitle': 'Carte mentale',
    'mindmap.eyebrow': 'CARTE 2D',
    'mindmap.heading': 'Explorez projets, tâches et connaissances sans dupliquer leur identité.',
    'mindmap.projectRequired': 'Sélectionnez d’abord un projet dans l’espace Projets.',
    'mindmap.loading': 'Chargement de la carte du projet…',
    'mindmap.loadError': 'Impossible de charger la carte mentale.',
    'mindmap.saveError': 'Impossible d’enregistrer la disposition de la carte.',
    'mindmap.mutationError': 'Impossible d’appliquer cette modification à la carte.',
    'mindmap.saving': 'Enregistrement…',
    'mindmap.saved': 'Disposition enregistrée',
    'mindmap.undo': 'Annuler',
    'mindmap.redo': 'Rétablir',
    'mindmap.export': 'Exporter JSON',
    'mindmap.search': 'Rechercher dans la carte',
    'mindmap.filter': 'Filtrer la carte',
    'mindmap.filterAll': 'Tout',
    'mindmap.filterTasks': 'Tâches',
    'mindmap.filterDocuments': 'Documents',
    'mindmap.filterIdeas': 'Idées',
    'mindmap.filterDecisions': 'Décisions',
    'mindmap.filterNotes': 'Notes',
    'mindmap.filterSources': 'Sources',
    'mindmap.nodes': 'nœuds',
    'mindmap.links': 'liens',
    'mindmap.selected': 'sélectionné(s)',
    'mindmap.truncated': 'La carte atteint une limite de chargement. Affinez le projet ou les filtres avant d’étendre le périmètre.',
    'mindmap.linkEditor': 'Liens',
    'mindmap.linkSource': 'Source',
    'mindmap.linkTarget': 'Cible',
    'mindmap.linkRelation': 'Relation',
    'mindmap.linkCreate': 'Créer le lien',
    'mindmap.linkDelete': 'Supprimer le lien',
    'mindmap.useSelection': 'Utiliser les 2 nœuds sélectionnés',
    'mindmap.swapDirection': 'Inverser source et cible',
    'mindmap.selectedLink': 'Lien sélectionné',
    'mindmap.groups': 'Groupes',
    'mindmap.group': 'Groupe',
    'mindmap.groupName': 'Nom du groupe',
    'mindmap.groupCreate': 'Créer le groupe',
    'mindmap.groupCollapse': 'Replier',
    'mindmap.groupExpand': 'Déplier',
    'mindmap.groupDelete': 'Supprimer le groupe',
    'mindmap.ideaSelected': 'Idée sélectionnée',
    'mindmap.convertIdea': 'Convertir en tâche',
    'mindmap.converting': 'Conversion…',
    'mindmap.kind.project': 'Projet',
    'mindmap.kind.task': 'Tâche',
    'mindmap.kind.source': 'Source',
    'mindmap.kind.note': 'Note',
    'mindmap.kind.idea': 'Idée',
    'mindmap.kind.decision': 'Décision',
    'mindmap.status.active': 'Actif',
    'mindmap.status.todo': 'À faire',
    'mindmap.status.queued': 'Planifié',
    'mindmap.status.running': 'En cours',
    'mindmap.status.completed': 'Terminé',
    'mindmap.status.failed': 'Échec',
    'mindmap.status.pending': 'En attente',
    'mindmap.status.ready': 'Prêt',
    'mindmap.status.hypothesis': 'Hypothèse',
    'mindmap.status.supported': 'Étayer',
    'mindmap.status.contested': 'Contesté',
    'mindmap.status.verified': 'Vérifié',
    'mindmap.relation.related_to': 'Lié à',
    'mindmap.relation.supports': 'Soutient',
    'mindmap.relation.contradicts': 'Contredit',
    'mindmap.relation.depends_on': 'Dépend de',
    'mindmap.relation.references': 'Référence',
    'mindmap.relation.derived_from': 'Dérivé de',
    'mindmap.relation.converted_to': 'Converti en',
  },
  en: {
    'language.label': 'Language',
    'language.change': 'Change Nevolium language',
    'language.french': 'Français',
    'language.english': 'English',
    'planning.panelTitle': 'Planning',
    'planning.eyebrow': 'PLANNING',
    'planning.heading': 'Organise the same tasks as a list, Kanban board, Gantt chart or calendar.',
    'planning.projectRequired': 'Select a project in the Projects space first.',
    'planning.list': 'List',
    'planning.kanban': 'Kanban',
    'planning.gantt': 'Gantt',
    'planning.calendar': 'Calendar',
    'planning.calendarTimezone': 'Timezone',
    'planning.calendarPrevious': 'Previous month',
    'planning.calendarNext': 'Next month',
    'planning.calendarToday': 'Today',
    'planning.calendarAgenda': 'Agenda',
    'planning.calendarEmptyDay': 'No planned task or due date on this day.',
    'planning.calendarRecurrenceLoading': 'Loading recurring occurrences…',
    'planning.calendarRecurrenceError': 'Unable to load recurring occurrences.',
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
    'planning.ganttReadonly': 'Drag or resize a bar to propose a new planning window; Nevolium restores canonical dates and requires a validated preview before applying it.',
    'planning.ganttEmpty': 'No task has a complete planning window to display in the Gantt chart yet.',
    'planning.ganttHidden': 'task(s) without a complete planning window remain visible in List and Kanban.',
    'planning.critical': 'Critical',
    'planning.criticalPath': 'Critical path',
    'planning.criticalTasks': 'critical task(s)',
    'planning.criticalDuration': 'Minimum network duration',
    'planning.networkIncomplete': 'The critical network is partial: some dependencies touch unscheduled tasks.',
    'planning.editSchedule': 'Edit schedule',
    'planning.scheduleEditorEyebrow': 'SCHEDULE',
    'planning.scheduleStart': 'Planned start',
    'planning.scheduleEnd': 'Planned end',
    'planning.scheduleDue': 'Due date',
    'planning.scheduleMilestoneHint': 'A milestone stays punctual: its end automatically follows its start.',
    'planning.schedulePreview': 'Preview',
    'planning.schedulePreviewing': 'Checking…',
    'planning.schedulePreviewRequired': 'Preview the changes before they can be applied.',
    'planning.schedulePreviewValid': 'Valid preview',
    'planning.schedulePreviewInvalid': 'Planning conflict',
    'planning.scheduleChangedTasks': 'changed task(s)',
    'planning.scheduleCheckedDependencies': 'checked dependency(ies)',
    'planning.scheduleNoChange': 'There are no changes to apply.',
    'planning.scheduleSuggestedHeading': 'Suggested downstream effects',
    'planning.scheduleSuggestedHint': 'These shifts are never applied automatically. Include them and run a new validation before applying.',
    'planning.scheduleIncludeEffects': 'Include effects and revalidate',
    'planning.scheduleRechecking': 'Revalidating…',
    'planning.scheduleApply': 'Apply',
    'planning.scheduleApplying': 'Applying…',
    'planning.schedulePreviewError': 'Unable to preview the replanning operation.',
    'planning.scheduleApplyError': 'Unable to apply the replanning operation.',
    'planning.scheduleDependencySatisfied': 'satisfied',
    'planning.scheduleDependencyIncomplete': 'incomplete',
    'planning.scheduleDependencyViolated': 'conflict',
    'planning.cancel': 'Cancel',
    'mindmap.panelTitle': 'Mind map',
    'mindmap.eyebrow': '2D MAP',
    'mindmap.heading': 'Explore projects, tasks and knowledge without duplicating their identity.',
    'mindmap.projectRequired': 'Select a project in the Projects space first.',
    'mindmap.loading': 'Loading the project map…',
    'mindmap.loadError': 'Unable to load the mind map.',
    'mindmap.saveError': 'Unable to save the map layout.',
    'mindmap.mutationError': 'Unable to apply this map change.',
    'mindmap.saving': 'Saving…',
    'mindmap.saved': 'Layout saved',
    'mindmap.undo': 'Undo',
    'mindmap.redo': 'Redo',
    'mindmap.export': 'Export JSON',
    'mindmap.search': 'Search the map',
    'mindmap.filter': 'Filter the map',
    'mindmap.filterAll': 'All',
    'mindmap.filterTasks': 'Tasks',
    'mindmap.filterDocuments': 'Documents',
    'mindmap.filterIdeas': 'Ideas',
    'mindmap.filterDecisions': 'Decisions',
    'mindmap.filterNotes': 'Notes',
    'mindmap.filterSources': 'Sources',
    'mindmap.nodes': 'nodes',
    'mindmap.links': 'links',
    'mindmap.selected': 'selected',
    'mindmap.truncated': 'The map reached a loading limit. Narrow the project or filters before expanding the scope.',
    'mindmap.linkEditor': 'Links',
    'mindmap.linkSource': 'Source',
    'mindmap.linkTarget': 'Target',
    'mindmap.linkRelation': 'Relation',
    'mindmap.linkCreate': 'Create link',
    'mindmap.linkDelete': 'Delete link',
    'mindmap.useSelection': 'Use the 2 selected nodes',
    'mindmap.swapDirection': 'Swap source and target',
    'mindmap.selectedLink': 'Selected link',
    'mindmap.groups': 'Groups',
    'mindmap.group': 'Group',
    'mindmap.groupName': 'Group name',
    'mindmap.groupCreate': 'Create group',
    'mindmap.groupCollapse': 'Collapse',
    'mindmap.groupExpand': 'Expand',
    'mindmap.groupDelete': 'Delete group',
    'mindmap.ideaSelected': 'Selected idea',
    'mindmap.convertIdea': 'Convert to task',
    'mindmap.converting': 'Converting…',
    'mindmap.kind.project': 'Project',
    'mindmap.kind.task': 'Task',
    'mindmap.kind.source': 'Source',
    'mindmap.kind.note': 'Note',
    'mindmap.kind.idea': 'Idea',
    'mindmap.kind.decision': 'Decision',
    'mindmap.status.active': 'Active',
    'mindmap.status.todo': 'To do',
    'mindmap.status.queued': 'Queued',
    'mindmap.status.running': 'In progress',
    'mindmap.status.completed': 'Completed',
    'mindmap.status.failed': 'Failed',
    'mindmap.status.pending': 'Pending',
    'mindmap.status.ready': 'Ready',
    'mindmap.status.hypothesis': 'Hypothesis',
    'mindmap.status.supported': 'Supported',
    'mindmap.status.contested': 'Contested',
    'mindmap.status.verified': 'Verified',
    'mindmap.relation.related_to': 'Related to',
    'mindmap.relation.supports': 'Supports',
    'mindmap.relation.contradicts': 'Contradicts',
    'mindmap.relation.depends_on': 'Depends on',
    'mindmap.relation.references': 'References',
    'mindmap.relation.derived_from': 'Derived from',
    'mindmap.relation.converted_to': 'Converted to',
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
