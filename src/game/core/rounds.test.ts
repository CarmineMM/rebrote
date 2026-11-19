import { describe, expect, it } from 'vitest';
import { BOARD, COSTS, ENEMIES, LIVES, ROUND_PREP, ROUNDS } from '../config/balance';
import type { Cell } from './board';
import { spawnEnemy, stepCombat } from './combat';
import { cardPlay, createMatch, createPlant, fusionBlocker, fusionTargets, levelUpOffer, playCard, type MatchState } from './match';
import {
  ROUND_COUNT,
  availableCards,
  createRound,
  infusableElements,
  isUnlocked,
  isWon,
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
  it('el mundo 1 tiene 7 rondas', () => {
    expect(ROUND_COUNT).toBe(7);
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

  it('un concepto por ronda, en el orden de la spec', () => {
    const unlocks: Feature[][] = [['shooter'], ['levelUp'], ['fireMine'], ['fireInfuse'], ['iceMine', 'iceInfuse'], ['fuse'], []];
    expect(ROUNDS.map((round) => [...round.unlocks])).toEqual(unlocks);
  });

  it('el acorazado llega en la ronda 4 y el escupidor en la 6', () => {
    const firstRound = (kind: string) => ROUNDS.findIndex((round) => round.groups.some((g) => g.kind === kind)) + 1;
    expect(firstRound('worm')).toBe(1);
    expect(firstRound('armored')).toBe(4);
    expect(firstRound('spitter')).toBe(6);
  });
});

describe('desbloqueo', () => {
  it('lo de cada ronda se suma a lo de las anteriores', () => {
    expect([...unlockedAt(0)]).toEqual(['shooter']);
    expect([...unlockedAt(2)]).toEqual(['shooter', 'levelUp', 'fireMine']);
    expect(unlockedAt(ROUND_COUNT - 1).size).toBe(7);
    expect(unlockRound('fireInfuse')).toBe(3);
    expect(unlockRound('fuse')).toBe(5);
  });

  it('en la bandeja solo aparecen las cartas que ya se pueden jugar', () => {
    expect(availableCards(atRound(0))).toEqual(['shooter']);
    expect(availableCards(atRound(1))).toEqual(['shooter']);
    expect(availableCards(atRound(2))).toEqual(['shooter', 'fire']);
    expect(availableCards(atRound(3))).toEqual(['shooter', 'fire']);
    expect(availableCards(atRound(4))).toEqual(['shooter', 'fire', 'ice']);
  });

  it('el fuego se siembra solo desde la ronda 3 y se infunde desde la 4; el hielo, las dos cosas desde la 5', () => {
    const empty = { lane: 2, col: 4 };
    const plant = { lane: 1, col: 1 };
    const sow = (round: number, card: 'fire' | 'ice') => cardPlay(atRound(round), card, empty).blocker;
    const infuse = (round: number, card: 'fire' | 'ice') => cardPlay(withPlantAt(atRound(round), plant), card, plant);
    expect(sow(1, 'fire')).toBe('locked');
    expect(sow(2, 'fire')).toBeNull();
    expect(infuse(2, 'fire')).toMatchObject({ action: 'infuse', blocker: 'locked' });
    expect(infuse(3, 'fire')).toMatchObject({ action: 'infuse', blocker: null, cost: COSTS.fire });
    expect(sow(3, 'ice')).toBe('locked');
    expect(infuse(3, 'ice').blocker).toBe('locked');
    expect(sow(4, 'ice')).toBeNull();
    expect(infuse(4, 'ice').blocker).toBeNull();
    expect(infusableElements(atRound(2))).toEqual([]);
    expect(infusableElements(atRound(3))).toEqual(['fire']);
    expect(infusableElements(atRound(4))).toEqual(['fire', 'ice']);
    expect(() => playCard(atRound(1), 'fire', empty)).toThrow();
  });

  it('subir de nivel llega en la ronda 2', () => {
    const cell = { lane: 0, col: 0 };
    expect(levelUpOffer(withPlantAt(atRound(0), cell), cell)?.blocker).toBe('locked');
    expect(levelUpOffer(withPlantAt(atRound(1), cell), cell)?.blocker).toBeNull();
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
    expect(out.state.enemies).toEqual(out.spawned);
    expect(out.state.round.released).toBe(1);
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
