/**
 * Utilidades de pintado con Canvas 2D que comparten `textures.ts` y las formas de la disparadora (`shooters/`).
 * Sin Phaser: solo dibujan en un contexto que reciben.
 */

export type Ctx = CanvasRenderingContext2D;

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rotation = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Hoja con forma de almendra desde (x, y) en direccion `angle`. */
export function leafShape(ctx: Ctx, x: number, y: number, length: number, width: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.45, -width, length, 0);
  ctx.quadraticCurveTo(length * 0.45, width, 0, 0);
  ctx.closePath();
  ctx.restore();
}

export function smallFlower(ctx: Ctx, x: number, y: number, r: number, petal: string, center: string): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, petal);
  }
  circle(ctx, x, y, r * 0.7, center);
}
