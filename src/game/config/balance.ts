import type { OutbreakScript } from '../core/outbreaks';
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
  /** Tope absoluto de nivel de una disparadora. Cada ronda de un brote puede poner el suyo (`levelCap` en `OUTBREAKS`, T-009). */
  maxLevel: 20,
} as const;

export const COSTS = {
  shooter: 100, // PROVISIONAL
  fire: 75, // PROVISIONAL
  ice: 75, // PROVISIONAL
  /** Escudo (T-024, E-05): sembrar un muro o infundir una disparadora de un canon. PROVISIONAL. */
  shield: 150,
} as const;

/**
 * Economia (D-01 cerrada): moneda por enemigo eliminado (`reward` de cada uno en `ENEMIES`, T-009) mas goteo pasivo, que
 * solo corre durante el ataque (T-010: en la preparacion no se gana moneda esperando). Al eliminar un enemigo, la moneda se cobra sola salvo en `dropChance` de los casos:
 * entonces queda en el suelo y solo se cobra si el jugador la recoge con un clic,
 * con un `dropBonusPercent` extra redondeado hacia arriba. Siempre en enteros.
 * El saldo con el que empieza la partida es de cada brote (`startingBalance` en `OUTBREAKS`, T-018).
 */
export const ECONOMY = {
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

/**
 * Semillas (T-020, C-01 a C-05, decididas el 21 nov 2026): la moneda que el jugador se lleva de la partida y gasta fuera
 * de ella (la tienda, T-022, y el nivel base, T-023). Va en el progreso permanente, nunca en el saldo de la partida.
 * - Cada ronda superada (menos la ultima, la del jefe) suma a lo que lleva la partida un azar entre el `firstPercent` de
 *   su tope (`round`): nunca dan lo mismo (C-02). Vencer al jefe da lo mismo con su tope (`boss`).
 * - En un brote ya vencido, el azar es el de `replayPercent` (C-03).
 * - Se cobra al acabar la partida. Al ganar, cada corazon que queda suma `heartPercent` de lo ganado (C-05); al perder
 *   solo se cobra `defeatPercent` de lo de las rondas (C-04): perder da poco.
 * - Los topes son los del brote 1 y suben `growthPercent` (de los del brote 1) en cada brote siguiente: los brotes de
 *   mas adelante cuestan mas y dan algo mas.
 * Esta pensado para una tienda con articulos de unas 1000 o 2000 semillas y el mas caro de unas 10 000: la primera
 * victoria del brote 1 sin perder vidas da unas 1000, y para comprarlo todo hay que repetir algun brote. Siempre en
 * enteros, redondeando hacia abajo. PROVISIONAL hasta que existan los precios de la tienda.
 */
export const SEEDS = {
  /** Tope de cada ronda superada en el brote 1. PROVISIONAL. */
  round: 50,
  /** Tope del jefe del brote 1. PROVISIONAL. */
  boss: 500,
  /** Cuanto suben los topes en cada brote siguiente, en % de los del brote 1: el brote 2, al 105 %; el 3, al 110 %. PROVISIONAL. */
  growthPercent: 5,
  /** Lo que da cada recompensa en un brote sin vencer, en % de su tope, al azar (C-02). */
  firstPercent: { min: 75, max: 100 },
  /** Lo mismo en un brote ya vencido (C-03): repetir sirve, pero no vacia la tienda en una tarde. */
  replayPercent: { min: 15, max: 25 },
  /** Al perder se cobra este % de lo que dieron las rondas superadas (C-04). PROVISIONAL. */
  defeatPercent: 25,
  /** Al ganar, cada corazon que queda suma este % de lo ganado en las rondas y el jefe (C-05). PROVISIONAL. */
  heartPercent: 10,
  /** Saldo maximo: el marcador nunca pasa de 6 cifras. */
  maxBalance: 999_999,
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
 * Escudo (T-024; E-01 a E-06 decididas el 21 nov 2026). Sembrado solo es un muro: no dispara ni explota, aguanta mucho y
 * los enemigos lo muerden hasta romperlo. Infundido, la disparadora dispara igual que una normal y tiene `hpMultiplier`
 * veces su vida (E-05). Los dos paran lo que va por su carril hacia lo de detras (E-02): ningun disparo enemigo ni salto
 * pasa por encima, y el disparo que paran les quita vida (E-01). El precio, en `COSTS.shield`. PROVISIONAL.
 */
export const SHIELD = {
  /** Vida del muro: cuatro veces la de una disparadora (E-05). PROVISIONAL. */
  wallHp: 1200,
  /** La disparadora con escudo tiene el doble de su vida normal, con sus canones (E-05). PROVISIONAL. */
  hpMultiplier: 2,
} as const;

/** Gusano (T-002): avanza y muerde lo que toca. Lo repite el copion del brote 2 (T-025). */
const WORM = {
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
} as const;

/** Gusano acorazado (T-007, desde la ronda 4): muerde como el gusano, con mucha mas vida y mas lento. */
const ARMORED = {
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
} as const;

/**
 * Gusano escupidor (T-007, desde la ronda 6): se para a `range` casillas de lo primero sembrado en su carril
 * (planta o mina) y le escupe. Nunca se para antes de pisar el cesped, para que las plantas puedan darle.
 */
const SPITTER = {
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
} as const;

/**
 * Enemigos. Posiciones y velocidades en casillas (ADR-0005): la logica no sabe de pixeles.
 * `attack` dice como ataca: `bite` muerde lo que toca; `spit` se para a distancia y escupe (T-007); `verse` se para a
 * distancia y suelta versos, ondas que cruzan el carril por encima de las plantas (T-025, el juglar).
 * `hp` y el dano son la base de nivel 1: cada nivel suma `ENEMY_LEVELS.perLevel` (T-009) y despues los multiplica la
 * fuerza de `ENEMY_POWER` (T-010). `reward` es la moneda que da al caer (T-009, P-03): fija por tipo, sea cual sea su
 * nivel.
 */
export const ENEMIES = {
  worm: WORM,
  armored: ARMORED,
  spitter: SPITTER,
  /**
   * Creeper (T-008), jefe del brote 1 y unico enemigo de la ronda 10: muerde como el gusano, con mucha mas vida, y
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
  /**
   * Tropas del brote 2, el de Elk Cloner (T-025, F-01): las del brote 1 con otra cara y los mismos numeros, pero al caer
   * dejan una copia pequena y debil (`CLONE`), una sola vez. Elk Cloner se copiaba a cada disquete que tocaba.
   */
  copycat: WORM,
  copycatArmored: ARMORED,
  copycatSpitter: SPITTER,
  /**
   * Juglar (T-025, F-02 a F-06): se para a `range` casillas de lo primero sembrado en su carril (nunca antes de pisar el
   * cesped), toma aire `warnMs` (se hincha: el aviso, F-04) y suelta un verso cada `verseIntervalMs`. El verso es una onda
   * que recorre el carril hacia la izquierda (`VERSE`) y quita `verseDamage` a todo lo sembrado que cruza, minas incluidas
   * (F-06), hasta el primer escudo, que lo recibe y lo para (F-05, `waveReach`). Sin nada sembrado delante, avanza: no
   * muerde. Ralentizado, tarda mas entre versos.
   */
  minstrel: {
    reward: 25,
    hp: 150, // PROVISIONAL
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.25,
    attack: 'verse',
    /** Distancia de centro a centro a la que se para: mas lejos que el escupidor, porque su verso cruza el carril. PROVISIONAL. */
    range: 3.5,
    /** Lo que quita el verso a cada cosa que cruza: poco, porque da a todas (F-06: las minas aguantan varios). PROVISIONAL. */
    verseDamage: 15,
    verseIntervalMs: 3600, // PROVISIONAL
    /** Lo que tarda el primer verso desde que se para. Mas que `warnMs`: siempre avisa. PROVISIONAL. */
    firstVerseMs: 1800,
    /** Aviso (F-04): lo que dura hinchado, tomando aire, antes de cada verso. PROVISIONAL. */
    warnMs: 900,
    halfLength: 0.4,
  },
  /**
   * Elk Cloner, el Poeta (T-026), jefe del brote 2 y lo grande de su ultima ronda. Avanza despacio todo el rato (L-05) y
   * muerde lo que toca, como Creeper (`attack: 'recite'`). Mientras pisa el cesped recita: cada `verseIntervalMs` suelta un
   * verso por su carril, con su aviso (`warnMs`), como el Minstrel pero mas grande; y tras `ELK_CLONER.poemEvery` versos
   * recita el poema entero por los cinco carriles (L-03). No tiene nivel: de `ENEMY_POWER` solo le toca la fuerza de todos.
   * Si cruza el jardin, se pierde la partida; al caer se gana: no da moneda.
   */
  elkCloner: {
    reward: 0,
    hp: 9000, // PROVISIONAL: ajustado con la simulacion (docs/specs/05-brote-2-elk-cloner.md)
    /** Casillas por segundo: la mitad que Creeper. Va despacio, pero no se para (L-05). PROVISIONAL. */
    speed: 0.1,
    attack: 'recite',
    /** Muerde lo que toca, como Creeper. PROVISIONAL. */
    biteDamage: 100,
    biteIntervalMs: 1200, // PROVISIONAL
    firstBiteMs: 600,
    reach: 0.8,
    halfLength: 0.55,
    /** Lo que quita cada verso de su carril: mas que el del Minstrel, porque es el suyo en grande. PROVISIONAL. */
    verseDamage: 50,
    verseIntervalMs: 3500, // PROVISIONAL
    /** Lo que tarda el primer verso desde que pisa el cesped. Mas que `warnMs`: siempre avisa. PROVISIONAL. */
    firstVerseMs: 2500,
    /** Aviso de cada verso: se hincha tomando aire, como el Minstrel. PROVISIONAL. */
    warnMs: 1000,
  },
} as const;

/**
 * Lo propio de Elk Cloner (T-026; L-03 a L-06 cerradas el 22 nov 2026 con la recomendacion). El de verdad ensenaba un
 * poema cada 50 arranques: aqui, cada `poemEvery` versos recita el poema entero, una onda por cada uno de los cinco
 * carriles a la vez (L-03), tras un aviso largo (`poemWarnMs`) en el que no avanza ni muerde y que deja tiempo para sembrar
 * un escudo. El poema hace mucho dano, pero no mata lo que tenia la vida entera (L-04): lo deja con `spareFraction` de
 * ella. Cada onda la para el primer escudo de su carril, como un verso (`waveReach`). PROVISIONAL.
 */
export const ELK_CLONER = {
  /** Versos de su carril entre un poema entero y el siguiente. PROVISIONAL. */
  poemEvery: 2,
  /** Aviso del poema entero: largo, para que de tiempo a sembrar o infundir un escudo. No va mas lento aunque este frenado. PROVISIONAL. */
  poemWarnMs: 5000,
  /** Lo que quita el poema a cada cosa que cruza, sin la fuerza de todos (T-010). Alto (L-04). PROVISIONAL. */
  poemDamage: 350,
  /** L-04: a lo que tenia la vida entera, el poema lo deja como poco con esta parte de su vida: nunca lo mata. */
  spareFraction: 0.25,
} as const;

/**
 * Verso (T-025): la onda del juglar (y, con T-026, la de Elk Cloner). Nace en el centro de quien recita y recorre su
 * carril hacia la izquierda por encima de las plantas: da a todo lo sembrado que cruza, de delante atras, hasta el primer
 * escudo, que lo recibe y lo para (`waveReach`). Lo que hay detras de un escudo no sufre nada. PROVISIONAL.
 */
export const VERSE = {
  /** Casillas por segundo: mas despacio que el escupitajo, para que se vea pasar. */
  speed: 2.5,
} as const;

/**
 * Copias de las tropas del brote 2 (T-025, F-01): al caer un copion deja en su sitio una copia suya, pequena y debil, que
 * ataca igual (muerde o escupe) y ya no deja otra. Hereda el nivel y lo acelerado; nada de la quemadura ni del frio.
 * Si se cuela, resta una vida como cualquier otro. Si cae el jefe, no salen copias. PROVISIONAL.
 */
export const CLONE = {
  /** Las tropas que dejan copia al caer. */
  kinds: ['copycat', 'copycatArmored', 'copycatSpitter'],
  /** Parte de la vida y del dano de su tipo y nivel. */
  hp: 0.3,
  damage: 0.5,
  /** Tamano respecto al de su tipo: tambien su cuerpo (le dan algo mas tarde) y su alcance al morder. */
  size: 0.62,
  /** Moneda que da al caer, en vez de la de su tipo. */
  reward: 5,
  /** Una explosion de mina que tumba a muchos copiones solo deja estas copias, las de los primeros que alcanza. */
  maxPerBlast: 2,
} as const;

/**
 * Niveles de los enemigos (T-009, P-04 y P-05, decididos el 20 nov 2026). Cada nivel suma `perLevel` a la vida y al dano
 * (mordisco o escupitajo) de nivel 1; la velocidad no cambia. Encima va la fuerza de `ENEMY_POWER` (T-010). Cada ronda
 * dice con que pesos sale cada nivel (`levels` en las rondas de `OUTBREAKS`); sin tabla, todos de nivel 1. Las copias del Creeper y su
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
    /**
     * Brote 2 desde la ronda 5 (T-026): del 5 al 12, con el pico en el 8; el jugador ya puede subir sus disparadoras hasta
     * el 10 (L-08). Es lo que hace que el final del brote 2 sea mas duro que el del brote 1.
     */
    high: { 5: 8, 6: 13, 7: 18, 8: 20, 9: 16, 10: 13, 11: 8, 12: 4 },
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
 * Las rondas del brote 1, el de Creeper (T-007; de 7 a 10 en T-008; progresion de T-009 y T-010), en orden. Cada una desbloquea lo suyo
 * al empezar su preparacion (`unlocks`, y el tope de nivel de las disparadoras en `levelCap`), avisa con una linea
 * (su texto, en `round.notices.creeper` de `src/i18n/`, T-011) y, si trae algo nuevo, con el aviso que hay que aceptar (salvo `quiet`: la ronda 1, T-010). Saca sus grupos de enemigos: cada grupo, un enemigo por carril de `lanes` a la vez, `atMs` milisegundos
 * despues de que empiece el ataque (en orden). La ronda acaba cuando no quedan enemigos por salir ni vivos. Los
 * carriles van de 0 (el del fondo) a 4 (el de delante).
 * Los enemigos salen con un nivel al azar segun `levels` (tablas de `ENEMY_LEVELS`; sin ella, nivel 1), salvo los
 * grupos que fijan el suyo (`level`).
 * En las rondas 8 y 9 Creeper se prepara (`bossPreparing`, se le ve a la derecha) y acelera a sus enemigos (`haste`:
 * velocidad respecto a la normal). La 10 es el combate contra Creeper: primero manda a su escolta (un grupo con su
 * propio `level` y `haste`, y un grito, `shout`, cuyo texto esta en `creeper.shouts` de `src/i18n/`) y sale detras. PROVISIONAL: se ajusta jugando.
 */
const CREEPER_ROUNDS: readonly RoundScript[] = [
  {
    unlocks: ['shooter'],
    // T-010 (A-01): la disparadora se da por sabida; basta el aviso de una linea.
    quiet: true,
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
    // T-010 (A-05): el tope se queda en 5 todo el brote 1.
    levelCap: 5,
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
    levels: ENEMY_LEVELS.tables.late,
    groups: [
      // T-009 (P-10): su escolta, un acorazado por carril, va a su paso para no dejarse adelantar. De nivel 10 (T-010).
      {
        atMs: 2_000,
        kind: 'armored',
        lanes: [0, 1, 2, 3, 4],
        level: 10,
        haste: ENEMIES.creeper.speed / ENEMIES.armored.speed,
        shout: 'escort',
      },
      { atMs: 5_500, kind: 'creeper', lanes: [2] },
    ],
  },
];

/** Los cinco carriles, para los grupos que salen por todos a la vez. */
const ALL = [0, 1, 2, 3, 4] as const;

/**
 * Las rondas del brote 2, el de Elk Cloner (T-026; L-01, L-07 y L-08 cerradas el 22 nov 2026 con la recomendacion): 8
 * rondas, porque el jugador ya sabe jugar y solo hay dos cosas nuevas. Empiezan con lo aprendido en el brote 1 (B-01) y
 * con el tope de nivel a 10 desde la ronda 1 (L-08). Un concepto por ronda (L-07): en la 1, los Copycat y el tope 10; en
 * la 2, el escudo; en la 3, el Minstrel; de la 4 a la 7, mezcla y mas dificultad (los niveles suben de `mid` a `high`), y
 * en la 6 y la 7 Elk Cloner se prepara a la derecha y acelera a sus tropas, como Creeper. La 8 es el combate: primero su
 * escolta de acorazados de nivel 10 por los cinco carriles y dos Minstrel (L-06, para que las minas sigan sirviendo), y
 * detras el, por el centro; mientras vive llegan refuerzos, que dejan de salir en cuanto cae (`stepRound`). La simulacion
 * con bots que lo ajusta esta en `src/game/sim/` (`npm run sim`), y lo que dio, en `docs/specs/05-brote-2-elk-cloner.md`.
 * PROVISIONAL: se ajusta jugando.
 */
const ELK_CLONER_ROUNDS: readonly RoundScript[] = [
  {
    unlocks: [],
    // L-08: el tope sube a 10 desde la primera ronda: el aviso lo cuenta Boxer.
    levelCap: 10,
    // El tablero empieza vacio (B-02): de uno en uno al principio, como en el brote 1, pero ya con nivel y con copias.
    levels: ENEMY_LEVELS.tables.early,
    groups: [
      { atMs: 3_000, kind: 'copycat', lanes: [2] },
      { atMs: 12_000, kind: 'copycat', lanes: [1] },
      { atMs: 20_000, kind: 'copycat', lanes: [3] },
      { atMs: 27_000, kind: 'copycat', lanes: [0, 4] },
      { atMs: 34_000, kind: 'copycatSpitter', lanes: [2] },
      { atMs: 40_000, kind: 'copycat', lanes: [1, 3] },
      { atMs: 47_000, kind: 'copycatArmored', lanes: [2] },
      { atMs: 54_000, kind: 'copycat', lanes: [0, 2, 4] },
      { atMs: 60_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 66_000, kind: 'copycat', lanes: ALL },
      { atMs: 74_000, kind: 'copycatArmored', lanes: [1, 3] },
    ],
  },
  {
    unlocks: ['shield'],
    levels: ENEMY_LEVELS.tables.mid,
    // Muchos escupidores: el muro les para los escupitajos antes de que lleguen a las disparadoras.
    groups: [
      { atMs: 3_000, kind: 'copycatSpitter', lanes: [2] },
      { atMs: 9_000, kind: 'copycat', lanes: [1, 3] },
      { atMs: 15_000, kind: 'copycatSpitter', lanes: [0, 4] },
      { atMs: 22_000, kind: 'copycatArmored', lanes: [2] },
      { atMs: 28_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 35_000, kind: 'copycat', lanes: [0, 2, 4] },
      { atMs: 42_000, kind: 'copycatSpitter', lanes: [0, 2, 4] },
      { atMs: 50_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 57_000, kind: 'copycatSpitter', lanes: [1, 2, 3] },
      { atMs: 64_000, kind: 'copycat', lanes: ALL },
      { atMs: 72_000, kind: 'copycatArmored', lanes: [0, 4] },
      { atMs: 76_000, kind: 'copycatSpitter', lanes: [2] },
    ],
  },
  {
    unlocks: [],
    levels: ENEMY_LEVELS.tables.mid,
    // Llegan los Minstrel: sus versos cruzan el carril y solo los para un escudo.
    groups: [
      { atMs: 3_000, kind: 'copycatArmored', lanes: [0, 4] },
      { atMs: 6_000, kind: 'minstrel', lanes: [2] },
      { atMs: 12_000, kind: 'copycat', lanes: ALL },
      { atMs: 20_000, kind: 'minstrel', lanes: [1, 3] },
      { atMs: 26_000, kind: 'copycatArmored', lanes: [1, 2, 3] },
      { atMs: 34_000, kind: 'copycatSpitter', lanes: [0, 4] },
      { atMs: 40_000, kind: 'copycat', lanes: ALL },
      { atMs: 46_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 56_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
      { atMs: 64_000, kind: 'copycat', lanes: ALL },
      { atMs: 70_000, kind: 'minstrel', lanes: [1, 3] },
      { atMs: 74_000, kind: 'copycatSpitter', lanes: [0, 1, 3, 4] },
      { atMs: 80_000, kind: 'copycat', lanes: [1, 2, 3] },
    ],
  },
  {
    unlocks: [],
    levels: ENEMY_LEVELS.tables.late,
    // Mezcla: acorazados que piden minas, Minstrel que piden escudos y escupidores que los desgastan.
    groups: [
      { atMs: 3_000, kind: 'copycat', lanes: [0, 2, 4] },
      { atMs: 8_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 14_000, kind: 'minstrel', lanes: [0, 4] },
      { atMs: 20_000, kind: 'copycatSpitter', lanes: [2] },
      { atMs: 24_000, kind: 'copycat', lanes: ALL },
      { atMs: 32_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
      { atMs: 38_000, kind: 'minstrel', lanes: [1, 3] },
      { atMs: 44_000, kind: 'copycatSpitter', lanes: [0, 4] },
      { atMs: 50_000, kind: 'copycat', lanes: [1, 2, 3] },
      { atMs: 52_000, kind: 'copycat', lanes: [1, 2, 3] },
      { atMs: 60_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 64_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 72_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 78_000, kind: 'copycat', lanes: ALL },
      { atMs: 84_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
    ],
  },
  {
    unlocks: [],
    levels: ENEMY_LEVELS.tables.late,
    // Dos oleadas por los cinco carriles, con Minstrel detras de cada una.
    groups: [
      { atMs: 3_000, kind: 'copycat', lanes: ALL },
      { atMs: 8_000, kind: 'minstrel', lanes: [1, 3] },
      { atMs: 12_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
      { atMs: 18_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 24_000, kind: 'copycat', lanes: ALL },
      { atMs: 27_000, kind: 'copycat', lanes: ALL },
      { atMs: 34_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 46_000, kind: 'copycatSpitter', lanes: [0, 2, 4] },
      { atMs: 54_000, kind: 'copycat', lanes: ALL },
      { atMs: 58_000, kind: 'copycatArmored', lanes: ALL },
      { atMs: 66_000, kind: 'minstrel', lanes: [1, 2, 3] },
      { atMs: 72_000, kind: 'copycatSpitter', lanes: [0, 4] },
      { atMs: 78_000, kind: 'copycat', lanes: ALL },
      { atMs: 81_000, kind: 'copycat', lanes: ALL },
      { atMs: 88_000, kind: 'copycatArmored', lanes: [1, 2, 3] },
    ],
  },
  {
    unlocks: [],
    haste: 1.15,
    bossPreparing: true,
    levels: ENEMY_LEVELS.tables.high,
    groups: [
      { atMs: 3_000, kind: 'copycat', lanes: ALL },
      { atMs: 6_000, kind: 'copycatArmored', lanes: [2] },
      { atMs: 9_000, kind: 'minstrel', lanes: [0, 4] },
      { atMs: 13_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 18_000, kind: 'copycat', lanes: ALL },
      { atMs: 22_000, kind: 'copycatArmored', lanes: [0, 4] },
      { atMs: 26_000, kind: 'minstrel', lanes: [1, 2, 3] },
      { atMs: 32_000, kind: 'copycat', lanes: ALL },
      { atMs: 35_000, kind: 'copycatSpitter', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 46_000, kind: 'minstrel', lanes: [0, 4] },
      { atMs: 50_000, kind: 'copycat', lanes: ALL },
      { atMs: 53_000, kind: 'copycat', lanes: [1, 2, 3] },
      { atMs: 58_000, kind: 'copycatArmored', lanes: ALL },
      { atMs: 64_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 68_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 74_000, kind: 'copycat', lanes: ALL },
      { atMs: 77_000, kind: 'copycat', lanes: ALL },
      { atMs: 84_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
      { atMs: 90_000, kind: 'copycatSpitter', lanes: ALL },
    ],
  },
  {
    unlocks: [],
    haste: 1.25,
    bossPreparing: true,
    levels: ENEMY_LEVELS.tables.high,
    groups: [
      { atMs: 3_000, kind: 'copycat', lanes: ALL },
      { atMs: 5_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 8_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 12_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 16_000, kind: 'copycat', lanes: ALL },
      { atMs: 19_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
      { atMs: 23_000, kind: 'minstrel', lanes: [1, 3] },
      { atMs: 27_000, kind: 'copycat', lanes: ALL },
      { atMs: 30_000, kind: 'copycatSpitter', lanes: [0, 2, 4] },
      { atMs: 34_000, kind: 'copycatArmored', lanes: ALL },
      { atMs: 40_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 44_000, kind: 'copycat', lanes: ALL },
      { atMs: 46_000, kind: 'copycat', lanes: ALL },
      { atMs: 52_000, kind: 'copycatSpitter', lanes: [1, 3] },
      { atMs: 55_000, kind: 'copycatArmored', lanes: [1, 2, 3] },
      { atMs: 60_000, kind: 'minstrel', lanes: ALL },
      { atMs: 66_000, kind: 'copycat', lanes: ALL },
      { atMs: 69_000, kind: 'copycatArmored', lanes: [0, 4] },
      { atMs: 74_000, kind: 'copycatSpitter', lanes: ALL },
      { atMs: 80_000, kind: 'copycat', lanes: ALL },
      { atMs: 83_000, kind: 'copycat', lanes: ALL },
      { atMs: 88_000, kind: 'copycatArmored', lanes: ALL },
      { atMs: 94_000, kind: 'minstrel', lanes: [1, 3] },
    ],
  },
  {
    unlocks: [],
    levels: ENEMY_LEVELS.tables.high,
    groups: [
      // L-06: su escolta, un acorazado de nivel 10 por carril (como la de Creeper) y dos Minstrel de nivel 10.
      { atMs: 2_000, kind: 'copycatArmored', lanes: ALL, level: 10, shout: 'escort' },
      { atMs: 4_000, kind: 'minstrel', lanes: [1, 3], level: 10 },
      { atMs: 6_000, kind: 'elkCloner', lanes: [2] },
      // Refuerzos mientras vive: dejan de salir en cuanto cae.
      { atMs: 26_000, kind: 'minstrel', lanes: [0, 4] },
      { atMs: 40_000, kind: 'copycatArmored', lanes: [1, 3] },
      { atMs: 54_000, kind: 'minstrel', lanes: [0, 2, 4] },
      { atMs: 70_000, kind: 'copycat', lanes: ALL },
      { atMs: 86_000, kind: 'minstrel', lanes: [1, 3] },
      { atMs: 100_000, kind: 'copycatArmored', lanes: [0, 2, 4] },
      { atMs: 116_000, kind: 'minstrel', lanes: ALL },
    ],
  },
];

/**
 * Brotes (T-018, ADR-0015), en orden: cada uno es una campana que acaba en su jefe ("Brote 1: Creeper"), con su guion de
 * rondas (`rounds`, como el de arriba) y el saldo con el que se empieza (`startingBalance`). Lo que desbloquearon los
 * brotes anteriores llega desbloqueado desde la ronda 1 (B-01), asi que las rondas de un brote nuevo solo desbloquean lo
 * suyo. Entre brotes no pasa nada de la partida: tablero vacio y su saldo inicial (B-02). Anadir un brote es anadirlo
 * aqui, con su nombre en `OutbreakId` (`src/game/core/outbreaks.ts`), los avisos de sus rondas en `round.notices` de
 * `src/i18n/` y lo que cuenta Boxer de su jefe en `story.lore` (T-032); si trae algo que desbloquear, con su tour (regla 9
 * de `CLAUDE.md`) y con quien lo presenta (`presenter`: Patty desde el brote 2, VT-03).
 */
export const OUTBREAKS: readonly OutbreakScript[] = [
  {
    id: 'creeper',
    boss: 'creeper',
    startingBalance: 250,
    rounds: CREEPER_ROUNDS,
    // Lo del brote 1 lo da Boxer (T-032, VT-02).
    presenter: 'boxer',
  },
  {
    id: 'elkCloner',
    // T-026: Elk Cloner, el Poeta. Hasta entonces el brote estaba en preparacion (T-024, `boss: null`).
    boss: 'elkCloner',
    startingBalance: 300, // PROVISIONAL
    rounds: ELK_CLONER_ROUNDS,
    // Lo nuevo desde el brote 2 lo crea Patty (T-032, VT-03).
    presenter: 'patty',
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
  /**
   * Premio de algunos niveles (21 nov 2026): llegar a ellos suma mas dano y cadencia que un nivel normal, y lo ganado
   * se queda. En el 5 y el 15, un 50 % mas que un nivel normal (x1,5); en el 10 y el 20, el doble (x2). Son los niveles
   * en los que la medallita cambia de color. PROVISIONAL.
   */
  milestones: { 5: 1.5, 10: 2, 15: 1.5, 20: 2 } as Readonly<Record<number, number>>,
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

/**
 * Poderes (T-021, O-01 a O-11 decididas el 22 nov 2026): habilidades de un uso que se lanzan desde el panel izquierdo. Se
 * compran una vez en la tienda (T-022) y traen `chargesPerMatch` cargas a cada partida (O-01, b). Se llevan `maxCarried`
 * (O-02); hasta que exista la tienda, cada partida trae `trialLoadout` (O-08). En la preparacion solo se recoloca (O-07).
 * Afectan a los jefes igual que a los demas (O-06). PROVISIONAL.
 */
export const POWERS = {
  /** Cargas de cada poder en cada partida (O-01, b). */
  chargesPerMatch: 1,
  /** Cuantos se llevan a una partida (O-02): los elige la tienda (T-022). */
  maxCarried: 2,
  /** Lo que trae cada partida hasta la tienda (O-08): los tres, para poder probarlos. En orden del panel, de arriba abajo. */
  trialLoadout: ['relocate', 'grenade', 'iceWall'],
  /** Si se puede usar en la preparacion (O-07): solo recolocar; la granada y el muro, en el ataque. */
  usableInPrep: { relocate: true, grenade: false, iceWall: false },
} as const;

/**
 * Granada (T-021, O-04): alguien la lanza desde detras de las plantas, vuela en curva `flightMs` hasta el centro de la
 * casilla elegida, cuenta `fuseMs` y explota. Es invulnerable y no ocupa la casilla: los enemigos no la atacan ni se paran.
 * Alcanza mas que la mina (`MINE.blastRadius`) y hace el dano de la de fuego; no dana plantas ni le da a Creeper en el aire.
 */
export const GRENADE = {
  /** Del lanzamiento a caer en la casilla. Solo aspecto de la curva, pero cuenta: la explosion llega despues. PROVISIONAL. */
  flightMs: 900,
  /** Desde que cae hasta que explota (O-04: "a los 2 s"). */
  fuseMs: 2000,
  /** Alcanza a todos los enemigos a esta distancia o menos de su casilla, en cualquier carril: mas que la mina (1,5). PROVISIONAL. */
  blastRadius: 1.8,
  /** El de la mina de fuego (O-04). */
  damage: FIRE.blastDamage,
} as const;

/**
 * Muro de hielo (T-021, O-05, O-09 a O-11): tres bloques de hielo en una columna, la casilla elegida y las de arriba y abajo
 * (`span`; en el carril de arriba o el de abajo se mete dentro del tablero). Cada bloque es un muro (bloquea el paso y para
 * lo que va hacia lo de detras, como el escudo) con la vida de una disparadora de nivel 1 y se derrite a los `durationMs`.
 */
export const ICE_WALL = {
  /** Carriles que ocupa, en una columna (O-09). */
  span: 3,
  /** Vida de cada bloque (O-05, O-10): la de una disparadora de nivel 1. */
  hp: SHOOTER.hp,
  /** Lo que dura cada bloque antes de derretirse (O-05: "unos 10 s"). PROVISIONAL. */
  durationMs: 10_000,
} as const;
