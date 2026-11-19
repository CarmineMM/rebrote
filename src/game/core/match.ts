import { BOARD, COSTS, ECONOMY } from '../config/balance';
import { isOnBoard, type Cell } from './board';
import { createShooter, type Shooter } from './plants';

/** Cartas que se pueden sembrar desde el HUD. Fuego y hielo llegan en T-004 y T-005. */
export type CardId = 'shooter';

export interface MatchState {
  readonly balance: number;
  /** Plantas por carril y columna; null si la casilla esta vacia. */
  readonly plants: ReadonlyArray<ReadonlyArray<Shooter | null>>;
}

export type PlantBlocker = 'off-board' | 'occupied' | 'insufficient-funds';

export function createMatch(balance: number = ECONOMY.startingBalance): MatchState {
  assertWholeAmount(balance);
  const plants = Array.from({ length: BOARD.lanes }, () =>
    Array.from({ length: BOARD.columns }, (): Shooter | null => null),
  );
  return { balance, plants };
}

export function cardCost(card: CardId): number {
  return COSTS[card];
}

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}

export function plantAt(state: MatchState, cell: Cell): Shooter | null {
  return isOnBoard(cell) ? state.plants[cell.lane][cell.col] : null;
}

/** Motivo por el que no se puede sembrar una disparadora en la casilla, o null si se puede. */
export function plantBlocker(state: MatchState, cell: Cell): PlantBlocker | null {
  if (!isOnBoard(cell)) return 'off-board';
  if (plantAt(state, cell)) return 'occupied';
  if (!canAfford(state.balance, cardCost('shooter'))) return 'insufficient-funds';
  return null;
}

/** Siembra una disparadora y cobra su costo. No modifica el estado recibido. */
export function plantShooter(state: MatchState, cell: Cell): MatchState {
  const blocker = plantBlocker(state, cell);
  if (blocker) {
    throw new Error(`No se puede sembrar: ${blocker}`);
  }
  const plants = state.plants.map((lane, laneIndex) =>
    laneIndex === cell.lane ? lane.map((plant, col) => (col === cell.col ? createShooter() : plant)) : lane,
  );
  return { balance: state.balance - cardCost('shooter'), plants };
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
