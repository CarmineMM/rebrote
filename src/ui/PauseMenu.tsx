import { useEffect, useId, useRef, useState } from 'react';
import type { QualityLevel } from '../game/view/quality';
import { SettingsPanel } from './SettingsPanel';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import type { Settings } from './useSettings';
import { useText } from './useText';

interface PauseMenuProps {
  settings: Settings;
  /** Nivel que elegiria el modo automatico ahora mismo. */
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onResume: () => void;
  /** Vuelve al menu de inicio (T-011). La partida se guarda sola al salir. */
  onExit: () => void;
}

/**
 * Menu de pausa (ADR-0007): el juego queda congelado detras y desde aqui se llega a los ajustes o se sale al menu de
 * inicio (T-011), con la partida guardada.
 */
export function PauseMenu({ settings, autoLevel, fullscreenSupported, onChange, onResume, onExit }: PauseMenuProps) {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);
  const t = useText();

  useEffect(() => {
    firstButton.current?.focus();
  }, [view]);

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className={`pause-card ${view === 'settings' ? 'is-wide' : ''}`}>
        {view === 'main' ? (
          <>
            <p className="pause-kicker">{t.world1}</p>
            <h2 id={titleId} className="pause-title">
              {t.pause.title}
            </h2>
            <div className="pause-actions">
              <button ref={firstButton} type="button" className="btn btn-primary" onClick={onResume}>
                <span aria-hidden="true">▶</span> {t.pause.resume}
              </button>
              <button type="button" className="btn" onClick={() => setView('settings')}>
                <span aria-hidden="true">⚙</span> {t.pause.settings}
              </button>
              <button type="button" className="btn" onClick={onExit}>
                <span aria-hidden="true">⌂</span> {t.pause.exit}
              </button>
            </div>
            <p className="pause-note">{t.title.autosave}</p>
            <p className="pause-hint">{t.pause.hint}</p>
          </>
        ) : (
          <SettingsPanel
            titleId={titleId}
            firstButton={firstButton}
            title={t.settings.title}
            backLabel={t.pause.back}
            settings={settings}
            autoLevel={autoLevel}
            fullscreenSupported={fullscreenSupported}
            onChange={onChange}
            onBack={() => setView('main')}
            footer={
              <div className="pause-actions is-row">
                <button type="button" className="btn btn-primary" onClick={onResume}>
                  <span aria-hidden="true">▶</span> {t.pause.resume}
                </button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
