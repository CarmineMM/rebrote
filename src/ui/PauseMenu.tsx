import { useEffect, useId, useRef, useState } from 'react';
import { SEEDS } from '../game/config/balance';
import type { OutbreakId } from '../game/core/outbreaks';
import type { QualityLevel } from '../game/view/quality';
import { formatAmount, formatPercent } from '../i18n';
import { outbreakTitle } from './outbreakName';
import { SettingsPanel } from './SettingsPanel';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import type { Settings } from './useSettings';
import { useLanguage, useText } from './useText';

interface PauseMenuProps {
  /** Brote de la partida (T-018), para su nombre arriba de la tarjeta. */
  outbreak: OutbreakId;
  /** Semillas que llevan las rondas superadas, sin cobrar (T-020). */
  seeds: number;
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
 * inicio (T-011), con la partida guardada. Dice las semillas que lleva la partida y que se cobran al acabar (T-020).
 */
export function PauseMenu({ outbreak, seeds, settings, autoLevel, fullscreenSupported, onChange, onResume, onExit }: PauseMenuProps) {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);
  const t = useText();
  const language = useLanguage();

  useEffect(() => {
    firstButton.current?.focus();
  }, [view]);

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <div className={`pause-card ${view === 'settings' ? 'is-wide' : ''}`}>
        {view === 'main' ? (
          <>
            <p className="pause-kicker">{outbreakTitle(t, outbreak)}</p>
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
            {seeds > 0 && (
              <p className="pause-note is-seeds">{t.seeds.pending(formatAmount(seeds, language), formatPercent(SEEDS.defeatPercent / 100, language))}</p>
            )}
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
