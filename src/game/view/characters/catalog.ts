import { BOXER_MIX, BOXER_PROPOSALS } from './boxer';
import type { CharacterDesign } from './design';
import { PATTY_PROPOSALS } from './patty';

/** Boxer: el elegido (la mezcla de a y b, Y-01) y las tres propuestas de la segunda ronda, como referencia. */
export const BOXER_DESIGNS: readonly CharacterDesign[] = [BOXER_MIX, ...BOXER_PROPOSALS];

/**
 * Todos los dibujos de personajes (T-031): Boxer y las propuestas de los dos. Solo lo usan la galeria de desarrollo
 * (`/proposals/personajes.html`) y los tests: el juego importa solo los elegidos (`CAST` en `cast.ts`).
 */
export const CHARACTER_PROPOSALS: readonly CharacterDesign[] = [...BOXER_DESIGNS, ...PATTY_PROPOSALS];

export { BOXER_PROPOSALS, PATTY_PROPOSALS };
