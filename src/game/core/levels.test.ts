import { describe, expect, it } from 'vitest';
import { LEVEL_MILESTONES } from '../config/balance';
import { compoundGrowth, isDoubleMilestone, isMilestone, milestonesReached } from './levels';

describe('regla de los niveles (T-035): premio cada 5 niveles', () => {
  it('da premio cada `every` niveles, tambien por encima del 20', () => {
    expect(LEVEL_MILESTONES.every).toBe(5);
    expect([5, 10, 15, 20, 25, 30].every(isMilestone)).toBe(true);
    expect([0, 1, 4, 6, 9, 11, 21, 2.5, -5].some(isMilestone)).toBe(false);
  });

  it('el 10, el 20 y el 30 son dos premios a la vez', () => {
    expect([10, 20, 30].every(isDoubleMilestone)).toBe(true);
    expect([5, 15, 25, 4].some(isDoubleMilestone)).toBe(false);
  });

  it('cuenta los premios alcanzados', () => {
    expect([0, 1, 4, 5, 9, 10, 14, 15, 20, 25].map(milestonesReached)).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 4, 5]);
  });

  it('crecimiento compuesto: cada nivel multiplica lo del anterior, y los de premio con lo suyo', () => {
    expect(compoundGrowth(1, 0.1, 0.5)).toBe(1);
    expect(compoundGrowth(3, 0.1, 0.5)).toBeCloseTo(1.1 * 1.1);
    expect(compoundGrowth(5, 0.1, 0.5)).toBeCloseTo(1.1 ** 3 * 1.5);
    expect(compoundGrowth(10, 0.1, 0.5)).toBeCloseTo(1.1 ** 7 * 1.5 ** 2);
    expect(compoundGrowth(9, 0, 0.25)).toBeCloseTo(1.25);
  });
});
