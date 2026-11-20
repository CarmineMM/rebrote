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

/**
 * Enemigos. Posiciones y velocidades en casillas (ADR-0005): la logica no sabe de pixeles.
 * `attack` dice como ataca: `bite` muerde lo que toca; `spit` se para a distancia y escupe (T-007).
 */
export const ENEMIES = {
  worm: {
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
   */
  creeper: {
    hp: 4000, // PROVISIONAL: con una defensa repartida, el combate dura cerca de un minuto
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.2,
    attack: 'bite',
    biteDamage: 120, // PROVISIONAL
    biteIntervalMs: 1000, // PROVISIONAL
    firstBiteMs: 500,
    reach: 0.85,
    halfLength: 0.62,
  },
} as const;

/**
 * Lo propio del Creeper (T-008; J-01 a J-05 cerradas el 20 nov 2026). Salta de carril al perder vida: cada umbral
 * de `jumpAt` (fraccion de su vida maxima) que cruza provoca un salto. Avisa del carril de destino (`warnMs`), vuela
 * (`airMs`) y al aterrizar golpea lo primero sembrado que tiene delante (`slamDamage`). Al despegar deja copias suyas
 * (gusanos normales, acelerados) en el carril que abandona. Por debajo de `enragedBelow` entra en su fase 2: salta
 * cada 10 % en vez de cada 20 %, avisa menos y deja dos copias en vez de una. Si cruza el borde izquierdo, se pierde
 * la partida. Al derrotarlo se desconectan sus copias.
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
  /** Golpe al aterrizar a lo primero sembrado que tiene delante en su carril nuevo (J-05). PROVISIONAL. */
  slamDamage: 150,
  /** Copias que deja en el carril que abandona al despegar (J-03). */
  copies: { calm: 1, enraged: 2 },
  copyKind: 'worm',
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
 * Las rondas del mundo 1 (T-007; de 7 a 10 en T-008), en orden. Cada una desbloquea lo suyo al empezar su preparacion
 * (`unlocks`), avisa con una linea (`notice`) y saca sus grupos de enemigos: cada grupo, un enemigo por carril de
 * `lanes` a la vez, `atMs` milisegundos despues de que empiece el ataque (en orden). La ronda acaba cuando no quedan
 * enemigos por salir ni vivos. Los carriles van de 0 (el del fondo) a 4 (el de delante).
 * En las rondas 8 y 9 Creeper se prepara (`bossPreparing`, se le ve a la derecha) y acelera a sus enemigos (`haste`:
 * velocidad respecto a la normal). La 10 es el combate contra Creeper. PROVISIONAL: se ajusta jugando.
 */
export const ROUNDS: readonly RoundScript[] = [
  {
    unlocks: ['shooter'],
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
    notice: 'Nuevo: subir de nivel. Toca una disparadora y mejórala',
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
    notice: 'Nuevo: fuego. Siémbralo solo y explota',
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [2] },
      { atMs: 10_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 22_000, kind: 'worm', lanes: [0] },
      { atMs: 23_500, kind: 'worm', lanes: [0] },
      { atMs: 25_000, kind: 'worm', lanes: [0] },
      { atMs: 36_000, kind: 'worm', lanes: [4] },
      { atMs: 37_500, kind: 'worm', lanes: [4] },
      { atMs: 39_000, kind: 'worm', lanes: [3, 4] },
      { atMs: 52_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 54_000, kind: 'worm', lanes: [2] },
      { atMs: 64_000, kind: 'worm', lanes: [0, 1] },
      { atMs: 66_000, kind: 'worm', lanes: [3, 4] },
    ],
  },
  {
    unlocks: ['fireInfuse'],
    notice: 'Nuevo: suelta el fuego sobre una disparadora para infundirla. ¡Llega el acorazado!',
    groups: [
      { atMs: 3_000, kind: 'armored', lanes: [2] },
      { atMs: 12_000, kind: 'worm', lanes: [1, 3] },
      { atMs: 22_000, kind: 'worm', lanes: [0, 4] },
      { atMs: 30_000, kind: 'armored', lanes: [1] },
      { atMs: 36_000, kind: 'worm', lanes: [2, 3] },
      { atMs: 44_000, kind: 'armored', lanes: [4] },
      { atMs: 50_000, kind: 'worm', lanes: [0, 1] },
      { atMs: 58_000, kind: 'worm', lanes: [2] },
      { atMs: 60_000, kind: 'worm', lanes: [2] },
      { atMs: 66_000, kind: 'armored', lanes: [0, 3] },
      { atMs: 72_000, kind: 'worm', lanes: [1, 4] },
    ],
  },
  {
    unlocks: ['iceMine', 'iceInfuse'],
    notice: 'Nuevo: hielo. Solo, frena en área; infundido, sus semillas frenan',
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
    notice: 'Nuevo: arrastra una disparadora sobre otra igual para fusionarlas. ¡Llega el escupidor!',
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
    notice: 'Todo junto, sin novedades. ¡Aguanta!',
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
    notice: '¡Creeper se prepara! Sus gusanos llegan más rápido',
    haste: 1.2,
    bossPreparing: true,
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [0, 1, 3, 4] },
      { atMs: 9_000, kind: 'armored', lanes: [2] },
      { atMs: 14_000, kind: 'spitter', lanes: [1, 3] },
      { atMs: 20_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 22_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 30_000, kind: 'armored', lanes: [0, 4] },
      { atMs: 34_000, kind: 'spitter', lanes: [2] },
      { atMs: 40_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 42_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 52_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 56_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 62_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 72_000, kind: 'armored', lanes: [0, 2, 4] },
      { atMs: 76_000, kind: 'spitter', lanes: [1, 2, 3] },
      { atMs: 82_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 85_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 88_000, kind: 'worm', lanes: [1, 3] },
    ],
  },
  {
    unlocks: [],
    notice: 'Creeper casi está listo: más gusanos y aún más rápidos',
    haste: 1.35,
    bossPreparing: true,
    groups: [
      { atMs: 3_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 8_000, kind: 'spitter', lanes: [0, 4] },
      { atMs: 12_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 18_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 20_000, kind: 'worm', lanes: [1, 2, 3] },
      { atMs: 28_000, kind: 'armored', lanes: [0, 2, 4] },
      { atMs: 32_000, kind: 'spitter', lanes: [1, 3] },
      { atMs: 38_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'worm', lanes: [0, 2, 4] },
      { atMs: 48_000, kind: 'spitter', lanes: [2] },
      { atMs: 50_000, kind: 'armored', lanes: [1, 3] },
      { atMs: 56_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 66_000, kind: 'armored', lanes: [0, 2, 4] },
      { atMs: 68_000, kind: 'spitter', lanes: [0, 1, 3, 4] },
      { atMs: 76_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 79_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 82_000, kind: 'spitter', lanes: [2] },
      { atMs: 88_000, kind: 'worm', lanes: [0, 1, 2, 3, 4] },
      { atMs: 91_000, kind: 'armored', lanes: [1, 2, 3] },
    ],
  },
  {
    unlocks: [],
    notice: '¡Llega Creeper! Salta de carril: reparte tus defensas',
    groups: [{ atMs: 2_000, kind: 'creeper', lanes: [2] }],
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
