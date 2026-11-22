import { POWER_LEVELS, POWERS, SHOP } from '../config/balance';
import { POWER_IDS, isPowerId, isPowerLevel, isPowerMilestone, type CarriedPower, type PowerId } from './powers';
import { isGreenhouseOpen } from './route';

/**
 * Tienda (T-022; T-01 a T-04 decididas por Carmine el 22 nov 2026): donde se gastan las semillas (T-020). Se abre al vencer
 * a Creeper, como el Invernadero (T-019), y vende los tres poderes (T-021):
 * - **Comprar un poder** (T-01) es para siempre: llega en el nivel 1 y trae sus cargas a cada partida. Cuesta lo que diga
 *   `SHOP.powerPrices` segun cuantos se tengan ya: el primero, sea cual sea, 1000.
 * - **Mejorarlo** sube su nivel hasta `POWER_LEVELS.max` (lo que da cada nivel esta en `powers.ts`). Subir al nivel N cuesta
 *   `SHOP.upgradePerLevel` x N, y el doble en los niveles con premio.
 * - **Nada se devuelve** (T-03) y nada se compra dos veces.
 * - **Lo que se lleva** al siguiente brote (T-04) se elige antes de empezarlo, como mucho `POWERS.maxCarried` (O-02). Se
 *   recuerda para el siguiente; un poder recien comprado entra solo si cabe.
 *
 * Las reglas son puras: reciben lo que tiene el jugador (`Wallet`, parte de su progreso) y devuelven lo nuevo. Si algo no se
 * puede, devuelven lo mismo: dos clics seguidos nunca cobran dos veces ni dejan el saldo en negativo.
 */

/** Lo que tiene el jugador para la tienda. Es parte de su progreso permanente (`Progress`, ADR-0014). */
export interface Wallet {
  /** Semillas: entero, de 0 al maximo (T-020). */
  readonly seeds: number;
  /** Poderes comprados y su nivel, del 1 al maximo. El que no esta, no se tiene. */
  readonly powers: Readonly<Partial<Record<PowerId, number>>>;
  /** Los que se llevan al siguiente brote, en el orden del panel: solo comprados y como mucho `POWERS.maxCarried`. */
  readonly carried: readonly PowerId[];
}

/** La tienda esta abierta: se vencio a Creeper (T-022), lo mismo que abre el Invernadero. */
export function isShopOpen(defeated: readonly string[]): boolean {
  return isGreenhouseOpen(defeated);
}

/**
 * Ganar el brote `outbreak` abre la tienda: es la primera vez que se vence a Creeper (`replay`: el brote ya estaba vencido
 * al empezar la partida). La victoria lo avisa.
 */
export function opensShop(outbreak: string, replay: boolean): boolean {
  return !replay && isShopOpen([outbreak]);
}

/** Nivel del poder `id` del jugador, o null si no lo tiene. */
export function ownedLevel(wallet: Wallet, id: PowerId): number | null {
  const level = wallet.powers[id];
  return level === undefined ? null : level;
}

/** Poderes que tiene, en el orden del panel. */
export function ownedPowers(wallet: Wallet): PowerId[] {
  return POWER_IDS.filter((id) => ownedLevel(wallet, id) !== null);
}

/** Lo que cuesta un poder que aun no tiene: depende de cuantos tiene ya (T-02). Null si los tiene todos. */
export function nextPowerPrice(wallet: Wallet): number | null {
  return SHOP.powerPrices[ownedPowers(wallet).length] ?? null;
}

/** Lo que cuesta subir un poder al nivel `level` (del 2 al maximo): `upgradePerLevel` x nivel, y mas en los de premio. */
export function upgradeCost(level: number): number {
  return SHOP.upgradePerLevel * level * (isPowerMilestone(level) ? SHOP.milestoneFactor : 1);
}

/** Por que no se puede comprar o mejorar un poder: ya lo tiene, aun no lo tiene, esta en el maximo o faltan semillas. */
export type ShopBlocker = 'owned' | 'not-owned' | 'max-level' | 'seeds';

export function buyBlocker(wallet: Wallet, id: PowerId): ShopBlocker | null {
  if (ownedLevel(wallet, id) !== null) return 'owned';
  const price = nextPowerPrice(wallet);
  return price === null ? 'owned' : wallet.seeds < price ? 'seeds' : null;
}

/** Lo que costaria mejorar ahora el poder `id`: el siguiente nivel y su precio. Null si no lo tiene o ya esta en el maximo. */
export function nextUpgrade(wallet: Wallet, id: PowerId): { level: number; cost: number } | null {
  const level = ownedLevel(wallet, id);
  if (level === null || level >= POWER_LEVELS.max) return null;
  return { level: level + 1, cost: upgradeCost(level + 1) };
}

export function upgradeBlocker(wallet: Wallet, id: PowerId): ShopBlocker | null {
  const level = ownedLevel(wallet, id);
  if (level === null) return 'not-owned';
  const next = nextUpgrade(wallet, id);
  if (!next) return 'max-level';
  return wallet.seeds < next.cost ? 'seeds' : null;
}

/** En el orden del panel y sin repetir. */
const inPanelOrder = (ids: readonly PowerId[]): PowerId[] => POWER_IDS.filter((id) => ids.includes(id));

/**
 * Compra el poder `id`: descuenta su precio y lo deja en el nivel 1. Si cabe, va directo a lo que se lleva al siguiente
 * brote (lo recien comprado se quiere probar). Si no se puede comprar, devuelve lo mismo.
 */
export function buyPower<W extends Wallet>(wallet: W, id: PowerId): W {
  const price = nextPowerPrice(wallet);
  if (buyBlocker(wallet, id) !== null || price === null) return wallet;
  const carried = wallet.carried.length < POWERS.maxCarried ? inPanelOrder([...wallet.carried, id]) : wallet.carried;
  return { ...wallet, seeds: wallet.seeds - price, powers: { ...wallet.powers, [id]: 1 }, carried };
}

/** Mejora el poder `id` un nivel: descuenta el precio del nivel nuevo. Si no se puede, devuelve lo mismo. */
export function upgradePower<W extends Wallet>(wallet: W, id: PowerId): W {
  const next = nextUpgrade(wallet, id);
  if (upgradeBlocker(wallet, id) !== null || !next) return wallet;
  return { ...wallet, seeds: wallet.seeds - next.cost, powers: { ...wallet.powers, [id]: next.level } };
}

/** Por que no se puede llevar un poder mas: no lo tiene o ya lleva el maximo (O-02). */
export type CarryBlocker = 'not-owned' | 'full';

export function carryBlocker(wallet: Wallet, id: PowerId): CarryBlocker | null {
  if (ownedLevel(wallet, id) === null) return 'not-owned';
  if (wallet.carried.includes(id)) return null;
  return wallet.carried.length >= POWERS.maxCarried ? 'full' : null;
}

/** Lleva o deja el poder `id` en el siguiente brote. Lo que no se puede llevar (no lo tiene o no cabe) devuelve lo mismo. */
export function toggleCarried<W extends Wallet>(wallet: W, id: PowerId): W {
  if (wallet.carried.includes(id)) return { ...wallet, carried: wallet.carried.filter((c) => c !== id) };
  if (carryBlocker(wallet, id) !== null) return wallet;
  return { ...wallet, carried: inPanelOrder([...wallet.carried, id]) };
}

/** Lo que trae una partida nueva: los poderes elegidos que tiene, con su nivel, en el orden del panel. */
export function carriedLoadout(wallet: Wallet): CarriedPower[] {
  return inPanelOrder(wallet.carried).flatMap((id) => {
    const level = ownedLevel(wallet, id);
    return level === null ? [] : [{ id, level }];
  });
}

/** Lo que cuesta la tienda entera: los tres poderes y todas sus mejoras. Sirve para medirla contra lo que dan los brotes. */
export function shopTotal(): number {
  let total = SHOP.powerPrices.reduce((sum, price) => sum + price, 0);
  for (let level = 2; level <= POWER_LEVELS.max; level++) total += POWER_IDS.length * upgradeCost(level);
  return total;
}

// ---------------------------------------------------------------------------
// Lo guardado (lo usa `progress.ts` al leer el progreso)

/** Poderes comprados de lo guardado: cada uno con un nivel que existe. Lo demas se pierde. */
export function sanitizeOwned(value: unknown): Partial<Record<PowerId, number>> {
  const owned: Partial<Record<PowerId, number>> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return owned;
  for (const [id, level] of Object.entries(value)) {
    if (isPowerId(id) && isPowerLevel(level)) owned[id] = level;
  }
  return owned;
}

/** Los que se llevan, de lo guardado: solo comprados, sin repetir, en el orden del panel y como mucho el maximo. */
export function sanitizeCarried(value: unknown, owned: Partial<Record<PowerId, number>>): PowerId[] {
  const listed: unknown[] = Array.isArray(value) ? value : [];
  return inPanelOrder(listed.filter((id): id is PowerId => isPowerId(id) && owned[id] !== undefined)).slice(0, POWERS.maxCarried);
}
