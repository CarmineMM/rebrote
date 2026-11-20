import type { ReactNode, RefObject } from 'react';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '../i18n';
import { QUALITY_LEVELS, type QualityLevel, type QualitySetting } from '../game/view/quality';
import type { Settings } from './useSettings';
import { useText } from './useText';

interface SettingsPanelProps {
  titleId: string;
  /** Recibe el foco al abrir: el boton de volver. */
  firstButton: RefObject<HTMLButtonElement | null>;
  /** "Ajustes" en la pausa, "Opciones" en el menu de inicio (T-011). */
  title: string;
  /** Lo que dice el boton de volver a los lectores de pantalla. */
  backLabel: string;
  settings: Settings;
  /** Nivel que elegiria el modo automatico ahora mismo. */
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onBack: () => void;
  /** Botones de abajo (en la pausa, "Continuar"). */
  footer?: ReactNode;
}

/**
 * Ajustes del jugador (ADR-0006, ADR-0007 y T-011): idioma, pantalla completa, calidad grafica y FPS. Los mismos en el menu
 * de inicio ("Opciones") y en el de pausa ("Ajustes").
 */
export function SettingsPanel({ titleId, firstButton, title, backLabel, settings, autoLevel, fullscreenSupported, onChange, onBack, footer }: SettingsPanelProps) {
  const t = useText();
  const levels = t.settings.levels;
  const options: Array<{ value: QualitySetting; label: string; description: string }> = [
    { value: 'auto', label: t.settings.auto(levels[autoLevel].label), description: t.settings.autoHelp },
    ...QUALITY_LEVELS.map((value) => ({ value, ...levels[value] })),
  ];

  return (
    <>
      <div className="settings-header">
        <button ref={firstButton} type="button" className="btn btn-ghost" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <span aria-hidden="true">←</span>
        </button>
        <h2 id={titleId} className="pause-title is-small">
          {title}
        </h2>
      </div>

      <section className="settings-section">
        <h3>{t.settings.language}</h3>
        <LanguagePicker value={settings.language} onChange={(language) => onChange({ language })} />
        <p className="settings-note">{t.settings.languageNote}</p>
      </section>

      <section className="settings-section">
        <h3>{t.settings.screen}</h3>
        <label className={`switch ${fullscreenSupported ? '' : 'is-disabled'}`}>
          <input
            type="checkbox"
            checked={settings.fullscreen && fullscreenSupported}
            disabled={!fullscreenSupported}
            onChange={(e) => onChange({ fullscreen: e.target.checked })}
          />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            <strong>{t.settings.fullscreen}</strong>
            <small>{fullscreenSupported ? t.settings.fullscreenHelp : t.settings.fullscreenUnsupported}</small>
          </span>
        </label>
      </section>

      <section className="settings-section">
        <h3>{t.settings.quality}</h3>
        <fieldset className="quality-list">
          <legend className="visually-hidden">{t.settings.quality}</legend>
          {options.map((option) => (
            <label key={option.value} className={`quality-option ${settings.quality === option.value ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="quality"
                value={option.value}
                checked={settings.quality === option.value}
                onChange={() => onChange({ quality: option.value })}
              />
              <span className="quality-text">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="settings-note">{t.settings.qualityNote}</p>
      </section>

      <section className="settings-section">
        <h3>{t.settings.performance}</h3>
        <label className="switch">
          <input type="checkbox" checked={settings.showFps} onChange={(e) => onChange({ showFps: e.target.checked })} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            <strong>{t.settings.showFps}</strong>
            <small>{t.settings.showFpsHelp}</small>
          </span>
        </label>
      </section>

      {footer}
    </>
  );
}

interface LanguagePickerProps {
  value: Language;
  onChange: (language: Language) => void;
  /** Version pequena para el pie del menu de inicio: "ES | EN". */
  compact?: boolean;
}

/**
 * Selector de idioma (T-011). Cada idioma se escribe en su propio idioma ("Español", "English") para que se encuentre
 * aunque no se entienda el de la interfaz. En el pie del menu de inicio va en corto ("ES", "EN").
 */
export function LanguagePicker({ value, onChange, compact = false }: LanguagePickerProps) {
  const t = useText();
  return (
    <div className={`language-picker${compact ? ' is-compact' : ''}`} role="radiogroup" aria-label={t.settings.language}>
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          role="radio"
          lang={language}
          aria-checked={value === language}
          className={`language-option${value === language ? ' is-active' : ''}`}
          title={LANGUAGE_NAMES[language]}
          onClick={() => value !== language && onChange(language)}
        >
          {compact ? language.toUpperCase() : LANGUAGE_NAMES[language]}
        </button>
      ))}
    </div>
  );
}
