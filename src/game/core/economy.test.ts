import { describe, expect, it } from 'vitest';
import { ECONOMY, ENEMIES } from '../config/balance';
import { droppedCoinValue, rollKillReward, stepIncome } from './economy';
import { createMatch, type MatchState } from './match';
import { stepRound } from './rounds';

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
    expect(droppedCoinValue(ENEMIES.worm.reward)).toBe(droppedCoinValue(ENEMIES.worm.reward, ECONOMY.dropBonusPercent));
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

  it('cada enemigo da lo suyo, sea cual sea su nivel (T-009): gusano 15, escupidor 20 y acorazado 25', () => {
    expect(ENEMIES.worm.reward).toBe(15);
    expect(ENEMIES.spitter.reward).toBe(20);
    expect(ENEMIES.armored.reward).toBe(25);
    expect(rollKillReward(ENEMIES.spitter.reward, () => 0.99)).toEqual({ kind: 'auto', amount: 20 });
    expect(rollKillReward(ENEMIES.armored.reward, () => 0)).toEqual({ kind: 'drop', amount: 29 });
  });
});

describe('goteo pasivo (T-010): solo durante el ataque', () => {
  const { passiveIncome, passiveIntervalMs } = ECONOMY;
  /** Partida en el ataque de la ronda 1, sin enemigos fuera. */
  const attacking = (over: Partial<MatchState> = {}): MatchState => ({
    ...createMatch(100),
    round: { index: 0, phase: 'attack', prepMs: 0, elapsedMs: 0, released: 0, waiting: [], brood: null },
    ...over,
  });

  it('en la preparacion no se gana nada ni avanza el reloj', () => {
    const prep = createMatch(100);
    const step = stepIncome(prep, passiveIntervalMs * 3);
    expect(step.earned).toBe(0);
    expect(step.state).toBe(prep);
  });

  it('en el ataque cae la moneda cada intervalo y lo que sobra cuenta para el siguiente', () => {
    const almost = stepIncome(attacking(), passiveIntervalMs - 1);
    expect(almost.earned).toBe(0);
    expect(almost.state.balance).toBe(100);
    expect(almost.state.incomeMs).toBe(passiveIntervalMs - 1);
    const drip = stepIncome(almost.state, 5);
    expect(drip.earned).toBe(passiveIncome);
    expect(drip.state.balance).toBe(100 + passiveIncome);
    expect(drip.state.incomeMs).toBe(4);
  });

  it('un paso largo da todos los goteos que tocan', () => {
    const step = stepIncome(attacking(), passiveIntervalMs * 2.5);
    expect(step.earned).toBe(2 * passiveIncome);
    expect(step.state.incomeMs).toBe(passiveIntervalMs / 2);
  });

  it('el reloj se para en la preparacion y sigue donde iba en el siguiente ataque', () => {
    // 7 s de ataque en la ronda 1, luego la preparacion entera de la 2 y 3 s de su ataque: un goteo justo al final.
    let state = stepIncome(attacking(), 7000).state;
    state = { ...state, round: { index: 1, phase: 'prep', prepMs: 20_000, elapsedMs: 0, released: 0, waiting: [], brood: null } };
    expect(stepIncome(state, 20_000).earned).toBe(0);
    state = { ...state, round: { ...state.round, phase: 'attack', prepMs: 0 } };
    expect(stepIncome(state, passiveIntervalMs - 7000 - 1).earned).toBe(0);
    expect(stepIncome(state, passiveIntervalMs - 7000).earned).toBe(passiveIncome);
  });

  it('una partida nueva empieza con el reloj a cero y su preparacion no da moneda', () => {
    const start = createMatch();
    expect(start.incomeMs).toBe(0);
    const waited = stepRound(start, 15_000, 9.75).state;
    expect(stepIncome(waited, 15_000).state.balance).toBe(start.balance);
  });

  it('sin vidas o con la partida ganada no corre', () => {
    expect(stepIncome(attacking({ lives: 0 }), passiveIntervalMs * 2).earned).toBe(0);
    const won = attacking({ round: { index: 9, phase: 'won', prepMs: 0, elapsedMs: 0, released: 2, waiting: [], brood: null } });
    expect(stepIncome(won, passiveIntervalMs * 2).earned).toBe(0);
  });

  it('no modifica el estado recibido', () => {
    const before = attacking({ incomeMs: passiveIntervalMs - 1 });
    stepIncome(before, 10);
    expect(before).toMatchObject({ balance: 100, incomeMs: passiveIntervalMs - 1 });
  });
});
