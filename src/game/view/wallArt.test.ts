import { describe, expect, it } from 'vitest';
import { SvgCanvas } from '../../icons/svgCanvas';
import { WALL_SIZE, WALL_WEARS, type WallWear, paintWall, wallWear } from './wallArt';

/** Pinta el muro con el lienzo que escribe SVG (T-028): devuelve el dibujo y lo que ocupa, sin DOM. */
function paint(wear: WallWear) {
  const parts: string[] = [];
  const defs: string[] = [];
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let ids = 0;
  const canvas = new SvgCanvas({
    part: (svg) => parts.push(svg),
    def: (svg) => defs.push(svg),
    id: () => `d${ids++}`,
    extend: (x, y, pad) => {
      box.x0 = Math.min(box.x0, x - pad);
      box.y0 = Math.min(box.y0, y - pad);
      box.x1 = Math.max(box.x1, x + pad);
      box.y1 = Math.max(box.y1, y + pad);
    },
  });
  paintWall(canvas.ctx, wear);
  return { svg: defs.join('') + parts.join(''), box };
}

describe('muro (T-024)', () => {
  it('pasa al desgaste 1 con dos tercios de vida y al 2 con un tercio', () => {
    expect(wallWear(1)).toBe(0);
    expect(wallWear(0.67)).toBe(0);
    expect(wallWear(0.66)).toBe(1);
    expect(wallWear(0.34)).toBe(1);
    expect(wallWear(0.33)).toBe(2);
    expect(wallWear(0)).toBe(2);
  });

  it('apoya los pies abajo y en el centro de su textura', () => {
    expect(WALL_SIZE.footX).toBe(WALL_SIZE.width / 2);
    expect(WALL_SIZE.footY).toBeGreaterThan(WALL_SIZE.height * 0.9);
    expect(WALL_SIZE.footY).toBeLessThanOrEqual(WALL_SIZE.height);
  });

  it.each(WALL_WEARS.map((wear) => [wear]))('con el desgaste %i cabe en su textura', (wear) => {
    const { box } = paint(wear);
    expect(box.x0).toBeGreaterThanOrEqual(0);
    expect(box.y0).toBeGreaterThanOrEqual(0);
    expect(box.x1).toBeLessThanOrEqual(WALL_SIZE.width);
    expect(box.y1).toBeLessThanOrEqual(WALL_SIZE.height);
  });

  it('cada desgaste se ve distinto', () => {
    const drawn = new Set(WALL_WEARS.map((wear) => paint(wear).svg));
    expect(drawn.size).toBe(WALL_WEARS.length);
  });
});
