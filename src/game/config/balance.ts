/**
 * Todos los numeros de balance viven aqui. Nada de numeros magicos en escenas.
 * Los valores marcados como PROVISIONAL estan pendientes de probar jugando.
 */
export const BOARD = {
  lanes: 5,
  columns: 9,
  cellSize: 96,
  offsetX: 48,
  offsetY: 30,
} as const;

export const LIMITS = {
  maxCannons: 3,
  maxLevel: 20,
} as const;

export const COSTS = {
  shooter: 100, // PROVISIONAL
  fire: 75, // PROVISIONAL
  ice: 75, // PROVISIONAL
} as const;

export const FUSION = {
  /** Multiplicador de dano por cantidad de canones. PROVISIONAL (ver D-02 en docs/specs/01-mecanicas.md). */
  damageByCannons: { 1: 1, 2: 2.2, 3: 3.5 },
} as const;

export const LEVELING = {
  /** Incremento por nivel sobre el valor base. PROVISIONAL. */
  damagePerLevel: 0.04,
  fireRatePerLevel: 0.02,
} as const;

export const FIRE_MINE = {
  countdownMs: 2000,
} as const;

export const WORLD_1 = {
  rounds: 7,
  boss: 'creeper',
} as const;
