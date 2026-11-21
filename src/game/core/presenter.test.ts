import { describe, expect, it, vi } from 'vitest';
import type { OutbreakId } from './outbreaks';
import { bossFirstSeenRound, unlockPresenter } from './rounds';

/**
 * Quien presenta lo nuevo y cuando se ve al jefe (T-032), sobre brotes de prueba: "uno" va primero; "dos" no dice nada
 * (vale la regla de la historia), trae una pieza, un tope de nivel sin nada nuevo y una ronda que dice quien la presenta, y
 * su jefe se prepara desde la ronda 2; "tres" declara que lo suyo lo presenta Boxer.
 */
vi.mock('../config/balance', async (importOriginal) => {
  const real = await importOriginal<typeof import('../config/balance')>();
  const worms = [{ atMs: 1_000, kind: 'worm', lanes: [2] }] as const;
  return {
    ...real,
    OUTBREAKS: [
      { id: 'uno', boss: 'armored', startingBalance: 100, rounds: [{ unlocks: ['shooter', 'levelUp'], levelCap: 5, groups: worms }] },
      {
        id: 'dos',
        boss: 'spitter',
        startingBalance: 100,
        rounds: [
          { unlocks: ['iceMine'], groups: worms },
          { unlocks: [], levelCap: 10, bossPreparing: true, groups: worms },
          { unlocks: ['fuse'], presenter: 'boxer', groups: [{ atMs: 1_000, kind: 'spitter', lanes: [2] }] },
        ],
      },
      { id: 'tres', boss: 'worm', startingBalance: 100, presenter: 'boxer', rounds: [{ unlocks: ['fireMine'], groups: worms }] },
    ],
  };
});

const UNO = 'uno' as OutbreakId;
const DOS = 'dos' as OutbreakId;
const TRES = 'tres' as OutbreakId;

describe('quien presenta lo nuevo (T-032)', () => {
  it('sin decirlo: Boxer en el primer brote (VT-02) y Patty con lo nuevo de los siguientes (VT-03)', () => {
    expect(unlockPresenter(UNO, 0)).toBe('boxer');
    expect(unlockPresenter(DOS, 0)).toBe('patty');
  });

  it('un tope de nivel sin nada nuevo que sembrar lo cuenta Boxer', () => {
    expect(unlockPresenter(DOS, 1)).toBe('boxer');
  });

  it('una ronda y un brote lo pueden declarar como dato', () => {
    expect(unlockPresenter(DOS, 2)).toBe('boxer');
    expect(unlockPresenter(TRES, 0)).toBe('boxer');
  });

  it('el jefe se ve por primera vez en la primera ronda en que se prepara; si su guion no lo saca, nunca', () => {
    expect(bossFirstSeenRound(DOS)).toBe(1);
    expect(bossFirstSeenRound(UNO)).toBeNull();
  });
});
