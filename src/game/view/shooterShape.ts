/**
 * Forma de la disparadora en pixeles de su textura (diseno, 160 px por casilla): donde apoya, sus canones,
 * los puntos del tallo y la cabeza. Sin Phaser: la usan las texturas, las vistas y los tests.
 */

/** Punto de apoyo de la disparadora dentro de su textura (los pies). 160 de ancho: una casilla. */
export const SHOOTER_SIZE = { width: 160, height: 180, footX: 80, footY: 174 } as const;

/**
 * Canones de la disparadora segun cuantos tenga (T-006), de arriba abajo, en pixeles de su textura:
 * centro en altura (`y`), desde donde sale de la cara (`fromX`), boca (`mouthX`) y alto del tubo (`h`).
 * La vista saca de aqui de donde sale cada semilla (`barrelMuzzle` en plantView.ts).
 */
export const SHOOTER_BARRELS = {
  1: [{ y: 79, fromX: 96, mouthX: 148, h: 32 }],
  2: [
    { y: 70, fromX: 94, mouthX: 145, h: 25 },
    { y: 97, fromX: 96, mouthX: 150, h: 25 },
  ],
  3: [
    { y: 61, fromX: 92, mouthX: 143, h: 21 },
    { y: 84, fromX: 94, mouthX: 151, h: 21 },
    { y: 107, fromX: 92, mouthX: 145, h: 21 },
  ],
} as const;

export type ShooterCannons = keyof typeof SHOOTER_BARRELS;

/**
 * Puntos del tallo, uno por canon, de abajo arriba (pixeles de la textura). Radio `SHOOTER_DOT_RADIUS`.
 * La medallita de nivel (T-003) no los tapa: va en la nuca, arriba a la izquierda de la cabeza (levelMedal.ts).
 */
export const SHOOTER_DOTS = [
  { x: 76, y: 158 },
  { x: 73, y: 147 },
  { x: 71.5, y: 136 },
] as const;
export const SHOOTER_DOT_RADIUS = 5;

/** Cabeza: centro y radio. Crece un poco con cada fusion. */
export function shooterHead(cannons: ShooterCannons): { x: number; y: number; r: number } {
  return { x: 76, y: 80, r: 44 + cannons * 2 };
}

/** Ojo (elipse): mira a la derecha, por donde llegan los gusanos. */
export const SHOOTER_EYE = { x: 72, y: 70, rx: 13, ry: 15 } as const;
