import { describe, expect, it } from 'vitest';
import { BOARD } from '../config/balance';
import { cellAt, cellCenter, isOnBoard } from './board';

const { lanes, columns } = BOARD;

describe('casilla bajo un punto del tablero', () => {
  it('la esquina del fondo a la izquierda es la casilla 0,0', () => {
    expect(cellAt({ x: 0, y: 0 })).toEqual({ lane: 0, col: 0 });
  });

  it('el ultimo punto dentro es la ultima casilla', () => {
    expect(cellAt({ x: columns - 0.001, y: lanes - 0.001 })).toEqual({ lane: lanes - 1, col: columns - 1 });
  });

  it('fuera del tablero no hay casilla', () => {
    expect(cellAt({ x: -0.001, y: 0 })).toBeNull();
    expect(cellAt({ x: 0, y: -0.001 })).toBeNull();
    expect(cellAt({ x: columns, y: 0 })).toBeNull();
    expect(cellAt({ x: 0, y: lanes })).toBeNull();
    expect(cellAt({ x: Number.NaN, y: Number.NaN })).toBeNull();
  });

  it('el centro de cada casilla cae en esa misma casilla', () => {
    for (let lane = 0; lane < lanes; lane++) {
      for (let col = 0; col < columns; col++) {
        expect(cellAt(cellCenter({ lane, col }))).toEqual({ lane, col });
      }
    }
  });

  it('no acepta casillas con indices fuera de rango o con decimales', () => {
    expect(isOnBoard({ lane: lanes, col: 0 })).toBe(false);
    expect(isOnBoard({ lane: 0, col: -1 })).toBe(false);
    expect(isOnBoard({ lane: 0.5, col: 0 })).toBe(false);
  });
});
