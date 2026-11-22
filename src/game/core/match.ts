import { BOARD, COSTS, LIVES, MINE, SHIELD } from '../config/balance';
import { isOnBoard, type Cell } from './board';
import type { Bullet, Enemy, Grenade, Spit, Verse } from './combat';
import {
  canInfuse,
  createShooter,
  fuse,
  fuseBlocker,
  infuse,
  infusionCost,
  levelUp,
  levelUpCost,
  isMineElement,
  plantMaxHp,
  type ElementType,
  type FuseBlocker,
  type MineElement,
  type Shooter,
} from './plants';
import { NO_BASE_LEVEL, isBaseLevel } from './baseLevel';
import { FIRST_OUTBREAK, outbreakScript, type OutbreakId } from './outbreaks';
import { loadoutSlots, type CarriedPower, type PowerSlot } from './powers';
import { createRound, infuseFeature, isUnlocked, levelCap, levelCapRaisedAfter, sowFeature, type Feature, type RoundState } from './rounds';
import { newMatchSeeds, type MatchSeeds } from './seeds';

/** Cartas que se pueden jugar desde el HUD: la disparadora y los elementos (fuego, hielo y, desde T-024, escudo). */
export type CardId = 'shooter' | ElementType;

/** Disparadora sembrada: lo que es (`shooter`) y como esta en el combate. */
export interface Plant {
  readonly kind: 'shooter';
  readonly shooter: Shooter;
  readonly hp: number;
  /** Milisegundos hasta que puede volver a disparar; 0 si esta lista. */
  readonly reloadMs: number;
}

/**
 * Elemento sembrado solo (T-004): una mina. Espera a que un enemigo entre en su radio, cuenta
 * `MINE.countdownMs` y explota. Tiene vida propia: si la destruyen antes, no explota.
 */
export interface Mine {
  readonly kind: 'mine';
  readonly element: MineElement;
  readonly hp: number;
  /** Milisegundos que le quedan al conteo; null mientras espera a un enemigo. */
  readonly fuseMs: number | null;
}

/**
 * Escudo sembrado solo (T-024): un muro. No dispara ni explota: aguanta `SHIELD.wallHp` y los enemigos lo muerden hasta
 * romperlo. Para lo que va por su carril hacia lo de detras (`isShield` en combat.ts).
 */
export interface Wall {
  readonly kind: 'wall';
  readonly hp: number;
}

/**
 * Bloque del muro de hielo (T-021, O-05): lo pone el poder, tres en una columna (`placeIceWall` en powers.ts; mas con su
 * nivel, T-022). Es un muro (bloquea el paso y, como el escudo, para lo que va hacia lo de detras: `isShield`) con la vida
 * del nivel del poder (`ICE_WALL.hp` en el nivel 1), y se derrite al acabarse `ms` (`stepCombat`). No se siembra, no se
 * arrastra ni se infunde.
 */
export interface IceBlock {
  readonly kind: 'ice';
  readonly hp: number;
  /** Su vida entera, la del nivel del poder que lo puso (T-022). */
  readonly maxHp: number;
  /** Lo que le queda antes de derretirse. */
  readonly ms: number;
}

/**
 * Lo que ocupa una casilla: una disparadora, una mina, un muro (T-024) o un bloque de hielo (T-021). Los enemigos muerden
 * todo.
 */
export type Sown = Plant | Mine | Wall | IceBlock;

/**
 * Todo lo que forma una partida, incluido el combate. Al cambiar el nivel grafico el juego se recrea
 * con este estado, asi que lo que no este aqui se pierde (ADR-0008).
 */
export interface MatchState {
  /** Brote al que pertenece la partida (T-018): su guion de rondas, su jefe y lo que llega desbloqueado. No cambia. */
  readonly outbreak: OutbreakId;
  readonly balance: number;
  readonly lives: number;
  /** Lo sembrado por carril y columna (disparadoras y minas); null si la casilla esta vacia. */
  readonly plants: ReadonlyArray<ReadonlyArray<Sown | null>>;
  readonly enemies: readonly Enemy[];
  readonly bullets: readonly Bullet[];
  /** Escupitajos de los escupidores en vuelo (T-007). */
  readonly spits: readonly Spit[];
  /** Versos de los juglares en vuelo (T-025): ondas que cruzan el carril hasta el primer escudo. */
  readonly verses: readonly Verse[];
  /** Granadas lanzadas con el poder (T-021): en vuelo o contando para explotar. */
  readonly grenades: readonly Grenade[];
  /** Poderes que lleva la partida, en el orden del panel, con sus cargas (T-021). Vacio: sin panel. */
  readonly powers: readonly PowerSlot[];
  /**
   * Nivel con el que nace cada disparadora sembrada (T-023): el nivel base del Invernadero al empezar la partida. No
   * cambia aunque se compre otro paso con la partida a medias, asi que una guardada sigue igual al cargarla.
   */
  readonly baseLevel: number;
  /**
   * Lo que la partida trae desbloqueado desde la ronda 1 por brotes posteriores ya vencidos (norma ES-03, T-037:
   * `carriedFeatures`). Se decide al empezarla y no cambia, aunque se venza otro brote con ella a medias.
   */
  readonly carried: readonly Feature[];
  /** Ronda en curso: preparacion o ataque, y que grupos del guion ya salieron (T-007). */
  readonly round: RoundState;
  /**
   * Tiempo de ataque contado hacia el siguiente goteo de moneda (T-010): en la preparacion no corre y en el siguiente
   * ataque sigue donde iba (ver `stepIncome`).
   */
  readonly incomeMs: number;
  /**
   * Semillas de la partida (T-020): lo que llevan las rondas superadas, sin cobrar, y si el brote ya estaba vencido. Se
   * cobran al acabar (`settleSeeds`); salir al menu con la partida guardada no entrega nada.
   */
  readonly seeds: MatchSeeds;
  /** Siguiente id libre para enemigos y balas: la vista sigue a cada uno por su id. */
  readonly nextId: number;
}

/**
 * Partida nueva del brote `outbreak`, en la preparacion de la ronda `roundIndex` (desde 0) con el tablero vacio y, si no
 * se dice otro, el saldo inicial del brote (T-018, B-02: no se trae nada de otro brote). El juego siempre empieza en la
 * primera ronda; empezar en otra sirve para probar lo que desbloquean las siguientes. `replay` dice si su jefe ya estaba
 * vencido: entonces las semillas dan menos (T-020, C-03). `loadout`, los poderes que trae (T-021) con su nivel (T-022),
 * que salen de la tienda y se eligen antes del brote; sin el, ninguno. `baseLevel`, el nivel con el que nacen sus
 * disparadoras (T-023); sin el, el 1. `carried`, lo que trae desbloqueado de brotes posteriores ya vencidos (ES-03,
 * `carriedFeatures`); sin el, nada.
 */
export function createMatch(
  balance?: number,
  roundIndex = 0,
  outbreak: OutbreakId = FIRST_OUTBREAK,
  replay = false,
  loadout?: readonly CarriedPower[],
  baseLevel = NO_BASE_LEVEL,
  carried: readonly Feature[] = [],
): MatchState {
  if (!isBaseLevel(baseLevel)) throw new Error(`Nivel base invalido: ${baseLevel}`);
  const start = balance ?? outbreakScript(outbreak).startingBalance;
  assertWholeAmount(start);
  const plants = Array.from({ length: BOARD.lanes }, () => Array.from({ length: BOARD.columns }, (): Sown | null => null));
  return {
    outbreak,
    balance: start,
    lives: LIVES.start,
    plants,
    enemies: [],
    bullets: [],
    spits: [],
    verses: [],
    grenades: [],
    powers: loadoutSlots(loadout),
    baseLevel,
    carried: [...carried],
    round: createRound(outbreak, roundIndex),
    incomeMs: 0,
    seeds: newMatchSeeds(replay),
    nextId: 1,
  };
}

/** Elemento de la carta, o null si es la disparadora. */
export function cardElement(card: CardId): ElementType | null {
  return card === 'shooter' ? null : card;
}

/** Precio de la carta en el HUD: sembrarla en una casilla vacia, o infundir una disparadora de un canon. */
export function cardCost(card: CardId): number {
  return COSTS[card];
}

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}

/** Lo que hay sembrado en la casilla (disparadora o mina), o null si esta vacia o fuera del tablero. */
export function sownAt(state: MatchState, cell: Cell): Sown | null {
  return isOnBoard(cell) ? state.plants[cell.lane][cell.col] : null;
}

/** Disparadora de la casilla, o null si esta vacia, tiene una mina o cae fuera del tablero. */
export function plantAt(state: MatchState, cell: Cell): Plant | null {
  const sown = sownAt(state, cell);
  return sown?.kind === 'shooter' ? sown : null;
}

/** Mina de la casilla, o null si no hay. */
export function mineAt(state: MatchState, cell: Cell): Mine | null {
  const sown = sownAt(state, cell);
  return sown?.kind === 'mine' ? sown : null;
}

/** Muro de la casilla (T-024), o null si no hay. */
export function wallAt(state: MatchState, cell: Cell): Wall | null {
  const sown = sownAt(state, cell);
  return sown?.kind === 'wall' ? sown : null;
}

/** Bloque de hielo de la casilla (T-021), o null si no hay. */
export function iceAt(state: MatchState, cell: Cell): IceBlock | null {
  const sown = sownAt(state, cell);
  return sown?.kind === 'ice' ? sown : null;
}

/**
 * Vida maxima de lo sembrado: la de la disparadora segun sus canones y su elemento, la de la mina, la del muro o la de un
 * bloque de hielo (T-021).
 */
export function sownMaxHp(sown: Sown): number {
  switch (sown.kind) {
    case 'shooter':
      return plantMaxHp(sown.shooter);
    case 'mine':
      return MINE.hp;
    case 'wall':
      return SHIELD.wallHp;
    case 'ice':
      return sown.maxHp;
  }
}

/**
 * Elemento sembrado solo en la casilla: el de la mina, o el escudo del muro (T-024). Null si es una disparadora. Es lo que
 * vale al arrastrarlo sobre una disparadora para infundirla (`elementInfusion`).
 */
export function sownElement(sown: Sown): ElementType | null {
  if (sown.kind === 'mine') return sown.element;
  return sown.kind === 'wall' ? 'shield' : null;
}

/** Planta recien sembrada: vida llena y lista para disparar en cuanto tenga a quien. */
export function createPlant(shooter: Shooter = createShooter()): Plant {
  return { kind: 'shooter', shooter, hp: plantMaxHp(shooter), reloadMs: 0 };
}

/** Mina recien sembrada: vida llena y esperando a un enemigo. */
export function createMine(element: MineElement): Mine {
  return { kind: 'mine', element, hp: MINE.hp, fuseMs: null };
}

/** Muro recien sembrado (T-024): vida llena. */
export function createWall(): Wall {
  return { kind: 'wall', hp: SHIELD.wallHp };
}

/** Lo que brota al sembrar el elemento solo en una casilla vacia: una mina (fuego o hielo) o un muro (escudo). */
export function createSownElement(element: ElementType): Mine | Wall {
  return isMineElement(element) ? createMine(element) : createWall();
}

/**
 * La disparadora infundida con `element`. Conserva su nivel y su recarga. Si su vida maxima cambia (el escudo la dobla,
 * T-024), conserva la proporcion de vida que tenia: una a media vida queda a media vida. El fuego y el hielo no cambian
 * la vida.
 */
export function infusedPlant(plant: Plant, element: ElementType): Plant {
  const shooter = infuse(plant.shooter, element);
  const hp = (plant.hp * plantMaxHp(shooter)) / plantMaxHp(plant.shooter);
  return { ...plant, shooter, hp };
}

/**
 * Por que no se puede jugar una carta en una casilla: fuera del tablero, lo que haria aun no esta desbloqueado
 * en esta ronda (T-007), casilla ocupada (para sembrar, o una mina para infundir), disparadora que ya tiene
 * elemento, o saldo que no alcanza.
 */
export type PlayBlocker = 'off-board' | 'locked' | 'occupied' | 'has-element' | 'insufficient-funds';

/** Lo que pasaria al soltar una carta en una casilla. */
export interface CardPlay {
  /** Sembrar en la casilla vacia, o infundir la disparadora (solo cartas de elemento). */
  readonly action: 'sow' | 'infuse';
  /** Lo que se cobra: el precio de la carta al sembrar, `infusionCost` al infundir. */
  readonly cost: number;
  /** Por cuanto se multiplica el precio de la carta: 1 al sembrar, los canones al infundir (D-04: "x3 = 225"). */
  readonly multiplier: number;
  /** Por que no se puede, o null si se puede. */
  readonly blocker: PlayBlocker | null;
}

/**
 * Que pasa al soltar `card` en `cell`. La disparadora se siembra en una casilla vacia. Un elemento se siembra
 * en una casilla vacia (mina, o muro el escudo) o se infunde en una disparadora sin elemento, y cuesta un elemento por canon.
 * Sembrar e infundir cada elemento se desbloquean por separado (T-007: el fuego solo llega antes que infundirlo).
 */
export function cardPlay(state: MatchState, card: CardId, cell: Cell): CardPlay {
  const sow = (blocker: PlayBlocker | null): CardPlay => ({ action: 'sow', cost: cardCost(card), multiplier: 1, blocker });
  if (!isOnBoard(cell)) return sow('off-board');
  const sown = sownAt(state, cell);
  if (!sown) {
    if (!isUnlocked(state, sowFeature(card))) return sow('locked');
    return sow(canAfford(state.balance, cardCost(card)) ? null : 'insufficient-funds');
  }
  if (card === 'shooter' || sown.kind !== 'shooter') return sow('occupied');
  const { shooter } = sown;
  const cost = infusionCost(shooter, card);
  const blocker = !isUnlocked(state, infuseFeature(card))
    ? 'locked'
    : !canInfuse(shooter)
      ? 'has-element'
      : canAfford(state.balance, cost)
        ? null
        : 'insufficient-funds';
  return { action: 'infuse', cost, multiplier: shooter.cannons, blocker };
}

/**
 * Juega la carta en la casilla (siembra o infunde) y cobra su costo. La disparadora nace en el nivel base de la partida
 * (T-023) y cuesta lo mismo. No modifica el estado recibido.
 */
export function playCard(state: MatchState, card: CardId, cell: Cell): MatchState {
  const play = cardPlay(state, card, cell);
  if (play.blocker) {
    throw new Error(`No se puede jugar la carta: ${play.blocker}`);
  }
  const element = cardElement(card);
  let placed: Sown;
  if (play.action === 'infuse' && element) {
    placed = infusedPlant(plantAt(state, cell) as Plant, element);
  } else {
    placed = element ? createSownElement(element) : createPlant(createShooter(state.baseLevel));
  }
  const plants = state.plants.map((lane, laneIndex) =>
    laneIndex === cell.lane ? lane.map((sown, col) => (col === cell.col ? placed : sown)) : lane,
  );
  return { ...state, balance: state.balance - play.cost, plants };
}

/**
 * Por que no se puede arrastrar un elemento sembrado (una mina, o un muro desde T-024) sobre una disparadora para
 * infundirla (T-009, P-12): infundir su elemento aun no esta desbloqueado, fuera del tablero, en el origen no hay mina ni
 * muro, la mina ya cuenta para explotar, en el destino no hay disparadora, la disparadora ya tiene elemento, o no alcanza
 * para los canones que faltan.
 */
export type ElementInfusionBlocker = 'locked' | 'off-board' | 'no-element' | 'armed' | 'no-plant' | 'has-element' | 'insufficient-funds';

/** Lo que pasaria al soltar la mina o el muro de una casilla sobre la disparadora de otra. */
export interface ElementInfusion {
  /** Lo que se cobra: lo arrastrado cuenta como un elemento y se pagan los que faltan, uno por canon mas alla del primero. */
  readonly cost: number;
  /** Elementos que se pagan aparte de lo arrastrado: los canones menos uno. */
  readonly multiplier: number;
  readonly blocker: ElementInfusionBlocker | null;
}

/** Mina o muro de la casilla, con su elemento, o null si no hay ninguno. Un bloque de hielo (T-021) no es un elemento. */
function elementAt(state: MatchState, cell: Cell): { readonly sown: Mine | Wall; readonly element: ElementType } | null {
  const sown = sownAt(state, cell);
  if (!sown || (sown.kind !== 'mine' && sown.kind !== 'wall')) return null;
  return { sown, element: sownElement(sown) as ElementType };
}

/** La mina que ya cuenta para explotar no se puede arrastrar; el muro (T-024), siempre, aunque este mordido. */
function isArmed(sown: Mine | Wall): boolean {
  return sown.kind === 'mine' && sown.fuseMs !== null;
}

/**
 * Por que no se puede empezar a arrastrar la mina o el muro de `cell` (o null si se puede): una mina que aun espera,
 * desde la ronda que desbloquea infundir su elemento. El muro, siempre (T-037, ES-02): antes de poder infundir el escudo
 * se levanta igual, y sobre una disparadora se ve en rojo por que aun no (`elementInfusion` responde `locked`).
 */
export function elementDragBlocker(state: MatchState, cell: Cell): 'locked' | 'no-element' | 'armed' | null {
  const found = elementAt(state, cell);
  if (!found) return 'no-element';
  if (found.sown.kind === 'mine' && !isUnlocked(state, infuseFeature(found.element))) return 'locked';
  return isArmed(found.sown) ? 'armed' : null;
}

/**
 * Que pasa al soltar la mina o el muro de `from` sobre lo sembrado en `to` (T-009, P-12; el muro desde T-024): infunde la
 * disparadora con su elemento, y lo arrastrado deja su casilla. Vale un elemento; en una de N canones se pagan los N - 1
 * que faltan.
 */
export function elementInfusion(state: MatchState, from: Cell, to: Cell): ElementInfusion {
  const result = (blocker: ElementInfusionBlocker | null, cost = 0, multiplier = 0): ElementInfusion => ({ cost, multiplier, blocker });
  if (!isOnBoard(from) || !isOnBoard(to)) return result('off-board');
  const found = elementAt(state, from);
  if (!found) return result('no-element');
  const plant = plantAt(state, to);
  if (!plant) return result('no-plant');
  const multiplier = plant.shooter.cannons - 1;
  const cost = COSTS[found.element] * multiplier;
  if (!isUnlocked(state, infuseFeature(found.element))) return result('locked', cost, multiplier);
  if (isArmed(found.sown)) return result('armed', cost, multiplier);
  if (!canInfuse(plant.shooter)) return result('has-element', cost, multiplier);
  return result(canAfford(state.balance, cost) ? null : 'insufficient-funds', cost, multiplier);
}

/** Casillas de las disparadoras sobre las que se puede soltar la mina o el muro de `from` para infundirlas. */
export function elementInfusionTargets(state: MatchState, from: Cell): Cell[] {
  const targets: Cell[] = [];
  state.plants.forEach((lane, laneIndex) =>
    lane.forEach((_sown, col) => {
      const to = { lane: laneIndex, col };
      if (elementInfusion(state, from, to).blocker === null) targets.push(to);
    }),
  );
  return targets;
}

/**
 * Infunde la disparadora de `to` con la mina o el muro de `from`, que deja su casilla, y cobra los canones que faltan. La
 * vida de la planta se conserva en proporcion (`infusedPlant`); la que le faltaba al muro no pasa a la planta.
 */
export function infuseWithElement(state: MatchState, from: Cell, to: Cell): MatchState {
  const play = elementInfusion(state, from, to);
  if (play.blocker) {
    throw new Error(`No se puede infundir con lo arrastrado: ${play.blocker}`);
  }
  const { element } = elementAt(state, from) as { element: ElementType };
  const infused = infusedPlant(plantAt(state, to) as Plant, element);
  const plants = state.plants.map((lane, laneIndex) =>
    lane.map((sown, col) => {
      if (laneIndex === from.lane && col === from.col) return null;
      if (laneIndex === to.lane && col === to.col) return infused;
      return sown;
    }),
  );
  return { ...state, balance: state.balance - play.cost, plants };
}

/**
 * Por que no se puede fusionar la planta de una casilla sobre la de otra: fusionar aun no esta desbloqueado (T-007),
 * fuera del tablero, la misma casilla, alguna de las dos sin disparadora (vacia, o con una mina o un muro), o las reglas de
 * `fuseBlocker` (otra variante, mas de 3 canones).
 */
export type FusionBlocker = 'locked' | 'off-board' | 'same-cell' | 'no-plant' | FuseBlocker;

/** Motivo por el que no se puede arrastrar la planta de `from` sobre la de `to` para fusionarlas, o null si se puede. */
export function fusionBlocker(state: MatchState, from: Cell, to: Cell): FusionBlocker | null {
  if (!isUnlocked(state, 'fuse')) return 'locked';
  if (!isOnBoard(from) || !isOnBoard(to)) return 'off-board';
  if (from.lane === to.lane && from.col === to.col) return 'same-cell';
  const source = plantAt(state, from);
  const target = plantAt(state, to);
  if (!source || !target) return 'no-plant';
  return fuseBlocker(source.shooter, target.shooter);
}

/** Casillas sobre las que se puede soltar la planta de `from` para fusionarla. */
export function fusionTargets(state: MatchState, from: Cell): Cell[] {
  const targets: Cell[] = [];
  state.plants.forEach((lane, laneIndex) =>
    lane.forEach((_sown, col) => {
      const to = { lane: laneIndex, col };
      if (fusionBlocker(state, from, to) === null) targets.push(to);
    }),
  );
  return targets;
}

/**
 * Planta que queda al soltar `source` sobre `target`: suma canones y se queda con el nivel mas bajo (`fuse`).
 * La vida es la suma de la vida actual de las dos (D-02); si el balance cambia la vida maxima de las fusionadas,
 * se conserva la proporcion. Conserva la recarga del destino, que no se mueve de su casilla.
 */
export function fusedPlant(source: Plant, target: Plant): Plant {
  const shooter = fuse(source.shooter, target.shooter);
  const maxHp = plantMaxHp(shooter);
  const hpRatio = (source.hp + target.hp) / (plantMaxHp(source.shooter) + plantMaxHp(target.shooter));
  return { kind: 'shooter', shooter, hp: Math.min(maxHp, Math.round(maxHp * hpRatio)), reloadMs: target.reloadMs };
}

/** Fusiona la planta de `from` sobre la de `to`: la primera deja su casilla y la segunda queda con el resultado. Es gratis. */
export function fusePlants(state: MatchState, from: Cell, to: Cell): MatchState {
  const blocker = fusionBlocker(state, from, to);
  if (blocker) {
    throw new Error(`No se puede fusionar: ${blocker}`);
  }
  const result = fusedPlant(plantAt(state, from) as Plant, plantAt(state, to) as Plant);
  const plants = state.plants.map((lane, laneIndex) =>
    lane.map((sown, col) => {
      if (laneIndex === from.lane && col === from.col) return null;
      if (laneIndex === to.lane && col === to.col) return result;
      return sown;
    }),
  );
  return { ...state, plants };
}

/**
 * Por que no se puede subir de nivel una disparadora: aun no esta desbloqueado (T-007), ya esta en el tope de la ronda
 * (T-009) o en el maximo, o el saldo no alcanza.
 */
export type LevelUpBlocker = 'locked' | 'max-level' | 'insufficient-funds';

/** Lo que ofrece el panel de una disparadora seleccionada (T-003): su nivel y lo que cuesta el siguiente. */
export interface LevelUpOffer {
  readonly level: number;
  /** Tope de nivel de la ronda (T-009). */
  readonly cap: number;
  /** En el tope: ronda (desde 0) en la que sube, o null si ya no sube mas. */
  readonly capRaisedAt: number | null;
  /** Lo que se cobra al subir: `levelUpCost`. Null en el tope. */
  readonly cost: number | null;
  /** Por cuanto se multiplica el costo de un canon: sus canones, como al infundir ("x3 = 225"). */
  readonly multiplier: number;
  /** Por que no se puede subir, o null si se puede. */
  readonly blocker: LevelUpBlocker | null;
}

/** Que pasaria al subir de nivel la disparadora de la casilla, o null si en la casilla no hay una. */
export function levelUpOffer(state: MatchState, cell: Cell): LevelUpOffer | null {
  const plant = plantAt(state, cell);
  if (!plant) return null;
  const { shooter } = plant;
  const cap = levelCap(state);
  const capped = shooter.level >= cap;
  const cost = capped ? null : levelUpCost(shooter);
  const blocker = !isUnlocked(state, 'levelUp')
    ? 'locked'
    : cost === null
      ? 'max-level'
      : canAfford(state.balance, cost)
        ? null
        : 'insufficient-funds';
  const capRaisedAt = capped ? levelCapRaisedAfter(state.outbreak, state.round.index, shooter.level) : null;
  return { level: shooter.level, cap, capRaisedAt, cost, multiplier: shooter.cannons, blocker };
}

/**
 * Sube un nivel la disparadora de la casilla y cobra su costo. Conserva su recarga: el nivel nuevo cuenta desde el
 * siguiente disparo. Si su vida maxima crece (un nivel con premio, T-035), conserva la proporcion de vida que tenia,
 * como al infundir. No modifica el estado recibido.
 */
export function levelUpPlant(state: MatchState, cell: Cell): MatchState {
  const offer = levelUpOffer(state, cell);
  if (!offer || offer.blocker || offer.cost === null) {
    throw new Error(`No se puede subir de nivel: ${offer ? offer.blocker : 'no-plant'}`);
  }
  const plant = plantAt(state, cell) as Plant;
  const shooter = levelUp(plant.shooter);
  const leveled: Plant = { ...plant, shooter, hp: (plant.hp * plantMaxHp(shooter)) / plantMaxHp(plant.shooter) };
  const plants = state.plants.map((lane, laneIndex) =>
    laneIndex === cell.lane ? lane.map((sown, col) => (col === cell.col ? leveled : sown)) : lane,
  );
  return { ...state, balance: state.balance - offer.cost, plants };
}

/** Suma moneda al saldo. Solo enteros no negativos: el juego no usa decimales. */
export function earn(state: MatchState, amount: number): MatchState {
  assertWholeAmount(amount);
  return { ...state, balance: state.balance + amount };
}

function assertWholeAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Cantidad de moneda invalida: ${amount}`);
  }
}
