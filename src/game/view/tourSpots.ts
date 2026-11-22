import { BOARD } from '../config/balance';
import type { Cell } from '../core/board';
import { cardPlay, elementDragBlocker, elementInfusionTargets, fusionTargets, mineAt, plantAt, sownAt, wallAt, type MatchState } from '../core/match';
import type { ElementType, MineElement } from '../core/plants';
import { iceWallCellsIn, relocateTargets } from '../core/powers';

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
  mines: Record<MineElement, Cell | null>;
  /**
   * Casilla libre para un muro (T-024): justo delante de una disparadora, en su carril, para que la proteja; sin
   * disparadoras, una algo adelantada como la de la mina.
   */
  wallCell: Cell | null;
  /** Un muro sembrado (T-024). */
  wall: Cell | null;
  /** Disparadora que se puede infundir con la carta de escudo (T-024). */
  shieldInfusable: Cell | null;
  /** Casilla libre a la que llevar la disparadora de `shooter` con el poder de recolocar (T-021): la mas cercana. */
  relocateTo: Cell | null;
  /** Donde lanzar la granada (T-021): algo adelantada, por donde llegan los enemigos, en el carril del centro. */
  grenadeCell: Cell;
  /** Donde poner el muro de hielo (T-021): una casilla con sus tres casillas libres, algo adelantada. */
  iceWallCell: Cell | null;
}

/** Columnas preferidas para lanzar la granada o poner el muro de hielo: por delante de las plantas. */
const POWER_COLUMNS = [6, 5, 7, 4, 8, 3, 2, 1, 0] as const;

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
    if (!mineAt(state, mine) || elementDragBlocker(state, mine) !== null) continue;
    const target = nearest(mine, elementInfusionTargets(state, mine));
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

  const mineOf = (element: MineElement) => firstCell(LEFT_TO_RIGHT, (cell) => mineAt(state, cell)?.element === element);
  const mineCell = firstCell(MINE_COLUMNS, free);

  const firstShooter = firstCell(LEFT_TO_RIGHT, shooter);

  // Delante de una disparadora: la primera casilla libre a su derecha, en su carril, antes de que haya otra cosa sembrada.
  let wallCell: Cell | null = null;
  for (const at of cellsInOrder(LEFT_TO_RIGHT)) {
    if (!shooter(at)) continue;
    const ahead = { lane: at.lane, col: at.col + 1 };
    if (ahead.col < BOARD.columns && free(ahead)) {
      wallCell = ahead;
      break;
    }
  }

  return {
    sowCell: firstCell(LEFT_TO_RIGHT, free),
    mineCell,
    shooter: firstShooter,
    infusable: firstCell(LEFT_TO_RIGHT, infusableWith('fire')) ?? firstCell(LEFT_TO_RIGHT, infusableWith('ice')),
    mineInfusion,
    fusion,
    mines: { fire: mineOf('fire'), ice: mineOf('ice') },
    wallCell: wallCell ?? mineCell,
    wall: firstCell(LEFT_TO_RIGHT, (cell) => wallAt(state, cell) !== null),
    shieldInfusable: firstCell(LEFT_TO_RIGHT, infusableWith('shield')),
    relocateTo: firstShooter ? nearest(firstShooter, relocateTargets(state, firstShooter)) : null,
    grenadeCell: firstCell(POWER_COLUMNS, () => true) as Cell,
    iceWallCell: firstCell(POWER_COLUMNS, (cell) => iceWallCellsIn(state, cell).every(free)),
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
