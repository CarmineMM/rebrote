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

/**
 * Regla de los niveles (T-035, Carmine, 22 nov 2026): todo lo que tiene nivel (disparadoras, enemigos, poderes y el nivel
 * base) da premio cada `every` niveles: el 5, el 10, el 15, el 20 y los que vengan si el tope sube. Lo que da cada premio es
 * de cada cosa (`LEVELING`, `ENEMY_LEVELS`, `GRENADE`...). Nunca se escribe la lista de niveles con premio a mano.
 */
export const LEVEL_MILESTONES = {
  every: 5,
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
 * Salto del Skipper (T-038; LK-05 a LK-07 cerradas por Carmine el 22 nov 2026 con la recomendacion). Avanza a saltos de
 * `length` casillas por encima de plantas y minas, con `restMs` en tierra entre uno y otro; en el ultimo `crouchMs` del
 * descanso se agacha: el aviso de que va a saltar. En el aire (`airMs`) no le dan las balas ni las minas. Un escudo en su
 * camino lo para: cae delante y lo muerde (`hopLanding`, T-024); si el escudo cae, sigue saltando (LK-07). El hielo le
 * alarga el descanso, no el vuelo. Con `restMs` y `airMs` va a unas 1,3 casillas por segundo de media. PROVISIONAL.
 */
export const HOP = {
  /** Los que avanzan a saltos. Brain (T-039) salta con su propio paso (`BRAIN`); estos numeros son los del Skipper. */
  kinds: ['skipper', 'brain'],
  /** Casillas por salto (LK-05). */
  length: 2,
  /** En tierra entre un salto y el siguiente (LK-05). Al salir del agujero tambien descansa esto. */
  restMs: 1000,
  /** Lo que dura cada salto en el aire. */
  airMs: 500,
  /** El final del descanso en que se agacha para saltar (dentro de `restMs`). */
  crouchMs: 350,
} as const;

/** Vida de los Lurker respecto a su pareja del brote 1 (T-038, LK-09, ajustada con `npm run sim`). PROVISIONAL. */
const LURKER_HP = 0.75;

/**
 * Sigilo de las tropas del brote 3 (T-038; LK-02 a LK-04 cerradas por Carmine el 22 nov 2026 con la recomendacion). Llegan
 * ocultas: las disparadoras no les apuntan, pero una bala que ya va por el carril les da (LK-04) y las minas estallan igual.
 * Se descubren a `revealRadius` casillas (de centro a centro) de lo primero sembrado que tienen delante en su carril y,
 * ademas, al recibir dano o ir frenadas o quemadas (LK-03). Vuelven a ocultarse `holdMs` despues de lo ultimo que las
 * descubrio, si siguen lejos. El jugador siempre las ve: oculto se pinta como una silueta que tiembla (LK-02). PROVISIONAL.
 */
export const STEALTH = {
  /**
   * Las que llegan ocultas. Brain (T-039) tambien, con su propia regla (`BRAIN`): a el no lo descubren la cercania ni el
   * dano, y estos numeros no le tocan.
   */
  kinds: ['lurker', 'lurkerSpitter', 'lurkerArmored', 'brain'],
  /** Decidido el 22 nov 2026: a 4 casillas de lo primero sembrado en su carril. */
  revealRadius: 4,
  /** LK-03: "unos segundos". */
  holdMs: 3000,
  /**
   * Lo que vale la vida de una tropa oculta al medir lo dura que es una ronda (`roundThreat`, T-039; el juego no lo usa). Con
   * las disparadoras atras, solo se le dispara desde `revealRadius` casillas de la primera: unas 3,4 de las 8,65 que anda
   * desde el agujero hasta morderla, el 40 %. Asi que su vida vale 1 / 0,4 = 2,5 veces la de una que se ve. Con un muro
   * delante vale menos, pero la ronda 1 se juega sin muros (docs/specs/06-brote-3-brain.md).
   */
  threat: 2.5,
} as const;

/**
 * Lo propio de Brain, el Cerebro (T-039; BR-02 a BR-09 cerradas por Carmine el 22 nov 2026 con la recomendacion), jefe del
 * brote 3. Avanza oculto y a saltos por su carril, por encima de las plantas y las minas, como el Skipper (`HOP.kinds`), y
 * solo lo para un escudo: cae delante (`hopLanding`) y lo muerde. Oculto, las plantas no le apuntan.
 * - Solo lo descubren chocar con un escudo, la explosion de una mina que lo alcanza y la granada. Ni la cercania de lo
 *   sembrado ni las balas, tampoco las de hielo o fuego (a los Lurker si: `STEALTH`): una bala perdida, disparada a su
 *   escolta, lo dejaria al descubierto todo el carril.
 * - Mientras muerde un escudo sigue descubierto, y `shieldRevealMs` despues de que caiga (BR-03: la ventana para
 *   castigarle). Una mina de fuego o la granada lo descubren `revealMinMs`; la de hielo, lo que lo frena, y nunca menos
 *   (BR-04).
 * - Fase 2 (BR-06): con `enragedBelow` de su vida o menos descansa menos entre saltos.
 * PROVISIONAL: se ajusta con `npm run sim` (docs/specs/06-brote-3-brain.md).
 */
export const BRAIN = {
  /** Casillas por salto (BR-02). */
  hopLength: 2,
  /** Lo que dura cada salto en el aire (BR-02). En el aire no le dan las balas ni las minas (BR-08). */
  airMs: 800,
  /**
   * En tierra entre un salto y el siguiente, y el final de ese descanso en que se agacha (el aviso de que salta). BR-02: 3 s y
   * 1 s. En la fase 2 (BR-06) descansa menos, pero mas que la cuenta de una mina (`MINE.countdownMs`): asi la mina que arma
   * al caer aun le alcanza antes de que salte.
   */
  calm: { restMs: 3000, crouchMs: 1000 },
  enraged: { restMs: 2400, crouchMs: 600 },
  /** Fase 2: con esta fraccion de vida o menos. */
  enragedBelow: 0.5,
  /** BR-03: lo que sigue descubierto tras caer el escudo que lo paraba. */
  shieldRevealMs: 2000,
  /** BR-04: lo que lo descubre, como poco, una mina o la granada. La de hielo, lo que lo frena, si es mas. */
  revealMinMs: 3000,
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
    /** T-035: un 40 % mas que en T-025 (150). PROVISIONAL. */
    hp: 210,
    /** Casillas por segundo. PROVISIONAL. */
    speed: 0.25,
    attack: 'verse',
    /** Distancia de centro a centro a la que se para: mas lejos que el escupidor, porque su verso cruza el carril. PROVISIONAL. */
    range: 3.5,
    /**
     * Lo que quita el verso a cada cosa que cruza: poco, porque da a todas (F-06: las minas aguantan varios). T-035: un 40 %
     * mas que en T-025 (15). PROVISIONAL.
     */
    verseDamage: 21,
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
    /** T-035: un 10 % mas que en T-026 (9000); 10 890 con la fuerza de todos. PROVISIONAL (docs/specs/05-brote-2-elk-cloner.md). */
    hp: 9900,
    /** Casillas por segundo: T-035, un 50 % mas que en T-026 (0,1), y algo menos que Creeper. No se para (L-05). PROVISIONAL. */
    speed: 0.15,
    attack: 'recite',
    /** Muerde lo que toca, como Creeper. T-035: un 30 % mas que en T-026 (100); 143 con la fuerza de todos. PROVISIONAL. */
    biteDamage: 130,
    biteIntervalMs: 1200, // PROVISIONAL
    firstBiteMs: 600,
    reach: 0.8,
    halfLength: 0.55,
    /**
     * Lo que quita cada verso de su carril: mas que el del Minstrel, porque es el suyo en grande. T-035: 75 en la partida, ya
     * con la fuerza de todos (`ENEMY_POWER.base`, x1,1), que aqui no se puede leer porque va despues. PROVISIONAL.
     */
    verseDamage: 750 / 11,
    verseIntervalMs: 3500, // PROVISIONAL
    /** Lo que tarda el primer verso desde que pisa el cesped. Mas que `warnMs`: siempre avisa. PROVISIONAL. */
    firstVerseMs: 2500,
    /** Aviso de cada verso: se hincha tomando aire, como el Minstrel. PROVISIONAL. */
    warnMs: 1000,
  },
  /**
   * Tropas del brote 3, el de Brain (T-038, LK-09): las del brote 1 con otro aspecto, pero llegan ocultas (`STEALTH`). Brain
   * se escondia de quien lo buscaba. Con su vida, `npm run sim` no pasaba de la ronda 1 (el sigilo les quita a las plantas
   * mas de la mitad del tiempo de disparo): llevan un 25 % menos, como permitia LK-09. Lo demas, igual. PROVISIONAL.
   */
  lurker: { ...WORM, hp: WORM.hp * LURKER_HP },
  lurkerSpitter: { ...SPITTER, hp: SPITTER.hp * LURKER_HP },
  lurkerArmored: { ...ARMORED, hp: ARMORED.hp * LURKER_HP },
  /**
   * Skipper (T-038, LK-05 a LK-08): avanza a saltos por encima de plantas y minas (`HOP`) y solo lo para un escudo, al que
   * muerde. No muerde nada mas: va a la salida y cuesta una vida. Fragil: unos dos tercios de la vida del Lurker (LK-08).
   * No llega oculto. `speed` es su media con salto y descanso, para la ficha y quien cuente lo que tarda en cruzar: no anda.
   */
  skipper: {
    /** LK-08: lo de un escupidor. */
    reward: 20,
    /** LK-08: unos dos tercios de la del Lurker (100); 71,5 con la fuerza de todos. PROVISIONAL. */
    hp: 65,
    /** Casillas por segundo, de media: `HOP.length` cada `HOP.restMs` + `HOP.airMs`. */
    speed: HOP.length / ((HOP.restMs + HOP.airMs) / 1000),
    attack: 'bite',
    /** Al escudo que lo para, como un gusano. PROVISIONAL. */
    biteDamage: 50,
    biteIntervalMs: 1000, // PROVISIONAL
    firstBiteMs: 450,
    reach: 0.6,
    halfLength: 0.36,
  },
  /**
   * Brain, el Cerebro (T-039), jefe del brote 3 y lo grande de su ultima ronda. Avanza oculto y a saltos (`BRAIN`) y solo
   * muerde el escudo que lo para. No tiene nivel: de `ENEMY_POWER` solo le toca la fuerza de todos. Si cruza el jardin, se
   * pierde la partida; al caer se gana: no da moneda. `speed` es su media con salto y descanso (fase 1), para la ficha y
   * quien cuente lo que tarda en cruzar: no anda.
   */
  brain: {
    reward: 0,
    /** PROVISIONAL (docs/specs/06-brote-3-brain.md): solo se le dispara mientras esta descubierto. */
    hp: 4500,
    /** Casillas por segundo, de media en la fase 1: `BRAIN.hopLength` cada descanso y vuelo. */
    speed: BRAIN.hopLength / ((BRAIN.calm.restMs + BRAIN.airMs) / 1000),
    attack: 'bite',
    /** Al escudo que lo para. PROVISIONAL. */
    biteDamage: 80,
    biteIntervalMs: 1200, // PROVISIONAL
    firstBiteMs: 600,
    /**
     * Grande y con la boca pegada al escudo: su hocico queda por delante del de cualquier tropa que muerda el mismo escudo
     * (`reach` - `halfLength`, 0,15; el acorazado, 0,18), asi que descubierto se lleva el los disparos y no su escolta.
     */
    reach: 0.75,
    halfLength: 0.6,
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
  /**
   * Lo que quita el poema a cada cosa que cruza, sin la fuerza de todos (T-010). Alto (L-04). T-035: un 45 % mas que en
   * T-026 (350); 558,25 con la fuerza. PROVISIONAL.
   */
  poemDamage: 507.5,
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
 * Niveles de los enemigos (T-009; curva de T-035, Carmine, 22 nov 2026). Crecimiento compuesto: cada nivel multiplica la
 * vida y el dano (mordisco, escupitajo o verso) del nivel anterior por 1 + `perLevel`, y cada nivel con premio
 * (`LEVEL_MILESTONES`) por 1 + `perMilestone`; la velocidad y la cadencia no cambian. Encima va la fuerza de todos
 * (`ENEMY_POWER`). Nivel 5, x2,11 sobre la base del tipo (con la fuerza, x2,33); nivel 9, x4,17 (x4,58); nivel 10, x5,29
 * (x5,82). Cada ronda dice con que pesos sale cada nivel (`levels` en las rondas de `OUTBREAKS`); sin tabla, todos de
 * nivel 1. Las copias del Creeper y las escoltas de los jefes tienen nivel fijo.
 * T-035: en los brotes 1 y 2 ninguna tropa al azar pasa del nivel 9; solo los aliados de los jefes llevan el 10. Para
 * los brotes siguientes, el nivel de los enemigos se pregunta a Carmine. PROVISIONAL.
 */
export const ENEMY_LEVELS = {
  /** Lo que crece la vida y el dano en cada nivel, sobre los del anterior (compuesto). */
  perLevel: 0.185,
  /** Lo mismo en cada nivel con premio (`LEVEL_MILESTONES`: 5, 10, 15...), en vez de `perLevel`. */
  perMilestone: 0.27,
  /** Pesos de cada nivel (no hace falta que sumen 100). */
  tables: {
    /** Del 1 al 4, mas probable cuanto mas bajo. */
    early: { 1: 40, 2: 30, 3: 20, 4: 10 },
    /** Del 1 al 7, con el pico en el 4; menos el 1 y aun menos el 7. */
    mid: { 1: 8, 2: 14, 3: 20, 4: 24, 5: 16, 6: 12, 7: 6 },
    /** Del 3 al 9, con el pico en el 7 (T-035: sin el 10, que era el 4 %; su parte, al 8 y al 9). */
    late: { 3: 6, 4: 10, 5: 15, 6: 20, 7: 22, 8: 15, 9: 12 },
    /**
     * Brote 2 desde la ronda 6 (T-026): del 5 al 9, con el pico en el 7 y el 8 (T-035: antes llegaba al 12). Es lo que
     * hace que el final del brote 2 sea mas duro que el del brote 1.
     */
    high: { 5: 12, 6: 18, 7: 25, 8: 25, 9: 20 },
  },
} as const;

/**
 * Fuerza de los enemigos (T-010, A-07, decidida el 20 nov 2026). Multiplica su vida y su dano (mordisco, escupitajo, verso,
 * el golpe del Creeper al aterrizar y el poema de Elk Cloner), encima de lo que da su nivel (`ENEMY_LEVELS`). Vale para
 * todos los enemigos, tambien los jefes (que no tienen nivel: solo `base`) y los que vengan. La velocidad no cambia.
 * El extra por tramo de nivel de T-010 (+20 % desde el 5 y +40 % desde el 10) lo sustituye desde T-035 el premio de cada
 * 5 niveles (`ENEMY_LEVELS.perMilestone`). PROVISIONAL.
 */
export const ENEMY_POWER = {
  /** Todos los enemigos: un 10 % mas. */
  base: 1.1,
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
 * con el tope de nivel en 5, como el brote 1 (T-035; hasta entonces subia a 10, L-08). Un concepto por ronda (L-07): en la 1, los Copycat; en
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
    // T-035: el tope de nivel sigue en el 5 del brote 1 (antes subia a 10 aqui, L-08). Sube a 10 en el brote 5, con Patty.
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
 * Las rondas del brote 3, el de Brain (T-039; diseno en docs/specs/06-brote-3-brain.md): 8, como el brote 2, con un concepto
 * por ronda. En la 1, los Lurker ocultos (niveles `early`, como la 1 del brote 2: T-038); en la 2, infundir el escudo (T-037,
 * lo anuncia Patty, ES-01), con muchos escupidores; en la 3, el Skipper, de uno en uno; en la 4, mezcla de acorazados
 * ocultos y Skipper; en la 5, dos oleadas por los cinco carriles; en la 6 y la 7 Brain se prepara a la derecha y acelera a
 * sus tropas, como Elk Cloner; y la 8 es el combate: su escolta (BR-07, un Lurker acorazado oculto de nivel 10 por carril y
 * dos Skipper de nivel 10), el por el centro y, mientras vive, refuerzos. Misma banda de niveles que el brote 2: ninguna
 * tropa pasa del 9, solo la escolta lleva el 10. La simulacion que lo ajusta esta en `src/game/sim/` (`npm run sim`).
 * PROVISIONAL: se ajusta jugando.
 */
const BRAIN_ROUNDS: readonly RoundScript[] = [
  {
    // Los Lurker, ocultos: las plantas tardan en verlos; las minas y el hielo los descubren. La de T-038, que `npm run sim`
    // pasaba siempre: con los grupos del brote 2, mas largos y con mas acorazados, el bot perdia aqui (solo se les dispara
    // en las ultimas casillas).
    unlocks: [],
    levels: ENEMY_LEVELS.tables.early,
    groups: [
      { atMs: 3_000, kind: 'lurker', lanes: [2] },
      { atMs: 10_000, kind: 'lurker', lanes: [1] },
      { atMs: 16_000, kind: 'lurker', lanes: [3] },
      { atMs: 22_000, kind: 'lurkerSpitter', lanes: [2] },
      { atMs: 28_000, kind: 'lurker', lanes: [0, 4] },
      { atMs: 34_000, kind: 'lurker', lanes: [1, 3] },
      { atMs: 40_000, kind: 'lurkerSpitter', lanes: [0, 4] },
      { atMs: 46_000, kind: 'lurker', lanes: [2] },
      { atMs: 52_000, kind: 'lurker', lanes: ALL },
      { atMs: 60_000, kind: 'lurker', lanes: [1, 2, 3] },
      { atMs: 66_000, kind: 'lurkerSpitter', lanes: [1, 3] },
    ],
  },
  {
    // T-037: infundir el escudo. Muchos escupidores: una disparadora con escudo les para los escupitajos.
    unlocks: ['shieldInfuse'],
    levels: ENEMY_LEVELS.tables.early,
    groups: [
      { atMs: 3_000, kind: 'lurkerSpitter', lanes: [2] },
      { atMs: 9_000, kind: 'lurker', lanes: [1, 3] },
      { atMs: 15_000, kind: 'lurkerSpitter', lanes: [0, 4] },
      { atMs: 22_000, kind: 'lurkerArmored', lanes: [2] },
      { atMs: 28_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 35_000, kind: 'lurker', lanes: [0, 2, 4] },
      { atMs: 42_000, kind: 'lurkerSpitter', lanes: [0, 2, 4] },
      { atMs: 50_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 57_000, kind: 'lurkerSpitter', lanes: [1, 2, 3] },
      { atMs: 64_000, kind: 'lurker', lanes: ALL },
      { atMs: 72_000, kind: 'lurkerArmored', lanes: [0, 4] },
      { atMs: 76_000, kind: 'lurkerSpitter', lanes: [2] },
    ],
  },
  {
    // Llega el Skipper, de uno en uno: solo lo para un escudo, y en tierra es fragil.
    unlocks: [],
    levels: ENEMY_LEVELS.tables.mid,
    groups: [
      { atMs: 3_000, kind: 'lurkerArmored', lanes: [0, 4] },
      { atMs: 6_000, kind: 'skipper', lanes: [2] },
      { atMs: 12_000, kind: 'lurker', lanes: ALL },
      { atMs: 20_000, kind: 'skipper', lanes: [1] },
      { atMs: 26_000, kind: 'lurkerArmored', lanes: [1, 2, 3] },
      { atMs: 30_000, kind: 'skipper', lanes: [3] },
      { atMs: 34_000, kind: 'lurkerSpitter', lanes: [0, 4] },
      { atMs: 40_000, kind: 'lurker', lanes: ALL },
      { atMs: 46_000, kind: 'skipper', lanes: [0] },
      { atMs: 52_000, kind: 'skipper', lanes: [4] },
      { atMs: 56_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
      { atMs: 64_000, kind: 'lurker', lanes: ALL },
      { atMs: 70_000, kind: 'skipper', lanes: [1, 3] },
      { atMs: 74_000, kind: 'lurkerSpitter', lanes: [0, 1, 3, 4] },
      { atMs: 80_000, kind: 'lurker', lanes: [1, 2, 3] },
    ],
  },
  {
    // Mezcla: acorazados ocultos que piden minas y Skipper que piden escudos.
    unlocks: [],
    levels: ENEMY_LEVELS.tables.mid,
    groups: [
      { atMs: 3_000, kind: 'lurker', lanes: [0, 2, 4] },
      { atMs: 8_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 14_000, kind: 'skipper', lanes: [0, 4] },
      { atMs: 20_000, kind: 'lurkerSpitter', lanes: [2] },
      { atMs: 24_000, kind: 'lurker', lanes: ALL },
      { atMs: 32_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
      { atMs: 38_000, kind: 'skipper', lanes: [1, 3] },
      { atMs: 44_000, kind: 'lurkerSpitter', lanes: [0, 4] },
      { atMs: 50_000, kind: 'lurker', lanes: [1, 2, 3] },
      { atMs: 52_000, kind: 'lurker', lanes: [1, 2, 3] },
      { atMs: 60_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 64_000, kind: 'skipper', lanes: [0, 2, 4] },
      { atMs: 72_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 78_000, kind: 'lurker', lanes: ALL },
      { atMs: 84_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
    ],
  },
  {
    // Dos oleadas por los cinco carriles, con Skipper detras de cada una: una puerta en cada carril.
    unlocks: [],
    levels: ENEMY_LEVELS.tables.late,
    groups: [
      { atMs: 3_000, kind: 'lurker', lanes: ALL },
      { atMs: 8_000, kind: 'skipper', lanes: [1, 3] },
      { atMs: 12_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
      { atMs: 18_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 24_000, kind: 'lurker', lanes: ALL },
      { atMs: 27_000, kind: 'lurker', lanes: ALL },
      { atMs: 34_000, kind: 'skipper', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 46_000, kind: 'lurkerSpitter', lanes: [0, 2, 4] },
      { atMs: 54_000, kind: 'lurker', lanes: ALL },
      { atMs: 58_000, kind: 'lurkerArmored', lanes: ALL },
      { atMs: 66_000, kind: 'skipper', lanes: [1, 2, 3] },
      { atMs: 72_000, kind: 'lurkerSpitter', lanes: [0, 4] },
      { atMs: 78_000, kind: 'lurker', lanes: ALL },
      { atMs: 81_000, kind: 'lurker', lanes: ALL },
      { atMs: 88_000, kind: 'lurkerArmored', lanes: [1, 2, 3] },
    ],
  },
  {
    // Brain se prepara: todo un 15 % mas rapido. Boxer cuenta quien fue Brain.
    unlocks: [],
    haste: 1.15,
    bossPreparing: true,
    levels: ENEMY_LEVELS.tables.late,
    groups: [
      { atMs: 3_000, kind: 'lurker', lanes: ALL },
      { atMs: 6_000, kind: 'lurkerArmored', lanes: [2] },
      { atMs: 9_000, kind: 'skipper', lanes: [0, 4] },
      { atMs: 13_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 18_000, kind: 'lurker', lanes: ALL },
      { atMs: 22_000, kind: 'lurkerArmored', lanes: [0, 4] },
      { atMs: 26_000, kind: 'skipper', lanes: [1, 2, 3] },
      { atMs: 32_000, kind: 'lurker', lanes: ALL },
      { atMs: 35_000, kind: 'lurkerSpitter', lanes: [0, 2, 4] },
      { atMs: 40_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 46_000, kind: 'skipper', lanes: [0, 4] },
      { atMs: 50_000, kind: 'lurker', lanes: ALL },
      { atMs: 53_000, kind: 'lurker', lanes: [1, 2, 3] },
      { atMs: 58_000, kind: 'lurkerArmored', lanes: ALL },
      { atMs: 64_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 68_000, kind: 'skipper', lanes: [0, 2, 4] },
      { atMs: 74_000, kind: 'lurker', lanes: ALL },
      { atMs: 77_000, kind: 'lurker', lanes: ALL },
      { atMs: 84_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
      { atMs: 90_000, kind: 'lurkerSpitter', lanes: ALL },
    ],
  },
  {
    // Mas tropas y mas rapidas (+25 %), con Skipper por los cinco carriles: hay que llegar con los cinco cerrados.
    unlocks: [],
    haste: 1.25,
    bossPreparing: true,
    levels: ENEMY_LEVELS.tables.high,
    groups: [
      { atMs: 3_000, kind: 'lurker', lanes: ALL },
      { atMs: 5_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 8_000, kind: 'skipper', lanes: [0, 2, 4] },
      { atMs: 12_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 16_000, kind: 'lurker', lanes: ALL },
      { atMs: 19_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
      { atMs: 23_000, kind: 'skipper', lanes: [1, 3] },
      { atMs: 27_000, kind: 'lurker', lanes: ALL },
      { atMs: 30_000, kind: 'lurkerSpitter', lanes: [0, 2, 4] },
      { atMs: 34_000, kind: 'lurkerArmored', lanes: ALL },
      { atMs: 40_000, kind: 'skipper', lanes: [0, 2, 4] },
      { atMs: 44_000, kind: 'lurker', lanes: ALL },
      { atMs: 46_000, kind: 'lurker', lanes: ALL },
      { atMs: 52_000, kind: 'lurkerSpitter', lanes: [1, 3] },
      { atMs: 55_000, kind: 'lurkerArmored', lanes: [1, 2, 3] },
      { atMs: 60_000, kind: 'skipper', lanes: ALL },
      { atMs: 66_000, kind: 'lurker', lanes: ALL },
      { atMs: 69_000, kind: 'lurkerArmored', lanes: [0, 4] },
      { atMs: 74_000, kind: 'lurkerSpitter', lanes: ALL },
      { atMs: 80_000, kind: 'lurker', lanes: ALL },
      { atMs: 83_000, kind: 'lurker', lanes: ALL },
      { atMs: 88_000, kind: 'lurkerArmored', lanes: ALL },
      { atMs: 94_000, kind: 'skipper', lanes: [1, 3] },
    ],
  },
  {
    unlocks: [],
    levels: ENEMY_LEVELS.tables.high,
    groups: [
      // BR-07: su escolta, un Lurker acorazado oculto de nivel 10 por carril y dos Skipper de nivel 10, con su grito.
      { atMs: 2_000, kind: 'lurkerArmored', lanes: ALL, level: 10, shout: 'escort' },
      { atMs: 4_000, kind: 'skipper', lanes: [1, 3], level: 10 },
      { atMs: 6_000, kind: 'brain', lanes: [2] },
      // Refuerzos mientras vive: dejan de salir en cuanto cae.
      { atMs: 24_000, kind: 'skipper', lanes: [0, 4] },
      { atMs: 36_000, kind: 'lurkerArmored', lanes: [1, 3] },
      { atMs: 48_000, kind: 'skipper', lanes: [0, 2, 4] },
      { atMs: 62_000, kind: 'lurker', lanes: ALL },
      { atMs: 76_000, kind: 'skipper', lanes: [1, 3] },
      { atMs: 90_000, kind: 'lurkerArmored', lanes: [0, 2, 4] },
      { atMs: 104_000, kind: 'skipper', lanes: ALL },
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
  {
    id: 'brain',
    // T-039: Brain, el Cerebro. Desde T-037 el brote estaba en preparacion (`boss: null`).
    boss: 'brain',
    // ES-04: como el brote 2.
    startingBalance: 300, // PROVISIONAL
    rounds: BRAIN_ROUNDS,
    // Patty no crea nada nuevo: avisa de que el escudo ya se puede infundir (ES-01, `unlock.featureLines` de src/i18n/).
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
 * Dano (tambien la quemadura) y vida crecen en compuesto (T-035, Carmine, 22 nov 2026): cada nivel multiplica el dano del
 * anterior por 1 + `damagePerLevel`, y cada nivel con premio (`LEVEL_MILESTONES`: 5, 10, 15...) por 1 + `damagePerMilestone`
 * y la vida por 1 + `hpPerMilestone`. Nivel 5: x1,71 de dano y 375 de vida; nivel 10: x3,28 y 469. La cadencia suma sobre la
 * de nivel 1, como antes. Lo que frena una de hielo no cambia con el nivel (depende de sus canones, ver `ICE`).
 * Costo (D-05, cerrada el 19 nov 2026): creciente. De nivel 1 a 2 cuesta `baseCost` y cada nivel siguiente
 * `costStep` mas (75, 100, 125...), por canon, como infundir: una de 3 canones paga el triple.
 */
export const LEVELING = {
  /** Lo que crece el dano en cada nivel, sobre el del anterior (compuesto). PROVISIONAL. */
  damagePerLevel: 0.125,
  /** Lo mismo en cada nivel con premio, en vez de `damagePerLevel`. PROVISIONAL. */
  damagePerMilestone: 0.2,
  /** Lo que crece la vida en cada nivel con premio, sobre la que tenia (compuesto); en los demas no cambia. PROVISIONAL. */
  hpPerMilestone: 0.25,
  /** Cadencia que suma cada nivel sobre la de nivel 1. PROVISIONAL. */
  fireRatePerLevel: 0.03,
  /**
   * Premio de cadencia (21 nov 2026): un nivel con premio suma `fireRateMilestone` veces lo de un nivel normal, y uno que
   * es dos premios a la vez (el 10, el 20...: multiplo de dos veces `LEVEL_MILESTONES.every`), `fireRateDoubleMilestone`
   * veces. Lo ganado se queda. Son los niveles en los que la medallita cambia de color. PROVISIONAL.
   */
  fireRateMilestone: 1.5,
  fireRateDoubleMilestone: 2,
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
 * compran una vez en la tienda (T-022) y traen `chargesPerMatch` cargas a cada partida (O-01, b; recolocar, mas con sus
 * niveles: `RELOCATE`). Se llevan `maxCarried` (O-02), elegidos antes de empezar el brote (T-04). En la preparacion solo
 * se recoloca (O-07). Afectan a los jefes igual que a los demas (O-06). PROVISIONAL.
 */
export const POWERS = {
  /** Cargas de cada poder en cada partida (O-01, b), en su nivel 1. */
  chargesPerMatch: 1,
  /** Cuantos se llevan a una partida (O-02). */
  maxCarried: 2,
  /** Si se puede usar en la preparacion (O-07): solo recolocar; la granada y el muro, en el ataque. */
  usableInPrep: { relocate: true, grenade: false, iceWall: false },
} as const;

/**
 * Niveles de los poderes (T-022, T-01 decidida por Carmine el 22 nov 2026): cada poder comprado empieza en el nivel 1 y
 * se mejora en la tienda hasta `max`. Cada nivel suma lo suyo (`RELOCATE`, `GRENADE`, `ICE_WALL`) y los niveles con premio
 * (`LEVEL_MILESTONES`, como los de las plantas: el 5 y el 10) suman mas y dan un salto: una carga mas de recolocar, mas
 * alcance de la granada y una casilla mas de muro.
 */
export const POWER_LEVELS = {
  max: 10,
} as const;

/**
 * Recolocar con nivel (T-022): cada nivel por encima del 1 cura a la planta que se mueve `healPerLevel` de su vida entera
 * (45 % en el nivel 10), y cada nivel con premio trae `chargesPerMilestone` cargas mas por partida (2 en el 5, 3 en el 10).
 * PROVISIONAL.
 */
export const RELOCATE = {
  healPerLevel: 0.05,
  chargesPerMilestone: 1,
} as const;

/**
 * Granada (T-021, O-04): alguien la lanza desde detras de las plantas, vuela en curva `flightMs` hasta el centro de la
 * casilla elegida, cuenta `fuseMs` y explota. Es invulnerable y no ocupa la casilla: los enemigos no la atacan ni se paran.
 * Alcanza mas que la mina (`MINE.blastRadius`) y hace el dano de la de fuego; no dana plantas ni le da a Creeper en el aire.
 * Con nivel (T-022): cada nivel suma `damagePerLevel` del dano del nivel 1 y los niveles con premio, `damagePerMilestone`
 * (570 en el nivel 10), y estos alargan el alcance `radiusPerMilestone` casillas (2,4 en el 10).
 */
export const GRENADE = {
  /** Del lanzamiento a caer en la casilla. Solo aspecto de la curva, pero cuenta: la explosion llega despues. PROVISIONAL. */
  flightMs: 900,
  /** Desde que cae hasta que explota (O-04: "a los 2 s"). */
  fuseMs: 2000,
  /** En el nivel 1, alcanza a todos los enemigos a esta distancia o menos de su casilla, en cualquier carril: mas que la mina (1,5). PROVISIONAL. */
  blastRadius: 1.8,
  /** En el nivel 1, el de la mina de fuego (O-04). */
  damage: FIRE.blastDamage,
  /** Dano que suma cada nivel, en fraccion del de nivel 1 (T-01: un 15 %). */
  damagePerLevel: 0.15,
  /** Lo que suman los niveles 5 y 10 en vez de eso (T-01: un 40 %). */
  damagePerMilestone: 0.4,
  /** Alcance que suman los niveles 5 y 10, en casillas. PROVISIONAL. */
  radiusPerMilestone: 0.3,
} as const;

/**
 * Muro de hielo (T-021, O-05, O-09 a O-11): tres bloques de hielo en una columna, la casilla elegida y las de arriba y abajo
 * (`span`; en el carril de arriba o el de abajo se mete dentro del tablero). Cada bloque es un muro (bloquea el paso y para
 * lo que va hacia lo de detras, como el escudo) con la vida de una disparadora de nivel 1 y se derrite a los `durationMs`.
 * Con nivel (T-022): cada nivel suma `hpPerLevel` de la vida de nivel 1 a cada bloque y los niveles con premio,
 * `hpPerMilestone` (930 en el nivel 10), y estos lo alargan `spanPerMilestone` casillas (4 desde el 5 y 5, la columna
 * entera, en el 10).
 */
export const ICE_WALL = {
  /** Carriles que ocupa en el nivel 1, en una columna (O-09). */
  span: 3,
  /** Vida de cada bloque en el nivel 1 (O-05, O-10): la de una disparadora de nivel 1. */
  hp: SHOOTER.hp,
  /** Lo que dura cada bloque antes de derretirse (O-05: "unos 10 s"). PROVISIONAL. */
  durationMs: 10_000,
  /** Vida que suma cada nivel, en fraccion de la de nivel 1 (T-01: un 20 %). */
  hpPerLevel: 0.2,
  /** Lo que suman los niveles 5 y 10 en vez de eso (T-01: un 35 %). */
  hpPerMilestone: 0.35,
  /** Casillas que suman los niveles 5 y 10 (T-01: 4 desde el 5 y 5 en el 10). */
  spanPerMilestone: 1,
} as const;

/**
 * Tienda (T-022; T-01 a T-04 decididas el 22 nov 2026). Los poderes cuestan `powerPrices` segun el orden en que se
 * compran: el primero, sea cual sea, 1000 (al alcance tras vencer a Creeper una vez sin perder vidas). Mejorar un poder
 * al nivel N cuesta `upgradePerLevel` x N, y los niveles con premio (5 y 10), `milestoneFactor` veces eso: 13.800 por poder
 * del 1 al 10. Lo comprado no se devuelve (T-03). PROVISIONAL.
 */
export const SHOP = {
  powerPrices: [1000, 1500, 2000],
  upgradePerLevel: 200,
  milestoneFactor: 2,
} as const;

/**
 * Nivel base de la disparadora (T-023; N-01 a N-06 decididas el 22 nov 2026 con la recomendacion): una mejora permanente
 * del Invernadero con la que toda disparadora sembrada nace en ese nivel, sin cambiar el precio de sembrarla. Cada paso
 * da lo mismo que un nivel de partida (N-02: `LEVELING`, con el premio del nivel 5, N-05). `max` nunca pasa del tope de
 * nivel de ninguna ronda (un test lo comprueba). `prices[i]` es lo que cuesta subirlo al nivel `i + 2`: crecientes, y el
 * paso al 5, el articulo mas caro de la tienda (N-03: unas 10.000 semillas). 20.000 del 1 al 5. PROVISIONAL.
 */
export const BASE_LEVEL = {
  max: 5,
  prices: [1500, 3000, 5500, 10_000],
} as const;
