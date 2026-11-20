import type { RoundScript } from '../core/rounds';

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
  /** Tope absoluto de nivel de una disparadora. En el mundo 1 cada ronda pone el suyo (`levelCap` en `ROUNDS`, T-009). */
  maxLevel: 20,
} as const;

export const COSTS = {
  shooter: 100, // PROVISIONAL
  fire: 75, // PROVISIONAL
  ice: 75, // PROVISIONAL
} as const;

/**
 * Economia (D-01 cerrada): moneda por enemigo eliminado (`reward` de cada uno en `ENEMIES`, T-009) mas goteo pasivo, que
 * solo corre durante el ataque (T-010: en la preparacion no se gana moneda esperando). Al eliminar un enemigo, la moneda se cobra sola salvo en `dropChance` de los casos:
 * entonces queda en el suelo y solo se cobra si el jugador la recoge con un clic,
 * con un `dropBonusPercent` extra redondeado hacia arriba. Siempre en enteros.
 */
export const ECONOMY = {
  startingBalance: 250,
  passiveIncome: 25, // PROVISIONAL
  /** Cada cuanto tiempo de ataque cae el goteo. En la preparacion el reloj se para y sigue donde iba. PROVISIONAL. */
  passiveIntervalMs: 10_000,
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

/**
 * Enemigos. Posiciones y velocidades en casillas (ADR-0005): la logica no sabe de pixeles.
 * `attack` dice como ataca: `bite` muerde lo que toca; `spit` se para a distancia y escupe (T-007).
 * `hp` y el dano son la base de nivel 1: cada nivel suma `ENEMY_LEVELS.perLevel` (T-009) y despues los multiplica la
 * fuerza de `ENEMY_POWER` (T-010). `reward` es la moneda que da al caer (T-009, P-03): fija por tipo, sea cual sea su
 * nivel.
 */
export const ENEMIES = {
  worm: {
    reward: 15,
    hp: 100, // PROVISIONAL
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.25,
    attack: 'bite',
    biteDamage: 50, // PROVISIONAL
    biteIntervalMs: 1000, // PROVISIONAL
    /** Lo que tarda el primer mordisco desde que toca la planta. PROVISIONAL. */
    firstBiteMs: 450,
    /** Distancia entre el centro del gusano y el de la planta a la que empieza a morderla. */
    reach: 0.6,
    /** Del centro del gusano a su hocico: ahi le dan las balas. */
    halfLength: 0.4,
  },
  /** Gusano acorazado (T-007, desde la ronda 4): muerde como el gusano, con mucha mas vida y mas lento. */
  armored: {
    reward: 25,
    /** Cuatro veces la del gusano. PROVISIONAL. */
    hp: 400,
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.16,
    attack: 'bite',
    biteDamage: 50, // PROVISIONAL
    biteIntervalMs: 1000, // PROVISIONAL
    firstBiteMs: 450,
    reach: 0.6,
    halfLength: 0.42,
  },
  /**
   * Gusano escupidor (T-007, desde la ronda 6): se para a `range` casillas de lo primero sembrado en su carril
   * (planta o mina) y le escupe. Nunca se para antes de pisar el cesped, para que las plantas puedan darle.
   */
  spitter: {
    reward: 20,
    hp: 140, // PROVISIONAL
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.28,
    attack: 'spit',
    /**
     * Distancia de centro a centro a la que se para. Mayor que `MINE.detectRadius`: asi puede reventar una mina
     * sin que llegue a armarse. PROVISIONAL.
     */
    range: 2.6,
    spitDamage: 25, // PROVISIONAL
    spitIntervalMs: 1800, // PROVISIONAL
    /** Lo que tarda el primer escupitajo desde que se para. PROVISIONAL. */
    firstSpitMs: 900,
    /** Velocidad del escupitajo, en casillas por segundo. PROVISIONAL. */
    spitSpeed: 4,
    halfLength: 0.4,
  },
  /**
   * Creeper (T-008), jefe del mundo 1 y unico enemigo de la ronda 10: muerde como el gusano, con mucha mas vida, y
   * salta de carril al perder vida (`CREEPER`). Mas grande que el gusano: le dan antes y se para mas lejos a morder.
   * No tiene nivel: de `ENEMY_POWER` solo le toca la fuerza de todos (T-010). Al caer se gana la partida: no da moneda.
   */
  creeper: {
    reward: 0,
    hp: 4000, // PROVISIONAL: con una defensa repartida, el combate dura cerca de un minuto
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.2,
    attack: 'bite',
    /** Lo que mordia en T-009 un gusano de nivel 10 (P-07). Con la fuerza de T-010, 129,25. PROVISIONAL. */
    biteDamage: 117.5,
    biteIntervalMs: 1000, // PROVISIONAL
    firstBiteMs: 500,
    reach: 0.85,
    halfLength: 0.62,
  },
} as const;

/**
 * Niveles de los enemigos (T-009, P-04 y P-05, decididos el 20 nov 2026). Cada nivel suma `perLevel` a la vida y al dano
 * (mordisco o escupitajo) de nivel 1; la velocidad no cambia. Encima va la fuerza de `ENEMY_POWER` (T-010). Cada ronda
 * dice con que pesos sale cada nivel (`levels` en `ROUNDS`); sin tabla, todos de nivel 1. Las copias del Creeper y su
 * escolta tienen nivel fijo. PROVISIONAL.
 */
export const ENEMY_LEVELS = {
  /** Un 5 % mas que lo que suma al dano cada nivel de una disparadora (`LEVELING.damagePerLevel`). */
  perLevel: 0.15,
  /** Pesos de cada nivel (no hace falta que sumen 100). */
  tables: {
    /** Rondas 3 y 4: del 1 al 4, mas probable cuanto mas bajo. */
    early: { 1: 40, 2: 30, 3: 20, 4: 10 },
    /** Rondas 5 a 7: del 1 al 7, con el pico en el 4; menos el 1 y aun menos el 7. */
    mid: { 1: 8, 2: 14, 3: 20, 4: 24, 5: 16, 6: 12, 7: 6 },
    /** Rondas 8 a 10: del 3 al 10, con el pico en el 7; menos el 3 y aun menos el 10. */
    late: { 3: 6, 4: 10, 5: 15, 6: 20, 7: 22, 8: 14, 9: 9, 10: 4 },
  },
} as const;

/**
 * Fuerza de los enemigos (T-010, A-07, decidida el 20 nov 2026). Multiplica su vida y su dano (mordisco, escupitajo y el
 * golpe del Creeper al aterrizar), encima de lo que suma su nivel (`ENEMY_LEVELS.perLevel`). Vale para todos los
 * enemigos, tambien Creeper (que no tiene nivel: solo `base`) y los que vengan. La velocidad no cambia. PROVISIONAL.
 * Un gusano de nivel 10 tiene 2,35 (nivel) x 1,40 (tramo) x 1,10 (fuerza) = 3,62 veces la vida y el dano de su base.
 * Ajustada a la baja el mismo dia (de 15, 25 y 40 % a 10, 20 y 40 %).
 */
export const ENEMY_POWER = {
  /** Todos los enemigos: un 10 % mas. */
  base: 1.1,
  /**
   * Extra por tramo de nivel, encima de lo que ya da el nivel: del 5 al 9, +20 %; desde el 10, +40 % (en vez del 20:
   * solo cuenta el tramo mas alto alcanzado). Son los niveles en los que la medallita cambia de color (plata y oro).
   */
  levelTiers: [
    { from: 5, bonus: 0.2 },
    { from: 10, bonus: 0.4 },
  ],
} as const;

/**
 * Lo propio del Creeper (T-008; J-01 a J-05 cerradas el 20 nov 2026). Salta de carril al perder vida: cada umbral
 * de `jumpAt` (fraccion de su vida maxima) que cruza provoca un salto. Avisa del carril de destino (`warnMs`), vuela
 * (`airMs`) y al aterrizar golpea lo primero sembrado que tiene delante (`slamDamage`). Al despegar deja copias suyas
 * (gusanos normales, acelerados) en el carril que abandona. Por debajo de `enragedBelow` entra en su fase 2: salta
 * cada 10 % en vez de cada 20 %, avisa menos y deja dos copias en vez de una. Si cruza el borde izquierdo, se pierde
 * la partida. Al derrotarlo se desconectan sus copias.
 * T-009 (P-07 y P-08): sus copias son de nivel 10 y en la fase 2 cada copia puede ser un acorazado o un escupidor.
 * T-010: su mordisco (`ENEMIES.creeper.biteDamage`) y su golpe llevan la fuerza de todos (`ENEMY_POWER.base`).
 */
export const CREEPER = {
  /** Umbrales de vida que lo hacen saltar: cada 20 % en la fase 1 y cada 10 % en la 2 (que empieza saltando en el 50 %). */
  jumpAt: [0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
  /** Fase 2: con esta fraccion de vida o menos. */
  enragedBelow: 0.5,
  /** Aviso antes de despegar: se agacha y marca el carril de destino (J-01). PROVISIONAL. */
  warnMs: { calm: 1000, enraged: 600 },
  /** Lo que tarda en el aire: no le dan las balas ni las minas, y no muerde ni avanza. PROVISIONAL. */
  airMs: 600,
  /** Golpe al aterrizar a lo primero sembrado que tiene delante en su carril nuevo (J-05), sin la fuerza. PROVISIONAL. */
  slamDamage: 150,
  /** Copias que deja en el carril que abandona al despegar (J-03). */
  copies: { calm: 1, enraged: 2 },
  /** De que tipo sale cada copia, con sus pesos: en la fase 1 siempre gusano; en la 2, 50 % gusano y 25 % cada otro. */
  copyKinds: { calm: { worm: 1 }, enraged: { worm: 50, armored: 25, spitter: 25 } },
  /** Nivel de sus copias (no salen al azar como el resto). */
  copyLevel: 10,
  /** Distancia entre copias, hacia atras (a la derecha) desde donde estaba. */
  copyGap: 0.8,
  /** Velocidad de sus copias respecto a la normal, como los gusanos que acelera en las rondas 8 y 9. PROVISIONAL. */
  copyHaste: 1.35,
} as const;

/**
 * Preparacion antes de cada ronda (T-007), tambien antes de la 1: se puede sembrar, infundir, fusionar y subir
 * de nivel, y el goteo sigue. El jugador puede adelantar el ataque con un boton. PROVISIONAL.
 */
export const ROUND_PREP = {
  durationMs: 20_000,
} as const;

/**
 * Las rondas del mundo 1 (T-007; de 7 a 10 en T-008; progresion de T-009 y T-010), en orden. Cada una desbloquea lo suyo
 * al empezar su preparacion (`unlocks`, y el tope de nivel de las disparadoras en `levelCap`), avisa con una linea
 * (`notice`) y, si trae algo nuevo, con el aviso que hay que aceptar (salvo `quiet`: la ronda 1, T-010). Saca sus grupos de enemigos: cada grupo, un enemigo por carril de `lanes` a la vez, `atMs` milisegundos
 * despues de que empiece el ataque (en orden). La ronda acaba cuando no quedan enemigos por salir ni vivos. Los
 * carriles van de 0 (el del fondo) a 4 (el de delante).
 * Los enemigos salen con un nivel al azar segun `levels` (tablas de `ENEMY_LEVELS`; sin ella, nivel 1), salvo los
 * grupos que fijan el suyo (`level`).
 * En las rondas 8 y 9 Creeper se prepara (`bossPreparing`, se le ve a la derecha) y acelera a sus enemigos (`haste`:
 * velocidad respecto a la normal). La 10 es el combate contra Creeper: primero manda a su escolta (un grupo con su
 * propio `level` y `haste`, y un grito, `shout`) y sale detras. PROVISIONAL: se ajusta jugando.
 */
export const ROUNDS: readonly RoundScript[] = [
  {
    unlocks: ['shooter'],
    // T-010 (A-01): la disparadora se da por sabida; basta el aviso de una linea.
    quiet: true,
    notice: 'Siembra disparadoras: cada una defiende su carril',
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [2] },
      { atMs: 15_000, kind: 'worm', lanes: [1] },
      { atMs: 24_000, kind: 'worm', lanes: [3] },
      { atMs: 32_000, kind: 'worm', lanes: [2] },
      { atMs: 39_000, kind: 'worm', lanes: [0] },
      { atMs: 45_000, kind: 'worm', lanes: [4] },
      { atMs: 52_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 60_000, kind: 'worm', lanes: [0, 4] },
    ],
  },
  {
    unlocks: ['levelUp'],
    // T-010 (A-05): el tope se queda en 5 todo el mundo 1.
    levelCap: 5,
    notice: 'Toca una disparadora para subirla de nivel (hasta el 5)',
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [2] },
      { atMs: 8_000, kind: 'worm', lanes: [2] },
      { atMs: 16_000, kind: 'worm', lanes: [0, 4] },
      { atMs: 24_000, kind: 'worm', lanes: [1] },
      { atMs: 27_000, kind: 'worm', lanes: [1] },
      { atMs: 34_000, kind: 'worm', lanes: [3] },
      { atMs: 37_000, kind: 'worm', lanes: [3] },
      { atMs: 45_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 55_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 60_000, kind: 'worm', lanes: [2] },
      { atMs: 64_000, kind: 'worm', lanes: [2] },
    ],
  },
  {
    unlocks: ['fireMine'],
    notice: 'Siembra fuego solo y explota. ¡Llega el acorazado, y los gusanos ya tienen nivel!',
    levels: ENEMY_LEVELS.tables.early,
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [2] },
      { atMs: 10_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 22_000, kind: 'worm', lanes: [0] },
      { atMs: 23_500, kind: 'worm', lanes: [0] },
      { atMs: 25_000, kind: 'worm', lanes: [0] },
      { atMs: 36_000, kind: 'worm', lanes: [4] },
      { atMs: 37_500, kind: 'worm', lanes: [4] },
      { atMs: 39_000, kind: 'worm', lanes: [3, 4] },
      { atMs: 45_000, kind: 'armored', lanes: [2] },
      { atMs: 52_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 54_000, kind: 'worm', lanes: [2] },
      { atMs: 64_000, kind: 'worm', lanes: [0, 1] },
      { atMs: 66_000, kind: 'worm', lanes: [3, 4] },
    ],
  },
  {
    unlocks: ['iceMine'],
    notice: 'Siembra hielo solo y frena en área. ¡Llega el escupidor!',
    levels: ENEMY_LEVELS.tables.early,
    groups: [
      { atMs: 3_000, kind: 'armored', lanes: [2] },
      { atMs: 12_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 22_000, kind: 'worm', lanes: [0, 4] },
      { atMs: 26_000, kind: 'spitter', lanes: [1] },
      { atMs: 30_000, kind: 'armored', lanes: [1] },
      { atMs: 36_000, kind: 'worm', lanes: [2, 3] },
      { atMs: 44_000, kind: 'armored', lanes: [4] },
      { atMs: 50_000, kind: 'worm', lanes: [0, 1] },
      { atMs: 54_000, kind: 'spitter', lanes: [3] },
      { atMs: 58_000, kind: 'worm', lanes: [2] },
      { atMs: 60_000, kind: 'worm', lanes: [2] },
      { atMs: 66_000, kind: 'armored', lanes: [0, 3] },
      { atMs: 72_000, kind: 'worm', lanes: [1, 4] },
    ],
  },
  {
    unlocks: ['fireInfuse', 'iceInfuse'],
    notice: 'Suelta fuego o hielo sobre una disparadora (o arrastra una mina hasta ella) para infundirla',
    levels: ENEMY_LEVELS.tables.mid,
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 10_000, kind: 'armored', lanes: [2] },
      { atMs: 18_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 30_000, kind: 'armored', lanes: [0] },
      { atMs: 32_000, kind: 'worm', lanes: [0] },
      { atMs: 34_000, kind: 'worm', lanes: [0] },
      { atMs: 44_000, kind: 'armored', lanes: [4] },
      { atMs: 46_000, kind: 'worm', lanes: [3, 4] },
      { atMs: 58_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 61_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 72_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 78_000, kind: 'worm', lanes: [0, 2, 4] },
    ],
  },
  {
    unlocks: ['fuse'],
    notice: 'Arrastra una disparadora sobre otra igual para fusionarlas',
    levels: ENEMY_LEVELS.tables.mid,
    groups: [
      { atMs: 3_000, kind: 'spitter', lanes: [2] },
      { atMs: 10_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 18_000, kind: 'armored', lanes: [0] },
      { atMs: 24_000, kind: 'spitter', lanes: [4] },
      { atMs: 30_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'armored', lanes: [2] },
      { atMs: 42_000, kind: 'spitter', lanes: [1] },
      { atMs: 50_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 60_000, kind: 'armored', lanes: [3, 4] },
      { atMs: 66_000, kind: 'spitter', lanes: [0, 3] },
      { atMs: 74_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 82_000, kind: 'armored', lanes: [1] },
    ],
  },
  {
    unlocks: [],
    notice: 'Llegan todos a la vez: gusanos, acorazados y escupidores. ¡Aguanta!',
    levels: ENEMY_LEVELS.tables.mid,
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 10_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 18_000, kind: 'spitter', lanes: [2] },
      { atMs: 22_000, kind: 'worm', lanes: [0, 1, 3, 4] },
      { atMs: 32_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 36_000, kind: 'armored', lanes: [2] },
      { atMs: 42_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 44_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 54_000, kind: 'armored', lanes: [0, 4] },
      { atMs: 58_000, kind: 'spitter', lanes: [1, 3] },
      { atMs: 66_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 76_000, kind: 'armored', lanes: [1, 2, 3] },
      { atMs: 80_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 84_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 87_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
    ],
  },
  {
    unlocks: [],
    notice: '¡Creeper se prepara! Sus tropas llegan más rápido y en mayor número',
    haste: 1.25,
    bossPreparing: true,
    levels: ENEMY_LEVELS.tables.late,
    // T-009: un 50 % mas de cada tipo que en T-008 (50 gusanos, 12 acorazados y 12 escupidores).
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [0, 1, 3, 4] },
      { atMs: 6_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 9_000, kind: 'armored', lanes: [2] },
      { atMs: 11_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 14_000, kind: 'spitter', lanes: [1, 3] },
      { atMs: 17_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 20_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 22_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 26_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 30_000, kind: 'armored', lanes: [0, 4] },
      { atMs: 34_000, kind: 'spitter', lanes: [2] },
      { atMs: 36_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 40_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 42_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 46_000, kind: 'worm', lanes: [0, 4] },
      { atMs: 47_000, kind: 'spitter', lanes: [2] },
      { atMs: 52_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 56_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 58_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 62_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 66_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 69_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 72_000, kind: 'armored', lanes: [0, 2, 4] },
      { atMs: 76_000, kind: 'spitter', lanes: [1, 2, 3] },
      { atMs: 79_000, kind: 'spitter', lanes: [2] },
      { atMs: 82_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 85_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 88_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 92_000, kind: 'worm', lanes: [0, 2, 4] },
    ],
  },
  {
    unlocks: [],
    notice: 'Creeper casi está listo: aún más tropas y más rápidas',
    haste: 1.35,
    bossPreparing: true,
    levels: ENEMY_LEVELS.tables.late,
    // T-009: un 50 % mas de cada tipo que en T-008 (59 gusanos, 20 acorazados y 15 escupidores).
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 5_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 8_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 10_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 12_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 15_000, kind: 'armored', lanes: [2] },
      { atMs: 18_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 20_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 23_000, kind: 'spitter', lanes: [1, 3] },
      { atMs: 25_000, kind: 'worm', lanes: [0, 4] },
      { atMs: 28_000, kind: 'armored', lanes: [0, 2, 4] },
      { atMs: 32_000, kind: 'spitter', lanes: [1, 3] },
      { atMs: 35_000, kind: 'armored', lanes: [0, 4] },
      { atMs: 38_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 44_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 48_000, kind: 'spitter', lanes: [2] },
      { atMs: 50_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 53_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 56_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 60_000, kind: 'worm', lanes: [0, 1, 3, 4] },
      { atMs: 63_000, kind: 'armored', lanes: [2] },
      { atMs: 66_000, kind: 'armored', lanes: [0, 2, 4] },
      { atMs: 68_000, kind: 'spitter', lanes: [0, 1, 3, 4] },
      { atMs: 72_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 76_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 79_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 82_000, kind: 'spitter', lanes: [2] },
      { atMs: 85_000, kind: 'armored', lanes: [0, 4] },
      { atMs: 88_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 91_000, kind: 'armored', lanes: [1, 2, 3] },
      { atMs: 94_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 97_000, kind: 'spitter', lanes: [2] },
      { atMs: 99_000, kind: 'armored', lanes: [2] },
    ],
  },
  {
    unlocks: [],
    notice: '¡Llega Creeper con su escolta! Salta de carril: reparte tus defensas',
    levels: ENEMY_LEVELS.tables.late,
    groups: [
      // T-009 (P-10): su escolta, un acorazado por carril, va a su paso para no dejarse adelantar. De nivel 10 (T-010).
      {
        atMs: 2_000,
        kind: 'armored',
        lanes: [0, 1, 2, 3, 4],
        level: 10,
        haste: ENEMIES.creeper.speed / ENEMIES.armored.speed,
        shout: '¡ADELANTE, MIS ACORAZADOS!',
      },
      { atMs: 5_500, kind: 'creeper', lanes: [2] },
    ],
  },
];

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

/**
 * Subir de nivel una disparadora (T-003). Los niveles duran la partida (D-03, cerrada el 19 nov 2026).
 * Cada nivel suma sobre los valores de nivel 1: el dano del disparo entero (tambien la quemadura) y la cadencia.
 * Lo que frena una de hielo no cambia con el nivel (depende de sus canones, ver `ICE`).
 * Costo (D-05, cerrada el 19 nov 2026): creciente. De nivel 1 a 2 cuesta `baseCost` y cada nivel siguiente
 * `costStep` mas (75, 100, 125...), por canon, como infundir: una de 3 canones paga el triple.
 */
export const LEVELING = {
  /** Dano que suma cada nivel sobre el de nivel 1. PROVISIONAL. */
  damagePerLevel: 0.1,
  /** Cadencia que suma cada nivel sobre la de nivel 1. PROVISIONAL. */
  fireRatePerLevel: 0.03,
  /** Subir de nivel 1 a 2 una disparadora de un canon. PROVISIONAL. */
  baseCost: 75,
  /** Cuanto mas cuesta cada nivel que el anterior, por canon. PROVISIONAL. */
  costStep: 25,
} as const;

/**
 * Elemento sembrado solo en una casilla vacia: una mina (T-004). Lo comun a fuego y hielo; lo que hace
 * al explotar va en cada elemento. Distancias en casillas, medidas entre el centro de la mina y el del enemigo.
 */
export const MINE = {
  /** Vida propia: los gusanos la muerden y el escupidor (T-007) le escupe. PROVISIONAL. */
  hp: 100,
  /** Desde que detecta a un enemigo hasta que explota. */
  countdownMs: 2000,
  /** Un enemigo a esta distancia o menos empieza el conteo. PROVISIONAL. */
  detectRadius: 1.1,
  /** Al explotar alcanza a todos los enemigos a esta distancia o menos (tambien en los carriles de al lado). PROVISIONAL. */
  blastRadius: 1.5,
} as const;

/**
 * Fuego (T-004). Solo, la mina dana en area. Infundido, cada semilla quema al enemigo que toca.
 * La quemadura no se acumula: se queda la mas fuerte y un nuevo impacto reinicia su duracion.
 */
export const FIRE = {
  /** Dano de la explosion de la mina a cada enemigo alcanzado. PROVISIONAL. */
  blastDamage: 200,
  /**
   * Dano por segundo de la quemadura de una disparadora de fuego de un canon y nivel 1. Crece con el disparo
   * entero (`damageMultiplier`): infundir N canones cuesta N fuegos y quema en proporcion. PROVISIONAL.
   */
  burnDps: 8,
  /** Lo que dura la quemadura desde el ultimo impacto. PROVISIONAL. */
  burnMs: 3000,
} as const;

/**
 * Hielo (T-005). Solo, la mina no dana: frena con fuerza en area. Infundido, cada semilla frena al enemigo que toca,
 * menos que la mina. `slow` es la parte de la velocidad que se pierde (0,7 = va al 30 %).
 * La ralentizacion no se acumula: se queda la mas fuerte y, si el impacto es igual o mas fuerte, la duracion vuelve
 * a empezar. Un enemigo ralentizado avanza y muerde mas despacio, en la misma proporcion.
 */
export const ICE = {
  /** Dano de la explosion de la mina de hielo: ninguno, solo frena. */
  blastDamage: 0,
  /** Mina de hielo (D-06, cerrada el 19 nov 2026 con la recomendacion): 70 % mas lento durante 4 s. PROVISIONAL. */
  blastSlow: 0.7,
  blastSlowMs: 4000,
  /**
   * Lo que frena cada semilla segun los canones de la planta: infundir N canones cuesta N hielos y frena algo mas,
   * siempre menos que la mina. PROVISIONAL.
   */
  bulletSlowByCannons: { 1: 0.3, 2: 0.4, 3: 0.5 },
  /** Lo que dura la ralentizacion de una semilla desde el impacto: mas que la recarga de la planta. PROVISIONAL. */
  bulletSlowMs: 2500,
  /** Si el enemigo ralentizado tambien muerde y escupe mas despacio (en la misma proporcion que avanza). */
  slowsAttacks: true,
} as const;
