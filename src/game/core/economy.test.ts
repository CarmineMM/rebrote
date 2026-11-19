import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../config/balance';
import { droppedCoinValue, rollKillReward } from './economy';

describe('moneda recogida a mano', () => {
  it('suma un 15 % y redondea hacia arriba', () => {
    expect(droppedCoinValue(25, 15)).toBe(29); // 28,75
    expect(droppedCoinValue(1, 15)).toBe(2); // 1,15
    expect(droppedCoinValue(0, 15)).toBe(0);
  });

  it('no sube de mas cuando el resultado ya es entero', () => {
    // En coma flotante 20 * 1.15 y 100 * 1.15 no dan exacto; aqui deben dar 23 y 115.
    expect(droppedCoinValue(20, 15)).toBe(23);
    expect(droppedCoinValue(60, 15)).toBe(69);
    expect(droppedCoinValue(100, 15)).toBe(115);
  });

  it('siempre es el menor entero que cubre la base mas el extra', () => {
    for (let amount = 0; amount <= 1000; amount++) {
      const value = droppedCoinValue(amount, 15);
      expect(Number.isInteger(value)).toBe(true);
      expect(value * 100).toBeGreaterThanOrEqual(amount * 115);
      expect(value * 100).toBeLessThan(amount * 115 + 100);
    }
  });

  it('usa el extra configurado en balance.ts', () => {
    expect(droppedCoinValue(ECONOMY.killReward)).toBe(droppedCoinValue(ECONOMY.killReward, ECONOMY.dropBonusPercent));
  });
});

describe('recompensa por enemigo eliminado', () => {
  it('por encima de la probabilidad de soltarla se cobra sola con el valor normal', () => {
    expect(rollKillReward(25, () => 0.5)).toEqual({ kind: 'auto', amount: 25 });
    expect(rollKillReward(25, () => ECONOMY.dropChance)).toEqual({ kind: 'auto', amount: 25 });
  });

  it('por debajo, el enemigo la suelta y vale mas', () => {
    expect(rollKillReward(25, () => 0)).toEqual({ kind: 'drop', amount: droppedCoinValue(25) });
  });

  it('la suelta en la proporcion configurada', () => {
    const rolls = 1000;
    let drops = 0;
    for (let i = 0; i < rolls; i++) {
      if (rollKillReward(25, () => (i + 0.5) / rolls).kind === 'drop') drops++;
    }
    expect(drops).toBe(Math.round(rolls * ECONOMY.dropChance));
  });

  it('por defecto usa la recompensa de balance.ts', () => {
    expect(rollKillReward(undefined, () => 0.99).amount).toBe(ECONOMY.killReward);
  });
});
