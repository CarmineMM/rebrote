import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FIRST_OUTBREAK } from '../game/core/outbreaks';
import { isGreenhouseOpen } from '../game/core/route';
import type { Progress } from '../game/progress';
import { summarizeSave, type SavedGame } from '../game/save';
import type { QualityLevel } from '../game/view/quality';
import { formatSavedAt, type Dictionary } from '../i18n';
import { Credits } from './Credits';
import { outbreakTitle } from './outbreakName';
import { PlayerChip, PlayersPanel, RemovePlayer } from './Players';
import { playerName, type PlayerCard } from './playerCards';
import { LanguagePicker, SettingsPanel } from './SettingsPanel';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import type { Settings } from './useSettings';
import { useLanguage, useText } from './useText';

interface TitleMenuProps {
  /** Partida guardada del jugador activo, o null si no hay (T-011): sin Invernadero, "Continuar" queda desactivado. */
  saved: SavedGame | null;
  /** Progreso permanente del jugador activo (T-017): si el Invernadero esta abierto (T-019, R-01: al vencer a Creeper). */
  progress: Progress;
  /** Jugadores de este aparato (T-034), con lo que tiene cada uno. */
  players: readonly PlayerCard[];
  /** El jugador activo. */
  player: string;
  settings: Settings;
  autoLevel: QualityLevel;
  fullscreenSupported: boolean;
  onChange: (change: Partial<Settings>) => void;
  onNewGame: () => void;
  /** Sin Invernadero, reanuda la partida guardada; con el, lleva a el (T-019, R-02). */
  onContinue: () => void;
  /** Cambia de jugador: su progreso, su partida y sus tours. Los ajustes no cambian (T-034). */
  onSelectPlayer: (id: string) => void;
  /** Crea un jugador vacio y lo deja activo. */
  onCreatePlayer: () => void;
  /** Borra un jugador con todo lo suyo (PF-06), ya confirmado. */
  onRemovePlayer: (id: string) => void;
}

type View = 'main' | 'options' | 'credits' | 'confirm' | 'players' | 'remove';

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
export function TitleScreen({ greenhouse = false, inert = false, children }: { greenhouse?: boolean; inert?: boolean; children: ReactNode }) {
  const t = useText();
  const word = greenhouse ? t.greenhouse.logo : NAME;
  const sprout = word.indexOf('O');
  const fit = Math.min(1, FIT_LETTERS / word.length);
  return (
    // Con una viñeta de la historia encima (T-031), el menu no recibe el foco ni los clics.
    <div className="title-screen" inert={inert}>
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
 * Despues, opciones y creditos. Arriba del todo, quien juega y el boton para cambiar de jugador (T-034), que abre la
 * pantalla de jugadores: elegir, crear y borrar (con confirmacion). Solo aqui se cambia de jugador, nunca en mitad de una
 * partida. Las opciones, los creditos, los jugadores y las confirmaciones (partida nueva y borrar un jugador) salen en el
 * mismo panel. Esc vuelve atras: al menu, o a los jugadores desde la confirmacion de borrar.
 */
export function TitleMenu({
  saved,
  progress,
  players,
  player,
  settings,
  autoLevel,
  fullscreenSupported,
  onChange,
  onNewGame,
  onContinue,
  onSelectPlayer,
  onCreatePlayer,
  onRemovePlayer,
}: TitleMenuProps) {
  const t = useText();
  const language = useLanguage();
  const [view, setView] = useState<View>('main');
  /** Jugador que se quiere borrar (en la confirmacion). */
  const [removing, setRemoving] = useState<string | null>(null);
  /** Nombre del jugador que se acaba de borrar: la lista lo avisa hasta que se sale de ella. */
  const [removed, setRemoved] = useState<string | null>(null);
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);
  const playerButton = useRef<HTMLButtonElement>(null);
  const lastView = useRef<View>(view);
  const summary = saved ? summarizeSave(saved) : null;
  const greenhouse = isGreenhouseOpen(progress.defeated);
  const current = players.find((card) => card.profile.id === player) ?? players[0];
  const doomed = players.find((card) => card.profile.id === removing) ?? null;

  useEffect(() => {
    const from = lastView.current;
    lastView.current = view;
    if (view !== 'players' && view !== 'remove') setRemoved(null);
    // De los jugadores se vuelve al boton que los abrio.
    if (view === 'main' && (from === 'players' || from === 'remove')) {
      playerButton.current?.focus({ preventScroll: true });
      return;
    }
    firstButton.current?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && view !== 'main') setView(view === 'remove' ? 'players' : 'main');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  const startNew = () => (summary ? setView('confirm') : onNewGame());

  const choosePlayer = (id: string) => {
    if (id !== player) onSelectPlayer(id);
    setView('main');
  };

  const createPlayer = () => {
    onCreatePlayer();
    setView('main');
  };

  const askRemove = (id: string) => {
    setRemoving(id);
    setView('remove');
  };

  const removePlayer = () => {
    if (!doomed) return;
    const name = playerName(t, doomed.profile);
    onRemovePlayer(doomed.profile.id);
    setRemoving(null);
    setRemoved(name);
    setView('players');
  };

  return (
    <nav className={`title-panel pause-card${view === 'players' ? ' is-players' : ''}`} aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      {view === 'main' && (
        <>
          <h2 id={titleId} className="visually-hidden">
            {t.title.menu}
          </h2>
          {current && <PlayerChip profile={current.profile} buttonRef={playerButton} onClick={() => setView('players')} />}
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

      {view === 'players' && (
        <PlayersPanel
          titleId={titleId}
          firstButton={firstButton}
          players={players}
          active={player}
          removed={removed}
          onSelect={choosePlayer}
          onCreate={createPlayer}
          onRemove={askRemove}
          onBack={() => setView('main')}
        />
      )}

      {view === 'remove' && doomed && (
        <RemovePlayer titleId={titleId} firstButton={firstButton} card={doomed} last={players.length === 1} onCancel={() => setView('players')} onConfirm={removePlayer} />
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
