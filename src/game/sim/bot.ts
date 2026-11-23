import { BOARD, COSTS, LIMITS } from '../config/balance';
import type { Cell } from '../core/board';
import { enemyReach, enemyReward, hops, isAirborne, isDefeated, isHidden, isShield, onLawn, poemWarning, stepCombat, type Enemy } from '../core/combat';
import { MINE } from '../config/balance';
import { stepIncome } from '../core/economy';
import { cardPlay, earn, fusionBlocker, fusePlants, levelUpOffer, levelUpPlant, playCard, plantAt, sownAt, type CardId, type MatchState } from '../core/match';
import { outbreakScript, roundCount, type OutbreakId } from '../core/outbreaks';
import { createMatch } from '../core/match';
import { isBossRound, isUnlocked, isWon, roundScript, stepRound } from '../core/rounds';

/**
 * Bots para simular un brote entero (T-026) sin pantalla: juegan con las reglas de `core` como lo haria un jugador que
 * sabe lo que hace, para ajustar el guion y comprobar que el escudo importa. No son parte del juego: los usa
 * `outbreaks.sim.ts` (`npm run sim`).
 *
 * El bot de siempre (el de T-009 y T-010, que fusiona antes de subir de nivel): primero cubre los cinco carriles; luego, en
 * cada uno, monta `columns` columnas de disparadoras de `cannons` canones desde la de mas atras, fusionando las que siembra
 * en la columna de detras, y ahorra para ello; infunde fuego en la primera y hielo en la segunda cuando ya tienen sus
 * canones, y con lo que sobra sube de nivel la mas baja. El que usa escudos, ademas, planta un muro
 * delante de sus disparadoras en cuanto un carril tiene algo que ataca de lejos (escupidor, Minstrel o el jefe), lo
 * repone si se rompe, cubre todos los carriles en cuanto tiene la primera columna montada y, si el jefe anuncia el poema
 * entero, siembra muros donde falten.
 *
 * Brote 3 (T-039): contra lo que salta (el Skipper y Brain), el que usa escudos pone la puerta antes que nada: si uno pisa el
 * cesped en un carril sin escudo por delante de el, ahorra hasta poder ponerla. La puerta es un muro o, con `door:
 * 'shooter'` y la infusion desbloqueada, el escudo infundido en la disparadora mas adelantada. Contra lo que llega oculto (los
 * Lurker), en cuanto tiene una disparadora en cada carril, ahorra para un muro delante de las suyas: se descubren 4 casillas
 * antes y se paran a morderlo, a tiro. Con `mines` llega al combate final sin ningun escudo en el carril de Brain (los que
 * habia se quitan al empezar la ronda) y no pone ninguno ahi: le siembra una mina de hielo donde va a caer (o, si aun le
 * queda descanso, debajo) para descubrirlo (BR-05).
 */
export interface BotStyle {
  readonly name: string;
  /**
   * Cuando usa el escudo (muros): nunca; siempre que hace falta (`always`); o solo cuando el jefe anuncia el poema entero
   * (`poem`: el jugador que llega al jefe sin ningun escudo y reacciona durante el aviso).
   */
  readonly shields: 'never' | 'always' | 'poem';
  /** Columnas de disparadoras que monta, desde la 0; la siguiente es donde siembra las que fusiona. */
  readonly columns: number;
  /** Canones de cada una. */
  readonly cannons: number;
  /**
   * Brote 3 (T-039): la puerta contra lo que salta, un muro (`wall`, sin decirlo) o la disparadora mas adelantada con el
   * escudo infundido (`shooter`), cuando ya se puede infundir.
   */
  readonly door?: 'wall' | 'shooter';
  /**
   * Brote 3 (T-039, BR-05): en el combate final, ningun escudo en el carril de Brain y minas de hielo (o de fuego, si no
   * llega) donde va a caer, para descubrirlo.
   */
  readonly mines?: boolean;
  /**
   * Brote 4 (T-042): dano en area. Donde se junta un grupo de enemigos en tierra (los que muerden un muro, una oleada que
   * llega a la vez por varios carriles), siembra una mina de fuego que pille a `area` o mas, tambien en los carriles de al lado.
   */
  readonly area?: number;
  /** Las minas de `area` antes que montar sus columnas (si no, con lo que sobra tras montarlas). */
  readonly areaEarly?: boolean;
}

/** Carril por el que sale el jefe del brote en su ronda (Brain, por el centro). Null si la ronda no es la del jefe. */
export function bossLane(state: MatchState): number | null {
  if (!isBossRound(state.outbreak, state.round.index)) return null;
  const { boss } = outbreakScript(state.outbreak);
  return roundScript(state.outbreak, state.round.index).groups.find((group) => group.kind === boss)?.lanes[0] ?? null;
}

/** ¿Puede poner un escudo en este carril? Todos, salvo el de Brain en el combate final si juega con minas (BR-05). */
function shieldAllowed(state: MatchState, style: BotStyle, lane: number): boolean {
  return !(style.mines && bossLane(state) === lane);
}

/**
 * Lo que pide un muro delante de las disparadoras: lo que ataca desde lejos, por encima o por delante de las plantas; lo que
 * salta por encima (el Skipper, T-038); y lo que llega oculto (los Lurker, T-038), que se descubre a 4 casillas del muro y se
 * para a morderlo, a tiro de todas.
 */
const RANGED = new Set<Enemy['kind']>(['spitter', 'copycatSpitter', 'minstrel', 'elkCloner', 'lurker', 'lurkerSpitter', 'lurkerArmored', 'skipper']);

const cell = (lane: number, col: number): Cell => ({ lane, col });

/** ¿Tiene un escudo por delante en su carril, antes de llegar a el? Entonces lo que salta se para ahi. */
function doorAhead(state: MatchState, e: Enemy): boolean {
  return state.plants[e.lane].some((sown, col) => isShield(sown) && col + 0.5 + enemyReach(e) <= e.x + 1e-6);
}

/** ¿Usa como puerta la disparadora con escudo (T-039)? Con `door: 'shooter'`, en cuanto se puede infundir el escudo. */
function shooterDoors(state: MatchState, style: BotStyle): boolean {
  return style.door === 'shooter' && isUnlocked(state, 'shieldInfuse');
}

/** ¿Le falta la puerta al carril? Con muros, el de la columna de los muros; con disparadoras con escudo, cualquier escudo. */
function doorMissing(state: MatchState, style: BotStyle, lane: number): boolean {
  if (shooterDoors(state, style)) return !state.plants[lane].some(isShield);
  return !isShield(sownAt(state, cell(lane, style.columns + 1)));
}

/**
 * Pone la puerta del carril `lane` por delante de `x` (el que salta, o `Infinity` si es de antemano): con `door: 'shooter'`,
 * el escudo infundido en la disparadora sin elemento mas adelantada que ya tiene sus canones; si no, o si es urgente y no le
 * llega para infundirla, un muro en la columna de los muros o, si es urgente y ya la paso, en la primera libre por delante.
 * Devuelve el estado nuevo, `'wait'` si no le llega la moneda o null si no hay donde.
 */
function placeDoor(state: MatchState, style: BotStyle, lane: number, x: number, reach: number, urgent: boolean): MatchState | 'wait' | null {
  const ahead = (col: number) => col + 0.5 + reach <= x + 1e-6;
  if (shooterDoors(state, style)) {
    for (let col = BOARD.columns - 1; col >= 0; col--) {
      const plant = plantAt(state, cell(lane, col));
      if (!plant || plant.shooter.element || plant.shooter.cannons < style.cannons || !ahead(col)) continue;
      if (canPlay(state, 'shield', cell(lane, col))) return playCard(state, 'shield', cell(lane, col));
      if (!urgent) return 'wait';
      break;
    }
  }
  const wallCol = style.columns + 1;
  const cols = urgent ? [wallCol, ...Array.from({ length: BOARD.columns }, (_, i) => BOARD.columns - 1 - i)] : [wallCol];
  const col = cols.find((c) => ahead(c) && !sownAt(state, cell(lane, c)));
  if (col === undefined) return null;
  return canPlay(state, 'shield', cell(lane, col)) ? playCard(state, 'shield', cell(lane, col)) : 'wait';
}

/**
 * La puerta contra lo que salta (T-039): para cada Skipper o Brain que pisa el cesped sin escudo por delante, la pone ya
 * (`placeDoor`, urgente). Si no le llega la moneda, ahorra (`'wait'`).
 */
function doorMove(style: BotStyle): Move {
  return (state) => {
    if (style.shields !== 'always') return null;
    for (const e of state.enemies) {
      if (!hops(e.kind) || !onLawn(e) || doorAhead(state, e) || !shieldAllowed(state, style, e.lane)) continue;
      const next = placeDoor(state, style, e.lane, e.x, enemyReach(e), true);
      if (next) return next;
    }
    return null;
  };
}

/**
 * Minas contra Brain (T-039, BR-05): oculto, en el aire, una de hielo en la casilla donde va a caer; en tierra, si le queda
 * mas descanso que la cuenta de la mina y no tiene ninguna cerca, debajo de el. De fuego si no llega para la de hielo.
 */
function brainMines(style: BotStyle): Move {
  return (state) => {
    if (!style.mines) return null;
    const brain = state.enemies.find((e) => e.kind === 'brain');
    if (!brain || !onLawn(brain) || !brain.hop || !isHidden(brain)) return null;
    const x = isAirborne(brain) ? brain.hop.to : brain.x;
    if (!isAirborne(brain) && brain.hop.ms < MINE.countdownMs + 200) return null;
    const col = Math.floor(x);
    if (col < 0 || col >= BOARD.columns) return null;
    const near = state.plants[brain.lane].some((sown, c) => sown?.kind === 'mine' && Math.abs(c + 0.5 - x) <= MINE.detectRadius);
    if (near || sownAt(state, cell(brain.lane, col))) return null;
    for (const card of ['ice', 'fire'] as const) {
      if (canPlay(state, card, cell(brain.lane, col))) return playCard(state, card, cell(brain.lane, col));
    }
    return 'wait';
  };
}

/**
 * Dano en area (T-042): la casilla vacia delante de los muros donde una mina de fuego, al explotar dentro de
 * `MINE.countdownMs`, alcanzaria a mas enemigos en tierra (en su carril y en los de al lado), contando lo que avanzan mientras
 * tanto. La siembra si pilla a `style.area` o mas, alguien la arma ya y no hay otra mina de fuego cerca, con lo que le sobra:
 * no ahorra para ella y guarda para reponer un muro.
 */
function areaMines(style: BotStyle): Move {
  return (state) => {
    if (!style.area || !isUnlocked(state, 'fireMine')) return null;
    const targets = state.enemies.filter((e) => e.hp > 0 && onLawn(e) && !isAirborne(e) && !isHidden(e));
    if (targets.length < style.area) return null;
    /** Donde estara dentro de la cuenta de la mina: quieto si muerde o ataca; si no, lo que anda. */
    const ahead = (e: Enemy) => (e.attackMs !== null ? e.x : e.x - (0.25 * e.haste * MINE.countdownMs) / 1000);
    let best: { at: Cell; hits: number } | null = null;
    // Solo delante de los muros: detras estan sus columnas y la de los muros, que tiene que poder reponer.
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      for (let col = style.columns + 2; col < BOARD.columns; col++) {
        const at = cell(lane, col);
        if (sownAt(state, at)) continue;
        const near = (e: Enemy, x: number) => Math.hypot(x - (col + 0.5), e.lane - lane);
        const hits = targets.filter((e) => near(e, ahead(e)) <= MINE.blastRadius - 0.2).length;
        if (hits < style.area || (best && hits <= best.hits)) continue;
        // Que se arme ya: alguien llega a su radio de deteccion dentro de la cuenta.
        if (!targets.some((e) => near(e, ahead(e)) <= MINE.detectRadius)) continue;
        const counting = state.plants.some((row, l) => row.some((sown, c) => sown?.kind === 'mine' && sown.element === 'fire' && Math.hypot(c - col, l - lane) <= 1.5));
        if (!counting) best = { at, hits };
      }
    }
    if (!best) return null;
    // Con lo que sobra: no ahorra para ella y guarda para reponer un muro.
    if (style.shields === 'always' && state.balance < COSTS.fire + COSTS.shield) return null;
    return canPlay(state, 'fire', best.at) ? playCard(state, 'fire', best.at) : null;
  };
}

function canPlay(state: MatchState, card: CardId, at: Cell): boolean {
  return cardPlay(state, card, at).blocker === null;
}

/** Carriles ordenados por peligro: primero los que tienen enemigos mas adelantados. */
function lanesByThreat(state: MatchState): number[] {
  const nearest = (lane: number) => Math.min(Infinity, ...state.enemies.filter((e) => e.lane === lane).map((e) => e.x));
  return Array.from({ length: BOARD.lanes }, (_, lane) => lane).sort((a, b) => nearest(a) - nearest(b));
}

/**
 * Una accion del bot: el estado nuevo; `'wait'` si quiere hacer algo pero aun no le alcanza (ahorra: no sigue con lo de
 * menos prioridad); o null si no tiene nada que hacer.
 */
type Move = (state: MatchState) => MatchState | 'wait' | null;

function wallMoves(style: BotStyle): Move[] {
  if (style.shields === 'never') return [];
  /** La puerta de antemano, si falta y le llega: si no, sigue con lo demas (no ahorra para ella). */
  const sowWall = (state: MatchState, lane: number) => {
    if (!shieldAllowed(state, style, lane) || !doorMissing(state, style, lane)) return null;
    const next = placeDoor(state, style, lane, Infinity, 0, false);
    return next === 'wait' ? null : next;
  };
  return [
    // El jefe anuncia el poema entero: muro donde falte.
    (state) => {
      if (!state.enemies.some((e) => poemWarning(e) !== null)) return null;
      for (const lane of lanesByThreat(state)) {
        const next = sowWall(state, lane);
        if (next) return next;
      }
      return null;
    },
    // Un carril con algo que ataca de lejos.
    (state) => {
      if (style.shields !== 'always') return null;
      for (const lane of lanesByThreat(state)) {
        if (!state.enemies.some((e) => e.lane === lane && RANGED.has(e.kind) && onLawn(e))) continue;
        const next = sowWall(state, lane);
        if (next) return next;
      }
      return null;
    },
  ];
}

/** Puerta (muro o disparadora con escudo) en todos los carriles en cuanto la primera columna esta montada. */
function allWalls(style: BotStyle): Move {
  return (state) => {
    if (style.shields !== 'always') return null;
    const ready = Array.from({ length: BOARD.lanes }, (_, lane) => (plantAt(state, cell(lane, 0))?.shooter.cannons ?? 0) >= style.cannons);
    if (!ready.every(Boolean) && !isBossRound(state.outbreak, state.round.index)) return null;
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      if (!doorMissing(state, style, lane) || !shieldAllowed(state, style, lane)) continue;
      const next = placeDoor(state, style, lane, Infinity, 0, false);
      if (next && next !== 'wait') return next;
    }
    return null;
  };
}

/**
 * Muro contra lo que llega oculto (T-039): con la primera columna montada (antes no hay moneda para muros), si una tropa
 * oculta pisa el cesped en un carril sin escudo, un muro en la columna de los muros; si no llega, ahorra (`'wait'`).
 */
function hiddenDoor(style: BotStyle): Move {
  return (state) => {
    if (style.shields !== 'always') return null;
    const wallCol = style.columns + 1;
    const ready = Array.from({ length: BOARD.lanes }, (_, lane) => (plantAt(state, cell(lane, 0))?.shooter.cannons ?? 0) >= style.cannons);
    if (!ready.every(Boolean)) return null;
    for (const lane of lanesByThreat(state)) {
      if (!shieldAllowed(state, style, lane)) continue;
      const hidden = state.enemies.some((e) => e.lane === lane && isHidden(e) && !hops(e.kind) && onLawn(e) && e.x > wallCol + 1.5);
      if (!hidden || state.plants[lane].some(isShield)) continue;
      const next = placeDoor(state, style, lane, Infinity, 0, false);
      if (next) return next;
    }
    return null;
  };
}

/** Una disparadora en la columna 0 de cada carril, los mas peligrosos primero. */
const cover: Move = (state) => {
  for (const lane of lanesByThreat(state)) {
    const at = cell(lane, 0);
    if (sownAt(state, at)) continue;
    return canPlay(state, 'shooter', at) ? playCard(state, 'shooter', at) : 'wait';
  }
  return null;
};

/**
 * Monta las columnas: la primera planta a la que le faltan canones (columna a columna) recibe la de la columna de
 * fusionar, que se siembra si hace falta. Sin fusionar desbloqueado, llena las columnas con disparadoras de un canon.
 */
function build(style: BotStyle): Move {
  return (state) => {
    const feeder = style.columns;
    const fuse = isUnlocked(state, 'fuse');
    for (let col = 0; col < (fuse ? style.columns : style.columns + 1); col++) {
      for (const lane of lanesByThreat(state)) {
        const at = cell(lane, col);
        const plant = plantAt(state, at);
        if (!plant) {
          if (sownAt(state, at)) continue;
          return canPlay(state, 'shooter', at) ? playCard(state, 'shooter', at) : 'wait';
        }
        if (!fuse || plant.shooter.cannons >= Math.min(style.cannons, LIMITS.maxCannons)) continue;
        const from = cell(lane, feeder);
        if (plantAt(state, from)) {
          if (fusionBlocker(state, from, at) === null) return fusePlants(state, from, at);
          continue;
        }
        if (sownAt(state, from)) continue;
        return canPlay(state, 'shooter', from) ? playCard(state, 'shooter', from) : 'wait';
      }
    }
    return null;
  };
}

/** Fuego en la primera columna y hielo en la segunda, cuando ya tienen sus canones. */
function infuseFront(style: BotStyle): Move {
  return (state) => {
  const plan: Array<[number, CardId]> = [
    [0, 'fire'],
    [1, 'ice'],
  ];
  for (const [col, card] of plan) {
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      const at = cell(lane, col);
      const plant = plantAt(state, at);
      if (!plant || plant.shooter.element || plant.shooter.cannons < style.cannons) continue;
      if (cardPlay(state, card, at).blocker === 'locked') continue;
      return canPlay(state, card, at) ? playCard(state, card, at) : 'wait';
    }
  }
  return null;
  };
}

/** Sube la disparadora de nivel mas bajo (de las de delante si empatan), dejando `reserve` en la caja. */
function levelLowest(reserve: number): Move {
  return (state) => {
    let best: { at: Cell; level: number; cost: number } | null = null;
    state.plants.forEach((lane, laneIndex) =>
      lane.forEach((sown, col) => {
        if (sown?.kind !== 'shooter') return;
        const at = cell(laneIndex, col);
        const offer = levelUpOffer(state, at);
        if (!offer || offer.cost === null || offer.blocker === 'locked' || offer.blocker === 'max-level') return;
        if (!best || offer.level < best.level || (offer.level === best.level && offer.cost < best.cost)) best = { at, level: offer.level, cost: offer.cost };
      }),
    );
    const pick = best as { at: Cell; level: number; cost: number } | null;
    if (!pick || state.balance - pick.cost < reserve) return null;
    return levelUpPlant(state, pick.at);
  };
}

/** Lo que hace el bot en un momento: hasta unas pocas acciones, en orden de prioridad. */
export function botAct(state: MatchState, style: BotStyle): MatchState {
  const shieldsReady = style.shields !== 'never' && isUnlocked(state, 'shield');
  // El que reacciona tarde guarda en el combate final para los muros que sembrara al oir el poema: tiene la moneda, pero
  // ningun escudo puesto.
  const saving = style.shields === 'poem' && shieldsReady && isBossRound(state.outbreak, state.round.index) ? 5 * 150 : 0;
  // El de las minas guarda en el combate contra Brain para unas cuantas (T-039).
  const mining = style.mines && isBossRound(state.outbreak, state.round.index) ? 4 * 75 : 0;
  const reserve = style.shields === 'always' && shieldsReady ? 150 : saving + mining;
  const moves: Move[] = [
    ...(shieldsReady ? [doorMove(style), ...wallMoves(style)] : []),
    brainMines(style),
    cover,
    ...(style.areaEarly ? [areaMines(style)] : []),
    ...(shieldsReady ? [hiddenDoor(style)] : []),
    build(style),
    infuseFront(style),
    ...(shieldsReady ? [allWalls(style)] : []),
    ...(style.areaEarly ? [] : [areaMines(style)]),
    levelLowest(reserve),
  ];
  let current = state;
  for (let actions = 0; actions < 6; actions++) {
    let next: MatchState | 'wait' | null = null;
    for (const move of moves) {
      next = move(current);
      if (next) break;
    }
    if (!next || next === 'wait') break;
    current = next;
  }
  return current;
}

/** Quita los escudos (muros y bloques de hielo) del carril `lane`. */
export function clearShields(state: MatchState, lane: number | null): MatchState {
  if (lane === null) return state;
  return { ...state, plants: state.plants.map((row, l) => (l === lane ? row.map((sown) => (sown && sown.kind !== 'shooter' && isShield(sown) ? null : sown)) : row)) };
}

/** Lo que paso en una partida simulada. */
export interface SimResult {
  readonly outcome: 'won' | 'lost' | 'timeout';
  /** Ronda en la que acabo, desde 1. */
  readonly round: number;
  readonly lives: number;
  /** Tiempo de juego, con las preparaciones enteras. */
  readonly timeMs: number;
  /** Lo que duro el ataque de la ronda del jefe, si se llego a ella. */
  readonly bossFightMs: number | null;
  /** Lo que duro el ataque de cada ronda jugada, en orden. */
  readonly attackMs: readonly number[];
}

/** Aleatorio con semilla (mulberry32): cada partida se puede repetir. */
export function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Agujero por el que salen los enemigos (`SCENERY.holeX` de la vista, sin importarla). */
const HOLE_X = BOARD.columns + 0.75;
const STEP_MS = 50;
const THINK_MS = 250;
const LIMIT_MS = 60 * 60 * 1000;

/**
 * Juega el brote `outbreak` entero con el bot `style`, con las preparaciones enteras. `baseLevel`, el nivel con el que
 * nacen sus disparadoras (T-023); sin el, el 1.
 */
export function simulate(outbreak: OutbreakId, style: BotStyle, seed: number, baseLevel = 1): SimResult {
  const random = seeded(seed);
  let state = createMatch(undefined, 0, outbreak, false, undefined, baseLevel);
  let time = 0;
  let thought = -Infinity;
  let bossStart: number | null = null;
  let bossFightMs: number | null = null;
  let attackStart = 0;
  const attackMs: number[] = [];
  const bossRound = roundCount(outbreak) - 1;
  while (!isDefeated(state) && !isWon(state) && time < LIMIT_MS) {
    if (time - thought >= THINK_MS) {
      state = botAct(state, style);
      thought = time;
    }
    const round = stepRound(state, STEP_MS, HOLE_X, random);
    state = round.state;
    // BR-05: el de las minas llega al combate final sin escudos en el carril de Brain.
    if (style.mines && round.events.some((event) => event.type === 'roundStarted' && event.index === bossRound)) state = clearShields(state, bossLane(state));
    for (const event of round.events) {
      if (event.type === 'attackStarted') attackStart = time;
      if (event.type === 'roundCleared') attackMs.push(time - attackStart);
      if (event.type === 'attackStarted' && event.index === bossRound) bossStart = time;
      if (event.type === 'won' && bossStart !== null) bossFightMs = time - bossStart;
    }
    state = stepIncome(state, STEP_MS).state;
    const combat = stepCombat(state, STEP_MS, random);
    state = combat.state;
    for (const event of combat.events) if (event.type === 'enemyKilled') state = earn(state, enemyReward(event));
    time += STEP_MS;
  }
  if (bossStart !== null && bossFightMs === null && isDefeated(state)) bossFightMs = time - bossStart;
  const outcome = isWon(state) ? 'won' : isDefeated(state) ? 'lost' : 'timeout';
  return { outcome, round: state.round.index + 1, lives: state.lives, timeMs: time, bossFightMs, attackMs };
}
