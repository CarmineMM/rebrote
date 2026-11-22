import { describe, expect, it } from 'vitest';
import { LEVEL_MILESTONES } from '../config/balance';
import { AURA_TIERS, auraTier, veilPhase, veilSize, veilStrength } from './wormAuraArt';

describe('aura de los gusanos (T-030)', () => {
  it('sale desde el nivel 5 (Z-01), con el tramo de la medallita', () => {
    expect(auraTier('worm', 1)).toBe(0);
    expect(auraTier('worm', 4)).toBe(0);
    expect(auraTier('worm', 5)).toBe(1);
    expect(auraTier('armored', 9)).toBe(1);
    expect(auraTier('spitter', 10)).toBe(2);
    expect(auraTier('worm', 14)).toBe(2);
    expect(auraTier('worm', 15)).toBe(3);
    expect(auraTier('worm', 19)).toBe(3);
    expect(auraTier('worm', 20)).toBe(AURA_TIERS);
  });

  it('empieza en el primer nivel con premio de los enemigos (T-035) y cambia en cada uno', () => {
    expect(auraTier('worm', LEVEL_MILESTONES.every)).toBe(1);
    expect(auraTier('worm', LEVEL_MILESTONES.every - 1)).toBe(0);
    expect(auraTier('worm', 2 * LEVEL_MILESTONES.every)).toBe(2);
  });

  it('la llevan las tres tropas, tambien las copias de Creeper (nivel 10, Z-02), pero no Creeper', () => {
    for (const kind of ['worm', 'armored', 'spitter'] as const) expect(auraTier(kind, 10)).toBe(2);
    expect(auraTier('creeper', 10)).toBe(0);
    expect(auraTier('creeper', 20)).toBe(0);
  });

  it('cada tramo es algo mas alto, ancho e intenso, y siempre muy suave', () => {
    for (let tier = 2; tier <= AURA_TIERS; tier++) {
      expect(veilSize(tier).height).toBeGreaterThan(veilSize(tier - 1).height);
      expect(veilSize(tier).width).toBeGreaterThan(veilSize(tier - 1).width);
      expect(veilStrength(tier)).toBeGreaterThan(veilStrength(tier - 1));
    }
    expect(veilStrength(AURA_TIERS)).toBeLessThanOrEqual(0.6);
  });

  it('cada velo sale del suelo sin verse, se enciende subiendo y se apaga arriba', () => {
    expect(veilPhase(0).alpha).toBeCloseTo(0);
    expect(veilPhase(0.5).alpha).toBeCloseTo(1);
    expect(veilPhase(0.999).alpha).toBeLessThan(0.01);
    expect(veilPhase(0.8).lift).toBeGreaterThan(veilPhase(0.2).lift);
    expect(veilPhase(1.25)).toEqual(veilPhase(0.25));
  });
});
