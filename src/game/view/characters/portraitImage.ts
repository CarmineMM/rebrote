import { type CharacterDesign, PORTRAIT_SIZE, type Pose } from './design';

/**
 * Retrato de un personaje como imagen (T-031, ADR-0019): el pintor dibuja en un lienzo aparte y React solo enseña la
 * imagen, como la foto de la ficha (`portrait.ts`). Cada fotograma (expresion, parpadeo y boca) se pinta una vez y se
 * guarda: la viñeta cambia de imagen para hablar y parpadear sin volver a pintar.
 */

/** Resolucion del retrato: el doble del tamano de diseno, para que se vea nitido en pantallas de alta densidad. */
export const PORTRAIT_SCALE = 2;

const cache = new Map<string, string>();

export const poseKey = (pose: Pose) => `${pose.expression}:${pose.blink ? 1 : 0}:${pose.open ? 1 : 0}`;

/** Pinta el retrato en un lienzo, a `scale` veces su tamano de diseno. */
export function paintPortrait(canvas: HTMLCanvasElement, design: CharacterDesign, pose: Pose, scale = PORTRAIT_SCALE): void {
  canvas.width = Math.round(PORTRAIT_SIZE.width * scale);
  canvas.height = Math.round(PORTRAIT_SIZE.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, PORTRAIT_SIZE.width, PORTRAIT_SIZE.height);
  design.paint(ctx, pose);
}

/** El retrato como imagen (data URL de un PNG), pintado una vez por fotograma. Sin DOM (tests), cadena vacia. */
export function portraitUrl(design: CharacterDesign, pose: Pose, scale = PORTRAIT_SCALE): string {
  const key = `${design.id}:${poseKey(pose)}:${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  paintPortrait(canvas, design, pose, scale);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
