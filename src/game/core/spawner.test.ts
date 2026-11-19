import { describe, expect, it } from 'vitest';
import { BOARD, ENEMIES, TEST_SPAWNER } from '../config/balance';
import { createMatch, type MatchState } from './match';
import { spawnIntervalMs, stepSpawner } from './spawner';

const HOLE_X = BOARD.columns + 0.75;

describe('generador de prueba', () => {
  it('el primer gusano sale tras la espera inicial, en el agujero y con la vida llena', () => {
    const waiting = stepSpawner(createMatch(), TEST_SPAWNER.firstDelayMs - 1, HOLE_X, () => 0.5);
    expect(waiting.spawned).toHaveLength(0);
    const out = stepSpawner(waiting.state, 1, HOLE_X, () => 0.5);
    expect(out.spawned).toEqual([{ id: 1, kind: 'worm', lane: 2, x: HOLE_X, hp: ENEMIES.worm.hp, biteMs: null }]);
    expect(out.state.enemies).toEqual(out.spawned);
    expect(out.state.spawner).toEqual({ spawned: 1, untilNextMs: spawnIntervalMs(1) });
  });

  it('elige el carril con el aleatorio, siempre dentro del tablero', () => {
    const at = (value: number) => stepSpawner(createMatch(), TEST_SPAWNER.firstDelayMs, HOLE_X, () => value).spawned[0].lane;
    expect(at(0)).toBe(0);
    expect(at(0.999)).toBe(BOARD.lanes - 1);
  });

  it('cada gusano sale un poco antes que el anterior, hasta el minimo', () => {
    expect(spawnIntervalMs(1)).toBe(TEST_SPAWNER.startIntervalMs);
    expect(spawnIntervalMs(2)).toBe(TEST_SPAWNER.startIntervalMs - TEST_SPAWNER.intervalStepMs);
    expect(spawnIntervalMs(1000)).toBe(TEST_SPAWNER.minIntervalMs);
  });

  it('un paso largo puede sacar varios y no pierde el tiempo sobrante', () => {
    const total = TEST_SPAWNER.firstDelayMs + spawnIntervalMs(1) + 10;
    const out = stepSpawner(createMatch(), total, HOLE_X, () => 0);
    expect(out.spawned.map((e) => e.id)).toEqual([1, 2]);
    expect(out.state.spawner.untilNextMs).toBe(spawnIntervalMs(2) - 10);
  });

  it('con 0 vidas no saca mas enemigos', () => {
    const lost: MatchState = { ...createMatch(), lives: 0 };
    expect(stepSpawner(lost, TEST_SPAWNER.firstDelayMs * 10, HOLE_X).spawned).toHaveLength(0);
  });
});
