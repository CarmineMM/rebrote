import { describe, expect, it } from 'vitest';
import { BOARD, COSTS, ECONOMY, LEVELING, LIMITS, LIVES, MINE, SHOOTER } from '../config/balance';
import type { Cell } from './board';
import {
  canAfford,
  createMatch,
  createPlant,
  createMine,
  earn,
  fusePlants,
  fusedPlant,
  fusionBlocker,
  fusionTargets,
  levelUpOffer,
  levelUpPlant,
  mineAt,
  plantAt,
  playCard,
  cardPlay,
  sownAt,
  sownMaxHp,
  type MatchState,
  type Plant,
} from './match';
import { createShooter, infusionCost, plantMaxHp, type Shooter } from './plants';
import { ROUND_COUNT } from './rounds';

const cost = COSTS.shooter;
const plantShooter = (state: MatchState, cell: Cell) => playCard(state, 'shooter', cell);
const plantBlocker = (state: MatchState, cell: Cell) => cardPlay(state, 'shooter', cell).blocker;

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
    expect(plantAt(match, { lane: 2, col: 4 })).toEqual({ kind: 'shooter', shooter: createShooter(), hp: SHOOTER.hp, reloadMs: 0 });
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

const shooter = (over: Partial<Shooter> = {}): Shooter => ({ ...createShooter(), ...over });

/**
 * Partida en la ultima ronda, con todo desbloqueado (T-007): fusionar, infundir y subir de nivel se prueban aqui
 * sin depender de la ronda. Lo que bloquea cada ronda se prueba en `rounds.test.ts`.
 */
const unlocked = (balance?: number) => createMatch(balance, ROUND_COUNT - 1);

/** Pone plantas en el tablero sin cobrar. */
function withPlants(state: MatchState, ...entries: Array<[Cell, Partial<Plant> & { shooter?: Shooter }]>): MatchState {
  const plants = state.plants.map((lane) => [...lane]);
  for (const [cell, over] of entries) {
    const base = createPlant(over.shooter ?? createShooter());
    plants[cell.lane][cell.col] = { ...base, ...over };
  }
  return { ...state, plants };
}

describe('fusionar', () => {
  const a = { lane: 1, col: 2 };
  const b = { lane: 3, col: 5 };
  const c = { lane: 0, col: 0 };

  it('la planta arrastrada deja su casilla y el destino suma sus canones, sin cobrar', () => {
    const before = withPlants(unlocked(), [a, {}], [b, {}]);
    const after = fusePlants(before, a, b);
    expect(plantAt(after, a)).toBeNull();
    expect(plantAt(after, b)?.shooter).toEqual({ element: null, cannons: 2, level: 1 });
    expect(after.balance).toBe(before.balance);
  });

  it('no modifica el estado anterior', () => {
    const before = withPlants(unlocked(), [a, {}], [b, {}]);
    fusePlants(before, a, b);
    expect(plantAt(before, a)?.shooter.cannons).toBe(1);
    expect(plantAt(before, b)?.shooter.cannons).toBe(1);
  });

  it('reproduce la tabla de la task', () => {
    // Normal, 1 canon, nivel 3 + normal, 1 canon, nivel 3 = normal, 2 canones, nivel 3.
    const same = withPlants(unlocked(), [a, { shooter: shooter({ level: 3 }) }], [b, { shooter: shooter({ level: 3 }) }]);
    expect(plantAt(fusePlants(same, a, b), b)?.shooter).toEqual({ element: null, cannons: 2, level: 3 });

    // Normal, 1 canon, nivel 9 sobre normal, 2 canones, nivel 7 = normal, 3 canones, nivel 7.
    const levels = withPlants(unlocked(), [a, { shooter: shooter({ level: 9 }) }], [b, { shooter: shooter({ cannons: 2, level: 7 }) }]);
    expect(plantAt(fusePlants(levels, a, b), b)?.shooter).toEqual({ element: null, cannons: 3, level: 7 });

    // Fuego, 1 canon sobre normal, 1 canon: no permitido.
    const fire = withPlants(unlocked(), [a, { shooter: shooter({ element: 'fire' }) }], [b, {}]);
    expect(fusionBlocker(fire, a, b)).toBe('variant');
    expect(() => fusePlants(fire, a, b)).toThrow();

    // Normal, 2 canones sobre normal, 2 canones: no permitido (serian 4).
    const four = withPlants(unlocked(), [a, { shooter: shooter({ cannons: 2 }) }], [b, { shooter: shooter({ cannons: 2 }) }]);
    expect(fusionBlocker(four, a, b)).toBe('max-cannons');
    expect(() => fusePlants(four, a, b)).toThrow();
  });

  it('tres disparadoras sembradas acaban en una de 3 canones', () => {
    let match = unlocked(cost * 3);
    for (const cell of [a, b, c]) match = plantShooter(match, cell);
    match = fusePlants(match, a, b);
    expect(fusionBlocker(match, b, c)).toBeNull();
    match = fusePlants(match, c, b);
    expect(plantAt(match, b)).toEqual({ kind: 'shooter', shooter: shooter({ cannons: 3 }), hp: plantMaxHp(shooter({ cannons: 3 })), reloadMs: 0 });
    expect(match.plants.flat().filter(Boolean)).toHaveLength(1);
  });

  it('suma la vida actual de las dos (D-02)', () => {
    const damaged = withPlants(unlocked(), [a, { hp: SHOOTER.hp - 150 }], [b, { hp: SHOOTER.hp - 50 }]);
    const result = plantAt(fusePlants(damaged, a, b), b);
    expect(result?.hp).toBe(2 * SHOOTER.hp - 200);
    const full = withPlants(unlocked(), [a, {}], [b, { shooter: shooter({ cannons: 2 }), hp: 2 * SHOOTER.hp }]);
    expect(plantAt(fusePlants(full, a, b), b)?.hp).toBe(plantMaxHp(shooter({ cannons: 3 })));
  });

  it('el destino conserva su recarga', () => {
    const source = { ...createPlant(), reloadMs: 900 };
    const target = { ...createPlant(), reloadMs: 300 };
    expect(fusedPlant(source, target).reloadMs).toBe(300);
  });

  it('no fusiona con una casilla vacia, consigo misma ni fuera del tablero', () => {
    const match = withPlants(unlocked(), [a, {}]);
    expect(fusionBlocker(match, a, b)).toBe('no-plant');
    expect(fusionBlocker(match, b, a)).toBe('no-plant');
    expect(fusionBlocker(match, a, a)).toBe('same-cell');
    expect(fusionBlocker(match, a, { lane: BOARD.lanes, col: 0 })).toBe('off-board');
    expect(() => fusePlants(match, a, b)).toThrow();
  });

  it('lista los destinos validos de una planta', () => {
    const match = withPlants(
      unlocked(),
      [a, {}],
      [b, {}],
      [c, { shooter: shooter({ cannons: 2 }) }],
      [{ lane: 4, col: 8 }, { shooter: shooter({ cannons: 3 }) }],
      [{ lane: 2, col: 2 }, { shooter: shooter({ element: 'fire' }) }],
    );
    expect(fusionTargets(match, a)).toEqual([c, b]);
    expect(fusionTargets(match, c)).toEqual([a, b]);
    expect(fusionTargets(match, { lane: 4, col: 8 })).toEqual([]);
    expect(fusionTargets(match, { lane: 2, col: 3 })).toEqual([]);
  });
});

describe('fuego (T-004)', () => {
  const fire = COSTS.fire;
  const empty = { lane: 2, col: 3 };
  const plantCell = { lane: 1, col: 5 };

  it('sobre una casilla vacia siembra una mina y cobra el fuego', () => {
    const before = unlocked();
    expect(cardPlay(before, 'fire', empty)).toEqual({ action: 'sow', cost: fire, multiplier: 1, blocker: null });
    const after = playCard(before, 'fire', empty);
    expect(mineAt(after, empty)).toEqual({ kind: 'mine', element: 'fire', hp: MINE.hp, fuseMs: null });
    expect(plantAt(after, empty)).toBeNull();
    expect(after.balance).toBe(before.balance - fire);
  });

  it('una mina ocupa su casilla: no se siembra ni se infunde encima', () => {
    const mined = playCard(unlocked(), 'fire', empty);
    expect(cardPlay(mined, 'fire', empty).blocker).toBe('occupied');
    expect(cardPlay(mined, 'shooter', empty).blocker).toBe('occupied');
    expect(() => playCard(mined, 'shooter', empty)).toThrow();
  });

  it('una mina no se arrastra ni sirve de destino para fusionar', () => {
    const match = withPlants(playCard(unlocked(), 'fire', empty), [plantCell, {}]);
    expect(fusionBlocker(match, empty, plantCell)).toBe('no-plant');
    expect(fusionBlocker(match, plantCell, empty)).toBe('no-plant');
    expect(fusionTargets(match, plantCell)).toEqual([]);
  });

  it('sobre una disparadora sin elemento la infunde, sin tocar su vida, recarga ni nivel', () => {
    const before = withPlants(unlocked(), [plantCell, { shooter: shooter({ level: 4 }), hp: 120, reloadMs: 300 }]);
    expect(cardPlay(before, 'fire', plantCell)).toEqual({ action: 'infuse', cost: fire, multiplier: 1, blocker: null });
    const after = playCard(before, 'fire', plantCell);
    expect(plantAt(after, plantCell)).toEqual({
      kind: 'shooter',
      shooter: { element: 'fire', cannons: 1, level: 4 },
      hp: 120,
      reloadMs: 300,
    });
    expect(after.balance).toBe(before.balance - fire);
  });

  it('el costo de infundir sale de infusionCost: un fuego por canon (D-04)', () => {
    for (const cannons of [1, 2, 3] as const) {
      const match = withPlants(unlocked(1000), [plantCell, { shooter: shooter({ cannons }) }]);
      const play = cardPlay(match, 'fire', plantCell);
      expect(play.cost).toBe(infusionCost(shooter({ cannons }), 'fire'));
      expect(play.multiplier).toBe(cannons);
      expect(playCard(match, 'fire', plantCell).balance).toBe(1000 - play.cost);
    }
  });

  it('si no alcanza la moneda no deja infundir, pero dice cuanto costaria', () => {
    const match = withPlants(unlocked(fire * 3 - 1), [plantCell, { shooter: shooter({ cannons: 3 }) }]);
    expect(cardPlay(match, 'fire', plantCell)).toEqual({ action: 'infuse', cost: fire * 3, multiplier: 3, blocker: 'insufficient-funds' });
    expect(() => playCard(match, 'fire', plantCell)).toThrow();
  });

  it('la disparadora no se siembra encima de otra planta', () => {
    const match = withPlants(unlocked(), [plantCell, {}]);
    expect(cardPlay(match, 'shooter', plantCell)).toMatchObject({ action: 'sow', blocker: 'occupied' });
  });

  it('fuera del tablero no hace nada', () => {
    expect(cardPlay(unlocked(), 'fire', { lane: -1, col: 0 }).blocker).toBe('off-board');
  });

  it('vida maxima de lo sembrado: la mina tiene la suya', () => {
    const match = withPlants(playCard(unlocked(), 'fire', empty), [plantCell, { shooter: shooter({ cannons: 2 }) }]);
    expect(sownMaxHp(sownAt(match, empty)!)).toBe(MINE.hp);
    expect(sownMaxHp(sownAt(match, plantCell)!)).toBe(2 * SHOOTER.hp);
    expect(createMine('fire').hp).toBe(MINE.hp);
  });

  it('reproduce la tabla de la task (fuego a 75)', () => {
    expect(fire).toBe(75);
    const start = 1000;
    const one = { lane: 0, col: 0 };
    const three = { lane: 4, col: 8 };
    const fiery = { lane: 3, col: 3 };
    const board = withPlants(
      unlocked(start),
      [one, {}],
      [three, { shooter: shooter({ cannons: 3 }) }],
      [fiery, { shooter: shooter({ element: 'fire' }) }],
    );

    // Fuego sobre casilla vacia: mina, saldo menos 75.
    const mine = playCard(board, 'fire', empty);
    expect(mineAt(mine, empty)?.element).toBe('fire');
    expect(mine.balance).toBe(start - 75);

    // Fuego sobre disparadora de 1 canon: disparadora de fuego, saldo menos 75.
    const infused1 = playCard(board, 'fire', one);
    expect(plantAt(infused1, one)?.shooter).toEqual({ element: 'fire', cannons: 1, level: 1 });
    expect(infused1.balance).toBe(start - 75);

    // Fuego sobre disparadora de 3 canones: disparadora de fuego de 3 canones, saldo menos 225.
    const infused3 = playCard(board, 'fire', three);
    expect(plantAt(infused3, three)?.shooter).toEqual({ element: 'fire', cannons: 3, level: 1 });
    expect(infused3.balance).toBe(start - 225);

    // Fuego sobre disparadora de fuego: no permitido, saldo sin cambios.
    expect(cardPlay(board, 'fire', fiery).blocker).toBe('has-element');
    expect(() => playCard(board, 'fire', fiery)).toThrow();
    expect(board.balance).toBe(start);
  });
});

describe('hielo (T-005)', () => {
  const ice = COSTS.ice;
  const empty = { lane: 2, col: 3 };
  const plantCell = { lane: 1, col: 5 };

  it('sobre una casilla vacia siembra una mina de hielo y cobra el hielo', () => {
    const before = unlocked();
    expect(cardPlay(before, 'ice', empty)).toEqual({ action: 'sow', cost: ice, multiplier: 1, blocker: null });
    const after = playCard(before, 'ice', empty);
    expect(mineAt(after, empty)).toEqual({ kind: 'mine', element: 'ice', hp: MINE.hp, fuseMs: null });
    expect(after.balance).toBe(before.balance - ice);
  });

  it('sobre una disparadora sin elemento la infunde: un hielo por canon', () => {
    for (const cannons of [1, 2, 3] as const) {
      const match = withPlants(unlocked(1000), [plantCell, { shooter: shooter({ cannons, level: 2 }) }]);
      expect(cardPlay(match, 'ice', plantCell)).toEqual({ action: 'infuse', cost: ice * cannons, multiplier: cannons, blocker: null });
      const after = playCard(match, 'ice', plantCell);
      expect(plantAt(after, plantCell)?.shooter).toEqual({ element: 'ice', cannons, level: 2 });
      expect(after.balance).toBe(1000 - ice * cannons);
    }
  });

  it('no se infunde hielo en una disparadora de fuego ni fuego en una de hielo', () => {
    const fiery = { lane: 0, col: 0 };
    const icy = { lane: 4, col: 8 };
    const board = withPlants(unlocked(1000), [fiery, { shooter: shooter({ element: 'fire' }) }], [icy, { shooter: shooter({ element: 'ice' }) }]);
    expect(cardPlay(board, 'ice', fiery).blocker).toBe('has-element');
    expect(cardPlay(board, 'fire', icy).blocker).toBe('has-element');
    expect(cardPlay(board, 'ice', icy).blocker).toBe('has-element');
    expect(() => playCard(board, 'ice', fiery)).toThrow();
    expect(() => playCard(board, 'fire', icy)).toThrow();
  });

  it('las de hielo se fusionan entre si, pero no con las de fuego ni con las normales', () => {
    const a = { lane: 0, col: 0 };
    const b = { lane: 0, col: 1 };
    const icy = (over: Partial<Shooter> = {}) => ({ shooter: shooter({ element: 'ice', ...over }) });
    const pair = withPlants(unlocked(), [a, icy()], [b, icy({ cannons: 2 })]);
    expect(plantAt(fusePlants(pair, a, b), b)?.shooter).toEqual({ element: 'ice', cannons: 3, level: 1 });
    expect(fusionBlocker(withPlants(unlocked(), [a, icy()], [b, { shooter: shooter({ element: 'fire' }) }]), a, b)).toBe('variant');
    expect(fusionBlocker(withPlants(unlocked(), [a, icy()], [b, {}]), a, b)).toBe('variant');
  });

  it('reproduce la tabla de la task', () => {
    // Hielo sobre disparadora de fuego: no permitido, saldo sin cambios.
    const fiery = { lane: 3, col: 3 };
    const board = withPlants(unlocked(500), [fiery, { shooter: shooter({ element: 'fire' }) }]);
    expect(cardPlay(board, 'ice', fiery).blocker).toBe('has-element');
    expect(board.balance).toBe(500);
  });
});

describe('subir de nivel', () => {
  const at = { lane: 2, col: 3 };

  it('ofrece el nivel de la planta y lo que cuesta el siguiente', () => {
    const match = withPlants(unlocked(1000), [at, { shooter: shooter({ level: 3 }) }]);
    expect(levelUpOffer(match, at)).toEqual({ level: 3, cost: LEVELING.baseCost + 2 * LEVELING.costStep, multiplier: 1, blocker: null });
  });

  it('una fusionada paga un nivel por canon', () => {
    const match = withPlants(unlocked(1000), [at, { shooter: shooter({ cannons: 3 }) }]);
    expect(levelUpOffer(match, at)).toMatchObject({ cost: 3 * LEVELING.baseCost, multiplier: 3, blocker: null });
  });

  it('sin disparadora en la casilla no hay nada que subir', () => {
    expect(levelUpOffer(unlocked(), at)).toBeNull();
    expect(levelUpOffer(playCard(unlocked(), 'fire', at), at)).toBeNull();
    expect(levelUpOffer(unlocked(), { lane: -1, col: 0 })).toBeNull();
    expect(() => levelUpPlant(unlocked(), at)).toThrow();
  });

  it('cobra el costo y sube un nivel, sin tocar la vida ni la recarga', () => {
    const before = withPlants(unlocked(500), [at, { shooter: shooter({ element: 'fire', cannons: 2, level: 2 }), hp: 410, reloadMs: 300 }]);
    const after = levelUpPlant(before, at);
    expect(after.balance).toBe(500 - 2 * (LEVELING.baseCost + LEVELING.costStep));
    expect(plantAt(after, at)).toEqual({
      kind: 'shooter',
      shooter: { element: 'fire', cannons: 2, level: 3 },
      hp: 410,
      reloadMs: 300,
    });
  });

  it('no modifica el estado anterior', () => {
    const before = withPlants(unlocked(500), [at, {}]);
    levelUpPlant(before, at);
    expect(before.balance).toBe(500);
    expect(plantAt(before, at)?.shooter.level).toBe(1);
  });

  it('con el saldo justo se puede; con uno menos, no', () => {
    const exact = withPlants(unlocked(LEVELING.baseCost), [at, {}]);
    expect(levelUpOffer(exact, at)?.blocker).toBeNull();
    expect(levelUpPlant(exact, at).balance).toBe(0);
    const short = withPlants(unlocked(LEVELING.baseCost - 1), [at, {}]);
    expect(levelUpOffer(short, at)?.blocker).toBe('insufficient-funds');
    expect(() => levelUpPlant(short, at)).toThrow();
  });

  it('en el nivel maximo aparece como maximo y no se puede subir', () => {
    const top = withPlants(unlocked(100_000), [at, { shooter: shooter({ level: LIMITS.maxLevel }) }]);
    expect(levelUpOffer(top, at)).toEqual({ level: LIMITS.maxLevel, cost: null, multiplier: 1, blocker: 'max-level' });
    expect(() => levelUpPlant(top, at)).toThrow();
  });

  it('subiendo de uno en uno llega al 20 y no pasa', () => {
    let state = withPlants(unlocked(100_000), [at, {}]);
    while (levelUpOffer(state, at)?.blocker === null) state = levelUpPlant(state, at);
    expect(plantAt(state, at)?.shooter.level).toBe(LIMITS.maxLevel);
    // 75 + 100 + ... + 525: 19 niveles.
    expect(100_000 - state.balance).toBe(19 * LEVELING.baseCost + LEVELING.costStep * ((18 * 19) / 2));
  });

  it('reproduce la tabla de la task', () => {
    // Nivel 1, subir: nivel 2 y saldo reducido.
    const one = levelUpPlant(withPlants(unlocked(250), [at, {}]), at);
    expect(plantAt(one, at)?.shooter.level).toBe(2);
    expect(one.balance).toBe(250 - LEVELING.baseCost);
    // Nivel 20, subir: no disponible, "Maximo".
    expect(levelUpOffer(withPlants(unlocked(250), [at, { shooter: shooter({ level: 20 }) }]), at)?.blocker).toBe('max-level');
    // Nivel 3 con saldo insuficiente: no disponible, saldo sin cambios.
    const poor = withPlants(unlocked(50), [at, { shooter: shooter({ level: 3 }) }]);
    expect(levelUpOffer(poor, at)?.blocker).toBe('insufficient-funds');
    expect(poor.balance).toBe(50);
  });
});
