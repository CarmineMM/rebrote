import { describe, expect, it } from 'vitest';
import { LIMITS } from '../config/balance';
import { MEDAL, MEDAL_TIERS, medalCenter, medalTier, showsMedal } from './levelMedal';
import { SHOOTER_BARRELS, SHOOTER_DOTS, SHOOTER_DOT_RADIUS, SHOOTER_EYE, shooterHead, type ShooterCannons } from './shooterShape';

const CANNONS: ShooterCannons[] = [1, 2, 3];
/** Hasta donde llegan las ondas del borde de la medallita (ver `paintMedal`). */
const MEDAL_REACH = MEDAL.radius + 3;

describe('medallita de nivel', () => {
  it('solo la llevan las plantas que se han subido', () => {
    expect(showsMedal(1)).toBe(false);
    expect(showsMedal(2)).toBe(true);
    expect(showsMedal(LIMITS.maxLevel)).toBe(true);
  });

  it('cambia de color cada 5 niveles y el maximo tiene el suyo', () => {
    expect([2, 3, 4].map(medalTier)).toEqual([0, 0, 0]);
    expect([5, 9].map(medalTier)).toEqual([1, 1]);
    expect([10, 14].map(medalTier)).toEqual([2, 2]);
    expect([15, 19].map(medalTier)).toEqual([3, 3]);
    expect(medalTier(LIMITS.maxLevel)).toBe(MEDAL_TIERS.length - 1);
  });

  it('va en la nuca: arriba a la izquierda de la cabeza', () => {
    for (const cannons of CANNONS) {
      const head = shooterHead(cannons);
      const center = medalCenter(head);
      expect(center.x).toBeLessThan(head.x);
      expect(center.y).toBeLessThan(head.y);
    }
  });

  it('no tapa los puntos del tallo, el ojo ni los canones, tambien en las fusionadas', () => {
    for (const cannons of CANNONS) {
      const center = medalCenter(shooterHead(cannons));
      const textureCannons = SHOOTER_DOTS.slice(0, cannons);
      for (const dot of textureCannons) {
        expect(Math.hypot(dot.x - center.x, dot.y - center.y)).toBeGreaterThan(MEDAL_REACH + SHOOTER_DOT_RADIUS);
      }
      // Punto del ojo mas cercano a la medallita, buscado por su borde.
      const eyeGap = Math.min(
        ...Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const x = SHOOTER_EYE.x + Math.cos(a) * SHOOTER_EYE.rx;
          const y = SHOOTER_EYE.y + Math.sin(a) * SHOOTER_EYE.ry;
          return Math.hypot(x - center.x, y - center.y);
        }),
      );
      expect(eyeGap).toBeGreaterThan(MEDAL_REACH);
      for (const barrel of SHOOTER_BARRELS[cannons]) expect(barrel.fromX).toBeGreaterThan(center.x + MEDAL_REACH);
    }
  });

  it('cabe en su textura', () => {
    expect(MEDAL_REACH * 2).toBeLessThanOrEqual(MEDAL.size);
  });
});
