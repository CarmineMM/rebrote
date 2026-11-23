/**
 * Que es un personaje dibujado (T-031): la forma comun de las propuestas de Boxer y Patty, para que la galeria, el juego
 * y los tests las traten igual. Sin Phaser: un pintor de Canvas 2D que recibe el contexto y la pose.
 */

/** Quien habla en las viñetas. El jugador no tiene cara (H-12). */
export type CharacterId = 'boxer' | 'patty';

/** Expresiones de cada personaje (Y-04). Dudoso, desde T-043 (HG-05): la duda leve de Patty en el giro. */
export type Expression = 'normal' | 'hurried' | 'happy' | 'doubtful';

export const EXPRESSIONS: readonly Expression[] = ['normal', 'hurried', 'happy', 'doubtful'];

/**
 * Lo que cambia de un fotograma a otro: la expresion, el parpadeo y la boca. La viñeta alterna la boca mientras sale el
 * texto y parpadea cada pocos segundos.
 */
export interface Pose {
  readonly expression: Expression;
  /** Ojos cerrados. */
  readonly blink: boolean;
  /** Boca abierta (hablando). */
  readonly open: boolean;
}

/** Tamaño de diseño del retrato, en unidades de pintor: el busto entero cabe dentro (lo comprueba el test). */
export const PORTRAIT_SIZE = { width: 320, height: 360 } as const;

/** Colores de la placa con su nombre y del borde del bocadillo: luz, tono y sombra. */
export interface CharacterTone {
  readonly light: string;
  readonly mid: string;
  readonly dark: string;
}

export interface CharacterDesign {
  /** "boxer-cables", "patty-coat"... unico entre todas las propuestas. */
  readonly id: string;
  readonly character: CharacterId;
  /** Nombre corto de la propuesta, solo para la galeria de desarrollo. */
  readonly label: string;
  /** Lo que la distingue, en una frase, para la galeria. */
  readonly about: string;
  readonly tone: CharacterTone;
  /** Pinta el busto en `PORTRAIT_SIZE`, con la luz arriba a la izquierda y mirando un poco a la derecha (al bocadillo). */
  readonly paint: (ctx: CanvasRenderingContext2D, pose: Pose) => void;
}
