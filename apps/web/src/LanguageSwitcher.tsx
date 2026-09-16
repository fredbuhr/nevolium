import { LANGUAGE_CONFIG, type AppLanguage, useI18n } from './i18n'

const LANGUAGE_ORDER: AppLanguage[] = ['fr', 'en']

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div
      className="nevolium-language-switcher"
      role="group"
      aria-label={t('language.change')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        border: '1px solid rgba(185, 224, 208, 0.2)',
        borderRadius: 999,
        background: 'rgba(5, 18, 25, 0.78)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <span className="sr-only">{t('language.label')}</span>
      {LANGUAGE_ORDER.map((candidate) => {
        const config = LANGUAGE_CONFIG[candidate]
        const active = candidate === language
        return (
          <button
            key={candidate}
            type="button"
            aria-pressed={active}
            aria-label={config.label}
            title={config.label}
            onClick={() => setLanguage(candidate)}
            style={{
              minWidth: 44,
              minHeight: 44,
              border: active ? '1px solid rgba(202, 255, 223, 0.7)' : '1px solid transparent',
              borderRadius: 999,
              padding: '0 10px',
              background: active ? 'rgba(202, 255, 223, 0.14)' : 'transparent',
              color: active ? '#eafff1' : '#9db4a9',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {config.shortLabel}
          </button>
        )
      })}
    </div>
  )
}
