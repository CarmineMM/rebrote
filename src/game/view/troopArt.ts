import { type Ctx, circle, ellipse } from './canvasKit';

/**
 * Arte de las tropas del brote 2 (T-025), sin Phaser: lo que no es el cuerpo de gusano de siempre. Lo registra
 * `textures.ts` y lo colocan `wormView.ts` y la foto de la ficha (`portrait.ts`).
 * - El disquete de 5¼ que los copiones llevan a la espalda, como una mochila: Elk Cloner viajaba en disquetes.
 * - El gorro del juglar, con su pluma.
 * - El verso (una onda de sonido que va hacia la izquierda) y la nota musical de sus particulas.
 * Mismo estilo que el resto (guia de graficos, seccion 10): degradado con la luz arriba a la izquierda, contorno oscuro
 * y un reflejo suave.
 */

/** Disquete de la espalda: lienzo cuadrado; `cx`, `cy` es su centro. */
export const FLOPPY_SIZE = { width: 52, height: 52, cx: 26, cy: 26 } as const;

/** Plastico negro de disquete, etiqueta blanca con dos rayas y el aro metalico del centro. */
export const FLOPPY = {
  light: '#5c6579',
  mid: '#343b4b',
  dark: '#1b1f28',
  outline: '#0b0d12',
  label: '#fbf8f0',
  stripes: ['#ff5a5f', '#8a5cf0'],
  hub: '#d5dce6',
} as const;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Disquete de 5¼ (T-025): funda negra con las esquinas algo redondeadas, etiqueta blanca arriba con dos rayas de color, el
 * aro metalico del centro con su agujero, la ventana de lectura con el disco marron asomando y la muesca de proteger.
 */
export function paintFloppy(ctx: Ctx): void {
  const { width } = FLOPPY_SIZE;
  const m = 4;
  const side = width - m * 2;
  ctx.lineJoin = 'round';
  const body = ctx.createLinearGradient(m, m, m + side, m + side);
  body.addColorStop(0, FLOPPY.light);
  body.addColorStop(0.45, FLOPPY.mid);
  body.addColorStop(1, FLOPPY.dark);
  roundRect(ctx, m, m, side, side, 5);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = FLOPPY.outline;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Muesca de proteger contra escritura, en el borde derecho.
  ctx.fillStyle = FLOPPY.outline;
  ctx.fillRect(m + side - 3, m + 10, 4, 6);

  // Etiqueta con dos rayas.
  roundRect(ctx, m + 6, m + 4, side - 12, 13, 2.5);
  ctx.fillStyle = FLOPPY.label;
  ctx.fill();
  ctx.strokeStyle = 'rgba(11, 13, 18, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  FLOPPY.stripes.forEach((stripe, i) => {
    ctx.fillStyle = stripe;
    ctx.fillRect(m + 9, m + 7.5 + i * 4.5, side - 18, 2.2);
  });

  // Aro del centro y su agujero.
  const hubX = width / 2;
  const hubY = m + side * 0.62;
  circle(ctx, hubX, hubY, 7.2, FLOPPY.outline);
  circle(ctx, hubX, hubY, 5.8, FLOPPY.hub);
  circle(ctx, hubX, hubY, 2.8, FLOPPY.outline);
  // Agujero indice, a un lado.
  circle(ctx, hubX - 10.5, hubY, 1.6, FLOPPY.outline);

  // Ventana de lectura: una ranura con el disco asomando.
  roundRect(ctx, hubX - 3.2, m + side - 11, 6.4, 9, 3.2);
  ctx.fillStyle = FLOPPY.outline;
  ctx.fill();
  ellipse(ctx, hubX, m + side - 6.5, 2, 3.2, '#6b4426');

  // Reflejo.
  ellipse(ctx, m + 11, m + 24, 6, 9, 'rgba(255, 255, 255, 0.16)', 0.5);
}

/**
 * Lienzo del gorro del juglar: mas alto que el de la cabeza para que quepa la pluma. `cx`, `cy` y `r` son el centro y el
 * radio de la cabeza del gusano (`WORM_SIZE.head`) dentro de el: la vista lo pone con ese origen sobre la cabeza.
 */
export const HAT_SIZE = { width: 132, height: 132, cx: 62, cy: 100, r: 34 } as const;

export const HAT = {
  felt: ['#a780ff', '#7046dc', '#43238f'] as const,
  outline: '#23104f',
  band: '#ffcf4a',
  bandDark: '#b07a0e',
  feather: ['#fff4b8', '#ffc23a', '#ff8a2a'] as const,
  featherOutline: '#7a3c00',
} as const;

/**
 * Gorro del juglar (T-025), en su lienzo (`HAT_SIZE`): un sombrero de fieltro morado con la punta hacia delante (a la
 * izquierda, por donde avanza), el ala de atras doblada hacia arriba, una cinta dorada y una pluma larga que sale de la
 * cinta por delante y sube hacia atras, por encima de la medallita de la nuca. Ocupa el sitio de la antena, que el
 * juglar no lleva.
 */
export function paintMinstrelHat(ctx: Ctx): void {
  const { cx, cy, r } = HAT_SIZE;
  const top = cy - r;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pluma: sale de la cinta, por delante (la copa tapa su pie), y sube inclinada hacia atras.
  const qx = cx - 6;
  const qy = top + 2;
  ctx.save();
  ctx.translate(qx, qy);
  ctx.rotate(0.5);
  ctx.scale(1.12, 1.12);
  const vane = ctx.createLinearGradient(0, 0, 0, -44);
  vane.addColorStop(0, HAT.feather[2]);
  vane.addColorStop(0.55, HAT.feather[1]);
  vane.addColorStop(1, HAT.feather[0]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-13, -12, -9, -36, 4, -48);
  ctx.bezierCurveTo(12, -34, 12, -12, 0, 0);
  ctx.closePath();
  ctx.fillStyle = vane;
  ctx.fill();
  ctx.strokeStyle = HAT.featherOutline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // Raquis y barbas.
  ctx.strokeStyle = 'rgba(122, 60, 0, 0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(1, -24, 4, -46);
  ctx.stroke();
  for (let i = 1; i <= 4; i++) {
    const y = -9 * i;
    ctx.beginPath();
    ctx.moveTo(1 + i * 0.6, y);
    ctx.lineTo(7, y - 5);
    ctx.stroke();
  }
  ctx.restore();

  // Copa del sombrero: de la punta de delante a la nuca, por encima de la cabeza.
  const felt = ctx.createRadialGradient(cx - 10, top - 4, 2, cx, top + 6, r + 16);
  felt.addColorStop(0, HAT.felt[0]);
  felt.addColorStop(0.5, HAT.felt[1]);
  felt.addColorStop(1, HAT.felt[2]);
  const brimY = top + 12;
  ctx.beginPath();
  ctx.moveTo(cx - r - 14, brimY + 3);
  ctx.quadraticCurveTo(cx - r + 2, top - 12, cx - 2, top - 14);
  ctx.quadraticCurveTo(cx + r - 2, top - 14, cx + r + 2, brimY - 2);
  ctx.quadraticCurveTo(cx, brimY + 6, cx - r - 14, brimY + 3);
  ctx.closePath();
  ctx.fillStyle = felt;
  ctx.fill();
  ctx.strokeStyle = HAT.outline;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // Ala de atras, doblada hacia arriba.
  ctx.beginPath();
  ctx.moveTo(cx + 6, brimY + 1);
  ctx.quadraticCurveTo(cx + r + 10, brimY - 4, cx + r + 12, top - 6);
  ctx.quadraticCurveTo(cx + r - 2, top + 2, cx + 6, brimY + 1);
  ctx.closePath();
  ctx.fillStyle = HAT.felt[0];
  ctx.fill();
  ctx.strokeStyle = HAT.outline;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Cinta dorada.
  ctx.strokeStyle = HAT.bandDark;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - r + 2, brimY - 3);
  ctx.quadraticCurveTo(cx, brimY + 3, cx + r - 4, brimY - 4);
  ctx.stroke();
  ctx.strokeStyle = HAT.band;
  ctx.lineWidth = 4.2;
  ctx.stroke();

  // Reflejo.
  ellipse(ctx, cx - 12, top - 4, 9, 4, 'rgba(255, 255, 255, 0.35)', -0.35);
}

/** Verso: una onda de sonido que avanza hacia la izquierda. `frontX` es su frente en la textura (lo que toca primero). */
export const VERSE_SIZE = { width: 72, height: 132, frontX: 14 } as const;

/** Magenta neon del verso, con contorno morado oscuro: sobre el cesped, lo aditivo se quedaria blanco. */
export const VERSE_INK = { glow: '#ffb3ee', mid: '#ff5fd2', outline: '#5a1470' } as const;

/**
 * Verso (T-025): tres arcos de sonido, abiertos hacia el juglar (a la derecha), el de delante grueso y los de detras cada
 * vez mas finos y transparentes, con un brillo dentro de cada uno. El del poema entero de Elk Cloner (T-026) va en otra
 * tinta (`POEM_INK`, dorada).
 */
export function paintVerse(ctx: Ctx, ink: { readonly glow: string; readonly mid: string; readonly outline: string } = VERSE_INK): void {
  const { height, frontX } = VERSE_SIZE;
  const cy = height / 2;
  const radius = 74;
  const spread = Math.asin((cy - 8) / radius);
  ctx.lineCap = 'round';
  const arcs = [
    { x: frontX, width: 9, alpha: 1 },
    { x: frontX + 16, width: 6.5, alpha: 0.7 },
    { x: frontX + 30, width: 4.5, alpha: 0.45 },
  ];
  for (const arc of arcs) {
    const center = arc.x + radius;
    ctx.globalAlpha = arc.alpha;
    ctx.beginPath();
    ctx.arc(center, cy, radius, Math.PI - spread, Math.PI + spread);
    ctx.strokeStyle = ink.outline;
    ctx.lineWidth = arc.width + 4;
    ctx.stroke();
    ctx.strokeStyle = ink.mid;
    ctx.lineWidth = arc.width;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center + 1.5, cy, radius, Math.PI - spread * 0.8, Math.PI - spread * 0.1);
    ctx.strokeStyle = ink.glow;
    ctx.lineWidth = Math.max(1.5, arc.width * 0.35);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Nota musical (corchea) de las particulas del juglar. */
export const NOTE_SIZE = { width: 26, height: 30 } as const;

/** Corchea dorada con contorno oscuro: cabeza ovalada, plica y banderita. */
export function paintNote(ctx: Ctx): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const fill = ctx.createLinearGradient(0, 4, 0, 28);
  fill.addColorStop(0, '#fffbe0');
  fill.addColorStop(1, '#ffc23a');
  const outline = '#5a3200';
  // Plica y banderita, primero el contorno y luego el color.
  const stem = (width: number, color: string | CanvasGradient) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(14, 22);
    ctx.lineTo(14, 5);
    ctx.quadraticCurveTo(15, 10, 22, 12);
    ctx.quadraticCurveTo(19, 15, 20, 19);
    ctx.stroke();
  };
  stem(5.5, outline);
  stem(2.6, fill);
  ellipse(ctx, 9.5, 23, 7, 5, outline, -0.45);
  ellipse(ctx, 9.5, 23, 5.2, 3.4, fill, -0.45);
  ellipse(ctx, 8, 21.8, 2, 1.1, 'rgba(255, 255, 255, 0.85)', -0.45);
}
