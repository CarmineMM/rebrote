import { BOARD, ENEMIES, LIMITS, LIVES } from './config/balance';
import type { Burn, Enemy, Jump, Slow } from './core/combat';
import type { MatchState, Sown } from './core/match';
import { ROUND_COUNT } from './core/rounds';
import type { UnlockInfo } from './EventBus';

/**
 * Partida guardada (T-011, ADR-0010). Un solo hueco en `localStorage`: se guarda sola al empezar la partida y cada ronda,
 * y en el momento exacto al salir al menu o al ocultar o cerrar la pestana. Al perder o ganar se borra (I-04).
 * Lo que se guarda es el estado entero de la partida (`MatchState`, ADR-0008), mas el aviso de desbloqueo que el
 * jugador aun no acepto. Una guardada que no se entiende, de otra version o con una ronda que ya no existe, se ignora.
 */
export const SAVE_KEY = 'rebrote.partida';

/** Sube cuando cambia la forma de `MatchState` o de la guardada: las de otra version se ignoran. */
export const SAVE_VERSION = 1;

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
  /** Ronda en curso, desde 1. */
  readonly round: number;
  readonly total: number;
  readonly lives: number;
  readonly balance: number;
  readonly savedAt: number;
}

/** Lo que hace falta del almacenamiento del navegador; en los tests, uno de mentira. */
export type SaveStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** El `localStorage` del navegador, o null si no hay o no deja usarlo (ventana privada, permisos). */
function browserStore(): SaveStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

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
  const pendingUnlock = isUnlockInfo(data.pendingUnlock) ? data.pendingUnlock : null;
  return { version: SAVE_VERSION, savedAt: data.savedAt, match: data.match, pendingUnlock };
}

export function summarizeSave(save: SavedGame): SaveSummary {
  const { match } = save;
  return { round: match.round.index + 1, total: ROUND_COUNT, lives: match.lives, balance: match.balance, savedAt: save.savedAt };
}

export function readSave(store: SaveStore | null = browserStore()): SavedGame | null {
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
  store: SaveStore | null = browserStore(),
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

export function clearSave(store: SaveStore | null = browserStore()): void {
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
const isElement = (value: unknown): boolean => value === 'fire' || value === 'ice';
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

function isSown(value: unknown): value is Sown {
  if (!isRecord(value) || !isNumber(value.hp) || value.hp <= 0) return false;
  if (value.kind === 'mine') return isElement(value.element) && isNullOr(value.fuseMs, isNumber);
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
    isInt(value.jumpsUsed, 0)
  );
}

const isBulletEffect = (value: unknown): boolean =>
  isRecord(value) && ((value.element === 'fire' && isBurn(value.burn)) || (value.element === 'ice' && isSlow(value.slow)));

const isProjectile = (value: unknown): value is Data =>
  isRecord(value) && isInt(value.id, 0) && isLane(value.lane) && isNumber(value.x) && isNumber(value.damage);

function isRound(value: unknown): boolean {
  return (
    isRecord(value) &&
    isInt(value.index, 0, ROUND_COUNT - 1) &&
    (value.phase === 'prep' || value.phase === 'attack') &&
    isNumber(value.prepMs) &&
    isNumber(value.elapsedMs) &&
    isInt(value.released, 0)
  );
}

export function isMatchState(value: unknown): value is MatchState {
  if (!isRecord(value)) return false;
  const { plants, enemies, bullets, spits } = value;
  return (
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
    isRound(value.round) &&
    isNumber(value.incomeMs) &&
    isInt(value.nextId, 0)
  );
}

function isUnlockInfo(value: unknown): value is UnlockInfo {
  return isRecord(value) && isInt(value.round, 1, ROUND_COUNT) && Array.isArray(value.items) && value.items.every((item) => isRecord(item) && typeof item.id === 'string');
}
