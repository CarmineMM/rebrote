import { BOARD } from '../config/balance';
import type { Cell } from '../core/board';
import { cardPlay, fusionTargets, mineAt, mineDragBlocker, mineInfusionTargets, plantAt, sownAt, type MatchState } from '../core/match';
import type { ElementType } from '../core/plants';

/**
 * Que se senala en el tablero en cada paso de un tour de ayuda (T-013, ADR-0012). Solo elige casillas con el estado y
 * las reglas de core: no decide nada del juego ni pinta. La escena las pasa a coordenadas de la pagina (`TourBoard`).
 */
export interface TourCells {
  /** Casilla libre para sembrar una disparadora: la mas a la izquierda del carril del centro (o del mas cercano). */
  sowCell: Cell | null;
  /** Casilla libre para una mina: algo adelantada, por donde llegaran los gusanos. */
  mineCell: Cell | null;
  /** Una disparadora (para tocarla, subirla de nivel o ver su ficha). */
  shooter: Cell | null;
  /** Disparadora que se puede infundir con una carta de elemento (fuego, y si no, hielo). */
  infusable: Cell | null;
  /** Mina que espera y disparadora a la que puede infundir arrastrandola (T-009). */
  mineInfusion: { mine: Cell; target: Cell } | null;
  /** Dos disparadoras que se pueden fusionar: la que se arrastra y la de destino. */
  fusion: { from: Cell; to: Cell } | null;
  /** Una mina de cada elemento (la recien sembrada, para contar como explota). */
  mines: Record<ElementType, Cell | null>;
}

/** Carriles del centro hacia fuera (2, 1, 3, 0, 4): lo senalado queda en mitad del cesped. */
export function lanesFromCenter(lanes: number = BOARD.lanes): number[] {
  const middle = (lanes - 1) / 2;
  return Array.from({ length: lanes }, (_, i) => i).sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle) || a - b);
}

/** Columnas preferidas para una mina: algo por delante de las plantas, sin llegar al borde. */
const MINE_COLUMNS = [5, 6, 4, 7, 3, 8, 2, 1, 0] as const;

/** Todas las casillas, carril a carril desde el centro y, en cada uno, en el orden de columnas dado. */
function cellsInOrder(columns: readonly number[]): Cell[] {
  return lanesFromCenter().flatMap((lane) => columns.map((col) => ({ lane, col })));
}

const LEFT_TO_RIGHT = Array.from({ length: BOARD.columns }, (_, col) => col);

function firstCell(columns: readonly number[], test: (cell: Cell) => boolean): Cell | null {
  return cellsInOrder(columns).find(test) ?? null;
}

/** Lo que conviene senalar ahora mismo para cada paso. */
export function tourCells(state: MatchState): TourCells {
  const free = (cell: Cell) => sownAt(state, cell) === null;
  const shooter = (cell: Cell) => plantAt(state, cell) !== null;
  const infusableWith = (element: ElementType) => (cell: Cell) => {
    const play = cardPlay(state, element, cell);
    return play.action === 'infuse' && play.blocker === null;
  };

  let mineInfusion: TourCells['mineInfusion'] = null;
  for (const mine of cellsInOrder(LEFT_TO_RIGHT)) {
    if (mineDragBlocker(state, mine) !== null) continue;
    const target = nearest(mine, mineInfusionTargets(state, mine));
    if (target) {
      mineInfusion = { mine, target };
      break;
    }
  }

  let fusion: TourCells['fusion'] = null;
  for (const from of cellsInOrder(LEFT_TO_RIGHT)) {
    if (!shooter(from)) continue;
    const to = nearest(from, fusionTargets(state, from));
    if (to) {
      fusion = { from, to };
      break;
    }
  }

  const mineOf = (element: ElementType) => firstCell(LEFT_TO_RIGHT, (cell) => mineAt(state, cell)?.element === element);

  return {
    sowCell: firstCell(LEFT_TO_RIGHT, free),
    mineCell: firstCell(MINE_COLUMNS, free),
    shooter: firstCell(LEFT_TO_RIGHT, shooter),
    infusable: firstCell(LEFT_TO_RIGHT, infusableWith('fire')) ?? firstCell(LEFT_TO_RIGHT, infusableWith('ice')),
    mineInfusion,
    fusion,
    mines: { fire: mineOf('fire'), ice: mineOf('ice') },
  };
}

/** La casilla mas cercana a `from` (en casillas), o null si no hay ninguna. */
function nearest(from: Cell, cells: readonly Cell[]): Cell | null {
  let best: Cell | null = null;
  let bestDistance = Infinity;
  for (const cell of cells) {
    const distance = Math.hypot(cell.lane - from.lane, cell.col - from.col);
    if (distance < bestDistance) {
      best = cell;
      bestDistance = distance;
    }
  }
  return best;
}
