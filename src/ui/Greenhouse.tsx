import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { RouteArt } from '../game/EventBus';
import type { OutbreakId } from '../game/core/outbreaks';
import { currentOutbreak, routeStops } from '../game/core/route';
import type { Progress } from '../game/progress';
import { summarizeSave, type SavedGame } from '../game/save';
import { formatSavedAt } from '../i18n';
import { GreenhousePatty } from './GreenhousePatty';
import { outbreakTitle } from './outbreakName';
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
  onResume: () => void;
  /** Empieza el brote desde la ronda 1, pisando la partida a medias (ya confirmado). */
  onPlay: (outbreak: OutbreakId) => void;
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
  | { readonly name: 'confirm'; readonly outbreak: OutbreakId };

const MAIN: View = { name: 'main' };

/** Boton de algo que aun no existe (la tienda de T-022, las plantas de T-023): con candado y "Proximamente". No suena. */
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
 * vencer a Creeper (R-01) y se llega desde "Continuar" en la portada o desde la victoria. Va en el panel de la derecha,
 * como el menu de la portada: reanudar la partida a medias (con su brote y su ronda), jugar el siguiente brote, abrir la
 * ruta de brotes, la historia vista para volver a verla (T-031), la tienda y las plantas (con candado hasta T-022 y T-023)
 * y volver a la portada. Arriba, las semillas del jugador (T-020). Empezar un brote con una partida a medias pide confirmacion. Esc vuelve atras: de la confirmacion
 * o de la historia al Invernadero y de ahi a la portada. Dentro esta Patty (T-032, VT-05), junto al panel: a veces dice
 * algo al entrar; con la ruta abierta se esconde.
 */
export function Greenhouse({ saved, progress, art, onResume, onPlay, onReplay, onBack, quiet, name }: GreenhouseProps) {
  const t = useText();
  const language = useLanguage();
  const [view, setView] = useState<View>(MAIN);
  const titleId = useId();
  const firstButton = useRef<HTMLButtonElement>(null);
  const routeButton = useRef<HTMLButtonElement>(null);
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
      if (view.name === 'confirm' || view.name === 'story') setView(MAIN);
      else onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, onBack]);

  /** Empezar un brote: con una partida a medias, antes se confirma. */
  const start = (outbreak: OutbreakId) => (summary ? setView({ name: 'confirm', outbreak }) : onPlay(outbreak));

  // Patty sigue montada con la ruta abierta (escondida): al cerrarla no vuelve a saludar como si acabara de entrar.
  const patty = <GreenhousePatty hidden={quiet || view.name === 'route'} name={name} />;

  if (view.name === 'route') {
    return (
      <>
        {patty}
        <RouteMap progress={progress} summary={summary} art={art} onPlay={onPlay} onResume={onResume} onClose={() => setView(MAIN)} />
      </>
    );
  }

  return (
    <>
      {patty}
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
              {/* La historia vista va en la fila de la tienda y las plantas: asi el panel cabe en un movil en horizontal. */}
              <div className={`greenhouse-locked${stories.length > 0 ? ' has-story' : ''}`}>
                {stories.length > 0 && (
                  <button ref={storyButton} type="button" className="btn" title={t.story.replayDetail} onClick={() => setView({ name: 'story' })}>
                    <span aria-hidden="true">✎</span> {t.story.replay}
                  </button>
                )}
                <LockedButton label={t.greenhouse.shop} detail={t.common.soon} />
                <LockedButton label={t.greenhouse.plants} detail={t.common.soon} />
              </div>
              <button type="button" className="btn" onClick={onBack}>
                <span aria-hidden="true">⌂</span> {t.greenhouse.back}
              </button>
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
              <button type="button" className="btn btn-danger" onClick={() => onPlay(view.outbreak)}>
                {t.greenhouse.confirmYes}
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
