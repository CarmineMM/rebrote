import { BOARD } from '../config/balance';
import { createPerspective, type BoardQuad } from './perspective';

/**
 * Composicion de la escena: tamano del lienzo y donde cae el cesped. Son numeros de aspecto,
 * no de balance; por eso viven aqui y no en balance.ts.
 */
export const VIEW = { width: 1600, height: 900 } as const;

/**
 * Decorado extra alrededor del diseno (ADR-0007). El juego llena toda la pantalla: si la ventana no es 16:9,
 * en vez de bandas negras se ve mas mundo por los lados (pantallas anchas) o arriba y abajo (pantallas altas).
 */
export const BLEED = { side: 360, top: 360, bottom: 200 } as const;

/** Todo el mundo pintado: el diseno mas el decorado extra. */
export const WORLD = {
  left: -BLEED.side,
  top: -BLEED.top,
  right: VIEW.width + BLEED.side,
  bottom: VIEW.height + BLEED.bottom,
  width: VIEW.width + 2 * BLEED.side,
  height: VIEW.height + BLEED.top + BLEED.bottom,
} as const;

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** En pantallas altas, que parte del espacio extra va arriba (cielo); el resto va abajo (tierra). */
const EXTRA_HEIGHT_ON_TOP = 0.65;

/**
 * Trozo del mundo que se ve en una pantalla de proporcion `aspect` (ancho / alto).
 * Siempre contiene el diseno entero (1600 x 900) y tiene exactamente esa proporcion.
 */
export function viewFor(aspect: number): ViewRect {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : VIEW.width / VIEW.height;
  if (safeAspect >= VIEW.width / VIEW.height) {
    const width = VIEW.height * safeAspect;
    return { x: (VIEW.width - width) / 2, y: 0, width, height: VIEW.height };
  }
  const height = VIEW.width / safeAspect;
  return { x: 0, y: -(height - VIEW.height) * EXTRA_HEIGHT_ON_TOP, width: VIEW.width, height };
}

/** El cesped ocupa la parte baja y central; arriba queda el cielo y a los lados el decorado. */
export const LAWN: BoardQuad = {
  backLeft: { x: 330, y: 385 },
  backRight: { x: 1270, y: 385 },
  frontRight: { x: 1410, y: 845 },
  frontLeft: { x: 190, y: 845 },
};

export const perspective = createPerspective(LAWN, BOARD.columns, BOARD.lanes);

/** Franjas del decorado en unidades de tablero (x = columnas, y = carriles), fuera del cesped. */
export const SCENERY = {
  /** Borde delantero del terreno, donde se ve el corte de tierra. */
  frontEdgeY: BOARD.lanes + 0.12,
  hedgeY: -0.1,
  path: { fromX: -0.78, toX: -0.1 },
  /** El bancal llega hasta el borde izquierdo del mundo, para las pantallas anchas. */
  flowerBed: { fromX: -4.6, toX: -0.86 },
  /** Zona donde se plantan las flores animadas (la parte del bancal que casi siempre se ve). */
  flowerSpots: { fromX: -4.3, toX: -0.96 },
  corruption: { fromX: BOARD.columns + 0.08, toX: BOARD.columns + 7 },
  /** Columna de los agujeros por los que saldran los gusanos (T-002), uno por carril. */
  holeX: BOARD.columns + 0.75,
  sun: { x: 1040, y: 112 },
} as const;

/** Orden de dibujo. Las entidades usan `entities + y en pantalla` para que lo de delante tape lo de atras. */
export const DEPTH = {
  sky: 0,
  sun: 1,
  clouds: 2,
  birds: 3,
  land: 10,
  canopy: 11,
  groundFx: 12,
  highlight: 20,
  entities: 100,
  pollen: 1050,
  butterflies: 1060,
  foreground: 1100,
  /**
   * Monedas soltadas que esperan a que el jugador las recoja (T-010): por encima de enemigos y matas para que siempre se
   * vean y se puedan pulsar, aunque se queden donde cayeron. Entre ellas, la de delante tapa a la de atras.
   */
  droppedCoins: 1110,
  floatText: 1200,
} as const;

export const entityDepth = (screenY: number): number => DEPTH.entities + screenY;
