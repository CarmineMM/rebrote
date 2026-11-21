import { describe, expect, it } from 'vitest';
import { LIMITS } from '../config/balance';
import { isMilestoneLevel } from '../core/plants';
import { GARDEN_LEVELS, GARDEN_TIERS, gardenSpots, gardenTier } from './gardenArt';
import { MEDAL_TIERS, medalTier } from './levelMedal';

describe('jardincito de los niveles con premio', () => {
  it('sale en los niveles con premio y crece en cada uno', () => {
    expect(GARDEN_LEVELS).toEqual([5, 10, 15, 20]);
    expect([1, 2, 4].map(gardenTier)).toEqual([0, 0, 0]);
    expect([5, 9, 10, 14, 15, 19, 20].map(gardenTier)).toEqual([1, 1, 2, 2, 3, 3, 4]);
    expect(gardenTier(LIMITS.maxLevel)).toBe(GARDEN_TIERS);
  });

  it('cambia justo en los niveles con premio, que son los que cambian el color de la medallita', () => {
    for (let level = 3; level <= LIMITS.maxLevel; level++) {
      const changes = gardenTier(level) !== gardenTier(level - 1);
      expect(changes).toBe(isMilestoneLevel(level));
      if (changes) expect(medalTier(level)).not.toBe(medalTier(level - 1));
    }
    // Un color de la medallita (plata, oro, rubi y cristal) por tramo del jardincito.
    expect(MEDAL_TIERS.length - 1).toBe(GARDEN_TIERS);
  });

  it('cada premio anade trozos: dos detras y, desde el 10 y el 15, uno mas delante', () => {
    expect(gardenSpots(0)).toEqual([]);
    expect([1, 2, 3, 4].map((tier) => gardenSpots(tier).length)).toEqual([2, 3, 4, 4]);
    expect(gardenSpots(1).every((spot) => !spot.front)).toBe(true);
  });

  it('lo de delante va a los lados, sin tapar el centro de la planta, y nada se va a la casilla de al lado', () => {
    for (let tier = 1; tier <= GARDEN_TIERS; tier++) {
      for (const spot of gardenSpots(tier)) {
        if (spot.front) expect(Math.abs(spot.dx)).toBeGreaterThanOrEqual(0.25);
        expect(Math.abs(spot.dx)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(spot.dy)).toBeLessThanOrEqual(0.15);
      }
    }
  });
});
