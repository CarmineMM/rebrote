import { describe, expect, it } from 'vitest';
import { MEDAL } from '../levelMedal';
import { SHOOTER } from '../shooterShape';
import { SHOOTER_DESIGNS } from './catalog';
import { SHOOTER_CANNONS, type Barrel, type Ellipse, type Point } from './design';
import { BULB_SHOOTER } from './bulb';
import { LEGACY_SHOOTER } from './legacy';

/** Hasta donde llegan las ondas del borde de la medallita (ver `paintMedal`). */
const MEDAL_REACH = MEDAL.radius + 3;

/** Distancia de un punto al borde de una elipse, buscada por su contorno (negativa no hace falta: basta con el borde). */
function gapToEllipse(p: Point, e: Ellipse): number {
  return Math.min(
    ...Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      return Math.hypot(e.x + Math.cos(a) * e.rx - p.x, e.y + Math.sin(a) * e.ry - p.y);
    }),
  );
}

/** Distancia de un punto al tramo final de un canon (de donde nace a la boca), descontando medio tubo. */
function gapToBarrel(p: Point, b: Barrel): number {
  const dx = b.mouthX - b.fromX;
  const dy = b.y - b.fromY;
  const t = Math.max(0, Math.min(1, ((p.x - b.fromX) * dx + (p.y - b.fromY) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(b.fromX + dx * t - p.x, b.fromY + dy * t - p.y) - b.h / 2;
}

describe('formas de la disparadora (T-016)', () => {
  it('el juego usa "Brote" (X-03) y la de antes sigue guardada como legacy', () => {
    expect(SHOOTER).toBe(BULB_SHOOTER);
    expect(SHOOTER_DESIGNS).toContain(LEGACY_SHOOTER);
  });

  it('cada forma tiene su clave', () => {
    const ids = SHOOTER_DESIGNS.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const design of SHOOTER_DESIGNS) {
    describe(design.id, () => {
      it('mide una casilla de ancho y apoya los pies dentro de su textura', () => {
        const { width, height, footX, footY } = design.size;
        expect(width).toBe(160);
        expect(footX).toBeGreaterThan(0);
        expect(footX).toBeLessThan(width);
        expect(footY).toBeGreaterThan(height * 0.9);
        expect(footY).toBeLessThanOrEqual(height);
      });

      it('tiene un canon por canon, de arriba abajo, con la boca a la derecha y dentro de la textura', () => {
        for (const cannons of SHOOTER_CANNONS) {
          const barrels = design.barrels[cannons];
          expect(barrels).toHaveLength(cannons);
          for (let i = 1; i < barrels.length; i++) expect(barrels[i].y).toBeGreaterThan(barrels[i - 1].y + barrels[i].h * 0.8);
          for (const barrel of barrels) {
            expect(barrel.mouthX).toBeGreaterThan(design.size.footX);
            expect(barrel.mouthX).toBeGreaterThan(barrel.fromX);
            expect(barrel.mouthX + barrel.h * 0.3).toBeLessThanOrEqual(design.size.width);
            expect(barrel.y - barrel.h / 2).toBeGreaterThan(0);
          }
        }
      });

      it('tiene una marca por canon', () => {
        for (const cannons of SHOOTER_CANNONS) expect(design.marks(cannons)).toHaveLength(cannons);
      });

      it('lleva la medallita en la nuca, dentro de su textura, sin tapar el ojo, los canones ni las marcas', () => {
        for (const cannons of SHOOTER_CANNONS) {
          const center = design.medal(cannons);
          const eye = design.eye(cannons);
          expect(center.x).toBeLessThan(eye.x);
          expect(center.y).toBeLessThan(eye.y);
          expect(center.x - MEDAL_REACH).toBeGreaterThanOrEqual(0);
          expect(center.y - MEDAL_REACH).toBeGreaterThanOrEqual(0);
          expect(gapToEllipse(center, eye)).toBeGreaterThan(MEDAL_REACH);
          for (const barrel of design.barrels[cannons]) expect(gapToBarrel(center, barrel)).toBeGreaterThan(MEDAL_REACH);
          for (const mark of design.marks(cannons)) {
            expect(Math.hypot(mark.x - center.x, mark.y - center.y)).toBeGreaterThan(MEDAL_REACH + mark.r);
          }
        }
      });
    });
  }
});
