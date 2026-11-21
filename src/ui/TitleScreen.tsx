import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FIRST_OUTBREAK } from '../game/core/outbreaks';
import { isGreenhouseOpen } from '../game/core/route';
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

interface TitleMenuProps {
  /** Partida guardada, o null si no hay (T-011): sin Invernadero, "Continuar" queda desactivado. */
  saved: SavedGame | null;
  /**
   * Progreso permanente (T-017): lo que "Borrar progreso" dice que se pierde y si el Invernadero esta abierto (T-019,
   * R-01: al vencer a Creeper).
   */
  progress: Progress;
  settings: Settings;
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onNewGame: () => void;
  /** Sin Invernadero, reanuda la partida guardada; con el, lleva a el (T-019, R-02). */
  onContinue: () => void;
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
/** Letras para las que esta pensado el tamano del titulo: una palabra mas larga encoge para no meterse bajo el panel. */
const FIT_LETTERS = 8.5;

/**
 * Menu de inicio (T-011): el titulo arriba a la izquierda, con la portada animada debajo (la pinta Phaser, `TitleScene`),
 * y a la derecha el panel que toque: el menu de la portada (`TitleMenu`) o el Invernadero (`Greenhouse`, T-019). En el
 * Invernadero el titulo dice "INVERNADERO" en vez de "REBROTE": sus letras vuelven a caer al cambiar, y encoge si la
 * palabra es larga. El brote sale de su primera "O".
 */
export function TitleScreen({ greenhouse = false, children }: { greenhouse?: boolean; children: ReactNode }) {
  const t = useText();
  const word = greenhouse ? t.greenhouse.logo : NAME;
  const sprout = word.indexOf('O');
  const fit = Math.min(1, FIT_LETTERS / word.length);
  return (
    <div className="title-screen">
      <header className="title-brand">
        <h1 key={word} className="title-logo" aria-label={greenhouse ? t.greenhouse.title : 'Rebrote'} style={{ '--logo-fit': fit } as CSSProperties}>
          {[...word].map((letter, i) => (
            <span key={i} className="title-letter" style={{ animationDelay: `${0.06 * i}s, ${0.9 + 0.15 * i}s` }} aria-hidden="true">
              {letter}
              {i === sprout && <Sprout />}
            </span>
          ))}
        </h1>
        <p className="title-tagline">{t.title.tagline}</p>
      </header>
      {children}
    </div>
  );
}

/**
 * Menu de la portada (T-011; T-019). Sin el Invernadero (un jugador que aun no vencio a Creeper, R-01): nueva partida,
 * que empieza el primer brote, y "Continuar", que reanuda la guardada. Con el Invernadero abierto, "Continuar" lleva a
 * el y la portada no repite lo que hay alli (R-02): ni nueva partida ni la lista de jefes, que es la ruta de brotes.
 * Despues, opciones y creditos. Las opciones, los creditos y las confirmaciones (partida nueva y borrar el progreso,
 * T-017) salen en el mismo panel. Esc vuelve atras: al menu, o a las opciones desde la confirmacion de borrar.
 */
export function TitleMenu({ saved, progress, settings, autoLevel, fullscreenSupported, onChange, onNewGame, onContinue, onEraseProgress }: TitleMenuProps) {
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
  const greenhouse = isGreenhouseOpen(progress.defeated);

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
    <nav className="title-panel pause-card" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      {view === 'main' && (
        <>
          <h2 id={titleId} className="visually-hidden">
            {t.title.menu}
          </h2>
          {greenhouse ? (
            <div className="pause-actions title-actions">
              <button ref={firstButton} type="button" className="btn btn-primary has-detail" onClick={onContinue}>
                <span className="btn-line">
                  <span aria-hidden="true">▶</span> {t.title.continue}
                </span>
                <small className="btn-detail">{t.title.toGreenhouse}</small>
                {summary && <small className="btn-detail is-soft">{t.title.waiting(outbreakTitle(t, summary.outbreak), summary.round)}</small>}
              </button>
              <MenuTail t={t} onOptions={() => setView('options')} onCredits={() => setView('credits')} />
            </div>
          ) : (
            <>
              {/* "Nueva partida" empieza el primer brote (T-018); los demas se eligen en la ruta del Invernadero (T-019). */}
              <p className="pause-kicker">{outbreakTitle(t, FIRST_OUTBREAK)}</p>
              <div className="pause-actions title-actions">
                <button ref={firstButton} type="button" className="btn btn-primary" onClick={startNew}>
                  <span aria-hidden="true">▶</span> {t.title.newGame}
                </button>
                <button type="button" className="btn has-detail" onClick={onContinue} disabled={!summary}>
                  <span className="btn-line">
                    <span aria-hidden="true">⟳</span> {t.title.continue}
                  </span>
                  <small className="btn-detail">
                    {summary ? t.title.saveSummary(summary.round, summary.total, summary.lives, summary.balance) : t.title.noSave}
                  </small>
                  {summary && <small className="btn-detail is-soft">{t.title.savedAt(formatSavedAt(summary.savedAt, Date.now(), language))}</small>}
                </button>
                <MenuTail t={t} onOptions={() => setView('options')} onCredits={() => setView('credits')} />
              </div>
            </>
          )}
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
  );
}

/** Opciones y creditos, al final del menu de la portada en los dos casos. */
function MenuTail({ t, onOptions, onCredits }: { t: Dictionary; onOptions: () => void; onCredits: () => void }) {
  return (
    <>
      <button type="button" className="btn" onClick={onOptions}>
        <span aria-hidden="true">⚙</span> {t.title.options}
      </button>
      <button type="button" className="btn" onClick={onCredits}>
        <span aria-hidden="true">★</span> {t.title.credits}
      </button>
    </>
  );
}
