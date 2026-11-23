import { type Ctx, circle, ellipse, leafShape } from '../canvasKit';
import { curveTube, fillStroke, shine } from '../shooters/kit';
import type { Expression, Pose } from './design';

/**
 * Piezas que comparten los personajes (T-031): cara, orejas, cuello, hombros, ojos, cejas, nariz, boca, mejillas, gafas,
 * manos y gotas de sudor. Mismo estilo que el resto del juego (guia de graficos, seccion 10): degradado con la luz arriba a
 * la izquierda, contorno oscuro del mismo tono, un reflejo suave, ojos grandes con brillo y mejillas sonrosadas. Cada
 * propuesta (`boxer.ts`, `patty.ts`) elige medidas y colores y pinta lo suyo (pelo, ropa, lo que lleva en la mano).
 */

export { circle, ellipse, fillStroke, leafShape, shine, curveTube };
export type { Ctx };

/** Centro del retrato: la cara mira al frente con los ojos un poco hacia el bocadillo (a la derecha). */
export const CX = 160;

/** Contorno de la ropa y los objetos, mas fino que el de la cara. */
export const LINE = { face: 3.4, body: 3.2, detail: 2.2 } as const;

export interface Skin {
  readonly light: string;
  readonly mid: string;
  readonly dark: string;
  readonly outline: string;
  readonly blush: string;
}

export const SKINS = {
  /** Clara y rosada. */
  rosy: { light: '#ffeadb', mid: '#f7c9a8', dark: '#d9987a', outline: '#7a3f2a', blush: 'rgba(255, 112, 104, 0.34)' },
  /** Clara y calida. */
  warm: { light: '#ffe6cc', mid: '#efbe94', dark: '#c98a62', outline: '#6e3a20', blush: 'rgba(255, 110, 96, 0.32)' },
  /** Morena. */
  tan: { light: '#f6d2ae', mid: '#d39d70', dark: '#a8704a', outline: '#55301a', blush: 'rgba(240, 92, 80, 0.32)' },
  /** Oscura. */
  deep: { light: '#dca57c', mid: '#a86f48', dark: '#7a4a2c', outline: '#3b200f', blush: 'rgba(222, 80, 76, 0.34)' },
} as const satisfies Record<string, Skin>;

/** Medidas de la cabeza: coronilla, mejillas (lo mas ancho), mandibula y barbilla. */
export interface Face {
  readonly cx: number;
  readonly top: number;
  readonly cheekY: number;
  readonly cheekW: number;
  readonly jawY: number;
  readonly jawW: number;
  readonly chinY: number;
  readonly chinW: number;
}

/** Camino de la cabeza: coronilla redonda, mejillas, mandibula y barbilla, simetrico. */
export function facePath(ctx: Ctx, f: Face): void {
  const { cx, top, cheekY, cheekW, jawY, jawW, chinY, chinW } = f;
  const upper = top + (cheekY - top) * 0.42;
  const lower = cheekY + (jawY - cheekY) * 0.55;
  const jawIn = jawW + (cheekW - jawW) * 0.4;
  const jawTop = jawY - (jawY - cheekY) * 0.2;
  const chinRise = jawY + (chinY - jawY) * 0.72;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + cheekW * 0.8, top, cx + cheekW, upper, cx + cheekW, cheekY);
  ctx.bezierCurveTo(cx + cheekW, lower, cx + jawIn, jawTop, cx + jawW, jawY);
  ctx.bezierCurveTo(cx + jawW * 0.82, chinRise, cx + chinW * 1.5, chinY, cx, chinY);
  ctx.bezierCurveTo(cx - chinW * 1.5, chinY, cx - jawW * 0.82, chinRise, cx - jawW, jawY);
  ctx.bezierCurveTo(cx - jawIn, jawTop, cx - cheekW, lower, cx - cheekW, cheekY);
  ctx.bezierCurveTo(cx - cheekW, upper, cx - cheekW * 0.8, top, cx, top);
  ctx.closePath();
}

/** Degradado de piel con la luz arriba a la izquierda. */
export function skinFill(ctx: Ctx, x: number, y: number, r: number, skin: Skin): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.15);
  g.addColorStop(0, skin.light);
  g.addColorStop(0.5, skin.mid);
  g.addColorStop(1, skin.dark);
  return g;
}

export function paintFace(ctx: Ctx, f: Face, skin: Skin): void {
  facePath(ctx, f);
  fillStroke(ctx, skinFill(ctx, f.cx, f.cheekY - 10, f.cheekW * 1.2, skin), skin.outline, LINE.face);
}

/** Orejas a los lados, a la altura de los ojos, con su pliegue. Van detras de la cara. */
export function paintEars(ctx: Ctx, f: Face, y: number, skin: Skin, size = 1): void {
  for (const side of [-1, 1]) {
    const x = f.cx + side * (f.cheekW - 3);
    ctx.beginPath();
    ctx.ellipse(x + side * 6, y, 13 * size, 20 * size, side * 0.12, 0, Math.PI * 2);
    fillStroke(ctx, skinFill(ctx, x, y, 20, skin), skin.outline, LINE.face - 0.6);
    ctx.beginPath();
    ctx.moveTo(x + side * 3, y - 11 * size);
    ctx.quadraticCurveTo(x + side * 13 * size, y - 6 * size, x + side * 8, y + 9 * size);
    ctx.strokeStyle = skin.dark;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/** Cuello del pecho a la barbilla, con la sombra de la barbilla arriba. */
export function paintNeck(ctx: Ctx, cx: number, top: number, bottom: number, halfW: number, skin: Skin): void {
  ctx.beginPath();
  ctx.moveTo(cx - halfW, top);
  ctx.lineTo(cx + halfW, top);
  ctx.quadraticCurveTo(cx + halfW, bottom - 12, cx + halfW + 8, bottom);
  ctx.lineTo(cx - halfW - 8, bottom);
  ctx.quadraticCurveTo(cx - halfW, bottom - 12, cx - halfW, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, skin.dark);
  g.addColorStop(0.45, skin.mid);
  g.addColorStop(1, skin.mid);
  fillStroke(ctx, g, skin.outline, LINE.body);
}

/**
 * Camino de los hombros y el pecho, del borde de abajo al escote: hombros redondos, sin brazos (el busto se corta en el
 * pecho). `neckY` es donde nace el cuello y `shoulderY` lo alto del hombro.
 */
export function torsoPath(ctx: Ctx, cx: number, neckY: number, shoulderY: number, halfW: number, bottom: number, neckHalf: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - halfW, bottom);
  ctx.bezierCurveTo(cx - halfW, shoulderY + 36, cx - halfW + 12, shoulderY + 2, cx - halfW + 56, shoulderY - 6);
  ctx.bezierCurveTo(cx - neckHalf - 40, shoulderY - 14, cx - neckHalf - 12, neckY + 2, cx - neckHalf, neckY);
  ctx.lineTo(cx + neckHalf, neckY);
  ctx.bezierCurveTo(cx + neckHalf + 12, neckY + 2, cx + neckHalf + 40, shoulderY - 14, cx + halfW - 56, shoulderY - 6);
  ctx.bezierCurveTo(cx + halfW - 12, shoulderY + 2, cx + halfW, shoulderY + 36, cx + halfW, bottom);
  ctx.closePath();
}

/** Degradado de la ropa: luz arriba a la izquierda. */
export function clothFill(ctx: Ctx, x: number, y: number, r: number, colors: readonly [string, string, string]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.45, y - r * 0.55, r * 0.08, x, y, r * 1.1);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);
  return g;
}

/** Rectangulo con las esquinas redondas (Canvas tiene `roundRect`, pero el lienzo SVG de los iconos y los tests no). */
export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Ojos y cejas

export interface Eyes {
  /** Altura del centro y distancia de cada ojo al centro de la cara. */
  readonly y: number;
  readonly dx: number;
  readonly rx: number;
  readonly ry: number;
  /** Iris: luz y sombra. */
  readonly iris: readonly [string, string];
  readonly outline: string;
  /** Pestanas en la esquina de fuera. */
  readonly lashes?: boolean;
  /** Bolsas bajo los ojos (edad). */
  readonly bags?: boolean;
  /** Piel que tapa el parpado de abajo al sonreir. */
  readonly skin: Skin;
}

/** Ojos grandes con brillo que miran un poco a la derecha. Apurado: mas abiertos y con la pupila pequena. Contento: el
 * parpado de abajo sube. Dudoso (T-043): el parpado de arriba a media altura y la mirada de reojo, hacia arriba.
 * Parpadeando: una raya (contento, en arco hacia arriba). */
export function paintEyes(ctx: Ctx, cx: number, eyes: Eyes, pose: Pose): void {
  const { expression } = pose;
  for (const side of [-1, 1]) {
    const x = cx + side * eyes.dx;
    const y = eyes.y;
    if (pose.blink) {
      paintClosedEye(ctx, x, y, eyes, expression, side);
      continue;
    }
    const rx = eyes.rx * (expression === 'hurried' ? 1.06 : 1);
    const ry = eyes.ry * (expression === 'hurried' ? 1.12 : expression === 'happy' ? 0.96 : 1);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    // Sombra del parpado sobre el blanco.
    ellipse(ctx, x, y - ry * 0.95, rx * 1.2, ry * 0.5, 'rgba(120, 90, 80, 0.16)');
    const ir = rx * (expression === 'hurried' ? 0.5 : 0.62);
    const doubtful = expression === 'doubtful';
    const ix = x + rx * (doubtful ? 0.34 : 0.24);
    const iy = y + ry * (doubtful ? -0.08 : 0.06);
    const g = ctx.createRadialGradient(ix - ir * 0.3, iy - ir * 0.4, ir * 0.1, ix, iy, ir);
    g.addColorStop(0, eyes.iris[0]);
    g.addColorStop(1, eyes.iris[1]);
    circle(ctx, ix, iy, ir, g);
    circle(ctx, ix + ir * 0.05, iy + ir * 0.05, ir * 0.56, '#1a120e');
    circle(ctx, ix + ir * 0.36, iy - ir * 0.36, ir * 0.34, '#ffffff');
    circle(ctx, ix - ir * 0.36, iy + ir * 0.4, ir * 0.15, 'rgba(255, 255, 255, 0.85)');
    if (expression === 'happy') {
      // El parpado de abajo sube con la sonrisa.
      ellipse(ctx, x, y + ry * 1.28, rx * 1.4, ry * 0.72, eyes.skin.mid);
    }
    if (doubtful) {
      // El parpado de arriba baja: mira de reojo, sin acabar de creerselo.
      ellipse(ctx, x, y - ry * 1.18, rx * 1.4, ry * 0.7, eyes.skin.mid);
    }
    ctx.restore();
    // Contorno, con el parpado de arriba mas grueso.
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = eyes.outline;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.stroke();
    if (doubtful) {
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.95, y - ry * 0.67);
      ctx.quadraticCurveTo(x, y - ry * 0.29, x + rx * 0.95, y - ry * 0.67);
      ctx.lineWidth = 3.6;
      ctx.stroke();
    }
    if (expression === 'happy') {
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.95, y + ry * 0.62);
      ctx.quadraticCurveTo(x, y + ry * 0.36, x + rx * 0.95, y + ry * 0.62);
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    if (eyes.lashes) paintLashes(ctx, x, y - ry * 0.2, rx, ry, side, eyes.outline);
    if (eyes.bags) paintBags(ctx, x, y, rx, ry, eyes.skin);
  }
}

function paintClosedEye(ctx: Ctx, x: number, y: number, eyes: Eyes, expression: Expression, side: number): void {
  ctx.beginPath();
  if (expression === 'happy') {
    ctx.moveTo(x - eyes.rx, y + eyes.ry * 0.25);
    ctx.quadraticCurveTo(x, y - eyes.ry * 0.75, x + eyes.rx, y + eyes.ry * 0.25);
  } else {
    ctx.moveTo(x - eyes.rx, y);
    ctx.quadraticCurveTo(x, y + eyes.ry * 0.6, x + eyes.rx, y);
  }
  ctx.strokeStyle = eyes.outline;
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  if (eyes.lashes) {
    const ox = x + side * eyes.rx * 0.95;
    const oy = expression === 'happy' ? y + eyes.ry * 0.2 : y + eyes.ry * 0.05;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + side * 7, oy + 4);
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  if (eyes.bags) paintBags(ctx, x, y, eyes.rx, eyes.ry, eyes.skin);
}

/** Dos pestanas en la esquina de fuera del parpado de arriba. */
function paintLashes(ctx: Ctx, x: number, y: number, rx: number, ry: number, side: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const [a, len] of [
    [0.18, 9],
    [0.42, 7],
  ] as const) {
    const px = x + side * rx * Math.cos(a);
    const py = y - ry * 0.75 * Math.sin(a) - ry * 0.05;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + side * len * 0.9, py - len * 0.55);
    ctx.stroke();
  }
}

/** Bolsas suaves bajo los ojos: alguien que duerme poco desde que llego la IA. */
function paintBags(ctx: Ctx, x: number, y: number, rx: number, ry: number, skin: Skin): void {
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.7, y + ry * 1.18);
  ctx.quadraticCurveTo(x, y + ry * 1.5, x + rx * 0.75, y + ry * 1.16);
  ctx.strokeStyle = skin.dark;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export interface Brows {
  readonly y: number;
  readonly dx: number;
  readonly length: number;
  readonly thick: number;
  readonly color: string;
}

/**
 * Cejas: normal, casi rectas; apurado, con lo de dentro levantado (preocupado y con prisa); contento, en arco y altas;
 * dudoso (T-043), una baja y la otra levantada en arco, la del lado al que mira.
 */
export function paintBrows(ctx: Ctx, cx: number, brows: Brows, expression: Expression): void {
  const lifts = { normal: [0, -2, -5], hurried: [-10, 1, -3], happy: [-6, -7, -9], doubtful: [3, 2, -3] };
  ctx.strokeStyle = brows.color;
  ctx.lineWidth = brows.thick;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const lift = expression === 'doubtful' && side === 1 ? [-7, -9, -10] : lifts[expression];
    const inner = cx + side * (brows.dx - brows.length * 0.45);
    const outer = cx + side * (brows.dx + brows.length * 0.55);
    const innerY = brows.y + lift[0];
    const outerY = brows.y + lift[1];
    ctx.beginPath();
    ctx.moveTo(inner, innerY);
    ctx.quadraticCurveTo((inner + outer) / 2, Math.min(innerY, outerY) + lift[2], outer, outerY);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Nariz, boca y mejillas

/** Nariz de boton, con su brillo: la de Boxer. */
export function paintButtonNose(ctx: Ctx, x: number, y: number, size: number, skin: Skin): void {
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.8, size * 0.62, 0, 0, Math.PI * 2);
  fillStroke(ctx, skinFill(ctx, x, y, size, skin), skin.outline, 2.6);
  circle(ctx, x - size * 0.28, y - size * 0.22, size * 0.18, 'rgba(255, 255, 255, 0.55)');
}

/** Nariz pequena de una curva: la de Patty. */
export function paintSmallNose(ctx: Ctx, x: number, y: number, skin: Skin): void {
  ctx.beginPath();
  ctx.moveTo(x - 1, y - 14);
  ctx.quadraticCurveTo(x + 9, y + 1, x + 1, y + 4);
  ctx.quadraticCurveTo(x - 4, y + 5, x - 6, y + 2);
  ctx.strokeStyle = skin.outline;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export interface Mouth {
  readonly x: number;
  readonly y: number;
  /** Ancho de la sonrisa normal. */
  readonly w: number;
  readonly outline: string;
  /** Color de los labios (pintados) o null. */
  readonly lips?: string | null;
}

/**
 * Boca segun la expresion, cerrada o abierta (hablando). Normal: sonrisa tranquila. Apurado: boca tensa y, abierta,
 * gritando. Contento: sonrisa grande y, abierta, riendo con la lengua. Dudoso (T-043): torcida hacia un lado y, abierta,
 * pequena y corrida.
 */
export function paintMouth(ctx: Ctx, m: Mouth, pose: Pose): void {
  const { x, y, w, outline } = m;
  ctx.strokeStyle = outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (!pose.open) {
    ctx.beginPath();
    if (pose.expression === 'hurried') {
      ctx.moveTo(x - w * 0.42, y + 4);
      ctx.bezierCurveTo(x - w * 0.18, y - 4, x + w * 0.12, y + 6, x + w * 0.42, y - 1);
    } else if (pose.expression === 'happy') {
      ctx.moveTo(x - w * 0.62, y - 6);
      ctx.quadraticCurveTo(x, y + w * 0.5, x + w * 0.62, y - 7);
    } else if (pose.expression === 'doubtful') {
      ctx.moveTo(x - w * 0.34, y + 1);
      ctx.quadraticCurveTo(x + w * 0.06, y + 4, x + w * 0.42, y - 6);
    } else {
      ctx.moveTo(x - w * 0.5, y - 3);
      ctx.quadraticCurveTo(x, y + w * 0.32, x + w * 0.5, y - 4);
    }
    ctx.lineWidth = 3.4;
    ctx.stroke();
    if (m.lips) {
      ctx.strokeStyle = m.lips;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    // Hoyuelos en las comisuras de la sonrisa grande.
    if (pose.expression === 'happy') {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * w * 0.66, y - 11);
        ctx.quadraticCurveTo(x + side * w * 0.74, y - 7, x + side * w * 0.68, y - 2);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }
    return;
  }

  ctx.beginPath();
  if (pose.expression === 'hurried') {
    ctx.ellipse(x, y + w * 0.16, w * 0.3, w * 0.4, 0, 0, Math.PI * 2);
  } else if (pose.expression === 'happy') {
    ctx.moveTo(x - w * 0.62, y - 6);
    ctx.quadraticCurveTo(x, y - 1, x + w * 0.62, y - 7);
    ctx.bezierCurveTo(x + w * 0.52, y + w * 0.62, x - w * 0.52, y + w * 0.62, x - w * 0.62, y - 6);
  } else if (pose.expression === 'doubtful') {
    ctx.ellipse(x + w * 0.1, y + w * 0.08, w * 0.22, w * 0.2, -0.25, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x - w * 0.42, y - 3);
    ctx.quadraticCurveTo(x, y + 1, x + w * 0.42, y - 4);
    ctx.bezierCurveTo(x + w * 0.34, y + w * 0.5, x - w * 0.34, y + w * 0.5, x - w * 0.42, y - 3);
  }
  ctx.closePath();
  ctx.fillStyle = '#6a2226';
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Dientes arriba y lengua abajo.
  const top = pose.expression === 'hurried' ? y + w * 0.16 - w * 0.4 : pose.expression === 'doubtful' ? y - w * 0.16 : y - 8;
  ellipse(ctx, x, top, w * 0.7, w * (pose.expression === 'hurried' ? 0.14 : 0.13), '#ffffff');
  const tongue = pose.expression === 'hurried' ? 0.52 : pose.expression === 'doubtful' ? 0.3 : 0.5;
  ellipse(ctx, x + w * 0.05, y + w * tongue, w * 0.34, w * 0.2, '#f07a7e');
  ctx.restore();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = outline;
  ctx.stroke();
}

/** Mejillas sonrosadas; mas encendidas si esta contento. */
export function paintBlush(ctx: Ctx, cx: number, y: number, dx: number, skin: Skin, expression: Expression): void {
  const big = expression === 'happy' ? 1.18 : 1;
  for (const side of [-1, 1]) ellipse(ctx, cx + side * dx, y, 15 * big, 8.5 * big, skin.blush);
}

/** Arrugas suaves de la edad: patas de gallo y una raya en la frente. */
export function paintAgeLines(ctx: Ctx, cx: number, eyes: Eyes, foreheadY: number, skin: Skin): void {
  ctx.strokeStyle = skin.dark;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const x = cx + side * (eyes.dx + eyes.rx + 6);
    for (const k of [-0.5, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(x, eyes.y + k * eyes.ry * 0.6);
      ctx.lineTo(x + side * 8, eyes.y + k * eyes.ry * 0.9);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.moveTo(cx - 26, foreheadY + 2);
  ctx.quadraticCurveTo(cx, foreheadY - 4, cx + 24, foreheadY + 2);
  ctx.stroke();
}

/** Gota de sudor en la sien: tiene prisa. */
export function paintSweat(ctx: Ctx, x: number, y: number, size = 1): void {
  ctx.beginPath();
  ctx.moveTo(x, y - 14 * size);
  ctx.bezierCurveTo(x + 9 * size, y - 2 * size, x + 9 * size, y + 9 * size, x, y + 9 * size);
  ctx.bezierCurveTo(x - 9 * size, y + 9 * size, x - 9 * size, y - 2 * size, x, y - 14 * size);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - 14 * size, x, y + 9 * size);
  g.addColorStop(0, '#f2fbff');
  g.addColorStop(1, '#8fd3ff');
  fillStroke(ctx, g, '#3f8fc8', 2);
  ellipse(ctx, x - 2.5 * size, y + 2 * size, 2.2 * size, 3.6 * size, 'rgba(255, 255, 255, 0.9)');
}

// ---------------------------------------------------------------------------
// Gafas

/** Gafas de montura rectangular o redonda, con el cristal apenas tenido y un brillo en diagonal. */
export function paintGlasses(ctx: Ctx, cx: number, eyes: Eyes, kind: 'rect' | 'round', frame: string, earX: number): void {
  const w = eyes.rx * 2 + 14;
  const h = eyes.ry * 2 + (kind === 'rect' ? 2 : 10);
  for (const side of [-1, 1]) {
    const x = cx + side * eyes.dx;
    if (kind === 'rect') roundRectPath(ctx, x - w / 2, eyes.y - h / 2, w, h, 9);
    else {
      ctx.beginPath();
      ctx.ellipse(x, eyes.y, w / 2, h / 2, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(205, 235, 255, 0.16)';
    ctx.fill();
    ctx.strokeStyle = frame;
    ctx.lineWidth = kind === 'rect' ? 4.4 : 3.2;
    ctx.stroke();
    // Brillo en diagonal.
    ctx.save();
    if (kind === 'rect') roundRectPath(ctx, x - w / 2, eyes.y - h / 2, w, h, 9);
    else {
      ctx.beginPath();
      ctx.ellipse(x, eyes.y, w / 2, h / 2, 0, 0, Math.PI * 2);
    }
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(x - w * 0.42, eyes.y + h * 0.05);
    ctx.lineTo(x - w * 0.05, eyes.y - h * 0.55);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    // Patilla hasta la oreja.
    ctx.beginPath();
    ctx.moveTo(x + side * w * 0.5, eyes.y - h * 0.18);
    ctx.lineTo(cx + side * earX, eyes.y - h * 0.08);
    ctx.strokeStyle = frame;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
  // Puente.
  ctx.beginPath();
  ctx.moveTo(cx - eyes.dx + w * 0.5, eyes.y - h * 0.12);
  ctx.quadraticCurveTo(cx, eyes.y - h * 0.32, cx + eyes.dx - w * 0.5, eyes.y - h * 0.12);
  ctx.strokeStyle = frame;
  ctx.lineWidth = 3.6;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Manos

/** Antebrazo que sube desde el borde de abajo hasta la muneca, con la manga del color de la ropa. */
export function paintSleeve(ctx: Ctx, from: { x: number; y: number }, via: { x: number; y: number }, wrist: { x: number; y: number }, width: number, colors: readonly [string, string, string], outline: string): void {
  curveTube(ctx, from, via, wrist, width, width * 0.86, true);
  fillStroke(ctx, clothFill(ctx, wrist.x, wrist.y + 30, 70, colors), outline, LINE.body);
}

/**
 * Puno que agarra algo, visto de frente: dorso, cuatro dedos que se cierran y el pulgar por encima. Lo que agarra se pinta
 * entre el dorso y los dedos (`held`), asi asoma por arriba y por abajo. `angle` gira la mano entera.
 */
export function paintFist(ctx: Ctx, x: number, y: number, size: number, angle: number, skin: Skin, held?: () => void): void {
  const w = size;
  const h = size * 1.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  roundRectPath(ctx, -w * 0.55, -h * 0.5, w, h, w * 0.38);
  fillStroke(ctx, skinFill(ctx, -w * 0.1, 0, w * 0.8, skin), skin.outline, LINE.body);
  ctx.restore();
  held?.();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 0; i < 4; i++) {
    const fy = -h * 0.46 + i * (h * 0.235);
    roundRectPath(ctx, -w * 0.18, fy, w * 0.66, h * 0.25, h * 0.12);
    fillStroke(ctx, skinFill(ctx, w * 0.05, fy, w * 0.6, skin), skin.outline, LINE.detail + 0.4);
  }
  // Pulgar cruzando por delante de los dedos.
  ctx.beginPath();
  ctx.ellipse(-w * 0.08, -h * 0.38, w * 0.34, h * 0.15, -0.35, 0, Math.PI * 2);
  fillStroke(ctx, skinFill(ctx, -w * 0.15, -h * 0.45, w * 0.4, skin), skin.outline, LINE.detail + 0.4);
  ctx.restore();
}

/**
 * Mano que senala hacia arriba con el indice, vista de frente: el puno con tres dedos doblados, el pulgar por encima y el
 * indice levantado ("escucha bien"). `angle` gira la mano entera.
 */
export function paintPointingHand(ctx: Ctx, x: number, y: number, size: number, angle: number, skin: Skin): void {
  const w = size;
  const h = size * 1.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Indice levantado, detras del puno para que nazca de el.
  roundRectPath(ctx, -w * 0.02, -h * 0.5 - w * 0.92, w * 0.34, w * 1.12, w * 0.17);
  fillStroke(ctx, skinFill(ctx, w * 0.1, -h * 0.9, w * 0.6, skin), skin.outline, LINE.detail + 0.4);
  ctx.beginPath();
  ctx.moveTo(w * 0.04, -h * 0.5 - w * 0.34);
  ctx.lineTo(w * 0.24, -h * 0.5 - w * 0.34);
  ctx.strokeStyle = skin.dark;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.stroke();
  // Puno.
  roundRectPath(ctx, -w * 0.55, -h * 0.5, w, h, w * 0.38);
  fillStroke(ctx, skinFill(ctx, -w * 0.1, 0, w * 0.8, skin), skin.outline, LINE.body);
  // Tres dedos doblados por delante.
  for (let i = 0; i < 3; i++) {
    const fy = -h * 0.22 + i * (h * 0.235);
    roundRectPath(ctx, -w * 0.18, fy, w * 0.66, h * 0.25, h * 0.12);
    fillStroke(ctx, skinFill(ctx, w * 0.05, fy, w * 0.6, skin), skin.outline, LINE.detail + 0.4);
  }
  // Pulgar cruzando por delante.
  ctx.beginPath();
  ctx.ellipse(-w * 0.1, -h * 0.2, w * 0.34, h * 0.15, -0.25, 0, Math.PI * 2);
  fillStroke(ctx, skinFill(ctx, -w * 0.15, -h * 0.25, w * 0.4, skin), skin.outline, LINE.detail + 0.4);
  ctx.restore();
}
