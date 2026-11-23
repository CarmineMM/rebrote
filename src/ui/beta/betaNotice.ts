import { lastOutbreak } from '../../game/core/route';
import { profiles } from '../../game/profiles';
import type { SaveStore } from '../../game/storage';

/**
 * Aviso de beta (T-044): al vencer al ultimo brote del juego sale una vez, tras la victoria y sus viñetas, el mensaje de
 * que es una beta, de que viene mas y los botones para apoyar el proyecto. En la ruta se puede leer siempre (el lugar
 * "por llegar"), y en la portada, desde la marca "Beta" junto a la version.
 *
 * Decidido el 23 nov 2026 (con la recomendacion):
 * - Sale una vez por jugador (BT-04): lo visto va en el hueco `beta` de su perfil (ADR-0018). No es progreso: no va en
 *   `Progress` (que al cambiar de forma se descartaria entero, ADR-0014), igual que los tours vistos.
 * - Lo visto se apunta con el brote que era el ultimo: al llegar un brote nuevo, el final pasa a el y quien lo venza vuelve
 *   a ver el aviso una vez (`lastOutbreak` sale de la lista de brotes; nada mas cambia).
 * - Quien ya vencio al ultimo brote antes de esta task lo ve una vez al entrar al Invernadero (tras las viñetas que
 *   tenga pendientes). Rejugar el ultimo brote no lo vuelve a sacar.
 */

export const BETA_SLOT = 'beta';

/** Momento en que puede salir solo el aviso. */
export type BetaMoment =
  /** Se acaba de vencer al jefe de este brote (en el tablero). */
  | { readonly kind: 'victory'; readonly outbreak: string }
  /** Se esta en el Invernadero. */
  | { readonly kind: 'greenhouse' };

/**
 * Sale ahora el aviso: el jugador vencio al ultimo brote (`defeated`, de su progreso) y aun no lo vio para ese brote
 * (`seen`, el brote apuntado en su hueco). Tras una victoria, solo si la victoria es la del ultimo brote.
 */
export function betaNoticeDue(moment: BetaMoment, defeated: readonly string[], seen: string | null, last: string = lastOutbreak()): boolean {
  if (!defeated.includes(last) || seen === last) return false;
  return moment.kind === 'greenhouse' || moment.outbreak === last;
}

/** El brote apuntado en lo guardado; lo que no se entiende cuenta como no visto (un aviso de mas antes que un juego roto). */
export function parseBetaSeen(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { seen?: unknown };
    return typeof data.seen === 'string' && data.seen.length > 0 && data.seen.length <= 64 ? data.seen : null;
  } catch {
    return null;
  }
}

export function encodeBetaSeen(outbreak: string): string {
  return JSON.stringify({ seen: outbreak });
}

type Store = Pick<SaveStore, 'getItem' | 'setItem'>;

/** El ultimo brote para el que el jugador vio el aviso; sin almacen, el del jugador activo. */
export function readBetaSeen(store: Store | null = profiles.store()): string | null {
  try {
    return parseBetaSeen(store?.getItem(BETA_SLOT) ?? null);
  } catch {
    return null;
  }
}

/** Apunta que vio el aviso del final en `outbreak`: no vuelve a salir solo hasta que haya otro ultimo brote. */
export function markBetaSeen(outbreak: string, store: Store | null = profiles.store()): void {
  try {
    store?.setItem(BETA_SLOT, encodeBetaSeen(outbreak));
  } catch {
    // El almacen del perfil ya guarda en memoria lo que no cabe: dura al menos esta sesion.
  }
}
