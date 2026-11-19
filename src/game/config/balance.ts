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

/** Vidas de la partida: cada enemigo que cruza el borde izquierdo resta una. PROVISIONAL mientras D-07 siga abierta. */
export const LIVES = {
  start: 3,
} as const;

/** Disparadora de un canon y nivel 1. Fusionar y subir de nivel parten de estos valores (ver plants.ts). */
export const SHOOTER = {
  hp: 300, // PROVISIONAL
  damage: 20, // PROVISIONAL
  fireIntervalMs: 1400, // PROVISIONAL
  /** Velocidad de la bala, en casillas por segundo. PROVISIONAL. */
  bulletSpeed: 6,
} as const;

/** Enemigos. Posiciones y velocidades en casillas (ADR-0005): la logica no sabe de pixeles. */
export const ENEMIES = {
  worm: {
    hp: 100, // PROVISIONAL
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.25,
    biteDamage: 50, // PROVISIONAL
    biteIntervalMs: 1000, // PROVISIONAL
    /** Lo que tarda el primer mordisco desde que toca la planta. PROVISIONAL. */
    firstBiteMs: 450,
    /** Distancia entre el centro del gusano y el de la planta a la que empieza a morderla. */
    reach: 0.6,
    /** Del centro del gusano a su hocico: ahi le dan las balas. */
    halfLength: 0.4,
  },
} as const;

/**
 * Generador de enemigos para probar el combate hasta que existan las rondas (T-007):
 * un gusano por un carril al azar, cada vez un poco mas seguido, hasta un minimo. PROVISIONAL.
 */
export const TEST_SPAWNER = {
  firstDelayMs: 12_000,
  startIntervalMs: 10_000,
  /** Cuanto se acorta el intervalo con cada gusano que sale. */
  intervalStepMs: 350,
  minIntervalMs: 3_000,
} as const;

/**
 * Planta fusionada (D-02, cerrada el 19 nov 2026; se ajusta jugando). Ver docs/specs/01-mecanicas.md.
 * Cada canon dispara una bala y el dano total del disparo se reparte entre ellas: con 2 canones cada bala
 * lleva 2,2 / 2 = 1,1 veces el dano base, con 3 canones, 3,5 / 3.
 */
export const FUSION = {
  /** Dano total de cada disparo respecto a una disparadora de un canon. */
  damageByCannons: { 1: 1, 2: 2.2, 3: 3.5 },
  /** Vida maxima respecto a una disparadora de un canon: la suma de las partes. */
  hpByCannons: { 1: 1, 2: 2, 3: 3 },
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
