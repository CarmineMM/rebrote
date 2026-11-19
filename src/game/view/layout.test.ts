import { describe, expect, it } from 'vitest';
import { BLEED, VIEW, WORLD, viewFor } from './layout';

const contains = (outer: { x: number; y: number; width: number; height: number }, inner: { x: number; y: number; width: number; height: number }) =>
  inner.x >= outer.x - 1e-9 &&
  inner.y >= outer.y - 1e-9 &&
  inner.x + inner.width <= outer.x + outer.width + 1e-9 &&
  inner.y + inner.height <= outer.y + outer.height + 1e-9;

const design = { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
const world = { x: WORLD.left, y: WORLD.top, width: WORLD.width, height: WORLD.height };

describe('vista a pantalla completa', () => {
  it('en 16:9 se ve exactamente el diseno', () => {
    expect(viewFor(16 / 9)).toEqual(design);
  });

  it.each([
    ['16:10', 16 / 10],
    ['4:3', 4 / 3],
    ['ventana de navegador 1920x950', 1920 / 950],
    ['portatil 1366x650', 1366 / 650],
    ['21:9', 21 / 9],
    ['5:4', 5 / 4],
  ])('en %s se ve el diseno entero, con la proporcion de la pantalla y sin salirse del mundo pintado', (_name, aspect) => {
    const view = viewFor(aspect);
    expect(view.width / view.height).toBeCloseTo(aspect, 6);
    expect(contains(view, design)).toBe(true);
    expect(contains(world, view)).toBe(true);
  });

  it('en pantallas altas el espacio extra va sobre todo al cielo', () => {
    const view = viewFor(4 / 3);
    const extraTop = -view.y;
    const extraBottom = view.y + view.height - VIEW.height;
    expect(extraTop).toBeGreaterThan(extraBottom);
    expect(extraBottom).toBeLessThanOrEqual(BLEED.bottom);
  });

  it('una proporcion invalida se trata como 16:9', () => {
    expect(viewFor(Number.NaN)).toEqual(design);
    expect(viewFor(0)).toEqual(design);
  });
});
