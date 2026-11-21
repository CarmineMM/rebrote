import { LIMITS, ROUND_PREP } from '../config/balance';
import { isDefeated, rollEnemyLevel, spawnEnemy, type Enemy, type EnemyKind } from './combat';
import type { CardId, MatchState } from './match';
import { outbreakScript, outbreaksBefore, roundCount, type OutbreakId } from './outbreaks';
import type { ElementType } from './plants';

/**
 * Rondas con guion (T-007). Cada ronda empieza con una preparacion (se puede sembrar, infundir, fusionar y subir
 * de nivel) y sigue con un ataque que saca sus grupos de enemigos a su hora. Acaba cuando no quedan enemigos por
 * salir ni vivos; tras la ultima, la partida esta ganada. Cada brote tiene su guion (T-018, `OUTBREAKS` de balance.ts):
 * anadir o cambiar una ronda es editar esos datos. La ultima de cada brote es el combate contra su jefe (T-008: Creeper
 * en el brote 1), un grupo mas del guion.
 */

/**
 * Lo que una ronda desbloquea (un concepto nuevo por ronda): sembrar disparadoras, subir de nivel, sembrar o
 * infundir cada elemento, y fusionar. Lo desbloqueado sigue desbloqueado en las rondas siguientes y en los brotes
 * siguientes (T-018, B-01).
 */
export type Feature = 'shooter' | 'levelUp' | 'fireMine' | 'fireInfuse' | 'iceMine' | 'iceInfuse' | 'fuse';

/** Gritos de Creeper (T-009). El texto de cada uno, en cada idioma, esta en `creeper.shouts` de `src/i18n/` (T-011). */
export type CreeperShout = 'escort';

/**
 * Quien presenta lo nuevo en el aviso "¡YA LO TIENES!" (T-032): un personaje de la historia (`CharacterId` de
 * `view/characters/design.ts`). La regla de la historia: lo del brote 1 lo da Boxer (VT-02); las plantas y piezas nuevas
 * de los brotes siguientes las crea Patty (VT-03). Es un dato del guion; la vista pinta su retrato y su frase.
 */
export type Presenter = 'boxer' | 'patty';

/** Grupo del guion: un enemigo de `kind` por cada carril de `lanes`, todos a la vez. */
export interface RoundGroup {
  /** Milisegundos desde que empieza el ataque. Los grupos de una ronda van en orden. */
  readonly atMs: number;
  readonly kind: EnemyKind;
  readonly lanes: readonly number[];
  /** Nivel fijo de sus enemigos (T-009: la escolta de Creeper). Sin el, al azar con los pesos de la ronda. */
  readonly level?: number;
  /** Velocidad de sus enemigos respecto a la normal, en vez de la de la ronda (T-009: la escolta va al paso de Creeper). */
  readonly haste?: number;
  /** Lo que grita Creeper al sacar el grupo (T-009: "¡ADELANTE!" al mandar a su escolta). */
  readonly shout?: CreeperShout;
}

/** Pesos de cada nivel de enemigo (`ENEMY_LEVELS.tables`). */
export type LevelTable = Readonly<Record<number, number>>;

export interface RoundScript {
  /**
   * Lo que se desbloquea al empezar la ronda, ya en su preparacion. Lo que ya llego desbloqueado de antes (de un brote
   * anterior, B-01) no cuenta como nuevo: ni avisa ni trae su tour.
   */
  readonly unlocks: readonly Feature[];
  /**
   * Hasta que nivel se pueden subir las disparadoras desde esta ronda (T-010: 5 desde la 2 del brote 1). Sigue el de la
   * ultima ronda que lo dijo, tambien de un brote anterior (T-018, B-01); antes de ninguna, `LIMITS.maxLevel` (pero subir
   * de nivel aun no esta desbloqueado).
   */
  readonly levelCap?: number;
  /** Con que pesos sale cada nivel de enemigo (T-009). Sin tabla, todos de nivel 1. */
  readonly levels?: LevelTable;
  /**
   * Lo que desbloquea no sale en el aviso que hay que aceptar (T-010, A-01: la disparadora de la ronda 1 se da por
   * sabida). El aviso de una linea sale igual.
   */
  readonly quiet?: boolean;
  /**
   * Velocidad de los enemigos de la ronda respecto a la normal (T-008: Creeper los acelera en las rondas 8 y 9).
   * Sin ella, 1.
   */
  readonly haste?: number;
  /** El jefe se prepara durante esta ronda: se le ve esperando a la derecha (T-008). */
  readonly bossPreparing?: boolean;
  /**
   * Quien presenta lo que desbloquea la ronda (T-032), en vez del que toca (`unlockPresenter`): por ejemplo, Boxer en una
   * ronda del brote 2 que trae algo que no es una planta ni una pieza que haya creado Patty.
   */
  readonly presenter?: Presenter;
  readonly groups: readonly RoundGroup[];
}

/** Preparacion (cuenta atras antes del ataque), ataque, o partida ganada tras la ultima ronda del brote. */
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
  /** No quedan enemigos por salir ni vivos. Tras la ultima ronda del brote le sigue `won`; si no, `roundStarted`. */
  | { readonly type: 'roundCleared'; readonly index: number }
  /** Empieza la preparacion de la ronda `index`, con lo que desbloquea y su aviso. */
  | { readonly type: 'roundStarted'; readonly index: number }
  /** Superada la ultima ronda del brote (vencido su jefe): partida ganada. */
  | { readonly type: 'won' }
  /** Creeper grita al sacar un grupo (T-009: manda a su escolta). Lo pinta la vista. */
  | { readonly type: 'shout'; readonly shout: CreeperShout };

export interface RoundStep {
  readonly state: MatchState;
  /** Enemigos que acaban de salir, para animar su entrada. */
  readonly spawned: readonly Enemy[];
  readonly events: readonly RoundEvent[];
}

/** Ronda `index` (desde 0) del brote `outbreak` al empezar: en su preparacion, sin enemigos fuera. */
export function createRound(outbreak: OutbreakId, index = 0): RoundState {
  if (!Number.isInteger(index) || index < 0 || index >= roundCount(outbreak)) {
    throw new Error(`Ronda invalida: ${index} del brote ${outbreak}`);
  }
  return { index, phase: 'prep', prepMs: ROUND_PREP.durationMs, elapsedMs: 0, released: 0 };
}

export function roundScript(outbreak: OutbreakId, index: number): RoundScript {
  const script = outbreakScript(outbreak).rounds[index];
  if (!script) throw new Error(`Ronda invalida: ${index} del brote ${outbreak}`);
  return script;
}

/**
 * Rondas por las que ya paso quien llega a la ronda `index` del brote: las de los brotes anteriores (B-01: lo suyo
 * llega desbloqueado) y las de este hasta la anterior a `index`.
 */
function roundsBefore(outbreak: OutbreakId, index: number): RoundScript[] {
  return [...outbreaksBefore(outbreak).flatMap((earlier) => earlier.rounds), ...outbreakScript(outbreak).rounds.slice(0, Math.max(0, index))];
}

/** Las rondas de antes y la propia `index`. */
function roundsUpTo(outbreak: OutbreakId, index: number): RoundScript[] {
  return [...roundsBefore(outbreak, index), roundScript(outbreak, index)];
}

/**
 * Lo desbloqueado al llegar a la ronda `index` del brote: lo suyo, lo de las anteriores y lo de los brotes anteriores
 * (T-018, B-01).
 */
export function unlockedAt(outbreak: OutbreakId, index: number): ReadonlySet<Feature> {
  return new Set(roundsUpTo(outbreak, index).flatMap((round) => round.unlocks));
}

export function isUnlocked(state: MatchState, feature: Feature): boolean {
  return unlockedAt(state.outbreak, state.round.index).has(feature);
}

/** Lo que la ronda `index` desbloquea por primera vez: lo que trae su guion y no llego ya desbloqueado de antes. */
export function newFeaturesAt(outbreak: OutbreakId, index: number): Feature[] {
  const before = new Set(roundsBefore(outbreak, index).flatMap((round) => round.unlocks));
  return [...new Set(roundScript(outbreak, index).unlocks)].filter((feature) => !before.has(feature));
}

/** El ultimo tope de nivel que pusieron estas rondas, o undefined si ninguna lo puso. */
function lastLevelCap(rounds: readonly RoundScript[]): number | undefined {
  let cap: number | undefined;
  for (const round of rounds) {
    if (round.levelCap !== undefined) cap = round.levelCap;
  }
  return cap;
}

/**
 * Tope de nivel de las disparadoras en la ronda `index` del brote (T-009): el de la ultima ronda hasta ella que lo puso
 * (`levelCap`), tambien de un brote anterior (B-01), sin pasar de `LIMITS.maxLevel`.
 */
export function levelCapAt(outbreak: OutbreakId, index: number): number {
  return Math.min(lastLevelCap(roundsUpTo(outbreak, index)) ?? LIMITS.maxLevel, LIMITS.maxLevel);
}

/** Tope de nivel de las disparadoras en la ronda en curso. */
export function levelCap(state: MatchState): number {
  return levelCapAt(state.outbreak, state.round.index);
}

/** Ronda (desde 0) del mismo brote en la que el tope de nivel sube por encima de `level`, o null si ninguna lo sube. */
export function levelCapRaisedAfter(outbreak: OutbreakId, index: number, level: number): number | null {
  for (let i = index + 1; i < roundCount(outbreak); i++) {
    if (levelCapAt(outbreak, i) > level) return i;
  }
  return null;
}

/**
 * Lo nuevo de la ronda `index` para el aviso que hay que aceptar (T-009, P-02): lo que desbloquea por primera vez y, si
 * cambia, el tope de nivel. En la ronda que desbloquea subir de nivel, el tope va con ello. Una ronda `quiet` (la 1 del
 * brote 1, T-010) no avisa.
 */
export type Unlock = { readonly kind: 'feature'; readonly feature: Feature } | { readonly kind: 'levelCap'; readonly level: number };

export function roundUnlocks(outbreak: OutbreakId, index: number): Unlock[] {
  const script = roundScript(outbreak, index);
  if (script.quiet) return [];
  const unlocks: Unlock[] = newFeaturesAt(outbreak, index).map((feature) => ({ kind: 'feature', feature }));
  if (script.levelCap !== undefined && lastLevelCap(roundsBefore(outbreak, index)) !== script.levelCap) {
    unlocks.push({ kind: 'levelCap', level: script.levelCap });
  }
  return unlocks;
}

/**
 * Quien presenta lo nuevo de la ronda `index` del brote en el aviso que hay que aceptar (T-032): el que diga la ronda; si
 * no, lo que trae por primera vez (una planta o una pieza) lo presenta el de su brote o, si el brote no lo dice, el que
 * pide la historia: Boxer en el primer brote (VT-02) y Patty, que lo crea, en los demas (VT-03). Lo que no es nada nuevo
 * que sembrar (un tope de nivel mas alto) lo cuenta Boxer.
 */
export function unlockPresenter(outbreak: OutbreakId, index: number): Presenter {
  const own = roundScript(outbreak, index).presenter;
  if (own) return own;
  if (newFeaturesAt(outbreak, index).length === 0) return 'boxer';
  return outbreakScript(outbreak).presenter ?? (outbreaksBefore(outbreak).length === 0 ? 'boxer' : 'patty');
}

/** Ronda (desde 0) del brote que desbloquea `feature`, o null si ninguna de las suyas lo hace. */
export function unlockRound(outbreak: OutbreakId, feature: Feature): number | null {
  const index = outbreakScript(outbreak).rounds.findIndex((round) => round.unlocks.includes(feature));
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
  const unlocked = unlockedAt(state.outbreak, state.round.index);
  return CARDS.filter((card) => unlocked.has(sowFeature(card)) || (card !== 'shooter' && unlocked.has(infuseFeature(card))));
}

/** Elementos que ya se pueden infundir. */
export function infusableElements(state: MatchState): ElementType[] {
  const unlocked = unlockedAt(state.outbreak, state.round.index);
  return (['fire', 'ice'] as const).filter((element) => unlocked.has(infuseFeature(element)));
}

export function isWon(state: MatchState): boolean {
  return state.round.phase === 'won';
}

/** Velocidad de los enemigos que saca la ronda `index` respecto a la normal (1 si no los acelera). */
export function roundHaste(outbreak: OutbreakId, index: number): number {
  return roundScript(outbreak, index).haste ?? 1;
}

/** Grupo del guion de la ronda que saca al jefe del brote, o -1 si no lo saca. */
function bossGroupIndex(outbreak: OutbreakId, script: RoundScript): number {
  const { boss } = outbreakScript(outbreak);
  return script.groups.findIndex((group) => group.kind === boss);
}

/** ¿Saca la ronda `index` al jefe del brote? Es la del combate final (T-008). */
export function isBossRound(outbreak: OutbreakId, index: number): boolean {
  return bossGroupIndex(outbreak, roundScript(outbreak, index)) >= 0;
}

/** Ronda (desde 0) del combate contra el jefe del brote, o null si su guion no lo saca. */
export function bossRoundIndex(outbreak: OutbreakId): number | null {
  const index = outbreakScript(outbreak).rounds.findIndex((round) => bossGroupIndex(outbreak, round) >= 0);
  return index < 0 ? null : index;
}

/**
 * Primera ronda (desde 0) en la que se ve al jefe del brote: la primera que lo pone a prepararse (`bossPreparing`) o, si
 * ninguna lo hace, la de su combate. Null si su guion no lo saca. En ella cuenta Boxer que hizo el virus de verdad (T-032,
 * VT-04).
 */
export function bossFirstSeenRound(outbreak: OutbreakId): number | null {
  const index = outbreakScript(outbreak).rounds.findIndex((round) => round.bossPreparing);
  return index >= 0 ? index : bossRoundIndex(outbreak);
}

/**
 * ¿Se ve al jefe preparandose a la derecha? En las rondas que lo dicen (`bossPreparing`) y en la del combate hasta
 * que sale. Lo pinta la vista; aqui solo se decide cuando.
 */
export function isBossPreparing(state: MatchState): boolean {
  const { round, outbreak } = state;
  if (round.phase === 'won') return false;
  const script = roundScript(outbreak, round.index);
  if (script.bossPreparing) return true;
  const bossGroup = bossGroupIndex(outbreak, script);
  if (bossGroup < 0) return false;
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
 * partida ganada no hace nada. `random` (en [0, 1), como Math.random) elige el nivel de cada enemigo (T-009).
 */
export function stepRound(state: MatchState, dtMs: number, spawnX: number, random: () => number = Math.random): RoundStep {
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

  const { outbreak } = state;
  const { groups, levels } = roundScript(outbreak, round.index);
  const elapsedMs = round.elapsedMs + dt;
  let released = round.released;
  let current = state;
  const spawned: Enemy[] = [];
  while (released < groups.length && groups[released].atMs <= elapsedMs) {
    const group = groups[released];
    if (group.shout) events.push({ type: 'shout', shout: group.shout });
    for (const lane of group.lanes) {
      const level = group.level ?? rollEnemyLevel(levels, random);
      current = spawnEnemy(current, group.kind, lane, spawnX, undefined, group.haste ?? roundHaste(outbreak, round.index), level);
      spawned.push(current.enemies[current.enemies.length - 1]);
    }
    released++;
  }
  round = { ...round, elapsedMs, released };

  if (released === groups.length && current.enemies.length === 0) {
    events.push({ type: 'roundCleared', index: round.index });
    if (round.index + 1 < roundCount(outbreak)) {
      round = createRound(outbreak, round.index + 1);
      events.push({ type: 'roundStarted', index: round.index });
    } else {
      round = { ...round, phase: 'won' };
      events.push({ type: 'won' });
    }
  }
  return { state: { ...current, round }, spawned, events };
}
