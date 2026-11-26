import type { FloorDesign, FloorGrid } from './floors/design';
import { LEGACY_FLOOR } from './floors/legacy';

/**
 * Suelo del tablero que usa el juego (T-050). Cada suelo vive en `floors/` con su pintor; aqui se elige uno. Va en la
 * textura del terreno (`TEX.land`), asi que lo comparten el tablero, la portada, el catalogo y las galerias: cambiar
 * esta linea cambia el suelo en todo el juego (SU-04).
 *
 * Mientras dura la fase 1 de T-050 es el de siempre, el cesped a cuadros (`floors/legacy.ts`). Las propuestas (bancales,
 * patio y raices) se comparan en la galeria de desarrollo (`/proposals/suelo.html`), que no entra en `npm run build`.
 * Un suelo distinto por brote (SU-07) se eligira tambien aqui, cuando haga falta.
 */
export const FLOOR: FloorDesign = LEGACY_FLOOR;

/** Cuanto dibuja el suelo las columnas (SU-03): el de siempre las dibuja igual con los dos. */
export const FLOOR_GRID: FloorGrid = 'hinted';
