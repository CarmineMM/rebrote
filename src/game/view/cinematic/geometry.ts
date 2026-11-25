/**
 * Utilidades de dibujo de la cinematica (T-049): puntos, curvas suaves que pasan por una lista de puntos, trozos de una
 * linea quebrada y numeros al azar con semilla. Sin Phaser ni DOM: Canvas 2D y aritmetica.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export type Ctx = CanvasRenderingContext2D;

/** Numeros al azar repetibles (mulberry32): el mismo dibujo con la misma semilla. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Traza una curva suave que pasa por todos los puntos (Catmull-Rom pasada a Bezier). Cerrada, vuelve al primero. No
 * empieza el camino (`beginPath`) ni lo rellena: asi se pueden juntar varias en uno.
 */
export function smoothPath(ctx: Ctx, points: readonly Pt[], closed = false, tension = 1): void {
  const n = points.length;
  if (n < 2) return;
  const at = (i: number) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(points[0].x, points[0].y);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) * k, p1.y + (p2.y - p0.y) * k, p2.x - (p3.x - p1.x) * k, p2.y - (p3.y - p1.y) * k, p2.x, p2.y);
  }
  if (closed) ctx.closePath();
}

/** Largo de una linea quebrada. */
export function polylineLength(points: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

/** Los puntos de una linea quebrada hasta una fraccion de su largo (de 0 a 1), cortando el ultimo tramo donde toque. */
export function polylinePart(points: readonly Pt[], fraction: number): Pt[] {
  if (points.length === 0) return [];
  const goal = polylineLength(points) * clamp(fraction);
  const out: Pt[] = [points[0]];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const step = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + step >= goal) {
      const t = step === 0 ? 0 : (goal - walked) / step;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      return out;
    }
    walked += step;
    out.push(b);
  }
  return out;
}

/** Simetrico respecto a x = 0: el lado izquierdo de una silueta a partir del derecho, en orden inverso. */
export const mirror = (points: readonly Pt[]): Pt[] => points.map((p) => ({ x: -p.x, y: p.y })).reverse();

/** Rectangulo con esquinas redondeadas (solo el camino). */
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Degradado vertical de varios colores repartidos por igual. */
export function vertical(ctx: Ctx, top: number, bottom: number, colors: readonly string[]): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  colors.forEach((color, i) => gradient.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), color));
  return gradient;
}

/** Halo redondo que se desvanece hacia fuera. */
export function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha = 1): void {
  if (radius <= 0 || alpha <= 0) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
