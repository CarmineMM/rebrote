import type { Ctx } from '../canvasKit';

/**
 * Forma de una disparadora (T-016): todo lo que el juego necesita saber de su dibujo para pintarla, colocarla y animarla.
 * Sin Phaser: la usan las texturas, las vistas, la galeria de propuestas y los tests.
 *
 * Todas las medidas van en pixeles de su textura (diseno, 160 px por casilla). El juego usa una sola, la activa
 * (`SHOOTER` en `shooterShape.ts`); las demas quedan guardadas para poder cambiar de una a otra.
 */

export type ShooterCannons = 1 | 2 | 3;
export type ShooterVariant = 'normal' | 'fire' | 'ice';

export const SHOOTER_CANNONS: readonly ShooterCannons[] = [1, 2, 3];
export const SHOOTER_VARIANTS: readonly ShooterVariant[] = ['normal', 'fire', 'ice'];

export interface ShooterSize {
  width: number;
  height: number;
  /** Pies: el punto de apoyo en el suelo. */
  footX: number;
  footY: number;
}

/**
 * Un canon: su boca (de ahi sale la semilla, mirando a la derecha), el alto del tubo en la boca y donde nace en el
 * cuerpo. Si el tubo es curvo, de `from` a la boca va su tramo recto final: lo que la medallita no debe tapar.
 */
export interface Barrel {
  /** Altura de la boca. */
  y: number;
  /** Boca del canon. */
  mouthX: number;
  /** Alto del tubo en la boca. */
  h: number;
  /** Donde nace el tubo. */
  fromX: number;
  fromY: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Ellipse extends Point {
  rx: number;
  ry: number;
}

/** Marca de un canon en el cuerpo (los puntos dorados del tallo en la de siempre): destella al fusionarse. */
export interface Mark extends Point {
  r: number;
}

export interface ShooterDesign {
  /** Clave corta: va en el nombre de sus texturas. */
  readonly id: string;
  readonly size: ShooterSize;
  /** Canones segun cuantos tenga, de arriba abajo: el canon 0 es el de arriba, como en los eventos `shot`. */
  readonly barrels: Readonly<Record<ShooterCannons, readonly Barrel[]>>;
  /** Una marca por canon, en el orden en que salen al fusionar: la ultima es la del canon nuevo. */
  marks(cannons: ShooterCannons): readonly Mark[];
  /** Centro de la medallita de nivel: en la nuca, sin tapar el ojo, los canones ni las marcas. */
  medal(cannons: ShooterCannons): Point;
  /** Ojo: lo que mas se tiene que leer de la cara. */
  eye(cannons: ShooterCannons): Ellipse;
  /** Pinta la textura en medidas de diseno (el contexto ya va escalado a la resolucion del nivel grafico). */
  paint(ctx: Ctx, cannons: ShooterCannons, variant: ShooterVariant): void;
}
