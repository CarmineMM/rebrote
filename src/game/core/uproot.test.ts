import { describe, expect, it } from 'vitest';
import { COSTS, ENEMIES, UPROOT } from '../config/balance';
import type { Cell } from './board';
import { spawnEnemy, stepCombat } from './combat';
import {
  cardPlay,
  createMatch,
  createMine,
  createPlant,
  createWall,
  fusePlants,
  infuseWithElement,
  levelUpOffer,
  levelUpPlant,
  plantAt,
  playCard,
  refundOf,
  sownAt,
  uprootRefund,
  uprootSown,
  type MatchState,
  type Sown,
} from './match';
import { levelUpCost } from './plants';
import { relocatePlant } from './powers';
import { carriedFeatures, isUnlocked } from './rounds';

/**
 * Arrancar (T-046): quitar una disparadora o un muro y recuperar la mitad de lo gastado en ella (AR-02 a AR-06). Se estrena
 * en la ronda 4 del brote 3 (indice 3); con el brote 3 vencido vale desde la ronda 1 de los anteriores (regla 15, AR-10).
 */
const UPROOT_ROUND = 3;
const cell: Cell = { lane: 2, col: 3 };

/** Partida del brote 3 en la ronda de arrancar, con moneda de sobra. */
const uprootMatch = (balance = 5000, baseLevel = 1): MatchState => createMatch(balance, UPROOT_ROUND, 'brain', false, [], baseLevel);

/** El estado con `sown` en `at`. */
function put(state: MatchState, at: Cell, sown: Sown | null): MatchState {
  const plants = state.plants.map((lane, laneIndex) =>
    laneIndex === at.lane ? lane.map((old, col) => (col === at.col ? sown : old)) : lane,
  );
  return { ...state, plants };
}

describe('lo gastado en cada disparadora (AR-02)', () => {
  it('sembrarla cuesta lo de la carta', () => {
    const state = playCard(uprootMatch(), 'shooter', cell);
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter);
  });

  it('el nivel base es gratis: nace en el 5 y lleva lo mismo gastado (T-023)', () => {
    const state = playCard(uprootMatch(5000, 5), 'shooter', cell);
    expect(plantAt(state, cell)?.shooter.level).toBe(5);
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter);
    expect(uprootRefund(state, cell)).toBe(COSTS.shooter / 2);
  });

  it('cada nivel suma lo que cuesta', () => {
    let state = playCard(uprootMatch(), 'shooter', cell);
    const first = levelUpOffer(state, cell)?.cost as number;
    state = levelUpPlant(state, cell);
    const second = levelUpOffer(state, cell)?.cost as number;
    state = levelUpPlant(state, cell);
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter + first + second);
  });

  it('infundir con la carta suma un elemento por canon', () => {
    const state = playCard(playCard(uprootMatch(), 'shooter', cell), 'fire', cell);
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter + COSTS.fire);
  });

  it('infundir arrastrando una mina o un muro cuenta lo que costo sembrarlo', () => {
    const wallCell = { lane: 2, col: 5 };
    let state = put(put(uprootMatch(), cell, createPlant({ element: null, cannons: 2, level: 1 }, COSTS.shooter * 2)), wallCell, createWall());
    state = infuseWithElement(state, wallCell, cell);
    // El muro (un escudo) y el que faltaba para el segundo canon: lo mismo que con la carta.
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter * 2 + COSTS.shield * 2);
    const mineCell = { lane: 0, col: 1 };
    const target = { lane: 0, col: 0 };
    state = put(put(state, target, createPlant()), mineCell, createMine('ice'));
    state = infuseWithElement(state, mineCell, target);
    expect(plantAt(state, target)?.spent).toBe(COSTS.shooter + COSTS.ice);
  });

  it('fusionar suma lo de las dos, aunque se quede con el nivel mas bajo', () => {
    const other = { lane: 2, col: 1 };
    let state = playCard(playCard(uprootMatch(), 'shooter', cell), 'shooter', other);
    const first = levelUpOffer(state, other)?.cost as number;
    state = levelUpPlant(state, other);
    const second = levelUpOffer(state, other)?.cost as number;
    state = levelUpPlant(state, other);
    state = fusePlants(state, other, cell);
    expect(plantAt(state, cell)?.shooter).toMatchObject({ cannons: 2, level: 1 });
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter * 2 + first + second);
  });

  it('subir una de dos canones cuesta su precio por dos, y lo gastado lo cuenta', () => {
    let state = put(uprootMatch(), cell, createPlant({ element: null, cannons: 2, level: 1 }, COSTS.shooter * 2));
    const price = levelUpCost({ element: null, cannons: 2, level: 1 }) as number;
    state = levelUpPlant(state, cell);
    expect(plantAt(state, cell)?.spent).toBe(COSTS.shooter * 2 + price);
    expect(uprootRefund(state, cell)).toBe(Math.floor((COSTS.shooter * 2 + price) / 2));
  });

  it('recolocarla no cambia lo gastado', () => {
    const state = createMatch(5000, UPROOT_ROUND, 'brain', false, [{ id: 'relocate', level: 1 }]);
    const planted = playCard(playCard(state, 'shooter', cell), 'fire', cell);
    const to = { lane: 0, col: 0 };
    const moved = relocatePlant(planted, cell, to);
    expect(plantAt(moved, to)?.spent).toBe(COSTS.shooter + COSTS.fire);
  });
});

describe('cuanto devuelve arrancar (AR-03, AR-04, AR-06)', () => {
  it('la mitad, hacia abajo y siempre entera', () => {
    expect(UPROOT.refund).toBe(0.5);
    expect(refundOf(100)).toBe(50);
    expect(refundOf(175)).toBe(87);
    expect(refundOf(1)).toBe(0);
  });

  it('una disparadora recien sembrada devuelve 50, y una de fuego 87', () => {
    const state = playCard(uprootMatch(), 'shooter', cell);
    expect(uprootRefund(state, cell)).toBe(50);
    expect(uprootRefund(playCard(state, 'fire', cell), cell)).toBe(87);
  });

  it('un muro devuelve la mitad de lo que cuesta', () => {
    const state = playCard(uprootMatch(), 'shield', cell);
    expect(uprootRefund(state, cell)).toBe(COSTS.shield / 2);
  });

  it('herida devuelve lo mismo', () => {
    const state = put(uprootMatch(), cell, { ...createPlant(), hp: 1 });
    expect(uprootRefund(state, cell)).toBe(50);
    expect(uprootRefund(put(uprootMatch(), cell, { ...createWall(), hp: 1 }), cell)).toBe(COSTS.shield / 2);
  });

  it('las minas, el muro de hielo y una casilla vacia no se arrancan', () => {
    const state = uprootMatch();
    expect(uprootRefund(state, cell)).toBeNull();
    expect(uprootRefund(put(state, cell, createMine('fire')), cell)).toBeNull();
    expect(uprootRefund(put(state, cell, { kind: 'ice', hp: 100, maxHp: 100, ms: 5000 }), cell)).toBeNull();
    expect(uprootRefund(state, { lane: -1, col: 0 })).toBeNull();
  });
});

describe('cuando se puede arrancar', () => {
  it('no antes de la ronda 4 del brote 3, y si desde ella', () => {
    const before = put(createMatch(5000, UPROOT_ROUND - 1, 'brain'), cell, createPlant());
    expect(isUnlocked(before, 'uproot')).toBe(false);
    expect(uprootRefund(before, cell)).toBeNull();
    expect(uprootRefund(put(uprootMatch(), cell, createPlant()), cell)).toBe(50);
  });

  it('en los brotes de antes, solo con el brote 3 vencido, y desde su ronda 1 (regla 15, AR-10)', () => {
    expect(uprootRefund(put(createMatch(5000, 0, 'creeper'), cell, createPlant()), cell)).toBeNull();
    for (const outbreak of ['creeper', 'elkCloner'] as const) {
      const carried = carriedFeatures(outbreak, ['brain']);
      expect(carried).toContain('uproot');
      const state = put(createMatch(5000, 0, outbreak, false, [], 1, carried), cell, createPlant());
      expect(uprootRefund(state, cell)).toBe(50);
    }
    expect(carriedFeatures('creeper', ['elkCloner'])).not.toContain('uproot');
  });

  it('en el brote 4 llega aprendido desde la ronda 1', () => {
    expect(uprootRefund(put(createMatch(5000, 0, 'morris'), cell, createPlant()), cell)).toBe(50);
  });
});

describe('arrancar', () => {
  it('quita la planta, suma lo que devuelve y deja la casilla lista para sembrar', () => {
    const state = playCard(playCard(uprootMatch(1000), 'shooter', cell), 'fire', cell);
    const after = uprootSown(state, cell);
    expect(sownAt(after, cell)).toBeNull();
    expect(after.balance).toBe(state.balance + 87);
    expect(cardPlay(after, 'shooter', cell).blocker).toBeNull();
    // No toca el estado recibido.
    expect(plantAt(state, cell)).not.toBeNull();
  });

  it('arranca un muro', () => {
    const state = playCard(uprootMatch(1000), 'shield', cell);
    const after = uprootSown(state, cell);
    expect(sownAt(after, cell)).toBeNull();
    expect(after.balance).toBe(state.balance + COSTS.shield / 2);
  });

  it('lo que no se puede arrancar no se arranca', () => {
    expect(() => uprootSown(uprootMatch(), cell)).toThrow();
    expect(() => uprootSown(put(createMatch(5000, 0, 'brain'), cell, createPlant()), cell)).toThrow();
  });

  it('sembrar y arrancar no da moneda: se pierde la mitad', () => {
    const state = uprootMatch(1000);
    const after = uprootSown(playCard(state, 'shooter', cell), cell);
    expect(after.balance).toBe(state.balance - COSTS.shooter / 2);
  });

  it('en el ataque, el gusano que la mordia sigue andando (AR-05)', () => {
    const x = cell.col + 0.5 + ENEMIES.worm.reach - 0.01;
    let state = spawnEnemy(put(uprootMatch(), cell, createPlant()), 'worm', cell.lane, x);
    state = { ...state, round: { ...state.round, phase: 'attack' } };
    for (let t = 0; t < 2000; t += 50) state = stepCombat(state, 50).state;
    const biting = state.enemies[0];
    expect(biting.attackMs).not.toBeNull();
    state = uprootSown(state, cell);
    for (let t = 0; t < 1000; t += 50) state = stepCombat(state, 50).state;
    expect(state.enemies[0].attackMs).toBeNull();
    expect(state.enemies[0].x).toBeLessThan(biting.x);
  });
});
