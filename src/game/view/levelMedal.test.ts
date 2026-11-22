import { describe, expect, it } from 'vitest';
import { LIMITS } from '../config/balance';
import { MEDAL, MEDAL_TIERS, medalTier, showsMedal, showsSprout } from './levelMedal';

/** Hasta donde llegan las ondas del borde de la medallita (ver `paintMedal`). */
const MEDAL_REACH = MEDAL.radius + 3;

// Donde va en cada forma de la disparadora (en la nuca, sin tapar el ojo, los canones ni las marcas), en
// `shooters/designs.test.ts` (T-016).
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

  it('cabe en su textura', () => {
    expect(MEDAL_REACH * 2).toBeLessThanOrEqual(MEDAL.size);
  });
});

describe('brote del Invernadero (T-023)', () => {
  it('lo lleva la medallita de una partida con nivel base comprado; sin comprar, nunca', () => {
    expect(showsSprout(5, 5)).toBe(true);
    expect(showsSprout(7, 3)).toBe(true);
    expect(showsSprout(5, 1)).toBe(false);
    expect(showsSprout(1, 1)).toBe(false);
  });
});
