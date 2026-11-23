import { BULB_SHOOTER } from './shooters/bulb';
import type { ShooterDesign } from './shooters/design';

/**
 * Forma de la disparadora que usa el juego (T-016). Cada forma vive en `shooters/` con sus medidas y su pintor; aqui
 * se elige una. Tablero, ficha, portada, tours y arrastre de fusion la toman de aqui, asi que cambiar esta linea cambia
 * la disparadora en todo el juego.
 *
 * Desde el 21 nov 2026 es "Brote" (`bulb`), la que eligio Carmine en el rediseno (T-016, X-03). La de antes queda
 * guardada entera como `legacy` (`shooters/legacy.ts`): para volver a ella basta con ponerla aqui. Las demas propuestas
 * siguen en `shooters/` y se comparan en la galeria de desarrollo (`/proposals/disparadoras.html`).
 */
export const SHOOTER: ShooterDesign = BULB_SHOOTER;

export type { ShooterCannons, ShooterDesign, ShooterVariant } from './shooters/design';

/** Medidas de la textura y punto de apoyo (los pies) de la forma activa. 160 de ancho: una casilla. */
export const SHOOTER_SIZE = SHOOTER.size;

/** Canones de la forma activa segun cuantos tenga, de arriba abajo. De aqui sale la boca de cada uno (`barrelMuzzle`). */
export const SHOOTER_BARRELS = SHOOTER.barrels;
