import type { FormEventHandler } from 'react'

export type CommandRouteSummary = {
  capability?: string | null
  routing: 'deterministic' | 'semantic'
  confidence?: number | null
  route_reason: string
}

export type CommandTaskSummary = {
  capability: string
  status: string
  title?: string | null
  answer?: string | null
  artifact?: {
    title: string
    kind: string
  } | null
}

type CommandCenterPanelProps = {
  command: string
  conversationId: string | null
  pendingCommandId: string | null
  routing: boolean
  route: CommandRouteSummary | null
  task: CommandTaskSummary | null
  error: string | null
  onCommandChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onUseExample: (value: string) => void
}

const EXAMPLES = [
  ['Nouvelles de Paris', 'Quelles sont les nouvelles du jour sur la ville de Paris ?'],
  ['Ce matin à Paris', "Que s'est-il passé à Paris ce matin ?"],
  ['Impact bourse', "Quelles sont les nouvelles qui risquent d'impacter la bourse aujourd'hui ?"],
  ['Briefing oral', "Lis-moi les nouvelles qui risquent d'impacter les marchés aujourd'hui."],
] as const

const CAPABILITY_LABELS: Record<string, string> = {
  'news.brief': 'Actualités',
  'research.run': 'Recherche',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'en attente',
  queued: 'en attente',
  running: 'en cours',
  completed: 'terminé',
  failed: 'échec',
}

function capabilityLabel(value?: string | null) {
  if (!value) return 'Demande à préciser'
  return CAPABILITY_LABELS[value] || value
}

function taskStatusLabel(value: string) {
  return TASK_STATUS_LABELS[value] || value
}

export default function CommandCenterPanel({
  command,
  conversationId,
  pendingCommandId,
  routing,
  route,
  task,
  error,
  onCommandChange,
  onSubmit,
  onUseExample,
}: CommandCenterPanelProps) {
  const routeConfidence = route?.confidence == null ? null : Math.round(route.confidence * 100)

  return (
    <section className="command-center" aria-labelledby="command-heading">
      <div>
        <span className="eyebrow">ASSISTANT NEVOLIUM</span>
        <h2 id="command-heading">Dites ce que vous cherchez à comprendre ou à faire.</h2>
      </div>

      <form className="command-form" onSubmit={onSubmit}>
        <input
          value={command}
          onChange={(event) => onCommandChange(event.target.value)}
          minLength={2}
          placeholder="Ex. Que s’est-il passé à Paris ce matin ?"
          aria-label="Demande à Nevolium"
        />
        <button type="submit" disabled={routing || pendingCommandId !== null || !command.trim()}>
          {routing ? 'Préparation…' : pendingCommandId ? 'Compréhension de la demande…' : 'Demander à Nevolium'}
        </button>
      </form>

      <div className="command-examples" aria-label="Exemples de commandes">
        {EXAMPLES.map(([label, value]) => (
          <button key={label} type="button" onClick={() => onUseExample(value)}>
            {label}
          </button>
        ))}
      </div>

      {route && (
        <div className="route-chip">
          <span>{capabilityLabel(route.capability)}</span>
          <small>
            {routeConfidence == null ? '' : `${routeConfidence}% · `}
            {route.routing === 'semantic'
              ? 'choix proposé par l’IA et vérifié par Nevolium'
              : 'choix déterminé par votre demande'}
          </small>
        </div>
      )}

      {conversationId && (
        <small className="conversation-chip">
          Conversation enregistrée · {conversationId.slice(0, 8)}…
        </small>
      )}

      {error && <div className="error-panel">{error}</div>}

      {pendingCommandId && !error && (
        <div className="progress-panel">
          <strong>Nevolium cherche l’espace adapté à votre demande.</strong>
          <span>Le choix proposé par l’IA est vérifié avant de lancer le travail.</span>
        </div>
      )}

      {task && task.capability !== 'news.brief' && !error && (
        <div className="progress-panel">
          <strong>{task.answer || task.title || `${capabilityLabel(task.capability)} · ${taskStatusLabel(task.status)}`}</strong>
          <span>
            {task.answer
              ? `${capabilityLabel(task.capability)} · ${taskStatusLabel(task.status)}`
              : task.artifact
                ? `${task.artifact.title} · ${task.artifact.kind}`
                : `Travail Nevolium · ${taskStatusLabel(task.status)}`}
          </span>
        </div>
      )}
    </section>
  )
}
