import { describe, expect, it } from 'vitest';
import { BASE_LEVEL, COSTS, LEVELING, OUTBREAKS, POWER_LEVELS, SHOP } from '../config/balance';
import {
  NO_BASE_LEVEL,
  baseLevelBlocker,
  baseLevelFromParam,
  baseLevelCost,
  baseLevelTotal,
  buyBaseLevel,
  isBaseLevel,
  nextBaseStep,
  sanitizeBaseLevel,
  type BaseLevelWallet,
} from './baseLevel';
import { createMatch, fusePlants, levelUpOffer, levelUpPlant, playCard, plantAt, cardPlay, type MatchState } from './match';
import { roundCount, type OutbreakId } from './outbreaks';
import { infusionCost, levelBonus, levelUpCost } from './plants';
import { levelCapAt } from './rounds';
import { upgradeCost } from './shop';

/**
 * Nivel base de la disparadora (T-023; N-01 a N-06 decididas el 22 nov 2026 con la recomendacion): se compra en el
 * Invernadero, del 1 al 5, y toda disparadora sembrada en una partida nueva nace en ese nivel.
 */

const wallet = (seeds: number, baseLevel = NO_BASE_LEVEL): BaseLevelWallet => ({ seeds, baseLevel });

describe('comprar el nivel base', () => {
  it('sin comprar nada es el 1, y el siguiente paso es el 2 con su precio', () => {
    expect(nextBaseStep(wallet(0))).toEqual({ level: 2, cost: BASE_LEVEL.prices[0] });
    expect(baseLevelBlocker(wallet(0))).toBe('seeds');
    expect(baseLevelBlocker(wallet(BASE_LEVEL.prices[0]))).toBeNull();
  });

  it('comprar descuenta las semillas y sube un paso', () => {
    const bought = buyBaseLevel(wallet(BASE_LEVEL.prices[0] + 7));
    expect(bought).toEqual({ seeds: 7, baseLevel: 2 });
  });

  it('sin semillas suficientes no cambia nada', () => {
    const poor = wallet(BASE_LEVEL.prices[0] - 1);
    expect(buyBaseLevel(poor)).toBe(poor);
  });

  it('no pasa del 5: en el 5 dice "Maximo" y no cobra', () => {
    const top = wallet(1_000_000, BASE_LEVEL.max);
    expect(BASE_LEVEL.max).toBe(5);
    expect(nextBaseStep(top)).toBeNull();
    expect(baseLevelBlocker(top)).toBe('max-level');
    expect(buyBaseLevel(top)).toBe(top);
  });

  it('del 1 al 5 se puede subir paso a paso, y dos compras seguidas cobran dos pasos distintos', () => {
    let w = wallet(baseLevelTotal());
    for (let level = 2; level <= BASE_LEVEL.max; level++) {
      w = buyBaseLevel(w);
      expect(w.baseLevel).toBe(level);
    }
    expect(w.seeds).toBe(0);
  });

  it('los precios crecen y el paso al 5 es el articulo mas caro de la tienda, de unas 10.000 semillas (N-03)', () => {
    for (let i = 1; i < BASE_LEVEL.prices.length; i++) expect(BASE_LEVEL.prices[i]).toBeGreaterThan(BASE_LEVEL.prices[i - 1]);
    const top = baseLevelCost(BASE_LEVEL.max);
    expect(top).toBe(10_000);
    expect(top).toBeGreaterThan(Math.max(...SHOP.powerPrices, upgradeCost(POWER_LEVELS.max)));
    expect(() => baseLevelCost(BASE_LEVEL.max + 1)).toThrow();
  });

  it('cada paso da lo mismo que un nivel de partida, con el premio del 5 (N-02, N-05)', () => {
    // T-035: compuesto, un 12,5 % por nivel y un 20 % (y un 25 % de vida) en el 5.
    expect(levelBonus(3).damage).toBeCloseTo((1 + LEVELING.damagePerLevel) ** 2 - 1);
    expect(levelBonus(5).damage).toBeCloseTo(1.125 ** 3 * 1.2 - 1);
    expect(levelBonus(5).hp).toBeCloseTo(0.25);
  });

  it('lo guardado que no es un nivel base cuenta como el 1', () => {
    expect(isBaseLevel(3)).toBe(true);
    for (const bad of [0, 6, 2.5, '3', null, undefined]) {
      expect(isBaseLevel(bad)).toBe(false);
      expect(sanitizeBaseLevel(bad)).toBe(NO_BASE_LEVEL);
    }
    expect(sanitizeBaseLevel(4)).toBe(4);
  });
});

describe('el nivel base en la partida', () => {
  const at = { lane: 2, col: 3 };
  const other = { lane: 2, col: 5 };
  /** La ultima ronda del brote: todo desbloqueado. */
  const lastRound = (outbreak: OutbreakId, baseLevel: number, balance = 5000): MatchState =>
    createMatch(balance, roundCount(outbreak) - 1, outbreak, false, undefined, baseLevel);

  it('nunca pasa del tope de nivel de ninguna ronda: la planta no nace por encima del tope', () => {
    for (const outbreak of OUTBREAKS) {
      for (let round = 0; round < outbreak.rounds.length; round++) expect(levelCapAt(outbreak.id, round)).toBeGreaterThanOrEqual(BASE_LEVEL.max);
    }
  });

  it('una partida sin decir nada es de nivel base 1, y uno que no existe no se acepta', () => {
    expect(createMatch().baseLevel).toBe(NO_BASE_LEVEL);
    expect(() => createMatch(undefined, 0, undefined, false, undefined, 6)).toThrow();
  });

  it('toda disparadora sembrada nace en el nivel base, tambien en la ronda 1, y sembrar cuesta lo mismo', () => {
    const first = createMatch(1000, 0, 'creeper', false, undefined, 3);
    expect(cardPlay(first, 'shooter', at).cost).toBe(COSTS.shooter);
    const sown = playCard(first, 'shooter', at);
    expect(plantAt(sown, at)?.shooter.level).toBe(3);
    expect(sown.balance).toBe(1000 - COSTS.shooter);
  });

  it('infundir cuesta lo mismo', () => {
    const sown = playCard(lastRound('creeper', 4), 'shooter', at);
    expect(cardPlay(sown, 'fire', at).cost).toBe(infusionCost(plantAt(sown, at)!.shooter, 'fire'));
    expect(cardPlay(sown, 'fire', at).cost).toBe(COSTS.fire);
  });

  it('en el brote 1 (tope 5), una de nivel base 5 nace al maximo para la ronda', () => {
    const sown = playCard(lastRound('creeper', 5), 'shooter', at);
    expect(levelUpOffer(sown, at)).toMatchObject({ level: 5, cap: 5, cost: null, capRaisedAt: null, blocker: 'max-level' });
  });

  it('con un tope mayor sube con normalidad desde su nivel, y cuesta lo de su nivel (N-06 a)', () => {
    // T-035: el tope sigue en 5 en el brote 2; un nivel base 3 sube con normalidad hasta el.
    const sown = playCard(lastRound('elkCloner', 3), 'shooter', at);
    const offer = levelUpOffer(sown, at);
    expect(offer).toMatchObject({ level: 3, cap: 5, blocker: null, cost: LEVELING.baseCost + 2 * LEVELING.costStep });
    expect(offer?.cost).toBe(levelUpCost(plantAt(sown, at)!.shooter));
    expect(plantAt(levelUpPlant(sown, at), at)?.shooter.level).toBe(4);
  });

  it('fusionar no pierde ni duplica la mejora: queda el nivel mas bajo, que nunca baja del base', () => {
    let match = playCard(playCard(lastRound('elkCloner', 3), 'shooter', at), 'shooter', other);
    match = fusePlants(match, other, at);
    expect(plantAt(match, at)?.shooter).toMatchObject({ cannons: 2, level: 3 });
    match = levelUpPlant(match, at);
    match = playCard(match, 'shooter', other);
    match = fusePlants(match, other, at);
    expect(plantAt(match, at)?.shooter).toMatchObject({ cannons: 3, level: 3 });
  });
});

describe('en desarrollo: ?nivelbase=', () => {
  it('acepta un nivel base que existe y nada mas', () => {
    expect(baseLevelFromParam('5')).toBe(5);
    expect(baseLevelFromParam(' 2 ')).toBe(2);
    expect(baseLevelFromParam(null)).toBeNull();
    for (const bad of ['', '0', '6', 'cinco', '2.5']) expect(baseLevelFromParam(bad)).toBeNull();
  });
});
