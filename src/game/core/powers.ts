import { BOARD, GRENADE, ICE_WALL, POWER_LEVELS, POWERS, RELOCATE } from '../config/balance';
import { isMilestone, milestonesReached } from './levels';
import { isOnBoard, type Cell } from './board';
import { enemyHalfLength, isAirborne, type Enemy, type Grenade } from './combat';
import type { IceBlock, MatchState, Plant, Sown } from './match';
import { plantMaxHp } from './plants';

/**
 * Poderes (T-021, ADR-0020): habilidades de un uso que se lanzan desde el panel izquierdo. Cada partida trae los suyos
 * con sus cargas (`MatchState.powers`); cada uso gasta exactamente una, alcance o no a alguien. Las reglas son de aqui;
 * la escena solo apunta, pinta y anima.
 * - **Recolocar** (O-03): una disparadora a una casilla vacia, tal como estaba (vida, nivel, elemento, canones y recarga).
 * - **Granada** (O-04): vuela en curva a una casilla, cuenta y explota (`Grenade`, la lleva `stepCombat`).
 * - **Muro de hielo** (O-05, O-09 a O-11): tres bloques de hielo en una columna (`IceBlock`), que bloquean el paso y se
 *   derriten.
 *
 * Desde T-022 cada poder tiene su nivel, del 1 al `POWER_LEVELS.max`, que se mejora en la tienda: recolocar cura y trae mas
 * cargas, la granada hace mas dano y alcanza mas, y el muro aguanta mas y es mas largo (`relocateAt`, `grenadeAt`,
 * `iceWallAt`). La partida lleva el nivel de cada poder en su hueco (`PowerSlot.level`).
 */
export type PowerId = 'relocate' | 'grenade' | 'iceWall';

/** Todos los poderes, en el orden del panel. */
export const POWER_IDS: readonly PowerId[] = ['relocate', 'grenade', 'iceWall'];

/** Un poder que se lleva a una partida, con su nivel (T-022). */
export interface CarriedPower {
  readonly id: PowerId;
  readonly level: number;
}

/** Un poder que lleva la partida, su nivel y las cargas que le quedan. */
export interface PowerSlot extends CarriedPower {
  readonly charges: number;
}

export function isPowerId(value: unknown): value is PowerId {
  return typeof value === 'string' && (POWER_IDS as readonly string[]).includes(value);
}

/** Un nivel de poder que existe: entero, del 1 al maximo. */
export function isPowerLevel(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= POWER_LEVELS.max;
}

// ---------------------------------------------------------------------------
// Niveles (T-022, T-01)

/** El nivel `level` da premio: cada 5 niveles (`LEVEL_MILESTONES`, T-035), el 5 y el 10. */
export function isPowerMilestone(level: number): boolean {
  return isMilestone(level) && level <= POWER_LEVELS.max;
}

/** Cuantos niveles con premio alcanzo un poder de nivel `level`: 0 antes del 5, 1 del 5 al 9 y 2 en el 10. */
export function powerMilestones(level: number): number {
  return milestonesReached(Math.min(level, POWER_LEVELS.max));
}

/**
 * Lo que suma un poder de nivel `level` sobre el de nivel 1, en fraccion: cada nivel del 2 en adelante suma `perLevel`, y
 * los que tienen premio, `perMilestone` en su lugar. Como en las plantas (`levelBonus`), lo ganado se queda.
 */
function levelSum(level: number, perLevel: number, perMilestone: number): number {
  let sum = 0;
  for (let reached = 2; reached <= level; reached++) sum += isPowerMilestone(reached) ? perMilestone : perLevel;
  return sum;
}

/** Recolocar en el nivel `level`: cargas por partida y lo que cura a la planta que se mueve, en fraccion de su vida entera. */
export function relocateAt(level: number): { charges: number; heal: number } {
  return { charges: POWERS.chargesPerMatch + powerMilestones(level) * RELOCATE.chargesPerMilestone, heal: (level - 1) * RELOCATE.healPerLevel };
}

/** La granada en el nivel `level`: el dano a cada enemigo alcanzado (entero) y el alcance, en casillas. */
export function grenadeAt(level: number): { damage: number; radius: number } {
  return {
    damage: Math.round(GRENADE.damage * (1 + levelSum(level, GRENADE.damagePerLevel, GRENADE.damagePerMilestone))),
    // En centesimas: 1,8 + 0,3 da 2,1 y no 2,1000000000000001.
    radius: Math.round((GRENADE.blastRadius + powerMilestones(level) * GRENADE.radiusPerMilestone) * 100) / 100,
  };
}

/** El muro de hielo en el nivel `level`: la vida de cada bloque (entera) y cuantas casillas ocupa, nunca mas que los carriles. */
export function iceWallAt(level: number): { hp: number; span: number } {
  return {
    hp: Math.round(ICE_WALL.hp * (1 + levelSum(level, ICE_WALL.hpPerLevel, ICE_WALL.hpPerMilestone))),
    span: Math.min(BOARD.lanes, ICE_WALL.span + powerMilestones(level) * ICE_WALL.spanPerMilestone),
  };
}

/** Cargas con las que el poder `id` de nivel `level` empieza cada partida (O-01, b): recolocar, mas con sus premios. */
export function chargesAt(id: PowerId, level: number): number {
  return id === 'relocate' ? relocateAt(level).charges : POWERS.chargesPerMatch;
}

/** Lo mas largo que llega a ser el muro de hielo: lo que hay que tener preparado para apuntarlo. */
export const ICE_WALL_MAX_SPAN = iceWallAt(POWER_LEVELS.max).span;

/**
 * Lo que lleva una partida nueva: cada poder de `loadout` una vez, en el orden del panel, con las cargas de su nivel. Sin
 * `loadout`, ninguno: los poderes salen de la tienda (T-022) y se eligen antes de empezar el brote.
 */
export function loadoutSlots(loadout: readonly CarriedPower[] = []): PowerSlot[] {
  const levels = new Map<PowerId, number>();
  for (const carried of loadout) {
    if (isPowerId(carried.id) && !levels.has(carried.id)) levels.set(carried.id, isPowerLevel(carried.level) ? carried.level : 1);
  }
  return POWER_IDS.filter((id) => levels.has(id)).map((id) => {
    const level = levels.get(id) as number;
    return { id, level, charges: chargesAt(id, level) };
  });
}

/**
 * Poderes de la direccion, en desarrollo (`?poderes=granada,muro:10`): asi se prueba una partida con otros poderes, con
 * otro nivel (tras dos puntos; sin el, el 1) o sin ninguno (`?poderes=` vacio). Null si no viene: la partida trae los
 * elegidos antes del brote. Lo que no se entiende se ignora; un nivel que no existe cuenta como el 1.
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

export function powersFromParam(param: string | null): CarriedPower[] | null {
  if (param === null) return null;
  const carried: CarriedPower[] = [];
  for (const part of param.split(',')) {
    const [name, rawLevel] = part.split(':');
    const id = PARAM_NAMES[name.trim().toLowerCase()];
    if (!isPowerId(id) || carried.some((c) => c.id === id)) continue;
    const level = Number(rawLevel?.trim());
    carried.push({ id, level: isPowerLevel(level) ? level : 1 });
  }
  return carried;
}

/** Cargas que le quedan a un poder en la partida; 0 si no lo lleva. */
export function powerCharges(state: MatchState, id: PowerId): number {
  return state.powers.find((slot) => slot.id === id)?.charges ?? 0;
}

/** Nivel del poder que lleva la partida (T-022); el 1 si no lo lleva (para apuntar y ensenar algo igualmente). */
export function powerLevel(state: MatchState, id: PowerId): number {
  return state.powers.find((slot) => slot.id === id)?.level ?? 1;
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
 * Vida con la que llega a su casilla nueva la planta que se recoloca con el poder de nivel `level` (T-022): la que tenia
 * mas lo que cura el nivel, en fraccion de su vida entera, sin pasarse de ella.
 */
export function relocatedHp(plant: Plant, level: number): number {
  const full = plantMaxHp(plant.shooter);
  return Math.min(full, plant.hp + full * relocateAt(level).heal);
}

/**
 * Lleva la disparadora de `from` a la casilla vacia `to` tal como estaba: nivel, elemento, canones y recarga, y su vida
 * con lo que cura el nivel del poder (T-022; en el nivel 1, nada). Gasta una carga. Lo que la mordia sigue avanzando (ya
 * no tiene nada delante).
 */
export function relocatePlant(state: MatchState, from: Cell, to: Cell): MatchState {
  const blocker = relocateBlocker(state, from, to);
  if (blocker) throw new Error(`No se puede recolocar: ${blocker}`);
  const plant = sownIn(state, from) as Plant;
  const hp = relocatedHp(plant, powerLevel(state, 'relocate'));
  return spend(
    withSown(state, [
      [from, null],
      [to, hp === plant.hp ? plant : { ...plant, hp }],
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
 * (`stepCombat`) con el dano y el alcance del nivel del poder (`grenadeAt`, T-022). Gasta una carga. No ocupa la casilla:
 * puede caer junto a una planta, que no recibe nada.
 */
export function throwGrenade(state: MatchState, cell: Cell): MatchState {
  const blocker = grenadeBlocker(state, cell);
  if (blocker) throw new Error(`No se puede lanzar la granada: ${blocker}`);
  const { damage, radius } = grenadeAt(powerLevel(state, 'grenade'));
  const grenade: Grenade = { id: state.nextId, cell: { lane: cell.lane, col: cell.col }, flightMs: GRENADE.flightMs, fuseMs: GRENADE.fuseMs, damage, radius };
  return spend({ ...state, grenades: [...state.grenades, grenade], nextId: state.nextId + 1 }, 'grenade');
}

// ---------------------------------------------------------------------------
// Muro de hielo (O-05, O-09 a O-11)

/**
 * Bloque de hielo recien puesto por el poder de nivel `level`: la vida de su nivel (la de una disparadora de nivel 1 en el
 * nivel 1; `iceWallAt`, T-022), que es tambien la entera, y su tiempo entero.
 */
export function createIceBlock(level = 1): IceBlock {
  const { hp } = iceWallAt(level);
  return { kind: 'ice', hp, maxHp: hp, ms: ICE_WALL.durationMs };
}

/**
 * Casillas del muro de `span` casillas que se pone apuntando a `cell` (O-09): la suya y las de arriba y abajo, en su
 * columna (con un numero par, una mas arriba). En el carril de arriba o el de abajo se mete dentro del tablero, asi que
 * siempre son `span` (nunca mas que los carriles). Fuera del tablero, ninguna.
 */
export function iceWallCells(cell: Cell, span: number = ICE_WALL.span): Cell[] {
  if (!isOnBoard(cell)) return [];
  const length = Math.max(1, Math.min(span, BOARD.lanes));
  const first = Math.max(0, Math.min(BOARD.lanes - length, cell.lane - Math.floor(length / 2)));
  return Array.from({ length }, (_, i) => ({ lane: first + i, col: cell.col }));
}

/** Casillas del muro que pondria la partida apuntando a `cell`: las del nivel de su poder (T-022). */
export function iceWallCellsIn(state: MatchState, cell: Cell): Cell[] {
  return iceWallCells(cell, iceWallAt(powerLevel(state, 'iceWall')).span);
}

/** Por que no se puede poner el muro apuntando a una casilla: lo del poder, fuera del tablero o alguna de sus casillas ocupada. */
export type IceWallBlocker = PowerBlocker | 'off-board' | 'occupied';

export function iceWallBlocker(state: MatchState, cell: Cell): IceWallBlocker | null {
  const power = powerBlocker(state, 'iceWall');
  if (power) return power;
  const cells = iceWallCellsIn(state, cell);
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
  for (const wallCell of iceWallCellsIn(state, cell)) {
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
 * Pone el muro de hielo apuntando a `cell`: un bloque por casilla, con el largo y la vida del nivel del poder
 * (`iceWallAt`, T-022), y saca de ellas a los enemigos que estaban dentro (`icePushOf`). Gasta una carga. Si un enemigo
 * sale hacia atras empieza a morder el hielo desde ahi.
 */
export function placeIceWall(state: MatchState, cell: Cell): IceWallPlaced {
  const blocker = iceWallBlocker(state, cell);
  if (blocker) throw new Error(`No se puede poner el muro de hielo: ${blocker}`);
  const level = powerLevel(state, 'iceWall');
  const cells = iceWallCellsIn(state, cell);
  const pushed = iceWallPushes(state, cell);
  const moved = new Map(pushed.map((push) => [push.enemyId, push.toX]));
  const enemies = state.enemies.map((enemy) => {
    const toX = moved.get(enemy.id);
    // Sale de la casilla: lo que estuviera mordiendo o escupiendo vuelve a empezar desde donde queda.
    return toX === undefined ? enemy : { ...enemy, x: toX, attackMs: null };
  });
  const placed = withSown({ ...state, enemies }, cells.map((c) => [c, createIceBlock(level)] as const));
  return { state: spend(placed, 'iceWall'), cells, pushed };
}
