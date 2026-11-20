import { ROUND_PREP, ROUNDS } from '../config/balance';
import { isDefeated, spawnEnemy, type Enemy, type EnemyKind } from './combat';
import type { CardId, MatchState } from './match';
import type { ElementType } from './plants';

/**
 * Rondas con guion (T-007). Cada ronda empieza con una preparacion (se puede sembrar, infundir, fusionar y subir
 * de nivel) y sigue con un ataque que saca sus grupos de enemigos a su hora. Acaba cuando no quedan enemigos por
 * salir ni vivos; tras la ultima, la partida esta ganada. El guion vive en `ROUNDS` (balance.ts): anadir o cambiar
 * una ronda es editar esos datos. La ultima del mundo 1 es el combate contra Creeper (T-008): un grupo mas del guion.
 */

/**
 * Lo que una ronda desbloquea (un concepto nuevo por ronda): sembrar disparadoras, subir de nivel, sembrar o
 * infundir cada elemento, y fusionar. Lo desbloqueado sigue desbloqueado en las rondas siguientes.
 */
export type Feature = 'shooter' | 'levelUp' | 'fireMine' | 'fireInfuse' | 'iceMine' | 'iceInfuse' | 'fuse';

/** Grupo del guion: un enemigo de `kind` por cada carril de `lanes`, todos a la vez. */
export interface RoundGroup {
  /** Milisegundos desde que empieza el ataque. Los grupos de una ronda van en orden. */
  readonly atMs: number;
  readonly kind: EnemyKind;
  readonly lanes: readonly number[];
}

export interface RoundScript {
  /** Lo que se desbloquea al empezar la ronda, ya en su preparacion. */
  readonly unlocks: readonly Feature[];
  /** Aviso de una linea con el concepto nuevo, al empezar la ronda. */
  readonly notice: string;
  /**
   * Velocidad de los enemigos de la ronda respecto a la normal (T-008: Creeper los acelera en las rondas 8 y 9).
   * Sin ella, 1.
   */
  readonly haste?: number;
  /** El jefe se prepara durante esta ronda: se le ve esperando a la derecha (T-008). */
  readonly bossPreparing?: boolean;
  readonly groups: readonly RoundGroup[];
}

/** Preparacion (cuenta atras antes del ataque), ataque, o partida ganada tras la ultima ronda. */
export type RoundPhase = 'prep' | 'attack' | 'won';

export interface RoundState {
  /** Ronda en curso, empezando en 0. */
  readonly index: number;
  readonly phase: RoundPhase;
  /** En la preparacion, lo que falta para el ataque. */
  readonly prepMs: number;
  /** En el ataque, lo que lleva. */
  readonly elapsedMs: number;
  /** Grupos del guion que ya salieron. */
  readonly released: number;
}

/** Lo que paso con las rondas durante un paso. La vista lo anima; el estado ya esta cambiado. */
export type RoundEvent =
  /** Acabo la preparacion (o el jugador la adelanto): empiezan a salir enemigos. */
  | { readonly type: 'attackStarted'; readonly index: number }
  /** No quedan enemigos por salir ni vivos. Tras la ultima ronda le sigue `won`; si no, `roundStarted`. */
  | { readonly type: 'roundCleared'; readonly index: number }
  /** Empieza la preparacion de la ronda `index`, con lo que desbloquea y su aviso. */
  | { readonly type: 'roundStarted'; readonly index: number }
  /** Superada la ultima ronda: partida ganada. */
  | { readonly type: 'won' };

export interface RoundStep {
  readonly state: MatchState;
  /** Enemigos que acaban de salir, para animar su entrada. */
  readonly spawned: readonly Enemy[];
  readonly events: readonly RoundEvent[];
}

/** Rondas del mundo. */
export const ROUND_COUNT = ROUNDS.length;

/** Ronda `index` (desde 0) al empezar: en su preparacion, sin enemigos fuera. */
export function createRound(index = 0): RoundState {
  if (!Number.isInteger(index) || index < 0 || index >= ROUND_COUNT) {
    throw new Error(`Ronda invalida: ${index}`);
  }
  return { index, phase: 'prep', prepMs: ROUND_PREP.durationMs, elapsedMs: 0, released: 0 };
}

export function roundScript(index: number): RoundScript {
  const script = ROUNDS[index];
  if (!script) throw new Error(`Ronda invalida: ${index}`);
  return script;
}

/** Lo desbloqueado al llegar a la ronda `index`: lo suyo y lo de todas las anteriores. */
export function unlockedAt(index: number): ReadonlySet<Feature> {
  return new Set(ROUNDS.slice(0, index + 1).flatMap((round) => round.unlocks));
}

export function isUnlocked(state: MatchState, feature: Feature): boolean {
  return unlockedAt(state.round.index).has(feature);
}

/** Ronda (desde 0) que desbloquea `feature`, o null si ninguna lo hace. */
export function unlockRound(feature: Feature): number | null {
  const index = ROUNDS.findIndex((round) => round.unlocks.includes(feature));
  return index < 0 ? null : index;
}

/** Lo que hay que tener desbloqueado para sembrar la carta en una casilla vacia. */
export function sowFeature(card: CardId): Feature {
  return card === 'shooter' ? 'shooter' : card === 'fire' ? 'fireMine' : 'iceMine';
}

/** Lo que hay que tener desbloqueado para infundir el elemento en una disparadora. */
export function infuseFeature(element: ElementType): Feature {
  return element === 'fire' ? 'fireInfuse' : 'iceInfuse';
}

const CARDS: readonly CardId[] = ['shooter', 'fire', 'ice'];

/** Cartas de la bandeja: las que ya se pueden jugar de alguna forma (sembrar o infundir). Las bloqueadas no se ven. */
export function availableCards(state: MatchState): CardId[] {
  const unlocked = unlockedAt(state.round.index);
  return CARDS.filter((card) => unlocked.has(sowFeature(card)) || (card !== 'shooter' && unlocked.has(infuseFeature(card))));
}

/** Elementos que ya se pueden infundir. */
export function infusableElements(state: MatchState): ElementType[] {
  const unlocked = unlockedAt(state.round.index);
  return (['fire', 'ice'] as const).filter((element) => unlocked.has(infuseFeature(element)));
}

export function isWon(state: MatchState): boolean {
  return state.round.phase === 'won';
}

/** Velocidad de los enemigos que saca la ronda `index` respecto a la normal (1 si no los acelera). */
export function roundHaste(index: number): number {
  return roundScript(index).haste ?? 1;
}

/** ¿Saca la ronda `index` a Creeper? Es la del combate final (T-008). */
export function isBossRound(index: number): boolean {
  return roundScript(index).groups.some((group) => group.kind === 'creeper');
}

/** Ronda (desde 0) del combate contra Creeper, o null si el guion no lo saca. */
export function bossRoundIndex(): number | null {
  const index = ROUNDS.findIndex((round) => round.groups.some((group) => group.kind === 'creeper'));
  return index < 0 ? null : index;
}

/**
 * ¿Se ve a Creeper preparandose a la derecha? En las rondas que lo dicen (`bossPreparing`) y en la del combate hasta
 * que sale. Lo pinta la vista; aqui solo se decide cuando.
 */
export function isBossPreparing(state: MatchState): boolean {
  const { round } = state;
  if (round.phase === 'won') return false;
  const script = roundScript(round.index);
  if (script.bossPreparing) return true;
  if (!isBossRound(round.index)) return false;
  const bossGroup = script.groups.findIndex((group) => group.kind === 'creeper');
  return round.phase === 'prep' || round.released <= bossGroup;
}

/** El jugador adelanta el ataque ("¡Que vengan!"): la preparacion acaba en el siguiente paso. Fuera de ella no hace nada. */
export function startAttack(state: MatchState): MatchState {
  if (state.round.phase !== 'prep' || isDefeated(state)) return state;
  return { ...state, round: { ...state.round, prepMs: 0 } };
}

/**
 * Avanza la ronda `dtMs` milisegundos: cuenta la preparacion, saca los grupos del guion a su hora (en `spawnX`, el
 * agujero de su carril, que pone la vista) y pasa a la siguiente ronda cuando la actual queda despejada. El tiempo
 * que sobra al acabar la preparacion cuenta para el ataque. No modifica el estado recibido. Sin vidas o con la
 * partida ganada no hace nada.
 */
export function stepRound(state: MatchState, dtMs: number, spawnX: number): RoundStep {
  if (isDefeated(state) || isWon(state)) return { state, spawned: [], events: [] };
  const events: RoundEvent[] = [];
  let round = state.round;
  let dt = dtMs;
  if (round.phase === 'prep') {
    const prepMs = round.prepMs - dt;
    if (prepMs > 0) return { state: { ...state, round: { ...round, prepMs } }, spawned: [], events };
    round = { ...round, phase: 'attack', prepMs: 0, elapsedMs: 0 };
    dt = -prepMs;
    events.push({ type: 'attackStarted', index: round.index });
  }

  const { groups } = roundScript(round.index);
  const elapsedMs = round.elapsedMs + dt;
  let released = round.released;
  let current = state;
  const spawned: Enemy[] = [];
  while (released < groups.length && groups[released].atMs <= elapsedMs) {
    const group = groups[released];
    for (const lane of group.lanes) {
      current = spawnEnemy(current, group.kind, lane, spawnX, undefined, roundHaste(round.index));
      spawned.push(current.enemies[current.enemies.length - 1]);
    }
    released++;
  }
  round = { ...round, elapsedMs, released };

  if (released === groups.length && current.enemies.length === 0) {
    events.push({ type: 'roundCleared', index: round.index });
    if (round.index + 1 < ROUND_COUNT) {
      round = createRound(round.index + 1);
      events.push({ type: 'roundStarted', index: round.index });
    } else {
      round = { ...round, phase: 'won' };
      events.push({ type: 'won' });
    }
  }
  return { state: { ...current, round }, spawned, events };
}
