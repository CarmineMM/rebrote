import type { BoardPoint } from '../core/board';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Donde caen en pantalla las cuatro esquinas del tablero. */
export interface BoardQuad {
  /** Esquina del fondo a la izquierda: punto de tablero (0, 0). */
  backLeft: ScreenPoint;
  /** Punto de tablero (columnas, 0). */
  backRight: ScreenPoint;
  /** Punto de tablero (columnas, carriles). */
  frontRight: ScreenPoint;
  /** Punto de tablero (0, carriles). */
  frontLeft: ScreenPoint;
}

export interface Perspective {
  toScreen(point: BoardPoint): ScreenPoint;
  /** Punto del tablero bajo un punto de pantalla; null si cae por encima del horizonte. */
  toBoard(point: ScreenPoint): BoardPoint | null;
  /** Ancho en pantalla de una casilla a la profundidad del punto: escala lo que se dibuja de pie. */
  cellWidthAt(point: BoardPoint): number;
}

/**
 * Camara inclinada (ADR-0005): una homografia que lleva el tablero plano al trapecio `quad`.
 * Las filas del fondo salen mas bajas y estrechas que las del frente, como en una foto real.
 * Funciona tambien fuera del tablero, para colocar el decorado alrededor con la misma perspectiva.
 */
export function createPerspective(quad: BoardQuad, columns: number, lanes: number): Perspective {
  // Cuadrado unidad -> cuadrilatero (Heckbert, "Fundamentals of Texture Mapping", 1989).
  const { x: x0, y: y0 } = quad.backLeft;
  const { x: x1, y: y1 } = quad.backRight;
  const { x: x2, y: y2 } = quad.frontRight;
  const { x: x3, y: y3 } = quad.frontLeft;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-9) {
    throw new Error('Las esquinas del tablero no forman un cuadrilatero valido');
  }
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;

  // Inversa por la adjunta de [[a, b, c], [d, e, f], [g, h, 1]]; la escala no importa en coordenadas homogeneas.
  const ia = e - f * h;
  const ib = c * h - b;
  const ic = b * f - c * e;
  const id = f * g - d;
  const ie = a - c * g;
  const iff = c * d - a * f;
  const ig = d * h - e * g;
  const ih = b * g - a * h;
  const ii = a * e - b * d;

  const toScreen = (point: BoardPoint): ScreenPoint => {
    const s = point.x / columns;
    const t = point.y / lanes;
    const w = g * s + h * t + 1;
    return { x: (a * s + b * t + c) / w, y: (d * s + e * t + f) / w };
  };

  const toBoard = (point: ScreenPoint): BoardPoint | null => {
    const w = ig * point.x + ih * point.y + ii;
    if (w === 0) return null;
    const s = (ia * point.x + ib * point.y + ic) / w;
    const t = (id * point.x + ie * point.y + iff) / w;
    // Si el punto quedara detras de la camara, no esta sobre el suelo visible.
    if (!(g * s + h * t + 1 > 0)) return null;
    return { x: s * columns, y: t * lanes };
  };

  const cellWidthAt = (point: BoardPoint): number => {
    const left = toScreen({ x: point.x - 0.5, y: point.y });
    const right = toScreen({ x: point.x + 0.5, y: point.y });
    return Math.hypot(right.x - left.x, right.y - left.y);
  };

  return { toScreen, toBoard, cellWidthAt };
}
