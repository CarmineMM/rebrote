import { ECONOMY } from '../config/balance';
import { isDefeated } from './combat';
import { earn, type MatchState } from './match';

/**
 * Recompensa por eliminar un enemigo.
 * - auto: se suma al saldo en el acto.
 * - drop: la moneda queda en el suelo y solo se cobra si el jugador la recoge;
 *   `amount` ya incluye el extra por recogerla.
 */
export type KillReward = { kind: 'auto'; amount: number } | { kind: 'drop'; amount: number };

/** Valor de una moneda recogida a mano: la base mas el extra, redondeado hacia arriba. */
export function droppedCoinValue(amount: number, bonusPercent: number = ECONOMY.dropBonusPercent): number {
  // Se opera en enteros (amount * 115 / 100) para no arrastrar errores de coma flotante al redondear.
  return Math.ceil((amount * (100 + bonusPercent)) / 100);
}

/** `random` devuelve un valor en [0, 1), como Math.random. Se inyecta para poder testearlo. */
export function rollKillReward(base: number, random: () => number = Math.random): KillReward {
  return random() < ECONOMY.dropChance
    ? { kind: 'drop', amount: droppedCoinValue(base) }
    : { kind: 'auto', amount: base };
}

/** Lo que paso con el goteo durante un paso: el estado ya lleva la moneda sumada. */
export interface IncomeStep {
  readonly state: MatchState;
  /** Moneda que cayo en este paso (0 casi siempre). */
  readonly earned: number;
}

/**
 * Goteo pasivo (D-01; T-010, A-02): `ECONOMY.passiveIncome` por cada `ECONOMY.passiveIntervalMs` de ataque. En la
 * preparacion el reloj se para (no se gana moneda esperando) y en el siguiente ataque sigue donde iba. Sin vidas o con
 * la partida ganada no corre. No modifica el estado recibido.
 */
export function stepIncome(state: MatchState, dtMs: number): IncomeStep {
  if (state.round.phase !== 'attack' || isDefeated(state) || dtMs <= 0) return { state, earned: 0 };
  const counted = state.incomeMs + dtMs;
  const drips = Math.floor(counted / ECONOMY.passiveIntervalMs);
  const earned = drips * ECONOMY.passiveIncome;
  const incomeMs = counted - drips * ECONOMY.passiveIntervalMs;
  return { state: { ...earn(state, earned), incomeMs }, earned };
}
