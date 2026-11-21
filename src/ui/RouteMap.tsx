import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { RouteArt } from '../game/EventBus';
import { outbreakNumber, outbreakScript, outbreaksBefore, roundCount, type OutbreakId } from '../game/core/outbreaks';
import { isPlayable, routeStops, type RouteStop } from '../game/core/route';
import type { Progress } from '../game/progress';
import type { SaveSummary } from '../game/save';
import type { Dictionary } from '../i18n';
import { outbreakTitle } from './outbreakName';
import { layoutRoute, routeSegment, type RouteBox, type RoutePoint } from './routeLayout';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useText } from './useText';

interface RouteMapProps {
  progress: Progress;
  /** Partida a medias: su lugar ofrece reanudarla, y empezar cualquier brote pide confirmacion. */
  summary: SaveSummary | null;
  art: RouteArt | null;
  onPlay: (outbreak: OutbreakId) => void;
  onResume: () => void;
  /** Vuelve al Invernadero. */
  onClose: () => void;
}

type OutbreakStop = Extract<RouteStop, { kind: 'outbreak' }>;

const isChoice = (stop: RouteStop): stop is OutbreakStop => stop.kind === 'outbreak' && isPlayable(stop.standing);

/** Tamano de la caja del mapa, medido y al dia si cambia la ventana. */
function useBoxSize(ref: RefObject<HTMLElement | null>): RouteBox {
  const [box, setBox] = useState<RouteBox>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setBox((before) => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      return before.width === width && before.height === height ? before : { width, height };
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return box;
}

const bossName = (t: Dictionary, id: OutbreakId) => t.info.enemy.names[outbreakScript(id).boss];

/**
 * Ruta de brotes (T-019): un camino de izquierda a derecha con un lugar por brote (R-03): los vencidos, superados, con
 * su jefe en color y un sello; el que toca, destacado y con la flecha encima; el siguiente, en sombra y con candado; y
 * el destino final, pequeno y a lo lejos. El suelo va sano hasta donde llego el jugador y corrupto despues, como el
 * jardin del tablero. Tocar un lugar vencido o el que toca ensena abajo su nombre, su jefe y el boton para jugarlo (o
 * para reanudar la partida a medias que haya alli). Los jefes son recortes de la escena (`routeArt`): React no los pinta.
 * Teclado: Tab o las flechas recorren los lugares, Enter elige y Esc vuelve (de la confirmacion a la ficha, de ahi al
 * Invernadero).
 */
export function RouteMap({ progress, summary, art, onPlay, onResume, onClose }: RouteMapProps) {
  const t = useText();
  const titleId = useId();
  const stops = useMemo(() => routeStops(progress.defeated), [progress.defeated]);
  const choices = stops.filter(isChoice);
  // Elegido al abrir: el que toca o, si no hay, el ultimo vencido. La ruta siempre tiene al menos uno (el primer brote).
  const [selected, setSelected] = useState<OutbreakId | null>(() => (choices.find((stop) => stop.current) ?? choices.at(-1))?.id ?? null);
  const [confirming, setConfirming] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const stopButtons = useRef(new Map<OutbreakId, HTMLButtonElement>());
  const keepButton = useRef<HTMLButtonElement>(null);
  const box = useBoxSize(mapRef);
  const layout = useMemo(() => layoutRoute(stops.length, box), [stops.length, box]);
  const chosen = choices.find((stop) => stop.id === selected) ?? null;
  const measured = box.width > 0 && box.height > 0;

  // El foco empieza en el lugar elegido (en cuanto el mapa esta medido y sus lugares existen); en la confirmacion, en
  // "Mejor no". Solo al abrir y al entrar o salir de la confirmacion: elegir con el raton no mueve el foco.
  useEffect(() => {
    if (confirming) keepButton.current?.focus({ preventScroll: true });
    else if (measured && selected) stopButtons.current.get(selected)?.focus({ preventScroll: true });
  }, [confirming, measured]);

  // Con muchos lugares el mapa se desplaza: el elegido queda a la vista.
  useEffect(() => {
    if (!measured || !layout.scrolls || !selected) return;
    const index = stops.findIndex((stop) => stop.kind === 'outbreak' && stop.id === selected);
    const point = layout.points[index];
    const map = mapRef.current;
    if (point && map) map.scrollTo({ left: point.x - map.clientWidth / 2, behavior: 'smooth' });
  }, [selected, measured, layout, stops]);

  const choose = (id: OutbreakId) => {
    setSelected(id);
    setConfirming(false);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (event.repeat) return;
        if (confirming) setConfirming(false);
        else onClose();
        return;
      }
      if (confirming || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
      // Las flechas mueven por los lugares que se pueden elegir; el foco va con ellas.
      const index = choices.findIndex((stop) => stop.id === selected);
      const next = choices[index + (event.key === 'ArrowRight' ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      choose(next.id);
      stopButtons.current.get(next.id)?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Hasta donde llega el suelo sano: pasado el que toca o, si no hay, el ultimo vencido.
  const lastDefeated = stops.reduce((last, stop, i) => (stop.kind === 'outbreak' && stop.standing === 'defeated' ? i : last), -1);
  const frontier = Math.max(stops.findIndex((stop) => stop.kind === 'outbreak' && stop.current), lastDefeated);
  // El nombre de un lugar no pasa de la mitad del camino hasta el de al lado.
  const captionMax = layout.points.length > 1 ? layout.points[1].x - layout.points[0].x - 10 : 180;
  const healedX = frontier >= 0 && layout.points[frontier] ? layout.points[frontier].x + layout.points[frontier].size * 0.75 : 0;

  return (
    <div className="route-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <section className="route-card">
        <header className="route-head">
          <button type="button" className="btn btn-ghost" aria-label={t.common.back} title={t.common.back} onClick={onClose}>
            <span aria-hidden="true">←</span>
          </button>
          <h2 id={titleId} className="pause-title is-small">
            {t.route.title}
          </h2>
          <span className="route-tally">{t.greenhouse.routeDetail(stops.filter((stop) => stop.kind === 'outbreak' && stop.standing === 'defeated').length)}</span>
        </header>

        <div ref={mapRef} className={`route-map${layout.scrolls ? ' is-scrolling' : ''}`}>
          {measured && (
            <div className="route-track" style={{ width: layout.width, height: layout.height, '--healed': `${Math.round(healedX)}px`, '--caption-max': `${Math.round(captionMax)}px` } as CSSProperties}>
              <RouteGround layout={layout} healedX={healedX} />
              <svg className="route-path" width={layout.width} height={layout.height} aria-hidden="true">
                {layout.points.slice(1).map((point, i) => {
                  const to = stops[i + 1];
                  const tone = to.kind === 'final' ? 'is-far' : to.kind === 'outbreak' && isPlayable(to.standing) ? 'is-walked' : 'is-ahead';
                  const d = routeSegment(layout.points[i], point);
                  return (
                    <g key={i} className={`route-segment ${tone}`} style={{ '--path': `${layout.points[i].size * 0.3}px` } as CSSProperties}>
                      <path className="route-segment-edge" d={d} />
                      <path className="route-segment-dirt" d={d} />
                      <path className="route-segment-steps" d={d} />
                    </g>
                  );
                })}
              </svg>
              <ol className="route-stops">
                {stops.map((stop, i) => (
                  <StopView
                    key={stop.kind === 'outbreak' ? stop.id : stop.kind}
                    stop={stop}
                    point={layout.points[i]}
                    art={art}
                    selected={stop.kind === 'outbreak' && stop.id === selected}
                    saved={stop.kind === 'outbreak' && summary?.outbreak === stop.id}
                    buttons={stopButtons.current}
                    onChoose={choose}
                  />
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="route-detail" aria-live="polite">
          {chosen ? (
            <StopDetail
              key={`${chosen.id}:${confirming}`}
              stop={chosen}
              summary={summary}
              confirming={confirming}
              keepButton={keepButton}
              onPlay={() => (summary ? setConfirming(true) : onPlay(chosen.id))}
              onConfirm={() => onPlay(chosen.id)}
              onCancel={() => setConfirming(false)}
              onResume={onResume}
            />
          ) : (
            <p className="route-hint">{t.route.hint}</p>
          )}
        </div>
        <p className="pause-hint route-keys">{t.route.keys}</p>
      </section>
    </div>
  );
}

/** Suelo del mapa: una loma ondulada, sana hasta `healedX` y corrupta despues, con matas de cesped y lucecitas neon. */
function RouteGround({ layout, healedX }: { layout: ReturnType<typeof layoutRoute>; healedX: number }) {
  const id = useId();
  const { width, height, points } = layout;
  const final = points.at(-1);
  const horizon = final ? Math.min(height * 0.62, final.y + final.size * 0.32) : height * 0.4;
  // Ondas del horizonte cada ~180 px.
  const waves = Math.max(2, Math.round(width / 180));
  let d = `M 0 ${horizon.toFixed(1)}`;
  for (let i = 0; i < waves; i++) {
    const x0 = (width * i) / waves;
    const x1 = (width * (i + 1)) / waves;
    const lift = i % 2 === 0 ? -9 : 7;
    d += ` Q ${((x0 + x1) / 2).toFixed(1)} ${(horizon + lift).toFixed(1)}, ${x1.toFixed(1)} ${horizon.toFixed(1)}`;
  }
  d += ` V ${height} H 0 Z`;
  const fade = 70;
  const healed = Math.max(0, Math.min(width, healedX));
  // Adornos repartidos sin azar: matas y flores en lo sano; lucecitas y pistas de circuito en lo corrupto, como el suelo
  // del tablero.
  const bits: Array<{ x: number; y: number; healed: boolean; k: number }> = [];
  const depth = Math.max(1, height - horizon - 24);
  for (let k = 0, x = 22; x < width - 10; k++, x += 34 + ((k * 37) % 29)) {
    const y = horizon + 14 + ((k * 53 + 17) % depth);
    bits.push({ x, y, healed: x < healed - fade / 2, k });
  }
  return (
    <svg className="route-ground" width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-soil`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          <stop offset={Math.max(0, (healed - fade) / width)} className="route-soil-healed" />
          <stop offset={Math.min(1, (healed + fade) / width)} className="route-soil-corrupt" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id}-soil)`} />
      <path d={d} fill={`url(#${id}-shade)`} />
      {bits.map(({ x, y, healed: sane, k }) => {
        if (sane && k % 4 === 0) {
          return (
            <g key={k} className={`route-flower is-${k % 3}`}>
              <path className="route-tuft" d={`M ${x} ${y} v -9`} />
              <circle cx={x} cy={y - 11} r={3.4} />
              <circle className="route-flower-heart" cx={x} cy={y - 11} r={1.4} />
            </g>
          );
        }
        if (sane) return <path key={k} className="route-tuft" d={`M ${x - 9} ${y} q 3 -13 6 -1 q 3 -16 6 0 q 3 -12 6 1`} />;
        if (k % 3 === 0) {
          return (
            <g key={k} className="route-circuit" style={{ animationDelay: `${(k % 5) * 0.45}s` }}>
              <path d={`M ${x - 14} ${y} h 12 l 6 -6 h 14`} />
              <circle cx={x + 18} cy={y - 6} r={2.4} />
            </g>
          );
        }
        return <circle key={k} className="route-spark" cx={x} cy={y} r={1.6 + (k % 3) * 0.6} style={{ animationDelay: `${(k % 5) * 0.4}s` }} />;
      })}
    </svg>
  );
}

interface StopViewProps {
  stop: RouteStop;
  point: RoutePoint;
  art: RouteArt | null;
  selected: boolean;
  /** La partida a medias es de este brote. */
  saved: boolean;
  buttons: Map<OutbreakId, HTMLButtonElement>;
  onChoose: (id: OutbreakId) => void;
}

/** Un lugar del camino: el cerco con su jefe (o su misterio) y el nombre debajo. */
function StopView({ stop, point, art, selected, saved, buttons, onChoose }: StopViewProps) {
  const t = useText();
  const style = { left: point.x, top: point.y, '--size': `${point.size}px` } as CSSProperties;

  if (stop.kind === 'soon') {
    const name = t.outbreak.number(stop.number);
    return (
      <li className="route-stop is-soon" style={style}>
        <div className="route-stop-body" role="img" aria-label={`${name} · ${t.common.soon}`} title={t.common.soon}>
          <span className="route-ring">
            <span className="route-mystery" aria-hidden="true">
              ?
            </span>
          </span>
          <Caption kicker={name} name={t.common.soon} />
        </div>
      </li>
    );
  }

  if (stop.kind === 'final') {
    return (
      <li className="route-stop is-final" style={style}>
        <div className="route-stop-body" role="img" aria-label={`${t.route.final} · ${t.route.finalHint}`} title={t.route.finalHint}>
          <span className="route-ring">
            <FinalSpire />
          </span>
          <Caption kicker={t.route.finalHint} name={t.route.final} />
        </div>
      </li>
    );
  }

  const { id, standing, current } = stop;
  const name = outbreakTitle(t, id);
  const face = (
    <span className="route-ring">
      <span className="route-photo">{art?.[id] && <img className="route-boss" src={art[id]} alt="" draggable={false} />}</span>
      {standing === 'defeated' && (
        <span className="route-seal" aria-hidden="true">
          ✓
        </span>
      )}
      {standing === 'locked' && <span className="lock-icon route-lock" aria-hidden="true" />}
      {saved && <span className="route-saved" aria-hidden="true" />}
    </span>
  );
  const caption = <Caption kicker={t.outbreak.number(outbreakNumber(id))} name={bossName(t, id)} />;
  const classes = `route-stop is-${standing}${current ? ' is-current' : ''}${selected ? ' is-selected' : ''}`;

  if (!isPlayable(standing)) {
    const before = outbreaksBefore(id).at(-1);
    const why = before ? t.route.locked(t.info.enemy.names[before.boss]) : t.common.soon;
    return (
      <li className={classes} style={style}>
        <div className="route-stop-body" role="img" aria-label={`${name} · ${why}`} title={why}>
          {face}
          {caption}
        </div>
      </li>
    );
  }

  const state = standing === 'defeated' ? t.route.defeated : t.route.current;
  return (
    <li className={classes} style={style}>
      {current && <span className="route-here" aria-hidden="true" />}
      <button
        ref={(button) => {
          if (button) buttons.set(id, button);
          else buttons.delete(id);
        }}
        type="button"
        className="route-stop-body"
        aria-pressed={selected}
        aria-label={`${name} · ${state}`}
        onClick={() => onChoose(id)}
      >
        {face}
        {caption}
      </button>
    </li>
  );
}

function Caption({ kicker, name }: { kicker: string; name: string }) {
  return (
    <span className="route-caption">
      <small>{kicker}</small>
      <strong>{name}</strong>
    </span>
  );
}

interface StopDetailProps {
  stop: OutbreakStop;
  summary: SaveSummary | null;
  confirming: boolean;
  keepButton: RefObject<HTMLButtonElement | null>;
  /** Jugar desde la ronda 1: si hay partida a medias, primero pide confirmacion. */
  onPlay: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onResume: () => void;
}

/** Ficha del lugar elegido: su nombre, su jefe, sus rondas y el boton para jugarlo, o la confirmacion de pisar la partida. */
function StopDetail({ stop, summary, confirming, keepButton, onPlay, onConfirm, onCancel, onResume }: StopDetailProps) {
  const t = useText();
  const name = outbreakTitle(t, stop.id);
  const savedHere = summary?.outbreak === stop.id ? summary : null;

  if (confirming && summary) {
    return (
      <div className="route-detail-body is-confirm" role="alertdialog" aria-label={t.greenhouse.confirmTitle(name)}>
        <div className="route-detail-text">
          <h3>{t.greenhouse.confirmTitle(name)}</h3>
          <p className="route-detail-warn">{t.greenhouse.confirmText(outbreakTitle(t, summary.outbreak), summary.round)}</p>
          <p className="route-detail-note">{t.title.confirmKeeps}</p>
        </div>
        <div className="route-detail-actions">
          <button ref={keepButton} type="button" className="btn" onClick={onCancel}>
            {t.greenhouse.confirmNo}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {t.greenhouse.confirmYes}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="route-detail-body">
      <div className="route-detail-text">
        <h3>
          {name}
          <span className={`route-badge is-${stop.standing}`}>{stop.standing === 'defeated' ? t.route.defeated : t.route.current}</span>
        </h3>
        <p>{t.route.boss(bossName(t, stop.id), roundCount(stop.id))}</p>
        {savedHere && <p className="route-detail-note">{t.route.saved(savedHere.round, savedHere.total)}</p>}
      </div>
      <div className="route-detail-actions">
        {savedHere ? (
          <>
            <button type="button" className="btn btn-primary" onClick={onResume}>
              <span aria-hidden="true">▶</span> {t.route.resume}
            </button>
            <button type="button" className="btn" onClick={onPlay}>
              <span aria-hidden="true">↻</span> {t.route.restart}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onPlay}>
            <span aria-hidden="true">▶</span> {stop.standing === 'defeated' ? t.route.replay : t.route.play}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * El destino final, a lo lejos: una torre oscura sobre suelo corrupto con un ojo neon que parpadea y bits que flotan.
 * Es el lugar, no el jefe (aun sin disenar ni nombrar, H-03).
 */
function FinalSpire() {
  return (
    <svg className="route-spire" viewBox="0 0 64 64" aria-hidden="true">
      <path className="route-spire-hill" d="M-2 66 C8 50 56 50 66 66 Z" />
      <path className="route-spire-body" d="M26 56 L28.5 24 L32 10 L35.5 24 L38 56 Z" />
      <path className="route-spire-arm" d="M21 42 H43 M23.5 32 H40.5" />
      <circle className="route-spire-eye" cx="32" cy="22" r="3.2" />
      <rect className="route-spire-bit is-a" x="12" y="26" width="4" height="4" />
      <rect className="route-spire-bit is-b" x="47" y="16" width="3" height="3" />
      <rect className="route-spire-bit is-c" x="45" y="36" width="5" height="5" />
    </svg>
  );
}
