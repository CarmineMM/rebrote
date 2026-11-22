import { BOARD, LIMITS } from '../config/balance';
import type { Cell } from '../core/board';
import { enemyReward, isDefeated, isShield, onLawn, poemWarning, stepCombat, type Enemy } from '../core/combat';
import { stepIncome } from '../core/economy';
import { cardPlay, earn, fusionBlocker, fusePlants, levelUpOffer, levelUpPlant, playCard, plantAt, sownAt, type CardId, type MatchState } from '../core/match';
import { roundCount, type OutbreakId } from '../core/outbreaks';
import { createMatch } from '../core/match';
import { isBossRound, isUnlocked, isWon, stepRound } from '../core/rounds';

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
}

/** Lo que ataca desde lejos, por encima o por delante de las plantas: lo que para un muro. */
const RANGED = new Set<Enemy['kind']>(['spitter', 'copycatSpitter', 'minstrel', 'elkCloner']);

const cell = (lane: number, col: number): Cell => ({ lane, col });

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
  const wallCol = style.columns + 1;
  const missing = (state: MatchState, lane: number) => !isShield(sownAt(state, cell(lane, wallCol)));
  const sowWall = (state: MatchState, lane: number) => (missing(state, lane) && canPlay(state, 'shield', cell(lane, wallCol)) ? playCard(state, 'shield', cell(lane, wallCol)) : null);
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

/** Muro en todos los carriles en cuanto la primera columna esta montada. */
function allWalls(style: BotStyle): Move {
  return (state) => {
    if (style.shields !== 'always') return null;
    const wallCol = style.columns + 1;
    const ready = Array.from({ length: BOARD.lanes }, (_, lane) => (plantAt(state, cell(lane, 0))?.shooter.cannons ?? 0) >= style.cannons);
    if (!ready.every(Boolean) && !isBossRound(state.outbreak, state.round.index)) return null;
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      if (isShield(sownAt(state, cell(lane, wallCol)))) continue;
      if (canPlay(state, 'shield', cell(lane, wallCol))) return playCard(state, 'shield', cell(lane, wallCol));
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
  const reserve = style.shields === 'always' && shieldsReady ? 150 : saving;
  const moves: Move[] = [...(shieldsReady ? wallMoves(style) : []), cover, build(style), infuseFront(style), ...(shieldsReady ? [allWalls(style)] : []), levelLowest(reserve)];
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
