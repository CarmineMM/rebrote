import { describe, expect, it } from 'vitest';
import { BOARD, COSTS, ECONOMY, LIVES, SHOOTER } from '../config/balance';
import { canAfford, createMatch, earn, plantAt, plantBlocker, plantShooter } from './match';
import { createShooter } from './plants';

const cost = COSTS.shooter;

describe('partida nueva', () => {
  it('arranca con el saldo inicial y el tablero vacio', () => {
    const match = createMatch();
    expect(match.balance).toBe(ECONOMY.startingBalance);
    expect(match.plants).toHaveLength(BOARD.lanes);
    expect(match.plants.every((lane) => lane.length === BOARD.columns && lane.every((p) => p === null))).toBe(true);
  });

  it('arranca con todas las vidas y sin enemigos ni balas', () => {
    const match = createMatch();
    expect(match.lives).toBe(LIVES.start);
    expect(match.enemies).toEqual([]);
    expect(match.bullets).toEqual([]);
  });
});

describe('sembrar', () => {
  it('coloca una disparadora y cobra su costo', () => {
    const match = plantShooter(createMatch(cost), { lane: 2, col: 4 });
    expect(match.balance).toBe(0);
    expect(plantAt(match, { lane: 2, col: 4 })).toEqual({ shooter: createShooter(), hp: SHOOTER.hp, reloadMs: 0 });
  });

  it('no modifica el estado anterior', () => {
    const before = createMatch();
    plantShooter(before, { lane: 0, col: 0 });
    expect(before.balance).toBe(ECONOMY.startingBalance);
    expect(plantAt(before, { lane: 0, col: 0 })).toBeNull();
  });

  it('reproduce la tabla de la task: dos siembras y la tercera no alcanza', () => {
    // Con disparadora a 100 es la tabla 250, 150, 50.
    const start = cost * 2 + cost / 2;
    const first = plantShooter(createMatch(start), { lane: 0, col: 0 });
    expect(first.balance).toBe(start - cost);
    const second = plantShooter(first, { lane: 1, col: 0 });
    expect(second.balance).toBe(start - 2 * cost);
    expect(plantBlocker(second, { lane: 2, col: 0 })).toBe('insufficient-funds');
    expect(plantBlocker(second, { lane: 0, col: 0 })).toBe('occupied');
  });

  it('dos clics seguidos en la misma casilla siembran una sola vez', () => {
    const once = plantShooter(createMatch(cost * 3), { lane: 1, col: 1 });
    expect(plantBlocker(once, { lane: 1, col: 1 })).toBe('occupied');
    expect(() => plantShooter(once, { lane: 1, col: 1 })).toThrow();
    expect(once.balance).toBe(cost * 2);
  });

  it('fuera del tablero no siembra ni cobra', () => {
    const match = createMatch();
    expect(plantBlocker(match, { lane: -1, col: 0 })).toBe('off-board');
    expect(plantBlocker(match, { lane: 0, col: BOARD.columns })).toBe('off-board');
    expect(() => plantShooter(match, { lane: BOARD.lanes, col: 0 })).toThrow();
    expect(match.balance).toBe(ECONOMY.startingBalance);
  });

  it('con el saldo justo alcanza', () => {
    expect(canAfford(cost, cost)).toBe(true);
    expect(canAfford(cost - 1, cost)).toBe(false);
  });
});

describe('ganar moneda', () => {
  it('suma al saldo', () => {
    expect(earn(createMatch(0), ECONOMY.passiveIncome).balance).toBe(ECONOMY.passiveIncome);
  });

  it('rechaza decimales y cantidades negativas', () => {
    expect(() => earn(createMatch(), 28.75)).toThrow();
    expect(() => earn(createMatch(), -1)).toThrow();
    expect(() => createMatch(10.5)).toThrow();
  });
});
