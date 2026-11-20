import { describe, expect, it } from 'vitest';
import { BOARD, COSTS, ENEMIES, ENEMY_LEVELS, LIMITS, LIVES, ROUND_PREP, ROUNDS } from '../config/balance';
import type { Cell } from './board';
import { spawnEnemy, stepCombat } from './combat';
import { cardPlay, createMatch, createPlant, fusionBlocker, fusionTargets, levelUpOffer, playCard, type MatchState } from './match';
import {
  ROUND_COUNT,
  availableCards,
  bossRoundIndex,
  createRound,
  infusableElements,
  isBossPreparing,
  isBossRound,
  isUnlocked,
  isWon,
  levelCapAt,
  levelCapRaisedAfter,
  roundHaste,
  roundUnlocks,
  startAttack,
  stepRound,
  unlockRound,
  unlockedAt,
  type Feature,
  type RoundEvent,
} from './rounds';

/** Donde salen los enemigos en el juego (el agujero de su carril). */
const HOLE_X = BOARD.columns + 0.75;
const PREP = ROUND_PREP.durationMs;

/** Partida en la ronda `index` (desde 0), en su preparacion. */
const atRound = (index: number, balance = 1000) => createMatch(balance, index);

/** Ronda `index` ya en su ataque, a `elapsedMs` del principio. */
const attacking = (index: number, elapsedMs = 0, released = 0): MatchState => ({
  ...atRound(index),
  round: { index, phase: 'attack', prepMs: 0, elapsedMs, released },
});

const withPlantAt = (state: MatchState, cell: Cell): MatchState => ({
  ...state,
  plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? createPlant() : p))),
});

const types = (events: readonly RoundEvent[]) => events.map((e) => e.type);

describe('guion de las rondas (datos)', () => {
  it('el mundo 1 tiene 10 rondas: la ultima es el combate contra Creeper (T-008)', () => {
    expect(ROUND_COUNT).toBe(10);
    expect(bossRoundIndex()).toBe(9);
    expect(ROUNDS.map((_, i) => isBossRound(i))).toEqual([false, false, false, false, false, false, false, false, false, true]);
  });

  it('en la ronda 10 sale Creeper por el carril del centro, detras de su escolta (T-009)', () => {
    const [escort, boss] = ROUNDS[9].groups;
    expect(ROUNDS[9].groups).toHaveLength(2);
    expect(boss).toEqual({ atMs: expect.any(Number), kind: 'creeper', lanes: [2] });
    // Un acorazado de nivel 5 por carril, antes que el y a su paso, con su grito.
    expect(escort).toMatchObject({ kind: 'armored', lanes: [0, 1, 2, 3, 4], level: 5, shout: expect.stringContaining('ADELANTE') });
    expect(escort.atMs).toBeLessThan(boss.atMs);
    expect(ENEMIES.armored.speed * (escort.haste ?? 1)).toBeCloseTo(ENEMIES.creeper.speed, 9);
    const others = ROUNDS.slice(0, 9).flatMap((round) => round.groups.map((group) => group.kind));
    expect(others).not.toContain('creeper');
  });

  it('en las rondas 8 y 9 Creeper se prepara y acelera a sus tropas un 25 % y un 35 %; las demas van a su velocidad', () => {
    expect(ROUNDS.map((_, i) => roundHaste(i))).toEqual([1, 1, 1, 1, 1, 1, 1, 1.25, 1.35, 1]);
    expect(ROUNDS.map((round) => round.bossPreparing ?? false)).toEqual([false, false, false, false, false, false, false, true, true, false]);
  });

  it('las rondas 8 y 9 sacan mas enemigos que la 7, y la 9 mas que la 8', () => {
    const count = (index: number) => ROUNDS[index].groups.reduce((sum, group) => sum + group.lanes.length, 0);
    expect(count(7)).toBeGreaterThan(count(6));
    expect(count(8)).toBeGreaterThan(count(7));
  });

  /** Enemigos de cada tipo que saca la ronda `index`. */
  const tally = (index: number) =>
    ROUNDS[index].groups.reduce<Record<string, number>>((sum, g) => ({ ...sum, [g.kind]: (sum[g.kind] ?? 0) + g.lanes.length }), {});

  it('rondas 8 y 9: un 50 % mas de cada tipo que antes de T-009 (redondeando hacia arriba)', () => {
    const before = [
      { worm: 33, armored: 8, spitter: 8 },
      { worm: 39, armored: 13, spitter: 10 },
    ];
    before.forEach((counts, i) => {
      const expected = Object.fromEntries(Object.entries(counts).map(([kind, n]) => [kind, Math.ceil(n * 1.5)]));
      expect(tally(7 + i)).toEqual(expected);
    });
  });

  it('ronda 3 con un acorazado y ronda 4 con dos escupidores (T-009); las rondas 5 a 7, como estaban', () => {
    expect(tally(2)).toEqual({ worm: 19, armored: 1 });
    expect(tally(3)).toEqual({ worm: 12, armored: 5, spitter: 2 });
    expect(tally(4)).toEqual({ worm: 22, armored: 5 });
    expect(tally(5)).toEqual({ worm: 13, armored: 5, spitter: 5 });
    expect(tally(6)).toEqual({ worm: 28, armored: 8, spitter: 7 });
  });

  it('niveles de los enemigos (T-009): rondas 1 y 2 de nivel 1; 3-4, 5-7 y 8-10 con su tabla', () => {
    expect(ROUNDS.map((round) => round.levels ?? null)).toEqual([
      null,
      null,
      ENEMY_LEVELS.tables.early,
      ENEMY_LEVELS.tables.early,
      ENEMY_LEVELS.tables.mid,
      ENEMY_LEVELS.tables.mid,
      ENEMY_LEVELS.tables.mid,
      ENEMY_LEVELS.tables.late,
      ENEMY_LEVELS.tables.late,
      ENEMY_LEVELS.tables.late,
    ]);
    const { early, mid, late } = ENEMY_LEVELS.tables;
    const levels = (table: Record<number, number>) => Object.keys(table).map(Number);
    const weight = (table: Record<number, number>, level: number) => table[level];
    // 3-4: del 1 al 4, mas probable cuanto mas bajo.
    expect(levels(early)).toEqual([1, 2, 3, 4]);
    expect(weight(early, 1) > weight(early, 2) && weight(early, 2) > weight(early, 3) && weight(early, 3) > weight(early, 4)).toBe(true);
    // 5-7: del 1 al 7, el 4 lo que mas; menos el 1, y aun menos el 7.
    expect(levels(mid)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Math.max(...Object.values(mid))).toBe(weight(mid, 4));
    expect(weight(mid, 7)).toBeLessThan(weight(mid, 1));
    // 8-10: del 3 al 10, el 7 lo que mas; menos el 3, y aun menos el 10.
    expect(levels(late)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(Math.max(...Object.values(late))).toBe(weight(late, 7));
    expect(weight(late, 10)).toBeLessThan(weight(late, 3));
  });

  it('cada grupo saca enemigos validos por carriles del tablero, sin repetir carril, y los grupos van en orden', () => {
    for (const round of ROUNDS) {
      expect(round.groups.length).toBeGreaterThan(0);
      expect(round.notice.length).toBeGreaterThan(0);
      round.groups.forEach((group, i) => {
        expect(Object.keys(ENEMIES)).toContain(group.kind);
        expect(group.lanes.length).toBeGreaterThan(0);
        expect(new Set(group.lanes).size).toBe(group.lanes.length);
        group.lanes.forEach((lane) => {
          expect(Number.isInteger(lane)).toBe(true);
          expect(lane).toBeGreaterThanOrEqual(0);
          expect(lane).toBeLessThan(BOARD.lanes);
        });
        expect(group.atMs).toBeGreaterThanOrEqual(i === 0 ? 0 : round.groups[i - 1].atMs);
      });
    }
  });

  it('un concepto por ronda, en el orden de la spec (T-009)', () => {
    const unlocks: Feature[][] = [['shooter'], ['levelUp'], ['fireMine'], ['iceMine'], ['fireInfuse', 'iceInfuse'], ['fuse'], [], [], [], []];
    expect(ROUNDS.map((round) => [...round.unlocks])).toEqual(unlocks);
  });

  it('el acorazado llega en la ronda 3 y el escupidor en la 4 (T-009)', () => {
    const firstRound = (kind: string) => ROUNDS.findIndex((round) => round.groups.some((g) => g.kind === kind)) + 1;
    expect(firstRound('worm')).toBe(1);
    expect(firstRound('armored')).toBe(3);
    expect(firstRound('spitter')).toBe(4);
  });
});

describe('desbloqueo', () => {
  it('lo de cada ronda se suma a lo de las anteriores', () => {
    expect([...unlockedAt(0)]).toEqual(['shooter']);
    expect([...unlockedAt(2)]).toEqual(['shooter', 'levelUp', 'fireMine']);
    expect(unlockedAt(ROUND_COUNT - 1).size).toBe(7);
    expect(unlockRound('iceMine')).toBe(3);
    expect(unlockRound('fireInfuse')).toBe(4);
    expect(unlockRound('fuse')).toBe(5);
  });

  it('en la bandeja solo aparecen las cartas que ya se pueden jugar', () => {
    expect(availableCards(atRound(0))).toEqual(['shooter']);
    expect(availableCards(atRound(1))).toEqual(['shooter']);
    expect(availableCards(atRound(2))).toEqual(['shooter', 'fire']);
    expect(availableCards(atRound(3))).toEqual(['shooter', 'fire', 'ice']);
    expect(availableCards(atRound(4))).toEqual(['shooter', 'fire', 'ice']);
  });

  it('la mina de fuego llega en la ronda 3, la de hielo en la 4 e infundir los dos en la 5 (T-009)', () => {
    const empty = { lane: 2, col: 4 };
    const plant = { lane: 1, col: 1 };
    const sow = (round: number, card: 'fire' | 'ice') => cardPlay(atRound(round), card, empty).blocker;
    const infuse = (round: number, card: 'fire' | 'ice') => cardPlay(withPlantAt(atRound(round), plant), card, plant);
    expect(sow(1, 'fire')).toBe('locked');
    expect(sow(2, 'fire')).toBeNull();
    expect(sow(2, 'ice')).toBe('locked');
    expect(sow(3, 'ice')).toBeNull();
    expect(infuse(3, 'fire')).toMatchObject({ action: 'infuse', blocker: 'locked' });
    expect(infuse(3, 'ice').blocker).toBe('locked');
    expect(infuse(4, 'fire')).toMatchObject({ action: 'infuse', blocker: null, cost: COSTS.fire });
    expect(infuse(4, 'ice').blocker).toBeNull();
    expect(infusableElements(atRound(3))).toEqual([]);
    expect(infusableElements(atRound(4))).toEqual(['fire', 'ice']);
    expect(() => playCard(atRound(1), 'fire', empty)).toThrow();
  });

  it('subir de nivel llega en la ronda 2', () => {
    const cell = { lane: 0, col: 0 };
    expect(levelUpOffer(withPlantAt(atRound(0), cell), cell)?.blocker).toBe('locked');
    expect(levelUpOffer(withPlantAt(atRound(1), cell), cell)?.blocker).toBeNull();
  });

  it('el tope de nivel es 5 desde la ronda 2 y 10 desde la 7 (T-009)', () => {
    expect(ROUNDS.map((_, i) => levelCapAt(i))).toEqual([LIMITS.maxLevel, 5, 5, 5, 5, 5, 10, 10, 10, 10]);
    expect(levelCapRaisedAfter(1, 5)).toBe(6);
    expect(levelCapRaisedAfter(6, 10)).toBeNull();
    expect(levelCapRaisedAfter(1, 3)).toBe(2);
  });

  it('lo nuevo de cada ronda para el aviso que hay que aceptar (T-009)', () => {
    expect(ROUNDS.map((_, i) => roundUnlocks(i))).toEqual([
      [{ kind: 'feature', feature: 'shooter' }],
      [
        { kind: 'feature', feature: 'levelUp' },
        { kind: 'levelCap', level: 5 },
      ],
      [{ kind: 'feature', feature: 'fireMine' }],
      [{ kind: 'feature', feature: 'iceMine' }],
      [
        { kind: 'feature', feature: 'fireInfuse' },
        { kind: 'feature', feature: 'iceInfuse' },
      ],
      [{ kind: 'feature', feature: 'fuse' }],
      [{ kind: 'levelCap', level: 10 }],
      [],
      [],
      [],
    ]);
  });

  it('fusionar llega en la ronda 6', () => {
    const a = { lane: 0, col: 0 };
    const b = { lane: 4, col: 8 };
    const pair = (round: number) => withPlantAt(withPlantAt(atRound(round), a), b);
    expect(fusionBlocker(pair(4), a, b)).toBe('locked');
    expect(fusionTargets(pair(4), a)).toEqual([]);
    expect(fusionBlocker(pair(5), a, b)).toBeNull();
    expect(isUnlocked(pair(5), 'fuse')).toBe(true);
  });
});

describe('preparacion', () => {
  it('la partida empieza en la preparacion de la ronda 1', () => {
    const match = createMatch();
    expect(match.round).toEqual({ index: 0, phase: 'prep', prepMs: PREP, elapsedMs: 0, released: 0 });
    expect(match.spits).toEqual([]);
  });

  it('cuenta atras sin sacar enemigos y luego empieza el ataque; lo que sobra del paso cuenta para el', () => {
    const waiting = stepRound(createMatch(), PREP - 1, HOLE_X);
    expect(waiting.events).toEqual([]);
    expect(waiting.state.round).toMatchObject({ phase: 'prep', prepMs: 1 });
    const started = stepRound(waiting.state, 101, HOLE_X);
    expect(started.events).toEqual([{ type: 'attackStarted', index: 0 }]);
    expect(started.state.round).toMatchObject({ phase: 'attack', elapsedMs: 100 });
  });

  it('el jugador puede adelantar el ataque; fuera de la preparacion no cambia nada', () => {
    const now = stepRound(startAttack(createMatch()), 0, HOLE_X);
    expect(types(now.events)).toEqual(['attackStarted']);
    expect(now.state.round.phase).toBe('attack');
    const running = attacking(0, 5000);
    expect(startAttack(running)).toBe(running);
  });

  it('tiene preparacion antes de cada ronda: entre rondas se puede sembrar', () => {
    const cleared = stepRound(attacking(0, 999_999, ROUNDS[0].groups.length), 16, HOLE_X).state;
    expect(cleared.round).toEqual(createRound(1));
    expect(cardPlay(cleared, 'shooter', { lane: 2, col: 2 }).blocker).toBeNull();
  });
});

describe('ataque', () => {
  it('saca cada grupo a su hora, un enemigo por carril, en el agujero y con la vida llena', () => {
    const [first] = ROUNDS[0].groups;
    const before = stepRound(attacking(0), first.atMs - 1, HOLE_X);
    expect(before.spawned).toEqual([]);
    const out = stepRound(before.state, 1, HOLE_X);
    expect(out.spawned.map((e) => [e.kind, e.lane, e.x, e.hp])).toEqual(first.lanes.map((lane) => [first.kind, lane, HOLE_X, ENEMIES[first.kind].hp]));
    expect(out.spawned.every((e) => e.haste === 1)).toBe(true);
    expect(out.state.enemies).toEqual(out.spawned);
    expect(out.state.round.released).toBe(1);
  });

  it('salen con el nivel de la tabla de la ronda; en la 1, de nivel 1 y con la vida de su nivel (T-009)', () => {
    const [first] = ROUNDS[2].groups;
    // 0,95 cae en el nivel mas alto de la tabla de las rondas 3 y 4.
    const { spawned } = stepRound(attacking(2), first.atMs, HOLE_X, () => 0.95);
    expect(spawned.map((e) => [e.level, e.hp])).toEqual(first.lanes.map(() => [4, ENEMIES[first.kind].hp * 1.45]));
    const low = stepRound(attacking(0), ROUNDS[0].groups[0].atMs, HOLE_X, () => 0.95).spawned;
    expect(low.every((e) => e.level === 1)).toBe(true);
  });

  it('la escolta de Creeper sale de nivel 5 y a su paso, con su grito, y despues sale el (T-009)', () => {
    const [escort, boss] = ROUNDS[9].groups;
    const out = stepRound(attacking(9), escort.atMs, HOLE_X, () => 0.99);
    expect(out.events).toEqual([{ type: 'shout', text: escort.shout }]);
    expect(out.spawned.map((e) => [e.kind, e.lane, e.level, e.haste])).toEqual(escort.lanes.map((lane) => ['armored', lane, 5, escort.haste]));
    const later = stepRound(out.state, boss.atMs - escort.atMs, HOLE_X);
    expect(later.spawned.map((e) => e.kind)).toEqual(['creeper']);
  });

  it('en las rondas 8 y 9 los enemigos salen acelerados (T-008)', () => {
    for (const index of [7, 8]) {
      const [first] = ROUNDS[index].groups;
      const { spawned } = stepRound(attacking(index), first.atMs, HOLE_X);
      expect(spawned.length).toBeGreaterThan(0);
      expect(spawned.every((e) => e.haste === roundHaste(index))).toBe(true);
    }
  });

  it('el Creeper sale con la vida llena, sin nivel y sin saltos gastados', () => {
    const group = ROUNDS[9].groups[1];
    const { spawned } = stepRound(attacking(9, group.atMs - 1, 1), 1, HOLE_X);
    expect(spawned).toEqual([expect.objectContaining({ kind: 'creeper', lane: 2, x: HOLE_X, hp: ENEMIES.creeper.hp, haste: 1, level: 1, jump: null, jumpsUsed: 0 })]);
  });

  it('un paso largo saca todos los grupos que tocan', () => {
    const groups = ROUNDS[6].groups;
    const out = stepRound(attacking(6), groups[2].atMs, HOLE_X);
    expect(out.state.round.released).toBe(3);
    expect(out.spawned).toHaveLength(groups[0].lanes.length + groups[1].lanes.length + groups[2].lanes.length);
    expect(out.spawned.map((e) => e.kind)).toEqual(groups.slice(0, 3).flatMap((g) => g.lanes.map(() => g.kind)));
  });

  it('no termina mientras queden enemigos por salir o vivos', () => {
    const groups = ROUNDS[0].groups;
    const pending = stepRound(attacking(0, 0, 0), 1, HOLE_X);
    expect(types(pending.events)).not.toContain('roundCleared');
    const allOut = attacking(0, groups[groups.length - 1].atMs, groups.length);
    const alive = spawnEnemy(allOut, 'worm', 0, 5);
    const step = stepRound(alive, 16, HOLE_X);
    expect(step.events).toEqual([]);
    expect(step.state.round.phase).toBe('attack');
  });
});

describe('fin de ronda', () => {
  const lastGroupOut = (index: number) => attacking(index, 999_999, ROUNDS[index].groups.length);

  it('sin enemigos por salir ni vivos, pasa a la preparacion de la siguiente con su aviso', () => {
    const { state, events } = stepRound(lastGroupOut(2), 16, HOLE_X);
    expect(events).toEqual([
      { type: 'roundCleared', index: 2 },
      { type: 'roundStarted', index: 3 },
    ]);
    expect(state.round).toEqual(createRound(3));
  });

  it('plantas, saldo y vidas se conservan de una ronda a la siguiente', () => {
    const cell = { lane: 3, col: 2 };
    const before: MatchState = { ...withPlantAt(lastGroupOut(1), cell), balance: 345, lives: LIVES.start - 1 };
    const { state } = stepRound(before, 16, HOLE_X);
    expect(state.round.index).toBe(2);
    expect(state.plants).toBe(before.plants);
    expect(state.balance).toBe(345);
    expect(state.lives).toBe(LIVES.start - 1);
  });

  it('tras la ultima ronda la partida esta ganada y ya no pasa nada mas', () => {
    const { state, events } = stepRound(lastGroupOut(ROUND_COUNT - 1), 16, HOLE_X);
    expect(events).toEqual([{ type: 'roundCleared', index: ROUND_COUNT - 1 }, { type: 'won' }]);
    expect(isWon(state)).toBe(true);
    const later = stepRound(state, 60_000, HOLE_X);
    expect(later.state).toBe(state);
    expect(later.events).toEqual([]);
  });

  it('sin vidas las rondas se detienen', () => {
    const lost: MatchState = { ...createMatch(), lives: 0 };
    const step = stepRound(lost, PREP * 10, HOLE_X);
    expect(step.state).toBe(lost);
    expect(step.spawned).toEqual([]);
  });

  it('no modifica el estado recibido', () => {
    const before = attacking(3, 0);
    const copy = structuredClone(before);
    stepRound(before, 30_000, HOLE_X);
    expect(before).toEqual(copy);
  });
});

describe('Creeper se prepara (T-008)', () => {
  it('se le ve desde la ronda 8 hasta que sale en la 10; antes, no', () => {
    expect([0, 3, 6].map((i) => isBossPreparing(atRound(i)))).toEqual([false, false, false]);
    expect(isBossPreparing(atRound(7))).toBe(true);
    expect(isBossPreparing(attacking(8, 40_000, 5))).toBe(true);
    expect(isBossPreparing(atRound(9))).toBe(true);
    expect(isBossPreparing(attacking(9, 0, 0))).toBe(true);
    // Sigue preparandose mientras sale su escolta (T-009); deja de verse al salir el.
    expect(isBossPreparing(attacking(9, 3_000, 1))).toBe(true);
    expect(isBossPreparing(attacking(9, 6_000, 2))).toBe(false);
  });

  it('al ganar ya no se le ve', () => {
    const won: MatchState = { ...atRound(9), round: { index: 9, phase: 'won', prepMs: 0, elapsedMs: 0, released: 1 } };
    expect(isBossPreparing(won)).toBe(false);
  });
});

describe('ronda completa', () => {
  it('con una disparadora en cada carril se supera la ronda 1 y empieza la 2', () => {
    let state = createMatch();
    for (let lane = 0; lane < BOARD.lanes; lane++) state = withPlantAt(state, { lane, col: 0 });
    const events: RoundEvent[] = [];
    for (let t = 0; t < 5 * 60_000 && state.round.index === 0; t += 50) {
      const round = stepRound(state, 50, HOLE_X);
      events.push(...round.events);
      state = stepCombat(round.state, 50).state;
    }
    expect(types(events)).toEqual(['attackStarted', 'roundCleared', 'roundStarted']);
    expect(state.lives).toBe(LIVES.start);
    expect(state.round).toEqual(createRound(1));
  });

  it('sin plantas, los gusanos de la ronda 1 se cuelan y se pierde', () => {
    let state = createMatch();
    for (let t = 0; t < 5 * 60_000 && state.lives > 0; t += 50) {
      state = stepCombat(stepRound(state, 50, HOLE_X).state, 50).state;
    }
    expect(state.lives).toBe(0);
    expect(state.round.index).toBe(0);
  });
});
