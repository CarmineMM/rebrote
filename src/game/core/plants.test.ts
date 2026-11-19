import { describe, expect, it } from 'vitest';
import { COSTS, ENEMIES, LEVELING, LIMITS, SHOOTER } from '../config/balance';
import {
  canFuse,
  canInfuse,
  canLevelUp,
  createShooter,
  damageMultiplier,
  fireRateMultiplier,
  fuse,
  fuseBlocker,
  infuse,
  infusionCost,
  levelBonus,
  levelUp,
  levelUpCost,
  plantMaxHp,
  type Shooter,
} from './plants';

const shooter = (over: Partial<Shooter> = {}): Shooter => ({ ...createShooter(), ...over });

describe('fusionar', () => {
  it('suma canones entre plantas de la misma variante', () => {
    expect(fuse(shooter(), shooter()).cannons).toBe(2);
    expect(fuse(shooter({ cannons: 2 }), shooter()).cannons).toBe(3);
  });

  it('se queda con el nivel mas bajo', () => {
    expect(fuse(shooter({ level: 7 }), shooter({ level: 9 })).level).toBe(7);
  });

  it('no permite mezclar variantes', () => {
    expect(canFuse(shooter({ element: 'fire' }), shooter())).toBe(false);
    expect(canFuse(shooter({ element: 'fire' }), shooter({ element: 'ice' }))).toBe(false);
  });

  it('no permite pasar de 3 canones', () => {
    expect(canFuse(shooter({ cannons: 2 }), shooter({ cannons: 2 }))).toBe(false);
    expect(canFuse(shooter({ cannons: 3 }), shooter())).toBe(false);
  });

  it('dice por que no se puede', () => {
    expect(fuseBlocker(shooter(), shooter())).toBeNull();
    expect(fuseBlocker(shooter({ cannons: 2 }), shooter())).toBeNull();
    expect(fuseBlocker(shooter({ element: 'ice' }), shooter())).toBe('variant');
    expect(fuseBlocker(shooter({ cannons: 2 }), shooter({ cannons: 2 }))).toBe('max-cannons');
    // Con otra variante, aunque tambien sobren canones, el motivo es la variante.
    expect(fuseBlocker(shooter({ element: 'fire', cannons: 2 }), shooter({ cannons: 2 }))).toBe('variant');
  });

  it('entre plantas de fuego o de hielo tambien se puede', () => {
    expect(fuse(shooter({ element: 'fire' }), shooter({ element: 'fire' }))).toEqual({ element: 'fire', cannons: 2, level: 1 });
    expect(canFuse(shooter({ element: 'ice', cannons: 2 }), shooter({ element: 'ice' }))).toBe(true);
  });

  it('no permite fusionar lo que no se puede', () => {
    expect(() => fuse(shooter({ element: 'fire' }), shooter())).toThrow();
  });
});

describe('vida', () => {
  it('una de un canon tiene la vida de la disparadora y una fusionada, la suma de sus partes (D-02)', () => {
    expect(plantMaxHp(shooter())).toBe(SHOOTER.hp);
    expect(plantMaxHp(shooter({ cannons: 2 }))).toBe(2 * SHOOTER.hp);
    expect(plantMaxHp(shooter({ cannons: 3 }))).toBe(3 * SHOOTER.hp);
  });
});

describe('infundir', () => {
  it('cuesta un elemento por canon', () => {
    expect(infusionCost(shooter(), 'fire')).toBe(COSTS.fire);
    expect(infusionCost(shooter({ cannons: 3 }), 'fire')).toBe(COSTS.fire * 3);
  });

  it('no permite un segundo elemento', () => {
    const fire = infuse(shooter(), 'fire');
    expect(fire.element).toBe('fire');
    expect(canInfuse(fire)).toBe(false);
  });
});

describe('dano', () => {
  it('fusionar rinde mas que la suma de las partes', () => {
    expect(damageMultiplier(shooter({ cannons: 2 }))).toBeGreaterThan(2 * damageMultiplier(shooter()));
    expect(damageMultiplier(shooter({ cannons: 3 }))).toBeGreaterThan(3 * damageMultiplier(shooter()));
  });
});

describe('cadencia', () => {
  it('nivel 1 dispara al ritmo base y cada nivel un poco mas seguido', () => {
    expect(fireRateMultiplier(shooter())).toBe(1);
    expect(fireRateMultiplier(shooter({ level: 2 }))).toBeGreaterThan(1);
    expect(fireRateMultiplier(shooter({ level: 20 }))).toBeGreaterThan(fireRateMultiplier(shooter({ level: 10 })));
  });
});

describe('subir de nivel', () => {
  it('sube un nivel sin tocar canones ni elemento', () => {
    expect(levelUp(shooter())).toEqual({ element: null, cannons: 1, level: 2 });
    expect(levelUp(shooter({ element: 'ice', cannons: 3, level: 7 }))).toEqual({ element: 'ice', cannons: 3, level: 8 });
  });

  it('no pasa del nivel maximo', () => {
    expect(canLevelUp(shooter({ level: LIMITS.maxLevel - 1 }))).toBe(true);
    expect(levelUp(shooter({ level: LIMITS.maxLevel - 1 })).level).toBe(LIMITS.maxLevel);
    expect(canLevelUp(shooter({ level: LIMITS.maxLevel }))).toBe(false);
    expect(() => levelUp(shooter({ level: LIMITS.maxLevel }))).toThrow();
  });

  it('cuesta mas cuanto mas nivel tiene (D-05): 75, 100, 125...', () => {
    expect(levelUpCost(shooter())).toBe(LEVELING.baseCost);
    expect(levelUpCost(shooter({ level: 2 }))).toBe(LEVELING.baseCost + LEVELING.costStep);
    expect(levelUpCost(shooter({ level: 3 }))).toBe(LEVELING.baseCost + 2 * LEVELING.costStep);
    expect(levelUpCost(shooter({ level: LIMITS.maxLevel - 1 }))).toBe(LEVELING.baseCost + 18 * LEVELING.costStep);
  });

  it('cuesta un nivel por canon, como infundir', () => {
    expect(levelUpCost(shooter({ cannons: 2 }))).toBe(2 * LEVELING.baseCost);
    expect(levelUpCost(shooter({ cannons: 3, level: 4 }))).toBe(3 * (LEVELING.baseCost + 3 * LEVELING.costStep));
  });

  it('el elemento no cambia el costo', () => {
    expect(levelUpCost(shooter({ element: 'fire', level: 5 }))).toBe(levelUpCost(shooter({ level: 5 })));
  });

  it('en el nivel maximo no tiene costo', () => {
    expect(levelUpCost(shooter({ level: LIMITS.maxLevel }))).toBeNull();
  });

  it('siempre cuesta moneda entera', () => {
    for (let level = 1; level < LIMITS.maxLevel; level++) {
      for (const cannons of [1, 2, 3] as const) expect(Number.isInteger(levelUpCost(shooter({ cannons, level })))).toBe(true);
    }
  });

  it('cada nivel suma dano y cadencia sobre el nivel 1', () => {
    expect(levelBonus(1)).toEqual({ damage: 0, fireRate: 0 });
    expect(levelBonus(3).damage).toBeCloseTo(2 * LEVELING.damagePerLevel);
    expect(levelBonus(3).fireRate).toBeCloseTo(2 * LEVELING.fireRatePerLevel);
    expect(damageMultiplier(shooter({ level: 2 }))).toBeCloseTo(1 + LEVELING.damagePerLevel);
    expect(fireRateMultiplier(shooter({ level: 2 }))).toBeCloseTo(1 + LEVELING.fireRatePerLevel);
  });

  it('en una fusionada el nivel multiplica el disparo entero', () => {
    expect(damageMultiplier(shooter({ cannons: 3, level: 5 }))).toBeCloseTo(damageMultiplier(shooter({ cannons: 3 })) * (1 + 4 * LEVELING.damagePerLevel));
  });

  it('se nota: con dos niveles mas un gusano cae antes, y en nivel 4 ya con una semilla menos', () => {
    // Con los valores de balance.ts: semillas que necesita un gusano de vida completa.
    const seeds = (level: number) => Math.ceil(ENEMIES.worm.hp / (SHOOTER.damage * damageMultiplier(shooter({ level }))));
    expect(seeds(4)).toBeLessThan(seeds(1));
    expect(fireRateMultiplier(shooter({ level: 3 }))).toBeGreaterThan(1.05);
  });

  it('subir de nivel no cambia la vida maxima', () => {
    expect(plantMaxHp(shooter({ level: 12 }))).toBe(plantMaxHp(shooter()));
  });
});
