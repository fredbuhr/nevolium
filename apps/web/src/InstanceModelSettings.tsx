import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { nevoliumFetch } from './lib/apiClient'

type Provider = 'openai' | 'anthropic' | 'xai' | 'moonshot'
type ConfigurationStatus = 'testing' | 'verified' | 'active' | 'retired' | 'failed'

type ModelConfiguration = {
  id: string | null
  source: 'environment' | 'managed'
  provider: string
  model_name: string
  model_alias: string
  status: ConfigurationStatus
  connection_state: 'bootstrap' | 'testing' | 'verified' | 'failed'
  test_task_id?: string | null
  test_execution_status?: string | null
  provider_model?: string | null
  failure_code?: string | null
  tested_at?: string | null
  activated_at?: string | null
  test_cost_usd: string | number
  test_cost_reported: boolean
}

type ModelInventory = {
  active: ModelConfiguration
  candidates: ModelConfiguration[]
  active_calls: number
  allowed_providers: Provider[]
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude / Anthropic',
  xai: 'Grok / xAI',
  moonshot: 'Kimi / Moonshot',
}

const MODEL_EXAMPLES: Record<Provider, string> = {
  openai: 'openai/gpt-4.1',
  anthropic: 'anthropic/claude-sonnet-4-6',
  xai: 'xai/grok-4',
  moonshot: 'moonshot/kimi-k2.5',
}

const RETRYABLE_TEST_STATUSES = new Set(['pending_start', 'start_unknown'])

const FAILURE_MESSAGES: Record<string, string> = {
  connection_test_failed: 'Le fournisseur a refusé ou interrompu le test borné.',
  provider_identity_mismatch: 'La réponse ne correspond pas au déploiement LiteLLM sélectionné.',
  workflow_start_failed: 'Le workflow de test n’a pas pu démarrer.',
  litellm_management_unavailable: 'Le registre LiteLLM interne est indisponible.',
  litellm_management_unauthorized: 'Le registre LiteLLM refuse l’identité de Nevolium Core.',
  litellm_model_conflict: 'Cet identifiant de déploiement existe déjà dans LiteLLM.',
  litellm_model_registration_failed: 'LiteLLM n’a pas accepté cette configuration.',
  model_configuration_persistence_failed: 'Nevolium n’a pas pu enregistrer le test de connexion.',
  model_configuration_test_not_retryable: 'Ce test a déjà repris ou s’est terminé.',
}

function readableError(value: unknown) {
  if (value instanceof Error) return value.message
  return 'La configuration API n’a pas pu être mise à jour.'
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null)
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (typeof detail?.message === 'string') return detail.message
  return `Le service Nevolium répond ${response.status}`
}

function ConfigurationBadge({ configuration }: { configuration: ModelConfiguration }) {
  const label = {
    bootstrap: 'Configuration serveur',
    testing: 'Test en cours',
    verified: configuration.status === 'active' ? 'Active et vérifiée' : 'Test réussi',
    failed: 'Test échoué',
  }[configuration.connection_state]
  return <span className={`model-state model-state-${configuration.connection_state}`}>{label}</span>
}

export default function InstanceModelSettings({ apiUrl }: { apiUrl: string }) {
  const [inventory, setInventory] = useState<ModelInventory | null>(null)
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState(MODEL_EXAMPLES.openai)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await nevoliumFetch(`${apiUrl}/v1/admin/model-configurations`)
    if (!response.ok) throw new Error(await responseError(response))
    const value = (await response.json()) as ModelInventory
    setInventory(value)
    return value
  }, [apiUrl])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const poll = async () => {
      let hasRunningTest = false
      try {
        const value = await load()
        hasRunningTest = value.candidates.some(
          (item) =>
            item.status === 'testing' &&
            !RETRYABLE_TEST_STATUSES.has(item.test_execution_status ?? ''),
        )
        if (cancelled) return
        setError(null)
      } catch (loadError) {
        if (!cancelled) setError(readableError(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
      if (!cancelled) {
        timer = window.setTimeout(
          poll,
          hasRunningTest ? 1200 : 8000,
        )
      }
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [load])

  const candidates = useMemo(
    () => inventory?.candidates.filter((item) => item.status !== 'active') ?? [],
    [inventory],
  )

  async function submitTest(event: FormEvent) {
    event.preventDefault()
    if (!apiKey || !model.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await nevoliumFetch(`${apiUrl}/v1/admin/model-configurations/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model: model.trim(), api_key: apiKey }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setApiKey('')
      await load()
    } catch (submitError) {
      setApiKey('')
      setError(readableError(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  async function activate(configuration: ModelConfiguration) {
    if (!configuration.id) return
    setActivatingId(configuration.id)
    setError(null)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/admin/model-configurations/${configuration.id}/activate`,
        { method: 'POST' },
      )
      if (!response.ok) throw new Error(await responseError(response))
      setInventory((await response.json()) as ModelInventory)
    } catch (activationError) {
      setError(readableError(activationError))
    } finally {
      setActivatingId(null)
    }
  }

  async function retryTest(configuration: ModelConfiguration) {
    if (!configuration.id) return
    setRetryingId(configuration.id)
    setError(null)
    try {
      const response = await nevoliumFetch(
        `${apiUrl}/v1/admin/model-configurations/${configuration.id}/retry-test`,
        { method: 'POST' },
      )
      if (!response.ok) throw new Error(await responseError(response))
      await load()
    } catch (retryError) {
      setError(readableError(retryError))
      await load().catch(() => undefined)
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <section className="model-settings workspace-panel" aria-labelledby="model-settings-title">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">INSTANCE · ADMINISTRATEUR</span>
          <h2 id="model-settings-title">Modèle et fournisseur IA</h2>
        </div>
        {inventory ? <span className="run-state">{inventory.active_calls} demande(s) en cours</span> : null}
      </div>

      {loading && !inventory ? (
        <div className="state-panel state-panel-loading" aria-live="polite">
          <strong>Lecture des réglages</strong>
          <span>Nevolium vérifie la configuration active.</span>
        </div>
      ) : null}
      {error ? (
        <div className="state-panel state-panel-error" role="alert">
          <strong>Action impossible</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      ) : null}

      {inventory ? (
        <article className="active-model-card">
          <div>
            <small>Configuration utilisée pour les nouvelles tâches</small>
            <strong>{inventory.active.model_name}</strong>
            <span>{PROVIDER_LABELS[inventory.active.provider as Provider] ?? inventory.active.provider}</span>
          </div>
          <ConfigurationBadge configuration={inventory.active} />
        </article>
      ) : null}

      <form className="model-settings-form" onSubmit={submitTest}>
        <div className="field-row">
          <label>
            Fournisseur
            <select
              value={provider}
              onChange={(event) => {
                const selected = event.target.value as Provider
                setProvider(selected)
                setModel(MODEL_EXAMPLES[selected])
              }}
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Modèle LiteLLM
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={MODEL_EXAMPLES[provider]}
              spellCheck={false}
              required
            />
          </label>
        </div>
        <label>
          Clé API
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <small>
            Envoyée une seule fois au service sécurisé ; elle n’est jamais réaffichée.
          </small>
        </label>
        <button type="submit" disabled={submitting || !apiKey || !model.trim()}>
          {submitting ? 'Démarrage du test…' : 'Tester cette connexion'}
        </button>
        <p className="settings-note">
          Le test effectue un appel réel de 8 tokens maximum, soumis aux budgets et usages canoniques.
          Les identifiants proposés sont des exemples non qualifiés : seule cette réponse réelle
          confirme le modèle choisi. La configuration active ne change qu’après réussite puis
          activation explicite.
        </p>
      </form>

      <div className="candidate-list" aria-label="Configurations testées">
        {candidates.length === 0 ? (
          <div className="state-panel state-panel-empty">
            <strong>Aucune configuration candidate</strong>
            <span>Le fournisseur serveur actuel reste actif.</span>
          </div>
        ) : (
          candidates.map((configuration) => (
            <article key={configuration.id ?? configuration.model_alias} className="candidate-card">
              <div className="candidate-heading">
                <div>
                  <strong>{configuration.model_name}</strong>
                  <small>{PROVIDER_LABELS[configuration.provider as Provider] ?? configuration.provider}</small>
                </div>
                <ConfigurationBadge configuration={configuration} />
              </div>
              {configuration.provider_model ? (
                <p>Réponse attribuée à {configuration.provider_model}.</p>
              ) : null}
              {configuration.failure_code ? (
                <p className="candidate-error">
                  {FAILURE_MESSAGES[configuration.failure_code] ?? 'Le test n’a pas été validé.'}
                </p>
              ) : null}
              {configuration.status === 'testing' &&
              RETRYABLE_TEST_STATUSES.has(configuration.test_execution_status ?? '') ? (
                <p className="candidate-error">
                  Le démarrage du test n’a pas été confirmé. Relancez exactement le même test ; la
                  clé reste protégée et la configuration active est inchangée.
                </p>
              ) : null}
              <div className="candidate-footer">
                <small>
                  Coût du test :{' '}
                  {configuration.test_cost_reported
                    ? `${Number(configuration.test_cost_usd).toFixed(6)} USD`
                    : 'non confirmé par le fournisseur'}
                </small>
                {configuration.status === 'verified' ? (
                  <button
                    type="button"
                    onClick={() => void activate(configuration)}
                    disabled={Boolean(activatingId) || Boolean(inventory?.active_calls)}
                  >
                    {activatingId === configuration.id ? 'Bascule…' : 'Activer'}
                  </button>
                ) : null}
                {configuration.status === 'testing' &&
                RETRYABLE_TEST_STATUSES.has(configuration.test_execution_status ?? '') ? (
                  <button
                    type="button"
                    onClick={() => void retryTest(configuration)}
                    disabled={Boolean(retryingId) || Boolean(activatingId)}
                  >
                    {retryingId === configuration.id ? 'Relance…' : 'Relancer le test'}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
