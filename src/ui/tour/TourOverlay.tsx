import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { MINE } from '../../game/config/balance';
import type { TourArt, TourBoard } from '../../game/EventBus';
import { CAST } from '../../game/view/characters/cast';
import { formatSeconds, type Dictionary } from '../../i18n';
import { Cameo, SpokenText, toneStyle, useSpeech } from '../story/Portrait';
import { NO_AUTO_FULLSCREEN } from '../useFullscreen';
import { useText } from '../useText';
import { placeBubble, type BubblePlace, type Size } from './placeBubble';
import { TourPicture } from './TourPicture';
import { TourHand } from './TourHand';
import {
  TOUR_GUIDE,
  hudTargetsOf,
  placeStep,
  shapeBox,
  type Box,
  type HudTarget,
  type PlacedGesture,
  type PlacedStep,
  type Shape,
  type TourId,
  type TourStep,
} from './tours';

interface TourOverlayProps {
  tour: TourId;
  step: TourStep;
  /** Paso en curso (desde 0) y cuantos tiene el tour. */
  index: number;
  count: number;
  board: TourBoard | null;
  art: TourArt | null;
  /** El jugador acaba de hacer el gesto: celebracion antes de pasar al siguiente. */
  cheer: boolean;
  /** El jugador esta jugando una carta: la mano se aparta para no estorbar. */
  hideHand: boolean;
  onNext: () => void;
  onSkip: () => void;
}

/** Lo que mide la mano alrededor de la punta del dedo: el bocadillo no se pone encima si puede. */
const HAND_BOX = { left: -22, top: -4, width: 70, height: 78 };
/** Puntos del camino del arrastre que el bocadillo tampoco tapa, si puede, y lo que mide cada uno. */
const TRAIL_SAMPLES = 9;
const TRAIL_BOX = 28;
/** Lo que espera Boxer a decir la frase de cada paso: antes entra el bocadillo de un salto. */
const SPEAK_DELAY_MS = 260;

/** Frase del paso, en el idioma en curso. La de la mina de fuego lleva su cuenta atras (de las reglas). */
function stepText(t: Dictionary, tour: TourId, step: TourStep): string {
  const entry = (t.tour.steps as Record<string, Record<string, string | ((arg: string) => string)>>)[tour]?.[step.id];
  if (typeof entry === 'function') return entry(formatSeconds(MINE.countdownMs));
  return entry ?? '';
}

/** Caja de un elemento en la pagina, en enteros (para no volver a pintar por medio pixel); null si no se ve. */
function boxOf(element: Element | null): Box | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) };
}

/** Piezas del HUD que senala el paso. */
function measureHud(names: readonly HudTarget[]): Partial<Record<HudTarget, Box>> {
  const boxes: Partial<Record<HudTarget, Box>> = {};
  for (const name of names) {
    const box = boxOf(document.querySelector(`[data-tour="${name}"]`));
    if (box) boxes[name] = box;
  }
  return boxes;
}

/**
 * Lo que el bocadillo no debe tapar si puede: cada pieza del HUD (bandeja, ronda y su aviso, marcadores) y el panel de nivel.
 * Las piezas de la ronda se miden una a una: en el movil van sueltas por el HUD (`.round-info` sin caja propia).
 */
function measureObstacles(): Box[] {
  const hud = document.querySelector('.hud');
  const elements = [...(hud ? hud.querySelectorAll(':scope > *, .round-info > *') : []), ...document.querySelectorAll('.level-panel')];
  return elements.map(boxOf).filter((box): box is Box => box !== null);
}

const viewportNow = (): Size => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * Un paso de un tour de ayuda (T-013, ADR-0012), encima del juego vivo: un velo que oscurece todo menos lo que se ensena
 * (con aros que laten alrededor), la mano haciendo el gesto y un bocadillo con un dibujo animado, una frase corta, los
 * puntos de los pasos, "Saltar" y "Siguiente". El velo, los aros y la mano no recogen clics: el jugador puede hacer el
 * gesto de verdad. Lo del HUD se mide en cada fotograma y lo del tablero lo manda la escena.
 *
 * La frase la dice Boxer (T-032): su retrato asoma por la esquina del bocadillo con su nombre al lado, y la dice letra a
 * letra con su voz, moviendo la boca; al hacer el gesto, sonrie. Lo que aun no dijo ocupa su sitio: el bocadillo no cambia
 * de tamano mientras habla, asi que `placeBubble` lo coloca igual.
 */
export function TourOverlay({ tour, step, index, count, board, art, cheer, hideHand, onNext, onSkip }: TourOverlayProps) {
  const t = useText();
  // El id va dentro de `url(#...)`: solo letras, numeros y guiones.
  const maskId = `tour-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const textId = useId();
  const bubble = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLSpanElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [hud, setHud] = useState<Partial<Record<HudTarget, Box>>>({});
  const [obstacles, setObstacles] = useState<Box[]>([]);
  const [viewport, setViewport] = useState<Size>(viewportNow);
  const [place, setPlace] = useState<BubblePlace | null>(null);
  const last = index === count - 1;
  const line = stepText(t, tour, step);
  const speech = useSpeech({ speaker: TOUR_GUIDE, text: line, delayMs: SPEAK_DELAY_MS, sound: 'keys', replay: `${tour}:${index}` });

  // El HUD se mueve (cartas que llegan, panel de nivel que se abre, ventana que cambia): se mide en cada fotograma y
  // solo se vuelve a pintar si algo cambio.
  useEffect(() => {
    const names = hudTargetsOf(step);
    let key = '';
    let frame = 0;
    const tick = () => {
      const boxes = measureHud(names);
      const blocking = measureObstacles();
      const size = viewportNow();
      const now = JSON.stringify([boxes, blocking, size]);
      if (now !== key) {
        key = now;
        setHud(boxes);
        setObstacles(blocking);
        setViewport(size);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  // Mientras se celebra un paso hecho, lo iluminado se queda donde estaba (la casilla sembrada, no la siguiente libre).
  const live = placeStep(step, board, hud);
  const frozen = useRef<PlacedStep | null>(null);
  if (!cheer) frozen.current = null;
  else if (!frozen.current) frozen.current = live;
  const placed = frozen.current ?? live;
  const gesture = cheer || hideHand ? null : placed.gesture;
  const shapeKey = JSON.stringify([placed, obstacles, viewport]);

  // El bocadillo se coloca antes de pintarse: junto a lo iluminado, sin taparlo ni ponerse sobre la mano. Boxer asoma por
  // arriba a la izquierda (T-032): cuenta como parte del bocadillo, asi tampoco tapa lo que se senala.
  useLayoutEffect(() => {
    const element = bubble.current;
    if (!element) return;
    const outLeft = Math.max(0, -(guide.current?.offsetLeft ?? 0));
    const outTop = Math.max(0, -(guide.current?.offsetTop ?? 0));
    const size = { width: element.offsetWidth + outLeft, height: element.offsetHeight + outTop };
    const spot = placeBubble(size, placed.shapes.map(shapeBox), viewport, [...gestureBoxes(placed.gesture), ...obstacles]);
    setPlace({ left: spot.left + outLeft, top: spot.top + outTop });
    // `shapeKey` resume lo que importa de `placed`, `obstacles` y `viewport`; `t`, el idioma (cambia lo que mide el bocadillo).
  }, [shapeKey, step.id, t]);

  // "Siguiente" toma el foco al cambiar de paso: Enter pasa. Sin desplazar la pagina.
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [tour, index]);

  const bubbleStyle: CSSProperties = { left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? 'visible' : 'hidden' };

  return (
    <div className={`tour${cheer ? ' is-cheer' : ''}`} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <svg className="tour-veil" width={viewport.width} height={viewport.height} aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {placed.shapes.map((shape, i) => (
              <ShapeSvg key={i} shape={shape} className="tour-hole" />
            ))}
          </mask>
        </defs>
        <rect className="tour-veil-dim" width="100%" height="100%" mask={`url(#${maskId})`} />
        {gesture?.kind === 'drag' && <Trail gesture={gesture} />}
        {placed.shapes.map((shape, i) => (
          <ShapeSvg key={`${step.id}:${i}`} shape={shape} className={`tour-ring${shape.kind === 'poly' ? ' is-dashed' : ''}`} />
        ))}
      </svg>

      {gesture && <TourHand key={`${step.id}:${gesture.kind}`} gesture={gesture} />}

      <div ref={bubble} key={`${tour}:${step.id}`} className="tour-bubble" style={bubbleStyle} role="dialog" aria-modal="false" aria-labelledby={textId}>
        <span ref={guide} className="tour-guide" style={toneStyle(CAST[TOUR_GUIDE])}>
          <Cameo speaker={TOUR_GUIDE} expression={cheer ? 'happy' : 'normal'} open={speech.open} blink={speech.blink} className="tour-cameo" />
          <span className="tour-guide-name">{t.story.names[TOUR_GUIDE]}</span>
        </span>
        <TourPicture id={step.picture} art={art} />
        <div className="tour-body">
          <div className="tour-head">
            <p className="tour-kicker">
              {t.tour.label} · {t.tour.names[tour]}
            </p>
            {count > 1 && (
              <span className="tour-dots" role="img" aria-label={t.tour.stepOf(index + 1, count)}>
                {Array.from({ length: count }, (_, i) => (
                  <span key={i} className={`tour-dot${i < index ? ' is-done' : i === index ? ' is-current' : ''}`} />
                ))}
              </span>
            )}
          </div>
          <p id={textId} className="tour-text">
            <SpokenText text={line} typed={speech.typed} />
          </p>
          <div className="tour-footer">
            {!last && (
              <button type="button" className="tour-skip" onClick={onSkip}>
                {t.tour.skip}
              </button>
            )}
            <button ref={next} type="button" className="btn btn-primary tour-next" onClick={onNext} disabled={cheer}>
              {last ? t.tour.done : t.tour.next}
              {!last && <span aria-hidden="true"> ›</span>}
            </button>
          </div>
        </div>
        {cheer && (
          <span className="tour-cheer" role="status">
            {t.tour.nice}
          </span>
        )}
      </div>
    </div>
  );
}

/** Lo que ocupa el gesto: la mano donde empieza y donde acaba y, en un arrastre, su camino. */
function gestureBoxes(gesture: PlacedGesture | null): Box[] {
  if (!gesture) return [];
  const points = gesture.kind === 'drag' ? [gesture.from, gesture.to] : [gesture.at];
  const boxes = points.map((p) => ({ left: p.pageX + HAND_BOX.left, top: p.pageY + HAND_BOX.top, width: HAND_BOX.width, height: HAND_BOX.height }));
  if (gesture.kind === 'drag') {
    const { from, to } = gesture;
    const control = trailControl(from, to);
    for (let i = 1; i < TRAIL_SAMPLES; i++) {
      const k = i / TRAIL_SAMPLES;
      const x = (1 - k) * (1 - k) * from.pageX + 2 * (1 - k) * k * control.pageX + k * k * to.pageX;
      const y = (1 - k) * (1 - k) * from.pageY + 2 * (1 - k) * k * control.pageY + k * k * to.pageY;
      boxes.push({ left: x - TRAIL_BOX / 2, top: y - TRAIL_BOX / 2, width: TRAIL_BOX, height: TRAIL_BOX });
    }
  }
  return boxes;
}

/** Punto de control de la curva del arrastre: en medio, levantado hasta 90 px. */
function trailControl(from: { pageX: number; pageY: number }, to: { pageX: number; pageY: number }) {
  const lift = Math.min(90, Math.hypot(to.pageX - from.pageX, to.pageY - from.pageY) * 0.28);
  return { pageX: (from.pageX + to.pageX) / 2, pageY: (from.pageY + to.pageY) / 2 - lift };
}

function ShapeSvg({ shape, className }: { shape: Shape; className: string }) {
  if (shape.kind === 'rect') {
    const { left, top, width, height } = shape.box;
    return <rect className={className} x={left} y={top} width={width} height={height} rx={Math.min(16, height / 2)} />;
  }
  if (shape.kind === 'ellipse') return <ellipse className={className} cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} />;
  return <polygon className={className} points={shape.points.map((p) => `${p.pageX},${p.pageY}`).join(' ')} />;
}

/** Camino del arrastre: una curva de puntos que avanza, con punta de flecha, de donde se coge a donde se suelta. */
function Trail({ gesture }: { gesture: Extract<PlacedGesture, { kind: 'drag' }> }) {
  const { from, to } = gesture;
  const { pageX: cx, pageY: cy } = trailControl(from, to);
  // La punta sigue la direccion de la curva al llegar.
  const angle = Math.atan2(to.pageY - cy, to.pageX - cx);
  const head = (spread: number) => `${to.pageX - Math.cos(angle + spread) * 14},${to.pageY - Math.sin(angle + spread) * 14}`;
  return (
    <g className="tour-trail">
      <path d={`M${from.pageX},${from.pageY} Q${cx},${cy} ${to.pageX},${to.pageY}`} />
      <polyline points={`${head(0.5)} ${to.pageX},${to.pageY} ${head(-0.5)}`} />
    </g>
  );
}
