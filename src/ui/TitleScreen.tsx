import { useEffect, useId, useRef, useState } from 'react';
import { FIRST_OUTBREAK } from '../game/core/outbreaks';
import { hasProgress, type Progress } from '../game/progress';
import { summarizeSave, type SaveSummary, type SavedGame } from '../game/save';
import type { QualityLevel } from '../game/view/quality';
import { formatList, formatSavedAt, type Dictionary } from '../i18n';
import { Credits } from './Credits';
import { defeatedBossName, outbreakTitle } from './outbreakName';
import { LanguagePicker, SettingsPanel } from './SettingsPanel';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import type { Settings } from './useSettings';
import { useLanguage, useText } from './useText';

interface TitleScreenProps {
  /** Partida guardada, o null si no hay (T-011): "Cargar partida" queda desactivado. */
  saved: SavedGame | null;
  /** Progreso permanente (T-017): lo que "Borrar progreso" dice que se pierde. */
  progress: Progress;
  settings: Settings;
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onNewGame: () => void;
  onLoadGame: () => void;
  /** Borra el progreso y la partida guardada; los ajustes y los tours vistos se quedan (T-017). */
  onEraseProgress: () => void;
}

type View = 'main' | 'options' | 'credits' | 'confirm' | 'erase';

/** Lo que se perderia al borrar el progreso, una linea por cosa: jefes vencidos y partida guardada. */
function progressLines(progress: Progress, summary: SaveSummary | null, t: Dictionary): string[] {
  const lines: string[] = [];
  if (hasProgress(progress)) lines.push(t.progress.bosses(formatList(progress.defeated.map((id) => defeatedBossName(t, id)))));
  if (summary) lines.push(t.progress.save(summary.round));
  return lines;
}

/** Brote que sale de la "O" del titulo: tallo y dos hojas con el contorno oscuro de las plantas del juego. */
function Sprout() {
  return (
    <svg className="title-sprout" viewBox="0 0 48 40">
      <path className="title-sprout-stem" d="M24 40 C24 33 23 27 24 19" />
      <path className="title-sprout-leaf is-left" d="M24 23 C14 25 5 19 3 8 C14 6 22 12 24 23 Z" />
      <path className="title-sprout-leaf is-right" d="M24 19 C29 9 38 3 46 5 C45 15 35 22 24 19 Z" />
    </svg>
  );
}

/** El nombre del juego no se traduce (I-08). Cada letra salta por su cuenta; de la "O" sale un brote. */
const NAME = 'REBROTE';
const SPROUT_LETTER = 4;

/**
 * Menu de inicio (T-011): el titulo arriba a la izquierda, con la portada animada debajo (la pinta Phaser, `TitleScene`),
 * y el menu a la derecha: nueva partida, cargar la guardada, opciones, jefes (desactivado, I-10) y creditos. Las
 * opciones, los creditos y las confirmaciones (partida nueva y borrar el progreso, T-017) salen en el mismo panel. Esc
 * vuelve atras: al menu, o a las opciones desde la confirmacion de borrar.
 */
export function TitleScreen({ saved, progress, settings, autoLevel, fullscreenSupported, onChange, onNewGame, onLoadGame, onEraseProgress }: TitleScreenProps) {
  const t = useText();
  const language = useLanguage();
  const [view, setView] = useState<View>('main');
  /** Se acaba de borrar el progreso: las opciones lo confirman hasta que se sale de ellas. */
  const [erased, setErased] = useState(false);
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);
  const eraseSection = useRef<HTMLElement>(null);
  const eraseButton = useRef<HTMLButtonElement>(null);
  const lastView = useRef<View>(view);
  const summary = saved ? summarizeSave(saved) : null;
  const lost = progressLines(progress, summary, t);

  useEffect(() => {
    const from = lastView.current;
    lastView.current = view;
    if (view === 'main') setErased(false);
    // De la confirmacion de borrar se vuelve a la seccion de progreso, abajo del todo de las opciones: con el foco en su
    // boton o, si ya no hay nada que borrar, en volver, y con el aviso de lo borrado a la vista.
    if (view === 'options' && from === 'erase') {
      const button = eraseButton.current;
      if (button && !button.disabled) button.focus({ preventScroll: true });
      else firstButton.current?.focus({ preventScroll: true });
      eraseSection.current?.scrollIntoView({ block: 'nearest' });
      return;
    }
    firstButton.current?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && view !== 'main') setView(view === 'erase' ? 'options' : 'main');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  const startNew = () => (summary ? setView('confirm') : onNewGame());

  const erase = () => {
    onEraseProgress();
    setErased(true);
    setView('options');
  };

  return (
    <div className="title-screen">
      <header className="title-brand">
        <h1 className="title-logo" aria-label="Rebrote">
          {[...NAME].map((letter, i) => (
            <span key={i} className="title-letter" style={{ animationDelay: `${0.08 * i}s, ${0.9 + 0.15 * i}s` }} aria-hidden="true">
              {letter}
              {i === SPROUT_LETTER && <Sprout />}
            </span>
          ))}
        </h1>
        <p className="title-tagline">{t.title.tagline}</p>
      </header>

      <nav className="title-panel pause-card" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
        {view === 'main' && (
          <>
            <h2 id={titleId} className="visually-hidden">
              {t.title.menu}
            </h2>
            {/* "Nueva partida" empieza el primer brote (T-018); elegir otro llega con la ruta de brotes (T-019). */}
            <p className="pause-kicker">{outbreakTitle(t, FIRST_OUTBREAK)}</p>
            <div className="pause-actions title-actions">
              <button ref={firstButton} type="button" className="btn btn-primary" onClick={startNew}>
                <span aria-hidden="true">▶</span> {t.title.newGame}
              </button>
              <button type="button" className="btn has-detail" onClick={onLoadGame} disabled={!summary}>
                <span className="btn-line">
                  <span aria-hidden="true">⟳</span> {t.title.loadGame}
                </span>
                <small className="btn-detail">
                  {summary ? t.title.saveSummary(summary.round, summary.total, summary.lives, summary.balance) : t.title.noSave}
                </small>
                {summary && <small className="btn-detail is-soft">{t.title.savedAt(formatSavedAt(summary.savedAt, Date.now(), language))}</small>}
              </button>
              <button type="button" className="btn" onClick={() => setView('options')}>
                <span aria-hidden="true">⚙</span> {t.title.options}
              </button>
              <button type="button" className="btn is-locked" aria-disabled="true" title={t.title.comingSoon} onClick={(e) => e.preventDefault()}>
                <span className="lock-icon" aria-hidden="true" /> {t.title.bosses}
                <span className="btn-badge">{t.title.comingSoon}</span>
              </button>
              <button type="button" className="btn" onClick={() => setView('credits')}>
                <span aria-hidden="true">★</span> {t.title.credits}
              </button>
            </div>
            <footer className="title-footer">
              <LanguagePicker compact value={settings.language} onChange={(next) => onChange({ language: next })} />
              <span className="title-version">{t.title.version(__APP_VERSION__)}</span>
            </footer>
          </>
        )}

        {view === 'options' && (
          <SettingsPanel
            titleId={titleId}
            firstButton={firstButton}
            title={t.title.options}
            backLabel={t.common.back}
            settings={settings}
            autoLevel={autoLevel}
            fullscreenSupported={fullscreenSupported}
            onChange={onChange}
            onBack={() => setView('main')}
            footer={
              <section ref={eraseSection} className="settings-section">
                <h3>{t.progress.section}</h3>
                <button ref={eraseButton} type="button" className="btn btn-erase has-detail" onClick={() => setView('erase')} disabled={lost.length === 0}>
                  <span className="btn-line">
                    <span className="trash-icon" aria-hidden="true" /> {t.progress.erase}
                  </span>
                  {lost.length > 0 ? (
                    lost.map((line) => (
                      <small key={line} className="btn-detail">
                        {line}
                      </small>
                    ))
                  ) : (
                    <small className="btn-detail">{t.progress.nothing}</small>
                  )}
                </button>
                {erased && (
                  <p className="settings-note is-done" role="status">
                    {t.progress.erased}
                  </p>
                )}
              </section>
            }
          />
        )}

        {view === 'credits' && <Credits titleId={titleId} firstButton={firstButton} onBack={() => setView('main')} />}

        {view === 'confirm' && summary && (
          <div className="title-confirm" role="alertdialog" aria-labelledby={titleId}>
            <h2 id={titleId} className="pause-title is-small">
              {t.title.confirmTitle}
            </h2>
            <p className="title-confirm-text">{t.title.confirmText(summary.round)}</p>
            <p className="title-confirm-note">{t.title.confirmKeeps}</p>
            <div className="pause-actions">
              <button ref={firstButton} type="button" className="btn" onClick={() => setView('main')}>
                {t.title.confirmNo}
              </button>
              <button type="button" className="btn btn-danger" onClick={onNewGame}>
                {t.title.confirmYes}
              </button>
            </div>
          </div>
        )}

        {view === 'erase' && (
          <div className="title-confirm" role="alertdialog" aria-labelledby={titleId}>
            <h2 id={titleId} className="pause-title is-small">
              {t.progress.confirmTitle}
            </h2>
            <p className="title-confirm-text">{t.progress.confirmLost}</p>
            <ul className="title-confirm-list">
              {lost.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="title-confirm-note">{t.progress.confirmKept}</p>
            <div className="pause-actions">
              <button ref={firstButton} type="button" className="btn" onClick={() => setView('options')}>
                {t.progress.confirmNo}
              </button>
              <button type="button" className="btn btn-danger" onClick={erase}>
                {t.progress.confirmYes}
              </button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
