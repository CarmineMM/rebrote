import { describe, expect, it } from 'vitest';
import { BOARD } from '../config/balance';
import { cellAt, cellCenter } from '../core/board';
import { LAWN } from './layout';
import { createPerspective } from './perspective';

const { columns, lanes } = BOARD;
const view = createPerspective(LAWN, columns, lanes);

const close = (actual: { x: number; y: number }, expected: { x: number; y: number }) => {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
};

describe('camara inclinada', () => {
  it('las esquinas del tablero caen en las esquinas del cesped', () => {
    close(view.toScreen({ x: 0, y: 0 }), LAWN.backLeft);
    close(view.toScreen({ x: columns, y: 0 }), LAWN.backRight);
    close(view.toScreen({ x: columns, y: lanes }), LAWN.frontRight);
    close(view.toScreen({ x: 0, y: lanes }), LAWN.frontLeft);
  });

  it('ida y vuelta entre tablero y pantalla devuelve el mismo punto', () => {
    for (let y = -0.5; y <= lanes + 0.5; y += 0.37) {
      for (let x = -1; x <= columns + 1; x += 0.61) {
        close(view.toBoard(view.toScreen({ x, y }))!, { x, y });
      }
    }
  });

  it('el centro de cada casilla en pantalla se reconoce como esa casilla', () => {
    for (let lane = 0; lane < lanes; lane++) {
      for (let col = 0; col < columns; col++) {
        const screen = view.toScreen(cellCenter({ lane, col }));
        expect(cellAt(view.toBoard(screen)!)).toEqual({ lane, col });
      }
    }
  });

  it('lo del fondo se ve mas pequeno: casillas mas estrechas y carriles mas bajos', () => {
    expect(view.cellWidthAt({ x: 4.5, y: 0.5 })).toBeLessThan(view.cellWidthAt({ x: 4.5, y: lanes - 0.5 }));
    const laneHeight = (lane: number) => view.toScreen({ x: 4.5, y: lane + 1 }).y - view.toScreen({ x: 4.5, y: lane }).y;
    for (let lane = 1; lane < lanes; lane++) {
      expect(laneHeight(lane)).toBeGreaterThan(laneHeight(lane - 1));
    }
  });

  it('por encima del horizonte no hay suelo', () => {
    expect(view.toBoard({ x: LAWN.backLeft.x, y: -1e7 })).toBeNull();
  });

  it('rechaza esquinas que no forman un cuadrilatero', () => {
    const p = { x: 0, y: 0 };
    expect(() => createPerspective({ backLeft: p, backRight: p, frontRight: p, frontLeft: p }, columns, lanes)).toThrow();
  });
});
