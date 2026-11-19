import { describe, expect, it } from 'vitest';
import { COSTS } from '../config/balance';
import {
  canFuse,
  canInfuse,
  createShooter,
  damageMultiplier,
  fireRateMultiplier,
  fuse,
  infuse,
  infusionCost,
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
