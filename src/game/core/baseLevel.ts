import { BASE_LEVEL } from '../config/balance';

/**
 * Nivel base de la disparadora (T-023; N-01 a N-06 decididas el 22 nov 2026): una mejora permanente que se compra con
 * semillas en el Invernadero, del 1 al `BASE_LEVEL.max`. Toda disparadora sembrada en una partida nueva nace en ese
 * nivel (N-01 a): es una planta de ese nivel a todos los efectos, con su premio y su jardincito si llega al 5 (N-05), y
 * subirla en la partida cuesta lo que cuesta desde su nivel (N-06 a). El tope de nivel de cada ronda no cambia.
 *
 * Las reglas son puras, como las de la tienda (`shop.ts`): reciben lo que tiene el jugador y devuelven lo nuevo, o lo
 * mismo si no se puede (dos clics seguidos nunca cobran dos veces).
 */

/** Lo que mira y cambia la mejora: las semillas y el nivel base. Es parte del progreso permanente (`Progress`). */
export interface BaseLevelWallet {
  readonly seeds: number;
  /** Nivel con el que nacen las disparadoras: entero del 1 al `BASE_LEVEL.max`. */
  readonly baseLevel: number;
}

/** El nivel base de quien aun no compro nada: el de siempre. */
export const NO_BASE_LEVEL = 1;

/** ¿Es un nivel base que existe? Entero del 1 al maximo. */
export function isBaseLevel(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= NO_BASE_LEVEL && (value as number) <= BASE_LEVEL.max;
}

/** Lo que cuesta subir el nivel base a `level` (del 2 al maximo). */
export function baseLevelCost(level: number): number {
  const price = BASE_LEVEL.prices[level - 2];
  if (price === undefined) throw new Error(`No hay paso de nivel base al ${level}`);
  return price;
}

/** El siguiente paso: su nivel y su precio. Null en el maximo ("Maximo"). */
export function nextBaseStep(wallet: BaseLevelWallet): { level: number; cost: number } | null {
  if (wallet.baseLevel >= BASE_LEVEL.max) return null;
  const level = wallet.baseLevel + 1;
  return { level, cost: baseLevelCost(level) };
}

/** Por que no se puede comprar el siguiente paso: ya esta en el maximo o faltan semillas. */
export type BaseLevelBlocker = 'max-level' | 'seeds';

export function baseLevelBlocker(wallet: BaseLevelWallet): BaseLevelBlocker | null {
  const next = nextBaseStep(wallet);
  if (!next) return 'max-level';
  return wallet.seeds < next.cost ? 'seeds' : null;
}

/** Compra el siguiente paso: descuenta su precio y sube el nivel base. Si no se puede, devuelve lo mismo. */
export function buyBaseLevel<W extends BaseLevelWallet>(wallet: W): W {
  const next = nextBaseStep(wallet);
  if (baseLevelBlocker(wallet) !== null || !next) return wallet;
  return { ...wallet, seeds: wallet.seeds - next.cost, baseLevel: next.level };
}

/** Lo que cuesta la mejora entera, del 1 al maximo. Sirve para medirla contra lo que dan los brotes. */
export function baseLevelTotal(): number {
  return BASE_LEVEL.prices.reduce((sum, price) => sum + price, 0);
}

/** Solo en desarrollo (T-023): el nivel base de `?nivelbase=N` en la direccion, o null si no viene o no existe. */
export function baseLevelFromParam(param: string | null): number | null {
  if (param === null) return null;
  const level = Number(param.trim());
  return isBaseLevel(level) ? level : null;
}

/** El nivel base de lo guardado: uno que existe, o el de siempre. */
export function sanitizeBaseLevel(value: unknown): number {
  return isBaseLevel(value) ? value : NO_BASE_LEVEL;
}
