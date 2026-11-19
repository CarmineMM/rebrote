import { BOARD, COSTS, ECONOMY, LIVES } from '../config/balance';
import { isOnBoard, type Cell } from './board';
import type { Bullet, Enemy } from './combat';
import { createShooter, plantMaxHp, type Shooter } from './plants';
import { createSpawner, type SpawnerState } from './spawner';

/** Cartas que se pueden sembrar desde el HUD. Fuego y hielo llegan en T-004 y T-005. */
export type CardId = 'shooter';

/** Planta sembrada: lo que es (`shooter`) y como esta en el combate. */
export interface Plant {
  readonly shooter: Shooter;
  readonly hp: number;
  /** Milisegundos hasta que puede volver a disparar; 0 si esta lista. */
  readonly reloadMs: number;
}

/**
 * Todo lo que forma una partida, incluido el combate. Al cambiar el nivel grafico el juego se recrea
 * con este estado, asi que lo que no este aqui se pierde (ADR-0008).
 */
export interface MatchState {
  readonly balance: number;
  readonly lives: number;
  /** Plantas por carril y columna; null si la casilla esta vacia. */
  readonly plants: ReadonlyArray<ReadonlyArray<Plant | null>>;
  readonly enemies: readonly Enemy[];
  readonly bullets: readonly Bullet[];
  readonly spawner: SpawnerState;
  /** Siguiente id libre para enemigos y balas: la vista sigue a cada uno por su id. */
  readonly nextId: number;
}

export type PlantBlocker = 'off-board' | 'occupied' | 'insufficient-funds';

export function createMatch(balance: number = ECONOMY.startingBalance): MatchState {
  assertWholeAmount(balance);
  const plants = Array.from({ length: BOARD.lanes }, () => Array.from({ length: BOARD.columns }, (): Plant | null => null));
  return { balance, lives: LIVES.start, plants, enemies: [], bullets: [], spawner: createSpawner(), nextId: 1 };
}

export function cardCost(card: CardId): number {
  return COSTS[card];
}

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}

export function plantAt(state: MatchState, cell: Cell): Plant | null {
  return isOnBoard(cell) ? state.plants[cell.lane][cell.col] : null;
}

/** Motivo por el que no se puede sembrar una disparadora en la casilla, o null si se puede. */
export function plantBlocker(state: MatchState, cell: Cell): PlantBlocker | null {
  if (!isOnBoard(cell)) return 'off-board';
  if (plantAt(state, cell)) return 'occupied';
  if (!canAfford(state.balance, cardCost('shooter'))) return 'insufficient-funds';
  return null;
}

/** Planta recien sembrada: vida llena y lista para disparar en cuanto tenga a quien. */
export function createPlant(shooter: Shooter = createShooter()): Plant {
  return { shooter, hp: plantMaxHp(shooter), reloadMs: 0 };
}

/** Siembra una disparadora y cobra su costo. No modifica el estado recibido. */
export function plantShooter(state: MatchState, cell: Cell): MatchState {
  const blocker = plantBlocker(state, cell);
  if (blocker) {
    throw new Error(`No se puede sembrar: ${blocker}`);
  }
  const plants = state.plants.map((lane, laneIndex) =>
    laneIndex === cell.lane ? lane.map((plant, col) => (col === cell.col ? createPlant() : plant)) : lane,
  );
  return { ...state, balance: state.balance - cardCost('shooter'), plants };
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
