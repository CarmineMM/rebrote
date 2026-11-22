import { BOARD, ENEMIES, LIMITS, LIVES } from './config/balance';
import type { Burn, Enemy, Jump, Recital, Slow } from './core/combat';
import type { MatchState, Sown } from './core/match';
import { isOutbreakId, roundCount, type OutbreakId } from './core/outbreaks';
import { isBaseLevel } from './core/baseLevel';
import { chargesAt, isPowerId, isPowerLevel } from './core/powers';
import { isFeature } from './core/rounds';
import type { UnlockInfo } from './EventBus';
import { profiles } from './profiles';
import type { SaveStore } from './storage';

/**
 * Partida guardada (T-011, ADR-0010). Un solo hueco por jugador, `partida` en su perfil (T-034, ADR-0018): se guarda sola
 * al empezar la partida y cada ronda, y en el momento exacto al salir al menu o al ocultar o cerrar la pestana. Al perder o
 * ganar se borra (I-04).
 * Lo que se guarda es el estado entero de la partida (`MatchState`, ADR-0008), mas el aviso de desbloqueo que el
 * jugador aun no acepto. Una guardada que no se entiende, de otra version o con una ronda que ya no existe, se ignora.
 * Lo que no se pierde al acabar la partida (jefes vencidos) va aparte, en `progress.ts` (T-017, ADR-0014).
 * Sin almacen, se usa el del jugador activo (`profiles.store()`).
 */
export const SAVE_KEY = 'partida';

/**
 * Sube cuando cambia la forma de `MatchState` o de la guardada: las de otra version se ignoran. La 2 (T-018) anade el
 * brote; la 3 (T-020), las semillas de la partida; la 4 (T-024), el muro y la disparadora con escudo; la 5 (T-025), las
 * copias de los copiones (`Enemy.clone`) y los versos de los juglares en vuelo (`MatchState.verses`); la 6 (T-026), el
 * recital de Elk Cloner (`Enemy.recital`) y quien recita cada verso y si es del poema entero (`Verse.by`, `Verse.poem`); la 7
 * (T-021), los poderes con sus cargas (`MatchState.powers`), las granadas en vuelo (`MatchState.grenades`) y los bloques
 * del muro de hielo; la 8 (T-022), el nivel de cada poder (`PowerSlot.level`), el dano y el alcance de cada granada y la
 * vida entera de cada bloque de hielo (`IceBlock.maxHp`); la 9 (T-023), el nivel base de la partida (`MatchState.baseLevel`); la 10
 * (T-037), lo que la partida trae de brotes posteriores vencidos (`MatchState.carried`). Con ella se descartan tambien las
 * del brote 2 con una disparadora con escudo, que desde T-037 no se infunde ahi (sin migracion, ADR-0014).
 */
export const SAVE_VERSION = 10;

export interface SavedGame {
  readonly version: number;
  /** Cuando se guardo (milisegundos desde 1970). */
  readonly savedAt: number;
  readonly match: MatchState;
  /** Aviso de lo desbloqueado sin aceptar (T-009): al cargar vuelve a salir. */
  readonly pendingUnlock: UnlockInfo | null;
}

/** Lo que dice "Cargar partida" en el menu. */
export interface SaveSummary {
  readonly outbreak: OutbreakId;
  /** Ronda en curso, desde 1. */
  readonly round: number;
  /** Rondas del brote de la partida (T-018). */
  readonly total: number;
  readonly lives: number;
  readonly balance: number;
  readonly savedAt: number;
}

export type { SaveStore };

/** Una partida acabada (sin vidas o ganada) no se guarda: perder obliga a empezar desde la ronda 1. */
export function isSavable(match: MatchState): boolean {
  return match.lives > 0 && match.round.phase !== 'won';
}

export function encodeSave(match: MatchState, pendingUnlock: UnlockInfo | null, savedAt: number): string {
  const save: SavedGame = { version: SAVE_VERSION, savedAt, match, pendingUnlock };
  return JSON.stringify(save);
}

/** La guardada, si se entiende y es de esta version; si no, null. */
export function decodeSave(raw: string | null): SavedGame | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== SAVE_VERSION || !isNumber(data.savedAt)) return null;
  if (!isMatchState(data.match) || !isSavable(data.match)) return null;
  const pendingUnlock = isUnlockInfo(data.pendingUnlock, data.match.outbreak) ? data.pendingUnlock : null;
  return { version: SAVE_VERSION, savedAt: data.savedAt, match: data.match, pendingUnlock };
}

export function summarizeSave(save: SavedGame): SaveSummary {
  const { match } = save;
  return {
    outbreak: match.outbreak,
    round: match.round.index + 1,
    total: roundCount(match.outbreak),
    lives: match.lives,
    balance: match.balance,
    savedAt: save.savedAt,
  };
}

export function readSave(store: SaveStore | null = profiles.store()): SavedGame | null {
  if (!store) return null;
  try {
    return decodeSave(store.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

/**
 * Guarda la partida. Si ya esta acabada, borra la guardada. Devuelve si quedo guardada: sin almacenamiento o sin espacio,
 * el juego sigue igual y no hay partida que cargar.
 */
export function writeSave(
  match: MatchState,
  pendingUnlock: UnlockInfo | null = null,
  store: SaveStore | null = profiles.store(),
  now: number = Date.now(),
): boolean {
  if (!store) return false;
  if (!isSavable(match)) {
    clearSave(store);
    return false;
  }
  try {
    store.setItem(SAVE_KEY, encodeSave(match, pendingUnlock, now));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(store: SaveStore | null = profiles.store()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}

// ---------------------------------------------------------------------------
// Comprobacion de la forma: una guardada rota o de otra version no debe romper la escena al cargarla.

type Data = Record<string, unknown>;

const isRecord = (value: unknown): value is Data => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isInt = (value: unknown, min = -Infinity, max = Infinity): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
/** Elemento de una mina: fuego o hielo. */
const isMineElement = (value: unknown): boolean => value === 'fire' || value === 'ice';
/** Elemento infundido en una disparadora: los de mina o el escudo (T-024). */
const isElement = (value: unknown): boolean => isMineElement(value) || value === 'shield';
const isLane = (value: unknown): boolean => isInt(value, 0, BOARD.lanes - 1);
const isNullOr = (value: unknown, check: (value: unknown) => boolean): boolean => value === null || check(value);

const isBurn = (value: unknown): value is Burn => isRecord(value) && isNumber(value.dps) && isNumber(value.ms);
const isSlow = (value: unknown): value is Slow => isRecord(value) && isNumber(value.amount) && isNumber(value.ms);
const isJump = (value: unknown): value is Jump =>
  isRecord(value) &&
  (value.stage === 'crouch' || value.stage === 'air') &&
  isLane(value.from) &&
  isLane(value.to) &&
  isNumber(value.ms) &&
  isNumber(value.stageMs);

/** Recital de Elk Cloner (T-026): su reloj de versos, los que lleva y el aviso del poema entero, si lo anuncia. */
const isRecital = (value: unknown): value is Recital =>
  isRecord(value) && isNumber(value.ms) && isInt(value.sung, 0) && isNullOr(value.poemMs, isNumber);

function isSown(value: unknown): value is Sown {
  if (!isRecord(value) || !isNumber(value.hp) || value.hp <= 0) return false;
  if (value.kind === 'mine') return isMineElement(value.element) && isNullOr(value.fuseMs, isNumber);
  if (value.kind === 'wall') return true;
  if (value.kind === 'ice') return isNumber(value.ms) && value.ms > 0 && isNumber(value.maxHp) && value.maxHp >= value.hp;
  if (value.kind !== 'shooter' || !isNumber(value.reloadMs) || !isRecord(value.shooter)) return false;
  const { shooter } = value;
  return isNullOr(shooter.element, isElement) && isInt(shooter.cannons, 1, LIMITS.maxCannons) && isInt(shooter.level, 1, LIMITS.maxLevel);
}

function isEnemy(value: unknown): value is Enemy {
  return (
    isRecord(value) &&
    isInt(value.id, 0) &&
    typeof value.kind === 'string' &&
    Object.hasOwn(ENEMIES, value.kind) &&
    isLane(value.lane) &&
    isNumber(value.x) &&
    isNumber(value.hp) &&
    isNullOr(value.attackMs, isNumber) &&
    isNullOr(value.burn, isBurn) &&
    isNullOr(value.slow, isSlow) &&
    isNumber(value.haste) &&
    value.haste > 0 &&
    isInt(value.level, 1) &&
    isNullOr(value.jump, isJump) &&
    isInt(value.jumpsUsed, 0) &&
    typeof value.clone === 'boolean' &&
    isNullOr(value.recital, isRecital)
  );
}

const isBulletEffect = (value: unknown): boolean =>
  isRecord(value) && ((value.element === 'fire' && isBurn(value.burn)) || (value.element === 'ice' && isSlow(value.slow)));

const isProjectile = (value: unknown): value is Data =>
  isRecord(value) && isInt(value.id, 0) && isLane(value.lane) && isNumber(value.x) && isNumber(value.damage);

/** Granada del poder (T-021): su casilla, lo que le queda de vuelo y de mecha. */
const isGrenade = (value: unknown): boolean =>
  isRecord(value) &&
  isInt(value.id, 0) &&
  isRecord(value.cell) &&
  isLane(value.cell.lane) &&
  isInt(value.cell.col, 0, BOARD.columns - 1) &&
  isNumber(value.flightMs) &&
  value.flightMs >= 0 &&
  isNumber(value.fuseMs) &&
  isNumber(value.damage) &&
  value.damage >= 0 &&
  isNumber(value.radius) &&
  value.radius > 0;

/**
 * Poderes de la partida (T-021): cada uno una vez, con su nivel (T-022) y sus cargas, nunca mas de las que trae una
 * partida con ese nivel.
 */
const isPowers = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every((slot) => isRecord(slot) && isPowerId(slot.id) && isPowerLevel(slot.level) && isInt(slot.charges, 0, chargesAt(slot.id, slot.level))) &&
  new Set(value.map((slot: Data) => slot.id)).size === value.length;

/** Ronda que existe en el guion del brote de la partida (T-018: cada brote tiene sus rondas). */
function isRound(value: unknown, outbreak: OutbreakId): boolean {
  return (
    isRecord(value) &&
    isInt(value.index, 0, roundCount(outbreak) - 1) &&
    (value.phase === 'prep' || value.phase === 'attack') &&
    isNumber(value.prepMs) &&
    isNumber(value.elapsedMs) &&
    isInt(value.released, 0)
  );
}

export function isMatchState(value: unknown): value is MatchState {
  if (!isRecord(value)) return false;
  const { plants, enemies, bullets, spits, verses, grenades } = value;
  return (
    isOutbreakId(value.outbreak) &&
    isInt(value.balance, 0) &&
    isInt(value.lives, 0, LIVES.start) &&
    Array.isArray(plants) &&
    plants.length === BOARD.lanes &&
    plants.every((lane) => Array.isArray(lane) && lane.length === BOARD.columns && lane.every((cell) => isNullOr(cell, isSown))) &&
    Array.isArray(enemies) &&
    enemies.every(isEnemy) &&
    Array.isArray(bullets) &&
    bullets.every((bullet) => isProjectile(bullet) && isNullOr(bullet.effect, isBulletEffect)) &&
    Array.isArray(spits) &&
    spits.every(isProjectile) &&
    Array.isArray(verses) &&
    verses.every((verse) => isProjectile(verse) && typeof verse.by === 'string' && Object.hasOwn(ENEMIES, verse.by) && typeof verse.poem === 'boolean') &&
    Array.isArray(grenades) &&
    grenades.every(isGrenade) &&
    isPowers(value.powers) &&
    isBaseLevel(value.baseLevel) &&
    Array.isArray(value.carried) &&
    value.carried.every(isFeature) &&
    isRound(value.round, value.outbreak) &&
    isNumber(value.incomeMs) &&
    isMatchSeeds(value.seeds, value.outbreak) &&
    isInt(value.nextId, 0)
  );
}

/**
 * Semillas de una partida a medias (T-020): lo que llevan sus rondas, sin cobrar. Nunca mas rondas de las que tiene su
 * brote. Una guardada nunca esta cobrada: al acabar la partida se borra.
 */
function isMatchSeeds(value: unknown, outbreak: OutbreakId): boolean {
  return (
    isRecord(value) &&
    typeof value.replay === 'boolean' &&
    isInt(value.rounds, 0, roundCount(outbreak)) &&
    isInt(value.earned, 0) &&
    value.payout === null
  );
}

function isUnlockInfo(value: unknown, outbreak: OutbreakId): value is UnlockInfo {
  return isRecord(value) && isInt(value.round, 1, roundCount(outbreak)) && Array.isArray(value.items) && value.items.every((item) => isRecord(item) && typeof item.id === 'string');
}
