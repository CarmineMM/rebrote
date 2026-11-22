import { BOARD, GRENADE, ICE_WALL, POWERS } from '../config/balance';
import { isOnBoard, type Cell } from './board';
import { enemyHalfLength, isAirborne, type Enemy, type Grenade } from './combat';
import type { IceBlock, MatchState, Plant, Sown } from './match';

/**
 * Poderes (T-021, ADR-0020): habilidades de un uso que se lanzan desde el panel izquierdo. Cada partida trae los suyos
 * con sus cargas (`MatchState.powers`); cada uso gasta exactamente una, alcance o no a alguien. Las reglas son de aqui;
 * la escena solo apunta, pinta y anima.
 * - **Recolocar** (O-03): una disparadora a una casilla vacia, tal como estaba (vida, nivel, elemento, canones y recarga).
 * - **Granada** (O-04): vuela en curva a una casilla, cuenta y explota (`Grenade`, la lleva `stepCombat`).
 * - **Muro de hielo** (O-05, O-09 a O-11): tres bloques de hielo en una columna (`IceBlock`), que bloquean el paso y se
 *   derriten.
 */
export type PowerId = 'relocate' | 'grenade' | 'iceWall';

/** Todos los poderes, en el orden del panel. */
export const POWER_IDS: readonly PowerId[] = ['relocate', 'grenade', 'iceWall'];

/** Un poder que lleva la partida y las cargas que le quedan. */
export interface PowerSlot {
  readonly id: PowerId;
  readonly charges: number;
}

export function isPowerId(value: unknown): value is PowerId {
  return typeof value === 'string' && (POWER_IDS as readonly string[]).includes(value);
}

/**
 * Lo que lleva una partida nueva: cada poder de `loadout` una vez, en su orden, con `POWERS.chargesPerMatch` cargas (O-01,
 * b). Hasta la tienda (T-022) es `POWERS.trialLoadout` (O-08).
 */
export function loadoutSlots(loadout: readonly PowerId[] = POWERS.trialLoadout): PowerSlot[] {
  return [...new Set(loadout)].filter(isPowerId).map((id) => ({ id, charges: POWERS.chargesPerMatch }));
}

/**
 * Nombres de los poderes en la direccion, en desarrollo (`?poderes=granada,muro`): asi se prueba una partida con otros
 * poderes o sin ninguno (`?poderes=` vacio). Null si no viene: la partida trae lo de siempre. Lo que no se entiende se
 * ignora.
 */
const PARAM_NAMES: Readonly<Record<string, PowerId>> = {
  recolocar: 'relocate',
  relocate: 'relocate',
  granada: 'grenade',
  grenade: 'grenade',
  muro: 'iceWall',
  hielo: 'iceWall',
  icewall: 'iceWall',
};

export function powersFromParam(param: string | null): PowerId[] | null {
  if (param === null) return null;
  const ids = param
    .split(',')
    .map((name) => PARAM_NAMES[name.trim().toLowerCase()])
    .filter(isPowerId);
  return [...new Set(ids)];
}

/** Cargas que le quedan a un poder en la partida; 0 si no lo lleva. */
export function powerCharges(state: MatchState, id: PowerId): number {
  return state.powers.find((slot) => slot.id === id)?.charges ?? 0;
}

/**
 * Por que no se puede usar un poder ahora: no lo lleva, no le quedan cargas, solo va en el ataque (O-07: la granada y el
 * muro; recolocar tambien en la preparacion) o la partida ya acabo.
 */
export type PowerBlocker = 'not-carried' | 'no-charges' | 'attack-only' | 'over';

export function powerBlocker(state: MatchState, id: PowerId): PowerBlocker | null {
  if (state.lives <= 0 || state.round.phase === 'won') return 'over';
  const slot = state.powers.find((s) => s.id === id);
  if (!slot) return 'not-carried';
  if (slot.charges <= 0) return 'no-charges';
  if (state.round.phase === 'prep' && !POWERS.usableInPrep[id]) return 'attack-only';
  return null;
}

/** Gasta una carga del poder. Solo la llaman los usos, despues de comprobar que se puede. */
function spend(state: MatchState, id: PowerId): MatchState {
  return { ...state, powers: state.powers.map((slot) => (slot.id === id ? { ...slot, charges: slot.charges - 1 } : slot)) };
}

const sownIn = (state: MatchState, cell: Cell): Sown | null => (isOnBoard(cell) ? state.plants[cell.lane][cell.col] : null);

/** Lo mismo que hay en el tablero, con `cells` cambiadas. */
function withSown(state: MatchState, changes: ReadonlyArray<readonly [Cell, Sown | null]>): MatchState {
  const plants = state.plants.map((lane) => [...lane]);
  for (const [cell, sown] of changes) plants[cell.lane][cell.col] = sown;
  return { ...state, plants };
}

// ---------------------------------------------------------------------------
// Recolocar (O-03)

/** Por que no se puede recolocar de `from` a `to`: lo del poder, fuera del tablero, sin disparadora, la misma casilla u ocupada. */
export type RelocateBlocker = PowerBlocker | 'off-board' | 'no-plant' | 'same-cell' | 'occupied';

/** Por que no se puede elegir la planta de `from` para recolocarla (o null si se puede): solo disparadoras (O-03). */
export function relocateSourceBlocker(state: MatchState, from: Cell): RelocateBlocker | null {
  const power = powerBlocker(state, 'relocate');
  if (power) return power;
  if (!isOnBoard(from)) return 'off-board';
  return sownIn(state, from)?.kind === 'shooter' ? null : 'no-plant';
}

export function relocateBlocker(state: MatchState, from: Cell, to: Cell): RelocateBlocker | null {
  const source = relocateSourceBlocker(state, from);
  if (source) return source;
  if (!isOnBoard(to)) return 'off-board';
  if (from.lane === to.lane && from.col === to.col) return 'same-cell';
  return sownIn(state, to) ? 'occupied' : null;
}

/** Casillas vacias a las que se puede llevar la planta de `from`. */
export function relocateTargets(state: MatchState, from: Cell): Cell[] {
  const targets: Cell[] = [];
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    for (let col = 0; col < BOARD.columns; col++) {
      if (relocateBlocker(state, from, { lane, col }) === null) targets.push({ lane, col });
    }
  }
  return targets;
}

/**
 * Lleva la disparadora de `from` a la casilla vacia `to` tal como estaba: vida, nivel, elemento, canones y recarga. Gasta
 * una carga. Lo que la mordia sigue avanzando (ya no tiene nada delante).
 */
export function relocatePlant(state: MatchState, from: Cell, to: Cell): MatchState {
  const blocker = relocateBlocker(state, from, to);
  if (blocker) throw new Error(`No se puede recolocar: ${blocker}`);
  const plant = sownIn(state, from) as Plant;
  return spend(
    withSown(state, [
      [from, null],
      [to, plant],
    ]),
    'relocate',
  );
}

// ---------------------------------------------------------------------------
// Granada (O-04)

/** Por que no se puede lanzar la granada a una casilla: lo del poder o fuera del tablero. Puede caer donde haya algo sembrado. */
export type GrenadeBlocker = PowerBlocker | 'off-board';

export function grenadeBlocker(state: MatchState, cell: Cell): GrenadeBlocker | null {
  return powerBlocker(state, 'grenade') ?? (isOnBoard(cell) ? null : 'off-board');
}

/**
 * Lanza la granada a `cell`: entra en vuelo (`GRENADE.flightMs`) y, al caer, cuenta `GRENADE.fuseMs` y explota
 * (`stepCombat`). Gasta una carga. No ocupa la casilla: puede caer junto a una planta, que no recibe nada.
 */
export function throwGrenade(state: MatchState, cell: Cell): MatchState {
  const blocker = grenadeBlocker(state, cell);
  if (blocker) throw new Error(`No se puede lanzar la granada: ${blocker}`);
  const grenade: Grenade = { id: state.nextId, cell: { lane: cell.lane, col: cell.col }, flightMs: GRENADE.flightMs, fuseMs: GRENADE.fuseMs };
  return spend({ ...state, grenades: [...state.grenades, grenade], nextId: state.nextId + 1 }, 'grenade');
}

// ---------------------------------------------------------------------------
// Muro de hielo (O-05, O-09 a O-11)

/** Bloque de hielo recien puesto: la vida de una disparadora de nivel 1 y su tiempo entero. */
export function createIceBlock(): IceBlock {
  return { kind: 'ice', hp: ICE_WALL.hp, ms: ICE_WALL.durationMs };
}

/**
 * Casillas del muro que se pone apuntando a `cell` (O-09): la suya y las de arriba y abajo, en su columna. En el carril de
 * arriba o el de abajo se mete dentro del tablero, asi que siempre son `ICE_WALL.span`. Fuera del tablero, ninguna.
 */
export function iceWallCells(cell: Cell): Cell[] {
  if (!isOnBoard(cell)) return [];
  const span = Math.min(ICE_WALL.span, BOARD.lanes);
  const first = Math.max(0, Math.min(BOARD.lanes - span, cell.lane - Math.floor(span / 2)));
  return Array.from({ length: span }, (_, i) => ({ lane: first + i, col: cell.col }));
}

/** Por que no se puede poner el muro apuntando a una casilla: lo del poder, fuera del tablero o alguna de sus casillas ocupada. */
export type IceWallBlocker = PowerBlocker | 'off-board' | 'occupied';

export function iceWallBlocker(state: MatchState, cell: Cell): IceWallBlocker | null {
  const power = powerBlocker(state, 'iceWall');
  if (power) return power;
  const cells = iceWallCells(cell);
  if (cells.length === 0) return 'off-board';
  return cells.some((c) => sownIn(state, c)) ? 'occupied' : null;
}

/** Un enemigo que estaba dentro de una casilla del muro y sale de ella: de donde a donde (centro, en casillas). */
export interface IcePush {
  readonly enemyId: number;
  readonly fromX: number;
  readonly toX: number;
}

/**
 * A donde sale el enemigo que esta en una casilla del muro (O-05): uno cuyo centro cae en la casilla sale por el lado mas
 * cercano, con el cuerpo entero fuera. Si aun no llego a la mitad, hacia atras (el hocico en el borde derecho, y se para a
 * morder el hielo); si ya la paso, hacia delante (la cola en el borde izquierdo, y sigue). Los jefes igual (O-06). Uno en
 * el aire (Creeper saltando) no esta en el suelo: no se mueve. Null si no esta dentro.
 */
export function icePushOf(enemy: Enemy, cell: Cell): number | null {
  if (enemy.lane !== cell.lane || enemy.hp <= 0 || isAirborne(enemy)) return null;
  if (enemy.x < cell.col || enemy.x >= cell.col + 1) return null;
  const half = enemyHalfLength(enemy);
  return enemy.x >= cell.col + 0.5 ? cell.col + 1 + half : cell.col - half;
}

/** Lo que pasaria al poner el muro apuntando a `cell`: sus casillas y los enemigos que saldrian de ellas. */
export function iceWallPushes(state: MatchState, cell: Cell): IcePush[] {
  const pushes: IcePush[] = [];
  for (const wallCell of iceWallCells(cell)) {
    for (const enemy of state.enemies) {
      const toX = icePushOf(enemy, wallCell);
      if (toX !== null) pushes.push({ enemyId: enemy.id, fromX: enemy.x, toX });
    }
  }
  return pushes;
}

export interface IceWallPlaced {
  readonly state: MatchState;
  /** Casillas de los bloques, de arriba abajo. */
  readonly cells: readonly Cell[];
  /** Enemigos que salieron de sus casillas, para animarlos. */
  readonly pushed: readonly IcePush[];
}

/**
 * Pone el muro de hielo apuntando a `cell`: un bloque por casilla (`createIceBlock`) y saca de ellas a los enemigos que
 * estaban dentro (`icePushOf`). Gasta una carga. Si un enemigo sale hacia atras empieza a morder el hielo desde ahi.
 */
export function placeIceWall(state: MatchState, cell: Cell): IceWallPlaced {
  const blocker = iceWallBlocker(state, cell);
  if (blocker) throw new Error(`No se puede poner el muro de hielo: ${blocker}`);
  const cells = iceWallCells(cell);
  const pushed = iceWallPushes(state, cell);
  const moved = new Map(pushed.map((push) => [push.enemyId, push.toX]));
  const enemies = state.enemies.map((enemy) => {
    const toX = moved.get(enemy.id);
    // Sale de la casilla: lo que estuviera mordiendo o escupiendo vuelve a empezar desde donde queda.
    return toX === undefined ? enemy : { ...enemy, x: toX, attackMs: null };
  });
  const placed = withSown({ ...state, enemies }, cells.map((c) => [c, createIceBlock()] as const));
  return { state: spend(placed, 'iceWall'), cells, pushed };
}
