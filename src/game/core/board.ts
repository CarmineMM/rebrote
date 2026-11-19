import { BOARD } from '../config/balance';

/** Casilla del tablero: carril (fila, 0 es el del fondo) y columna (0 es la de la izquierda). */
export interface Cell {
  lane: number;
  col: number;
}

/**
 * Punto sobre el tablero en unidades de casilla. `x` avanza por las columnas (hacia la derecha)
 * y `y` por los carriles (hacia el frente). La casilla {lane: 2, col: 3} ocupa x en [3, 4) e y en [2, 3).
 * Es independiente de como se pinte: la vista lo proyecta a pantalla (ver src/game/view/perspective.ts).
 */
export interface BoardPoint {
  x: number;
  y: number;
}

export function isOnBoard(cell: Cell): boolean {
  const { lane, col } = cell;
  return (
    Number.isInteger(lane) &&
    Number.isInteger(col) &&
    lane >= 0 &&
    lane < BOARD.lanes &&
    col >= 0 &&
    col < BOARD.columns
  );
}

/** Casilla que contiene el punto, o null si cae fuera del tablero. */
export function cellAt(point: BoardPoint): Cell | null {
  const cell = { lane: Math.floor(point.y), col: Math.floor(point.x) };
  return isOnBoard(cell) ? cell : null;
}

export function cellCenter(cell: Cell): BoardPoint {
  return { x: cell.col + 0.5, y: cell.lane + 0.5 };
}
