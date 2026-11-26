import type { FloorDesign, FloorGrid } from './floors/design';
import { SUNNY_ROOTS_FLOOR } from './floors/roots';

/**
 * Suelo del tablero que usa el juego (T-050). Cada suelo vive en `floors/` con su pintor; aqui se elige uno. Va en la
 * textura del terreno (`TEX.land`), asi que lo comparten el tablero, la portada, el catalogo y las galerias: cambiar
 * esta linea cambia el suelo en todo el juego (SU-04).
 *
 * Desde el 26 nov 2026 es D, raices al sol (`SUNNY_ROOTS_FLOOR` en `floors/roots.ts`), la que eligio Carmine en la galeria
 * (T-050, SU-02): tierra clara de arena dorada con la red de raices verdes que dibuja los carriles. El de antes, el cesped a
 * cuadros, queda guardado entero como `legacy` (`floors/legacy.ts`): para volver a el basta con ponerlo aqui. Las demas
 * propuestas siguen en `floors/` y se comparan en la galeria (`/proposals/suelo.html`), que no entra en `npm run build`.
 * Un suelo distinto por brote (SU-07) se eligira tambien aqui, cuando haga falta.
 */
export const FLOOR: FloorDesign = SUNNY_ROOTS_FLOOR;

/**
 * Cuanto dibuja el suelo las columnas (SU-03): insinuadas, la recomendacion con la que se empezo (en las raices, un nudo y
 * dos raicillas en cada columna). Con `shown`, una raiz fina cruza cada carril en cada columna.
 */
export const FLOOR_GRID: FloorGrid = 'hinted';
