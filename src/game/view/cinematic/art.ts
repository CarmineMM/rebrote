import type { CharacterId } from '../characters/design';
import type { AiDesign } from './aiArt';
import type { Ctx } from './geometry';

/**
 * Lo que comparten los pintores de las capas de una cinematica (T-049). Una capa se pinta una vez en su caja y luego solo
 * se mueve (`PaintedArt`), o se pinta en cada fotograma con el tiempo del plano (`LiveArt`). Sin Phaser ni DOM.
 */

/** Cuanto se pinta y se anima, del nivel grafico (ADR-0006) y de "reducir movimiento" del sistema. */
export interface CinematicLook {
  /** Multiplicador de particulas (0,25 en bajo). */
  readonly particles: number;
  /** Multiplicador de vida del escenario: estrellas, polvo, gente que pasa. */
  readonly life: number;
  /** Brillos y halos. */
  readonly glows: boolean;
  /** Movimiento reducido: lo que se anima solo se queda en su estado final. */
  readonly still: boolean;
}

/** Un retrato de personaje con los ojos abiertos y cerrados (para parpadear). */
export interface BustFrames {
  readonly open: CanvasImageSource;
  readonly blink: CanvasImageSource;
}

/**
 * Las imagenes que no se pintan aqui. Creeper, el gusano y la disparadora son entidades del juego: los recorta la escena
 * de Phaser con sus texturas (`cinematicCutouts`, regla 3 de `CLAUDE.md`). Las versiones en verde son las mismas tenidas
 * de fosforo, para las pantallas. Los bustos de Boxer y Patty son sus retratos de siempre (`CAST`). Mientras no lleguen,
 * la capa que los usa no los pinta.
 */
export interface CinematicImages {
  readonly creeper: CanvasImageSource | null;
  readonly worm: CanvasImageSource | null;
  readonly shooter: CanvasImageSource | null;
  readonly creeperGreen: CanvasImageSource | null;
  readonly wormGreen: CanvasImageSource | null;
  readonly busts: Readonly<Partial<Record<CharacterId, BustFrames>>>;
}

export const NO_IMAGES: CinematicImages = { creeper: null, worm: null, shooter: null, creeperGreen: null, wormGreen: null, busts: {} };

/** Lado de los recortes de la escena, en unidades de pintor (como la foto de la ficha: 200 x 200, el sujeto dentro). */
export const CUTOUT_SIZE = 200;

/** Lo que se lee dentro del dibujo (`story.cinematic.screen` de `src/i18n/`): las pantallas de 1971. */
export interface CinematicScreenText {
  readonly creeper: readonly [string, string];
  readonly network: string;
  readonly node: (node: number) => string;
}

export interface ArtEnv {
  readonly look: CinematicLook;
  readonly screen: CinematicScreenText;
  readonly images: CinematicImages;
  /** La propuesta de la IA que se pinta (`AI_DESIGN`; la galeria prueba otras). */
  readonly ai: AiDesign;
}

/** Una caja en coordenadas del diseno (1600 x 900): donde va la capa pintada. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PaintedArt {
  readonly kind: 'paint';
  readonly box: Box;
  /** Pinta la capa con (0, 0) en la esquina de su caja. */
  readonly paint: (ctx: Ctx, env: ArtEnv) => void;
  /** Depende de la propuesta de la IA: se vuelve a pintar si cambia. */
  readonly usesAi?: boolean;
}

export interface LiveArt {
  readonly kind: 'live';
  /** Pinta en coordenadas del diseno, a los `t` ms de entrar el plano. */
  readonly draw: (ctx: Ctx, t: number, env: ArtEnv) => void;
}

export type CinematicArt = PaintedArt | LiveArt;

/** Segundos de un tiempo en ms, para leer mejor las animaciones. */
export const sec = (ms: number) => ms / 1000;

/** Una imagen recortada de la escena dibujada centrada en (x, y) con `size` de lado (el del recorte entero). */
export function drawCutout(ctx: Ctx, image: CanvasImageSource | null, x: number, y: number, size: number, alpha = 1): void {
  if (!image || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}
