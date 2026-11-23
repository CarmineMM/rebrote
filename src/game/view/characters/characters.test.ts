import { describe, expect, it } from 'vitest';
import { SvgCanvas } from '../../../icons/svgCanvas';
import { CAST } from './cast';
import { BOXER_PROPOSALS, CHARACTER_PROPOSALS, PATTY_PROPOSALS } from './catalog';
import { type CharacterDesign, EXPRESSIONS, PORTRAIT_SIZE, type Pose } from './design';

/** Todas las poses que pinta la viñeta: las cuatro expresiones, con los ojos abiertos o cerrados y la boca abierta o cerrada. */
const POSES: Pose[] = EXPRESSIONS.flatMap((expression) =>
  [false, true].flatMap((blink) => [false, true].map((open) => ({ expression, blink, open }))),
);

/** Pinta la pose con el lienzo que escribe SVG (T-028): devuelve el dibujo y lo que ocupa, sin DOM. */
function paint(design: CharacterDesign, pose: Pose) {
  const parts: string[] = [];
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let ids = 0;
  const canvas = new SvgCanvas({
    part: (svg) => parts.push(svg),
    def: () => {},
    id: () => `d${ids++}`,
    extend: (x, y, pad) => {
      box.x0 = Math.min(box.x0, x - pad);
      box.y0 = Math.min(box.y0, y - pad);
      box.x1 = Math.max(box.x1, x + pad);
      box.y1 = Math.max(box.y1, y + pad);
    },
  });
  design.paint(canvas.ctx, pose);
  return { svg: parts.join(''), box };
}

describe('personajes (T-031)', () => {
  it('hay tres propuestas de Boxer y tres de Patty, cada una con su id', () => {
    expect(BOXER_PROPOSALS).toHaveLength(3);
    expect(PATTY_PROPOSALS).toHaveLength(3);
    expect(BOXER_PROPOSALS.every((design) => design.character === 'boxer')).toBe(true);
    expect(PATTY_PROPOSALS.every((design) => design.character === 'patty')).toBe(true);
    expect(new Set(CHARACTER_PROPOSALS.map((design) => design.id)).size).toBe(CHARACTER_PROPOSALS.length);
  });

  it('el juego usa una propuesta de cada personaje', () => {
    expect(CAST.boxer.character).toBe('boxer');
    expect(CAST.patty.character).toBe('patty');
    expect(CHARACTER_PROPOSALS).toContain(CAST.boxer);
    expect(CHARACTER_PROPOSALS).toContain(CAST.patty);
  });

  it.each(CHARACTER_PROPOSALS.map((design) => [design.id, design] as const))('%s: el busto cabe en el retrato en todas las poses', (_id, design) => {
    for (const pose of POSES) {
      const { box } = paint(design, pose);
      expect(box.x0).toBeGreaterThanOrEqual(0);
      expect(box.y0).toBeGreaterThanOrEqual(0);
      expect(box.x1).toBeLessThanOrEqual(PORTRAIT_SIZE.width);
      expect(box.y1).toBeLessThanOrEqual(PORTRAIT_SIZE.height);
    }
  });

  it.each(CHARACTER_PROPOSALS.map((design) => [design.id, design] as const))('%s: cada expresion, el parpadeo y la boca cambian el dibujo', (_id, design) => {
    const drawn = new Set(POSES.map((pose) => paint(design, pose).svg));
    expect(drawn.size).toBe(POSES.length);
  });
});
