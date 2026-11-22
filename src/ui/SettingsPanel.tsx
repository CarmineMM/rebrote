import type { CSSProperties, ReactNode, RefObject } from 'react';
import { sfx } from '../game/audio/sfx';
import { LANGUAGES, LANGUAGE_NAMES, formatPercent, type Language } from '../i18n';
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
  /** Lo que va antes de los ajustes del aparato: en Opciones de la portada, el nombre del jugador (T-033). */
  children?: ReactNode;
}

/**
 * Ajustes del jugador (ADR-0006, ADR-0007, T-011, T-013, T-014 y T-015): idioma, volumen de efectos y de musica,
 * pantalla completa, calidad grafica, tours de ayuda y FPS. Los mismos en el menu de inicio ("Opciones") y en el de pausa
 * ("Ajustes"). En Opciones van primero los del jugador (su nombre, T-033), que no son del aparato.
 */
export function SettingsPanel({ titleId, firstButton, title, backLabel, settings, autoLevel, fullscreenSupported, onChange, onBack, footer, children }: SettingsPanelProps) {
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

      {children}

      <section className="settings-section">
        <h3>{t.settings.language}</h3>
        <LanguagePicker value={settings.language} onChange={(language) => onChange({ language })} />
        <p className="settings-note">{t.settings.languageNote}</p>
      </section>

      <section className="settings-section">
        <h3>{t.settings.sound}</h3>
        <VolumeSlider label={t.settings.sfxVolume} help={t.settings.sfxVolumeHelp} value={settings.sfxVolume} onChange={(sfxVolume) => onChange({ sfxVolume })} />
        <VolumeSlider
          label={t.settings.musicVolume}
          help={t.settings.musicVolumeHelp}
          value={settings.musicVolume}
          onChange={(musicVolume) => onChange({ musicVolume })}
          silent
        />
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
        <h3>{t.settings.help}</h3>
        <label className="switch">
          <input type="checkbox" checked={settings.help} onChange={(e) => onChange({ help: e.target.checked })} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            <strong>{t.settings.tours}</strong>
            <small>{t.settings.toursHelp}</small>
          </span>
        </label>
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

interface VolumeSliderProps {
  label: string;
  help: string;
  /** De 0 a 100. */
  value: number;
  onChange: (value: number) => void;
  /** Sin muestra al soltarlo: la musica (T-015) ya suena de fondo y se oye cambiar. */
  silent?: boolean;
}

/**
 * Volumen de 0 a 100 (T-014). Al soltarlo suena una muestra con el volumen nuevo, por el canal de los menus: se oye
 * tambien con el juego en pausa. El de la musica no la lleva: se oye la propia musica.
 */
function VolumeSlider({ label, help, value, onChange, silent = false }: VolumeSliderProps) {
  const shown = formatPercent(value / 100);
  const preview = silent ? undefined : () => sfx.preview('coin');
  return (
    <label className="volume">
      <span className="volume-text">
        <strong>{label}</strong>
        <small>{help}</small>
      </span>
      <span className="volume-row">
        <span className={`volume-icon${value === 0 ? ' is-muted' : ''}`} aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          aria-valuetext={shown}
          style={{ '--fill': `${value}%` } as CSSProperties}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={preview}
          onKeyUp={preview}
        />
        <output className="volume-value">{shown}</output>
      </span>
    </label>
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
