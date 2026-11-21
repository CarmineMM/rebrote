import type { OutbreakId } from '../../game/core/outbreaks';
import { newFeaturesAt, type Feature } from '../../game/core/rounds';
import type { CardId } from '../../game/core/match';
import type { PagePoint, PlayerAction, TourAreaId, TourBoard, TourSpotId } from '../../game/EventBus';

/**
 * Tours de ayuda (T-013, ADR-0012): que se ensena, con que pasos y cuando. Todo es dato y funciones puras: lo pinta
 * `TourOverlay` y lo pone en marcha `useTours`.
 *
 * Regla del proyecto: una mecanica nueva llega con su tour. Cada `Feature` de `rounds.ts` tiene el suyo en
 * `TOUR_OF_FEATURE` (si se anade una sin tour, no compila).
 */
export type TourId = 'basics' | 'levelUp' | 'fireMine' | 'iceMine' | 'infuse' | 'fuse';

/** Pistas sueltas que salen en mitad del juego, sin parar nada (T-013, G-08). */
export type HintId = 'droppedCoin';

/** Lo que se ensena al desbloquear cada cosa. Infundir fuego y hielo llegan juntos y van en un tour. */
export const TOUR_OF_FEATURE: Record<Feature, TourId> = {
  shooter: 'basics',
  levelUp: 'levelUp',
  fireMine: 'fireMine',
  iceMine: 'iceMine',
  fireInfuse: 'infuse',
  iceInfuse: 'infuse',
  fuse: 'fuse',
};

/** Piezas del HUD que un tour puede senalar: llevan `data-tour` con este nombre. */
export type HudTarget = 'card-shooter' | 'card-fire' | 'card-ice' | 'balance' | 'lives' | 'round-go' | 'level-up';

/** Algo que senalar: una pieza del HUD, una elipse del tablero o un contorno del tablero. */
export type Target = { hud: HudTarget } | { spot: TourSpotId } | { area: TourAreaId };

/** El gesto que hace la mano, en bucle. Al arrastrar una carta, lleva su dibujo. */
export type Gesture =
  | { kind: 'tap'; at: Target }
  | { kind: 'doubleTap'; at: Target }
  | { kind: 'drag'; from: Target; to: Target; carry?: CardId };

/** Lo que tiene que hacer el jugador para dar el paso por hecho. */
export type TourCue = 'sowShooter' | 'sowFire' | 'sowIce' | 'pick' | 'levelUp' | 'infuseCard' | 'infuseMine' | 'fuse' | 'info' | 'attack';

/** Dibujo animado del bocadillo (`TourPicture`). */
export type PictureId =
  | 'sow'
  | 'lane'
  | 'coins'
  | 'lives'
  | 'info'
  | 'go'
  | 'pick'
  | 'levelUp'
  | 'fireSow'
  | 'fireBoom'
  | 'iceSow'
  | 'iceFreeze'
  | 'infuseCard'
  | 'infuseMine'
  | 'fuse';

export interface TourStep {
  /** Clave de su frase en `tour.steps.<tour>` de `src/i18n/`. */
  id: string;
  /** Lo que se ilumina. Lo que no esta (sin planta, sin par...) no se ilumina y el paso sale igual (G-07). */
  spots: Target[];
  gesture: Gesture | null;
  /** Hacerlo de verdad completa el paso; sin nada, solo se pasa con "Siguiente". */
  doneWhen: TourCue | null;
  picture: PictureId;
}

const hud = (name: HudTarget): Target => ({ hud: name });
const spot = (name: TourSpotId): Target => ({ spot: name });
const area = (name: TourAreaId): Target => ({ area: name });

export const TOURS: Record<TourId, readonly TourStep[]> = {
  basics: [
    {
      id: 'sow',
      spots: [hud('card-shooter'), spot('sowCell')],
      gesture: { kind: 'drag', from: hud('card-shooter'), to: spot('sowCell'), carry: 'shooter' },
      doneWhen: 'sowShooter',
      picture: 'sow',
    },
    { id: 'lane', spots: [area('shooterLane'), spot('shooter')], gesture: null, doneWhen: null, picture: 'lane' },
    { id: 'coins', spots: [hud('balance'), hud('card-shooter')], gesture: null, doneWhen: null, picture: 'coins' },
    { id: 'lives', spots: [hud('lives'), area('exit')], gesture: null, doneWhen: null, picture: 'lives' },
    { id: 'info', spots: [spot('shooter')], gesture: { kind: 'doubleTap', at: spot('shooter') }, doneWhen: 'info', picture: 'info' },
    { id: 'go', spots: [hud('round-go')], gesture: { kind: 'tap', at: hud('round-go') }, doneWhen: 'attack', picture: 'go' },
  ],
  levelUp: [
    { id: 'pick', spots: [spot('shooter')], gesture: { kind: 'tap', at: spot('shooter') }, doneWhen: 'pick', picture: 'pick' },
    { id: 'up', spots: [hud('level-up')], gesture: { kind: 'tap', at: hud('level-up') }, doneWhen: 'levelUp', picture: 'levelUp' },
  ],
  fireMine: [
    {
      id: 'sow',
      spots: [hud('card-fire'), spot('mineCell')],
      gesture: { kind: 'drag', from: hud('card-fire'), to: spot('mineCell'), carry: 'fire' },
      doneWhen: 'sowFire',
      picture: 'fireSow',
    },
    { id: 'boom', spots: [spot('fireBlast')], gesture: null, doneWhen: null, picture: 'fireBoom' },
  ],
  iceMine: [
    {
      id: 'sow',
      spots: [hud('card-ice'), spot('mineCell')],
      gesture: { kind: 'drag', from: hud('card-ice'), to: spot('mineCell'), carry: 'ice' },
      doneWhen: 'sowIce',
      picture: 'iceSow',
    },
    { id: 'freeze', spots: [spot('iceBlast')], gesture: null, doneWhen: null, picture: 'iceFreeze' },
  ],
  infuse: [
    {
      id: 'card',
      spots: [hud('card-fire'), spot('infusable')],
      gesture: { kind: 'drag', from: hud('card-fire'), to: spot('infusable'), carry: 'fire' },
      doneWhen: 'infuseCard',
      picture: 'infuseCard',
    },
    {
      id: 'mine',
      spots: [spot('mine'), spot('mineTarget')],
      gesture: { kind: 'drag', from: spot('mine'), to: spot('mineTarget') },
      doneWhen: 'infuseMine',
      picture: 'infuseMine',
    },
  ],
  fuse: [
    {
      id: 'drag',
      spots: [spot('fuseFrom'), spot('fuseTo')],
      gesture: { kind: 'drag', from: spot('fuseFrom'), to: spot('fuseTo') },
      doneWhen: 'fuse',
      picture: 'fuse',
    },
  ],
};

/**
 * Tours de lo que desbloquea por primera vez la ronda `index` (desde 0) del brote, en orden y sin repetir. Lo que llego
 * desbloqueado de un brote anterior (T-018, B-01) no trae tour: ya se enseno alli.
 */
export function toursOfRound(outbreak: OutbreakId, index: number): TourId[] {
  const tours: TourId[] = [];
  for (const feature of newFeaturesAt(outbreak, index)) {
    const tour = TOUR_OF_FEATURE[feature];
    if (!tours.includes(tour)) tours.push(tour);
  }
  return tours;
}

/** Lo que el paso da por hecho al ver que hizo el jugador. */
export function cueOf(action: PlayerAction): TourCue {
  switch (action.type) {
    case 'sow':
      return action.card === 'shooter' ? 'sowShooter' : action.card === 'fire' ? 'sowFire' : 'sowIce';
    case 'infuse':
      return action.withMine ? 'infuseMine' : 'infuseCard';
    case 'pick':
      return 'pick';
    case 'levelUp':
      return 'levelUp';
    case 'fuse':
      return 'fuse';
  }
}

/** Rectangulo en la pagina. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Lo que se pinta de un objetivo: un rectangulo redondeado (HUD), una elipse o un contorno (tablero). */
export type Shape =
  | { kind: 'rect'; box: Box }
  | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number }
  | { kind: 'poly'; points: PagePoint[] };

/** Gesto con sus puntos ya en la pagina. */
export type PlacedGesture =
  | { kind: 'tap' | 'doubleTap'; at: PagePoint }
  | { kind: 'drag'; from: PagePoint; to: PagePoint; carry?: CardId };

export interface PlacedStep {
  shapes: Shape[];
  gesture: PlacedGesture | null;
}

/** Margen alrededor de una pieza del HUD iluminada. */
const HUD_PAD = 6;

/** Donde esta cada objetivo ahora mismo; null si no esta (no hay planta, el panel de nivel esta cerrado...). */
export function placeTarget(target: Target, board: TourBoard | null, hudBoxes: Partial<Record<HudTarget, Box>>): Shape | null {
  if ('hud' in target) {
    const box = hudBoxes[target.hud];
    if (!box || box.width <= 0 || box.height <= 0) return null;
    return {
      kind: 'rect',
      box: { left: box.left - HUD_PAD, top: box.top - HUD_PAD, width: box.width + HUD_PAD * 2, height: box.height + HUD_PAD * 2 },
    };
  }
  if ('spot' in target) {
    const found = board?.spots[target.spot];
    return found ? { kind: 'ellipse', ...found } : null;
  }
  const points = board?.areas[target.area];
  return points && points.length >= 3 ? { kind: 'poly', points } : null;
}

/** Centro de una forma: donde apunta el dedo. */
export function shapeCenter(shape: Shape): PagePoint {
  if (shape.kind === 'rect') return { pageX: shape.box.left + shape.box.width / 2, pageY: shape.box.top + shape.box.height / 2 };
  if (shape.kind === 'ellipse') return { pageX: shape.x, pageY: shape.y };
  const n = shape.points.length;
  return {
    pageX: shape.points.reduce((sum, p) => sum + p.pageX, 0) / n,
    pageY: shape.points.reduce((sum, p) => sum + p.pageY, 0) / n,
  };
}

/** Caja que ocupa una forma. */
export function shapeBox(shape: Shape): Box {
  if (shape.kind === 'rect') return shape.box;
  if (shape.kind === 'ellipse') return { left: shape.x - shape.rx, top: shape.y - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
  const xs = shape.points.map((p) => p.pageX);
  const ys = shape.points.map((p) => p.pageY);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/**
 * El paso con lo que hay ahora: lo que falta no se ilumina, y el gesto solo sale si estan todos sus puntos. Asi un tour
 * nunca se atasca (G-07): sin nada que senalar queda el bocadillo con su dibujo.
 */
export function placeStep(step: TourStep, board: TourBoard | null, hudBoxes: Partial<Record<HudTarget, Box>>): PlacedStep {
  const shapes = step.spots.map((target) => placeTarget(target, board, hudBoxes)).filter((shape): shape is Shape => shape !== null);
  const point = (target: Target) => {
    const shape = placeTarget(target, board, hudBoxes);
    return shape ? shapeCenter(shape) : null;
  };
  let gesture: PlacedGesture | null = null;
  const g = step.gesture;
  if (g?.kind === 'drag') {
    const from = point(g.from);
    const to = point(g.to);
    if (from && to) gesture = { kind: 'drag', from, to, carry: g.carry };
  } else if (g) {
    const at = point(g.at);
    if (at) gesture = { kind: g.kind, at };
  }
  return { shapes, gesture };
}

/** Piezas del HUD que usa algun paso: son las que hay que medir. */
export function hudTargetsOf(step: TourStep): HudTarget[] {
  const all: Target[] = [...step.spots];
  if (step.gesture?.kind === 'drag') all.push(step.gesture.from, step.gesture.to);
  else if (step.gesture) all.push(step.gesture.at);
  const names = all.flatMap((target) => ('hud' in target ? [target.hud] : []));
  return [...new Set(names)];
}
