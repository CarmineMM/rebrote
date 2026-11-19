import { useEffect, useId, useRef, useState } from 'react';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel, type QualitySetting } from '../game/view/quality';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import type { Settings } from './useSettings';

interface PauseMenuProps {
  settings: Settings;
  /** Nivel que elegiria el modo automatico ahora mismo. */
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onResume: () => void;
}

/** Menu de pausa (ADR-0007): el juego queda congelado detras y desde aqui se llega a los ajustes. */
export function PauseMenu({ settings, autoLevel, fullscreenSupported, onChange, onResume }: PauseMenuProps) {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
  }, [view]);

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className={`pause-card ${view === 'settings' ? 'is-wide' : ''}`}>
        {view === 'main' ? (
          <>
            <p className="pause-kicker">Mundo 1: Gusanos</p>
            <h2 id={titleId} className="pause-title">
              Pausa
            </h2>
            <div className="pause-actions">
              <button ref={firstButton} type="button" className="btn btn-primary" onClick={onResume}>
                <span aria-hidden="true">▶</span> Continuar
              </button>
              <button type="button" className="btn" onClick={() => setView('settings')}>
                <span aria-hidden="true">⚙</span> Ajustes
              </button>
            </div>
            <p className="pause-hint">Esc o P pausa · Esc o clic derecho suelta la carta elegida</p>
          </>
        ) : (
          <SettingsView
            titleId={titleId}
            firstButton={firstButton}
            settings={settings}
            autoLevel={autoLevel}
            fullscreenSupported={fullscreenSupported}
            onChange={onChange}
            onBack={() => setView('main')}
            onResume={onResume}
          />
        )}
      </div>
    </div>
  );
}

interface SettingsViewProps {
  titleId: string;
  firstButton: React.RefObject<HTMLButtonElement | null>;
  settings: Settings;
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onBack: () => void;
  onResume: () => void;
}

function SettingsView({ titleId, firstButton, settings, autoLevel, fullscreenSupported, onChange, onBack, onResume }: SettingsViewProps) {
  const options: Array<{ value: QualitySetting; label: string; description: string }> = [
    {
      value: 'auto',
      label: `Automático (${QUALITY_PROFILES[autoLevel].label})`,
      description: 'Elige según tu equipo y baja un nivel si el juego va lento.',
    },
    ...QUALITY_LEVELS.map((value) => ({ value, ...QUALITY_PROFILES[value] })),
  ];

  return (
    <>
      <div className="settings-header">
        <button ref={firstButton} type="button" className="btn btn-ghost" onClick={onBack} aria-label="Volver al menú de pausa">
          <span aria-hidden="true">←</span>
        </button>
        <h2 id={titleId} className="pause-title is-small">
          Ajustes
        </h2>
      </div>

      <section className="settings-section">
        <h3>Pantalla</h3>
        <label className={`switch ${fullscreenSupported ? '' : 'is-disabled'}`}>
          <input
            type="checkbox"
            checked={settings.fullscreen && fullscreenSupported}
            disabled={!fullscreenSupported}
            onChange={(e) => onChange({ fullscreen: e.target.checked })}
          />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            <strong>Pantalla completa</strong>
            <small>{fullscreenSupported ? 'Oculta las barras del navegador.' : 'Este navegador no la permite.'}</small>
          </span>
        </label>
      </section>

      <section className="settings-section">
        <h3>Calidad gráfica</h3>
        <fieldset className="quality-list">
          <legend className="visually-hidden">Calidad gráfica</legend>
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
        <p className="settings-note">Al cambiar la calidad se recarga el escenario. Tu partida se conserva.</p>
      </section>

      <section className="settings-section">
        <h3>Rendimiento</h3>
        <label className="switch">
          <input type="checkbox" checked={settings.showFps} onChange={(e) => onChange({ showFps: e.target.checked })} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            <strong>Mostrar FPS</strong>
            <small>Fotogramas por segundo en una esquina.</small>
          </span>
        </label>
      </section>

      <div className="pause-actions is-row">
        <button type="button" className="btn btn-primary" onClick={onResume}>
          <span aria-hidden="true">▶</span> Continuar
        </button>
      </div>
    </>
  );
}
