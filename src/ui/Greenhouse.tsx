import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { POWERS } from '../game/config/balance';
import type { NurseryArt, RouteArt } from '../game/EventBus';
import type { OutbreakId } from '../game/core/outbreaks';
import type { PowerId } from '../game/core/powers';
import { currentOutbreak, routeStops } from '../game/core/route';
import { carryBlocker, ownedLevel, ownedPowers } from '../game/core/shop';
import type { Progress } from '../game/progress';
import { summarizeSave, type SavedGame } from '../game/save';
import { formatSavedAt } from '../i18n';
import { GreenhousePatty } from './GreenhousePatty';
import { outbreakTitle } from './outbreakName';
import { PattyLab } from './PattyLab';
import { PowerIcon } from './PowerPanel';
import { RouteMap } from './RouteMap';
import { SeedBalance } from './SeedsEarned';
import { replayableStories, storyTitle, type StoryId } from './story/stories';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useLanguage, useText } from './useText';

interface GreenhouseProps {
  /** Partida a medias, o null: "Reanudar" solo sale si hay una. */
  saved: SavedGame | null;
  /** Progreso permanente: brotes vencidos, para la ruta y el siguiente brote. */
  progress: Progress;
  /** Jefe de cada brote, recortado por la escena, para los lugares de la ruta. */
  art: RouteArt | null;
  /** La disparadora de cada nivel base (T-023), recortada por la escena, para el vivero del laboratorio. */
  nurseryArt: NurseryArt | null;
  onResume: () => void;
  /**
   * Empieza el brote desde la ronda 1, pisando la partida a medias (ya confirmado), con los poderes elegidos (T-022, que
   * ya estan en el progreso).
   */
  onPlay: (outbreak: OutbreakId) => void;
  /** Laboratorio de Patty (T-022, T-036): fabricar y mejorar un invento; true si se pudo. */
  onBuy: (id: PowerId) => boolean;
  onUpgrade: (id: PowerId) => boolean;
  /** Vivero (T-023): sube un paso el nivel base de la disparadora; true si se pudo. */
  onBuyBaseLevel: () => boolean;
  /** Llevar o dejar un invento en el siguiente brote (T-022, T-04). */
  onToggleCarried: (id: PowerId) => void;
  /** Vuelve a ver una secuencia de la historia ya vista (T-031, Y-05). */
  onReplay: (story: StoryId) => void;
  /** Vuelve a la portada. */
  onBack: () => void;
  /** Hay una viñeta de la historia encima (T-031): Patty se esconde y no saluda (T-032). */
  quiet: boolean;
  /** Nombre del jugador (T-033) o null, para lo que dice Patty. */
  name: string | null;
}

type View =
  | { readonly name: 'main' }
  | { readonly name: 'route' }
  | { readonly name: 'story' }
  | { readonly name: 'confirm'; readonly outbreak: OutbreakId }
  | { readonly name: 'loadout'; readonly outbreak: OutbreakId };

const MAIN: View = { name: 'main' };

/** Boton de algo que aun no existe (el siguiente brote si no hay mas): con candado y "Proximamente". No suena. */
function LockedButton({ label, detail }: { label: string; detail: string }) {
  return (
    <button type="button" className="btn is-locked has-detail" aria-disabled="true" title={detail} data-silent onClick={(e) => e.preventDefault()}>
      <span className="btn-line">
        <span className="lock-icon" aria-hidden="true" /> {label}
      </span>
      <small className="btn-detail">{detail}</small>
    </button>
  );
}

/**
 * Invernadero (T-019): el sitio entre un brote y el siguiente, con todo lo que se hace fuera de la partida. Se abre al
 * vencer a Creeper (R-01) y se llega desde "Continuar" en la portada o desde la victoria. Desde T-036 es un refugio de
 * noche (lo pinta la escena) con el Laboratorio de Patty siempre abierto a la izquierda (`PattyLab`: los inventos y el
 * vivero) y, en el panel de la derecha, como el menu de la portada: las semillas (T-020), reanudar la partida a medias
 * (con su brote y su ronda), jugar el siguiente brote, abrir la ruta de brotes y la historia vista para volver a verla
 * (T-031). "Volver a la portada", abajo a la izquierda. Empezar un brote con una partida a medias pide confirmacion, y
 * quien tiene inventos elige antes los que lleva (T-04), en el panel. Esc vuelve atras: de la confirmacion o de la
 * historia al Invernadero y de ahi a la portada. Patty (T-032, VT-05) asoma junto al panel: a veces dice algo al entrar;
 * con la ruta abierta se esconde, y el laboratorio tambien.
 */
export function Greenhouse({
  saved,
  progress,
  art,
  nurseryArt,
  onResume,
  onPlay,
  onBuy,
  onUpgrade,
  onBuyBaseLevel,
  onToggleCarried,
  onReplay,
  onBack,
  quiet,
  name,
}: GreenhouseProps) {
  const t = useText();
  const language = useLanguage();
  const [view, setView] = useState<View>(MAIN);
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);
  const routeButton = useRef<HTMLButtonElement>(null);
  const owned = ownedPowers(progress);
  const lastView = useRef<View['name']>(view.name);
  const summary = saved ? summarizeSave(saved) : null;
  const current = currentOutbreak(progress.defeated);
  const defeated = useMemo(() => routeStops(progress.defeated).filter((stop) => stop.kind === 'outbreak' && stop.standing === 'defeated').length, [progress.defeated]);
  const stories = replayableStories(progress.story);
  const storyButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const from = lastView.current;
    lastView.current = view.name;
    if (view.name === 'route') return;
    // Al cerrar la ruta o la historia, el foco vuelve a su boton; si no, al primero del panel.
    if (view.name === 'main' && from === 'route') routeButton.current?.focus({ preventScroll: true });
    else if (view.name === 'main' && from === 'story') storyButton.current?.focus({ preventScroll: true });
    else firstButton.current?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    // La ruta atiende su propio Esc.
    if (view.name === 'route') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return;
      if (view.name === 'confirm' || view.name === 'story' || view.name === 'loadout') setView(MAIN);
      else onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, onBack]);

  /** Ya confirmado (o sin partida a medias): con inventos fabricados, antes se eligen los que se llevan (T-04). */
  const play = (outbreak: OutbreakId) => (owned.length > 0 ? setView({ name: 'loadout', outbreak }) : onPlay(outbreak));
  /** Empezar un brote: con una partida a medias, antes se confirma. */
  const start = (outbreak: OutbreakId) => (summary ? setView({ name: 'confirm', outbreak }) : play(outbreak));

  // Patty sigue montada con la ruta abierta (escondida): al cerrarla no vuelve a saludar como si acabara de entrar.
  const patty = <GreenhousePatty hidden={quiet || view.name === 'route'} name={name} />;

  if (view.name === 'route') {
    return (
      <>
        {patty}
        <RouteMap progress={progress} summary={summary} art={art} onPlay={play} onResume={onResume} onClose={() => setView(MAIN)} />
      </>
    );
  }

  return (
    <>
      <PattyLab progress={progress} art={nurseryArt} onBuy={onBuy} onUpgrade={onUpgrade} onBuyBaseLevel={onBuyBaseLevel} />
      {patty}
      <button type="button" className="btn greenhouse-home" onClick={onBack} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
        <span aria-hidden="true">⌂</span> <span className="greenhouse-home-text">{t.greenhouse.back}</span>
      </button>
      <nav className="title-panel pause-card greenhouse-panel" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
        {view.name === 'main' && (
          <>
            {/* El titulo grande de la izquierda ya dice "INVERNADERO": aqui solo para los lectores de pantalla. */}
            <h2 id={titleId} className="visually-hidden">
              {t.greenhouse.title}
            </h2>
            {/* Las semillas del jugador (T-020), arriba del panel: lo que tendra para la tienda. */}
            <SeedBalance balance={progress.seeds} />
            <div className="pause-actions title-actions">
              {summary && (
                <button ref={firstButton} type="button" className="btn btn-primary has-detail" onClick={onResume}>
                  <span className="btn-line">
                    <span aria-hidden="true">▶</span> {t.greenhouse.resume}
                  </span>
                  <small className="btn-detail">{t.greenhouse.resumeDetail(outbreakTitle(t, summary.outbreak), summary.round, summary.total)}</small>
                  <small className="btn-detail is-soft">{t.title.savedAt(formatSavedAt(summary.savedAt, Date.now(), language))}</small>
                </button>
              )}
              {current ? (
                <button
                  ref={summary ? undefined : firstButton}
                  type="button"
                  className={`btn has-detail${summary ? '' : ' btn-primary'}`}
                  onClick={() => start(current)}
                >
                  <span className="btn-line">
                    <span aria-hidden="true">❀</span> {t.greenhouse.next}
                  </span>
                  <small className="btn-detail">{outbreakTitle(t, current)}</small>
                </button>
              ) : (
                <LockedButton label={t.greenhouse.next} detail={t.common.soon} />
              )}
              <button
                ref={(button) => {
                  routeButton.current = button;
                  if (!summary && !current) firstButton.current = button;
                }}
                type="button"
                className="btn has-detail"
                onClick={() => setView({ name: 'route' })}
              >
                <span className="btn-line">
                  <span aria-hidden="true">⚑</span> {t.greenhouse.route}
                </span>
                <small className="btn-detail">{t.greenhouse.routeDetail(defeated)}</small>
              </button>
              {stories.length > 0 && (
                <button ref={storyButton} type="button" className="btn" title={t.story.replayDetail} onClick={() => setView({ name: 'story' })}>
                  <span aria-hidden="true">✎</span> {t.story.replay}
                </button>
              )}
            </div>
          </>
        )}

        {view.name === 'story' && (
          <>
            <div className="settings-header">
              <button ref={firstButton} type="button" className="btn btn-ghost" onClick={() => setView(MAIN)} aria-label={t.common.back} title={t.common.back}>
                <span aria-hidden="true">←</span>
              </button>
              <h2 id={titleId} className="pause-title is-small">
                {t.story.replayTitle}
              </h2>
            </div>
            <ol className="story-list">
              {stories.map((id, i) => (
                <li key={id}>
                  <button type="button" className="btn" onClick={() => onReplay(id)}>
                    <span className="story-list-index" aria-hidden="true">
                      {i + 1}
                    </span>
                    {storyTitle(t, id)}
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}

        {view.name === 'confirm' && summary && (
          <div className="title-confirm" role="alertdialog" aria-labelledby={titleId}>
            <h2 id={titleId} className="pause-title is-small">
              {t.greenhouse.confirmTitle(outbreakTitle(t, view.outbreak))}
            </h2>
            <p className="title-confirm-text">{t.greenhouse.confirmText(outbreakTitle(t, summary.outbreak), summary.round)}</p>
            <p className="title-confirm-note">{t.title.confirmKeeps}</p>
            <div className="pause-actions">
              <button ref={firstButton} type="button" className="btn" onClick={() => setView(MAIN)}>
                {t.greenhouse.confirmNo}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => play(view.outbreak)}>
                {t.greenhouse.confirmYes}
              </button>
            </div>
          </div>
        )}

        {view.name === 'loadout' && (
          <Loadout
            outbreak={view.outbreak}
            progress={progress}
            titleId={titleId}
            firstButton={firstButton}
            onToggle={onToggleCarried}
            onPlay={() => onPlay(view.outbreak)}
            onBack={() => setView(MAIN)}
          />
        )}
      </nav>
    </>
  );
}

interface LoadoutProps {
  outbreak: OutbreakId;
  progress: Progress;
  titleId: string;
  firstButton: RefObject<HTMLButtonElement | null>;
  onToggle: (id: PowerId) => void;
  onPlay: () => void;
  onBack: () => void;
}

/**
 * Antes de empezar un brote (T-022, T-04): los poderes comprados, cada uno un interruptor con su dibujo, su nombre y su
 * nivel, y cuantos lleva de los que caben (O-02). Lo elegido se guarda y la proxima vez sale igual. Con el maximo
 * elegido, los demas se ven apagados y dicen que hay que dejar otro antes. "¡A jugar!" empieza el brote con lo elegido
 * (o sin poderes).
 */
function Loadout({ outbreak, progress, titleId, firstButton, onToggle, onPlay, onBack }: LoadoutProps) {
  const t = useText();
  const max = POWERS.maxCarried;
  const chosen = progress.carried.length;
  return (
    <>
      <div className="settings-header">
        <button type="button" className="btn btn-ghost" onClick={onBack} aria-label={t.common.back} title={t.common.back}>
          <span aria-hidden="true">←</span>
        </button>
        <h2 id={titleId} className="pause-title is-small">
          {t.loadout.title}
        </h2>
      </div>
      <p className="pause-kicker">{outbreakTitle(t, outbreak)}</p>
      <p className="loadout-hint">{t.loadout.hint(max)}</p>
      <ul className="loadout-list">
        {ownedPowers(progress).map((id) => {
          const on = progress.carried.includes(id);
          const full = carryBlocker(progress, id) === 'full';
          const level = ownedLevel(progress, id) ?? 1;
          return (
            <li key={id}>
              <button
                type="button"
                className={`loadout-power power-${id}${on ? ' is-on' : ''}${full ? ' is-full' : ''}`}
                aria-pressed={on}
                aria-disabled={full}
                title={full ? t.loadout.full(max) : undefined}
                onClick={() => !full && onToggle(id)}
              >
                <PowerIcon power={id} />
                <span className="loadout-name">{t.hud.powers.names[id]}</span>
                <span className="loadout-level">{t.hud.powers.level(level)}</span>
                <span className="loadout-check" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="loadout-count" aria-live="polite">
        {t.loadout.count(chosen, max)}
      </p>
      <div className="pause-actions">
        <button ref={firstButton} type="button" className="btn btn-primary has-detail" onClick={onPlay}>
          <span className="btn-line">
            <span aria-hidden="true">▶</span> {t.loadout.play}
          </span>
          {chosen === 0 && <small className="btn-detail">{t.loadout.none}</small>}
        </button>
      </div>
    </>
  );
}
