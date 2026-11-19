/**
 * Todos los numeros de balance viven aqui. Nada de numeros magicos en escenas.
 * Los valores marcados como PROVISIONAL estan pendientes de probar jugando.
 */
/** Tamano del tablero en casillas. Donde y como se pinta en pantalla vive en src/game/view/layout.ts. */
export const BOARD = {
  lanes: 5,
  columns: 9,
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

/**
 * Economia (D-01 cerrada): moneda por enemigo eliminado mas goteo pasivo.
 * Al eliminar un enemigo, la moneda se cobra sola salvo en `dropChance` de los casos:
 * entonces queda en el suelo y solo se cobra si el jugador la recoge con un clic,
 * con un `dropBonusPercent` extra redondeado hacia arriba. Siempre en enteros.
 */
export const ECONOMY = {
  startingBalance: 250,
  passiveIncome: 25, // PROVISIONAL
  passiveIntervalMs: 10_000, // PROVISIONAL
  killReward: 25, // PROVISIONAL
  dropChance: 0.1,
  dropBonusPercent: 15,
  /** Tiempo que la moneda soltada sigue en el suelo antes de perderse. PROVISIONAL. */
  dropLifetimeMs: 8_000,
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
