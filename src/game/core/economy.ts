import { ECONOMY } from '../config/balance';

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
export function rollKillReward(base: number = ECONOMY.killReward, random: () => number = Math.random): KillReward {
  return random() < ECONOMY.dropChance
    ? { kind: 'drop', amount: droppedCoinValue(base) }
    : { kind: 'auto', amount: base };
}
