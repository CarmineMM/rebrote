import { BOARD, TEST_SPAWNER } from '../config/balance';
import { isDefeated, spawnEnemy, type Enemy } from './combat';
import type { MatchState } from './match';

/**
 * Generador de enemigos para probar el combate (T-002) hasta que existan las rondas con guion (T-007):
 * un gusano por un carril al azar, cada vez un poco mas seguido. Vive en la partida para que pausar
 * o cambiar el nivel grafico no lo reinicie.
 */
export interface SpawnerState {
  /** Gusanos que ya salieron. */
  readonly spawned: number;
  /** Milisegundos hasta el siguiente. */
  readonly untilNextMs: number;
}

export interface SpawnResult {
  readonly state: MatchState;
  /** Enemigos que acaban de salir, para animar su entrada. */
  readonly spawned: readonly Enemy[];
}

export function createSpawner(): SpawnerState {
  return { spawned: 0, untilNextMs: TEST_SPAWNER.firstDelayMs };
}

/** Espera tras el gusano numero `spawned` (empezando en 1): se acorta con cada uno hasta el minimo. */
export function spawnIntervalMs(spawned: number): number {
  const interval = TEST_SPAWNER.startIntervalMs - (spawned - 1) * TEST_SPAWNER.intervalStepMs;
  return Math.max(TEST_SPAWNER.minIntervalMs, interval);
}

/**
 * Avanza el generador `dtMs` milisegundos. Los gusanos salen en `spawnX`, el agujero de su carril
 * (lo pone la vista). `random` devuelve un valor en [0, 1), como Math.random; se inyecta para testearlo.
 */
export function stepSpawner(state: MatchState, dtMs: number, spawnX: number, random: () => number = Math.random): SpawnResult {
  if (isDefeated(state)) return { state, spawned: [] };
  let { spawned: count, untilNextMs } = state.spawner;
  let current = state;
  const spawned: Enemy[] = [];
  untilNextMs -= dtMs;
  while (untilNextMs <= 0) {
    const lane = Math.min(BOARD.lanes - 1, Math.floor(random() * BOARD.lanes));
    current = spawnEnemy(current, 'worm', lane, spawnX);
    spawned.push(current.enemies[current.enemies.length - 1]);
    count++;
    untilNextMs += spawnIntervalMs(count);
  }
  return { state: { ...current, spawner: { spawned: count, untilNextMs } }, spawned };
}
