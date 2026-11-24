import { describe, expect, it } from 'vitest';
import { BOARD, ECONOMY, GAME_SPEED, ROUND_PREP } from '../config/balance';
import type { Cell } from './board';
import { MAX_STEP_MS, spawnEnemy, stepCombat, type CombatEvent } from './combat';
import { stepIncome } from './economy';
import { createMatch, createPlant, type MatchState } from './match';
import { createShooter } from './plants';
import { startAttack, stepRound } from './rounds';
import { NORMAL_SPEED, gameDelta, nextSpeed, validSpeed } from './speed';

const HOLE_X = BOARD.columns + 0.75;
const FAST = GAME_SPEED.steps[GAME_SPEED.steps.length - 1];

function withPlant(state: MatchState, cell: Cell): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? createPlant(createShooter()) : p)));
  return { ...state, plants };
}

/** Juega el combate con fotogramas reales de `frameMs` a la velocidad `speed` durante `gameMs` de juego. */
function play(state: MatchState, gameMs: number, frameMs: number, speed: number) {
  const events: Array<CombatEvent & { t: number }> = [];
  let current = state;
  for (let t = 0; t < gameMs; ) {
    const dt = Math.min(gameDelta(frameMs, speed), gameMs - t);
    const step = stepCombat(current, dt);
    current = step.state;
    t += dt;
    events.push(...step.events.map((e) => ({ ...e, t })));
  }
  return { state: current, events };
}

describe('velocidad del juego (T-048)', () => {
  it('empieza en la de siempre, ×1', () => {
    expect(NORMAL_SPEED).toBe(1);
    expect(GAME_SPEED.steps[0]).toBe(1);
  });

  it('el boton pasa por todas en orden y despues de la ultima vuelve a la primera', () => {
    let speed: number = NORMAL_SPEED;
    const seen: number[] = [];
    for (let i = 0; i < GAME_SPEED.steps.length; i++) {
      seen.push(speed);
      speed = nextSpeed(speed);
    }
    expect(seen).toEqual([...GAME_SPEED.steps]);
    expect(speed).toBe(NORMAL_SPEED);
  });

  it('las velocidades van de menos a mas y ninguna para el juego', () => {
    GAME_SPEED.steps.forEach((speed, i) => {
      expect(speed).toBeGreaterThan(0);
      if (i > 0) expect(speed).toBeGreaterThan(GAME_SPEED.steps[i - 1]);
    });
  });

  it('una velocidad desconocida se queda en la de siempre', () => {
    for (const bad of [0, -1, 3, 1.25, Number.NaN, Infinity, '2', null, undefined, {}]) expect(validSpeed(bad)).toBe(NORMAL_SPEED);
    for (const speed of GAME_SPEED.steps) expect(validSpeed(speed)).toBe(speed);
    expect(nextSpeed(7)).toBe(NORMAL_SPEED);
  });

  it('cada fotograma trae su tiempo real por la velocidad', () => {
    expect(gameDelta(16, NORMAL_SPEED)).toBe(16);
    for (const speed of GAME_SPEED.steps) expect(gameDelta(20, speed)).toBe(20 * speed);
    expect(gameDelta(20, 9)).toBe(20);
  });

  it('a la mas rapida, con fotogramas que dan pasos de 50 ms, el combate es identico al de pasos de 50 ms', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 2, HOLE_X);
    const fast = play(state, 20_000, MAX_STEP_MS / FAST, FAST);
    const normal = play(state, 20_000, MAX_STEP_MS, NORMAL_SPEED);
    expect(fast.state).toEqual(normal.state);
    expect(fast.events).toEqual(normal.events);
  });

  it('a la mas rapida, a 60 y a 30 fps, pasa lo mismo que a ×1: la disparadora acaba con el gusano a su tiempo', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 2, HOLE_X);
    const killedAt = (run: ReturnType<typeof play>) => run.events.find((e) => e.type === 'enemyKilled')?.t ?? null;
    const normal = play(state, 60_000, 16, NORMAL_SPEED);
    expect(killedAt(normal)).not.toBeNull();
    for (const frameMs of [33, 67]) {
      const fast = play(state, 60_000, frameMs, FAST);
      expect(fast.events.filter((e) => e.type === 'enemyKilled')).toHaveLength(1);
      expect(fast.events.filter((e) => e.type === 'enemyEscaped')).toHaveLength(0);
      expect(Math.abs((killedAt(fast) ?? Infinity) - (killedAt(normal) ?? 0))).toBeLessThanOrEqual(2 * MAX_STEP_MS);
      expect(fast.state.lives).toBe(normal.state.lives);
    }
  });

  it('a la mas rapida, la preparacion acaba en la parte de fotogramas que toca', () => {
    const framesUntilAttack = (speed: number) => {
      let state = createMatch();
      let frames = 0;
      while (state.round.phase === 'prep') {
        state = stepRound(state, gameDelta(16, speed), HOLE_X, () => 0.5).state;
        frames++;
      }
      return frames;
    };
    const normal = framesUntilAttack(NORMAL_SPEED);
    expect(normal).toBe(Math.ceil(ROUND_PREP.durationMs / 16));
    expect(framesUntilAttack(FAST)).toBe(Math.ceil(ROUND_PREP.durationMs / (16 * FAST)));
  });

  it('a la mas rapida, el goteo cae en la parte de fotogramas que toca', () => {
    const framesUntilDrip = (speed: number) => {
      let state = startAttack(createMatch());
      state = stepRound(state, 0, HOLE_X, () => 0.5).state;
      let frames = 0;
      for (;;) {
        frames++;
        const step = stepIncome(state, gameDelta(16, speed));
        state = step.state;
        if (step.earned > 0) return frames;
      }
    };
    expect(framesUntilDrip(NORMAL_SPEED)).toBe(Math.ceil(ECONOMY.passiveIntervalMs / 16));
    expect(framesUntilDrip(FAST)).toBe(Math.ceil(ECONOMY.passiveIntervalMs / (16 * FAST)));
  });
});
