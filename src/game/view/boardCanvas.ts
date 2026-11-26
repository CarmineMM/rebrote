import type { BoardPoint } from '../core/board';
import type { Ctx } from './canvasKit';
import { perspective } from './layout';
import type { ScreenPoint } from './perspective';

/**
 * Pintar con Canvas 2D en coordenadas de tablero (ADR-0005): el terreno (`textures.ts`) y los suelos del tablero
 * (`floors/`) dibujan en casillas y aqui se pasan a la camara inclinada. Sin Phaser.
 */

/** Punto de pantalla de un punto del tablero (tambien fuera de el: camino, seto, suelo corrupto). */
export const P = (x: number, y: number): ScreenPoint => perspective.toScreen({ x, y });

/** Ancho en pantalla de una casilla a esa profundidad: escala lo que se pinta (trazos, briznas, piedras). */
export const cwAt = (x: number, y: number): number => perspective.cellWidthAt({ x, y });

/** Poligono cerrado de puntos del tablero, listo para rellenar o trazar. */
export function boardPolygon(ctx: Ctx, points: ReadonlyArray<readonly [number, number]>): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const p = P(x, y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

/** Rectangulo del tablero (en pantalla, un trapecio). */
export function boardRect(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  boardPolygon(ctx, [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]);
}

/** Linea abierta por puntos del tablero, lista para trazar. */
export function boardPath(ctx: Ctx, points: readonly BoardPoint[]): void {
  ctx.beginPath();
  points.forEach((point, i) => {
    const p = P(point.x, point.y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
}

/** Elipse tumbada en el suelo del tablero: un circulo de radios `rx` y `ry` casillas visto con la camara inclinada. */
export function boardEllipse(ctx: Ctx, center: BoardPoint, rx: number, ry: number, steps = 28): void {
  ctx.beginPath();
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const p = P(center.x + Math.cos(a) * rx, center.y + Math.sin(a) * ry);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}
