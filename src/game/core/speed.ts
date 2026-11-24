import { GAME_SPEED } from '../config/balance';

/**
 * Velocidad del juego (T-048, ADR-0008). Acelerar no cambia ninguna regla: la escena da a `stepRound`, `stepIncome` y
 * `stepCombat` mas tiempo de juego por cada fotograma (`gameDelta`) y el combate lo reparte en pasos de `MAX_STEP_MS`.
 * La velocidad no va en la partida guardada: toda partida, nueva o continuada, empieza en la primera (VJ-05).
 */

/** Una de las velocidades de `GAME_SPEED.steps`. */
export type GameSpeed = (typeof GAME_SPEED.steps)[number];

/** La de siempre (×1): con la que empieza toda partida. */
export const NORMAL_SPEED: GameSpeed = GAME_SPEED.steps[0];

/** La velocidad que sigue a `current` (el boton y la V); despues de la ultima, la primera. Una desconocida pasa a la primera. */
export function nextSpeed(current: number): GameSpeed {
  const index = GAME_SPEED.steps.indexOf(current as GameSpeed);
  return index < 0 ? NORMAL_SPEED : GAME_SPEED.steps[(index + 1) % GAME_SPEED.steps.length];
}

/** `value` si es una de las velocidades; si no (llega de fuera: un evento, un numero raro), la de siempre. */
export function validSpeed(value: unknown): GameSpeed {
  return GAME_SPEED.steps.includes(value as GameSpeed) ? (value as GameSpeed) : NORMAL_SPEED;
}

/** Tiempo de juego que trae un fotograma de `realMs` a la velocidad `speed`. */
export function gameDelta(realMs: number, speed: number): number {
  return realMs * validSpeed(speed);
}
