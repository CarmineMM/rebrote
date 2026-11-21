import { BOXER_MIX } from './boxer';
import type { CharacterDesign, CharacterId } from './design';
import { PATTY_COAT } from './patty';

/**
 * Que dibujo de cada personaje usa el juego (T-031), como `SHOOTER` para la disparadora: cambiar una linea cambia el
 * personaje en todas las viñetas. Las propuestas se comparan en la galeria de desarrollo (`/personajes.html`).
 *
 * Elegidos por Carmine el 21 nov 2026: Boxer, la mezcla de las propuestas a) y b) de la segunda ronda (Y-01), y Patty, la
 * de la bata con una flor en el pelo (Y-02).
 */
export const CAST: Readonly<Record<CharacterId, CharacterDesign>> = {
  boxer: BOXER_MIX,
  patty: PATTY_COAT,
};

/** Si el dibujo de cada personaje ya esta elegido: la galeria marca los provisionales. */
export const CAST_CHOSEN: Readonly<Record<CharacterId, boolean>> = { boxer: true, patty: true };
