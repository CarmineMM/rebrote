import { type Ctx, circle, ellipse, leafShape } from './canvasKit';
import { wallWear, type WallWear } from './wallArt';

/**
 * Arte de los poderes (T-021), sin Phaser: lo pintan las texturas (`textures.ts`), la foto de la ficha y los dibujos de
 * los tours. Medidas en pixeles de su textura (diseno, 160 px por casilla), con los pies en el suelo.
 */

// ---------------------------------------------------------------------------
// Granada (O-04)

/**
 * Granada: del tamano de la mina de fuego (O-04), con su mecha. Es una granada de las de fruta, roja, con su corona en lo
 * alto y una anilla dorada colgando de ella, y la mecha que sale de la corona. Pies, centro del cuerpo y punta de la mecha.
 */
export const GRENADE_SIZE = { width: 112, height: 124, footX: 56, footY: 116, bodyY: 82, tipX: 76, tipY: 14 } as const;

/** Paleta de la granada (guia de graficos, seccion 10). */
export const GRENADE_COLORS = {
  outline: '#6a0b1c',
  /** Piel: luz, tono y sombra. Encendida, la luz tira a naranja. */
  skin: ['#ffd9cf', '#ff5a6a', '#b3122f'],
  skinLit: ['#fff0c8', '#ff6a4a', '#b3122f'],
  speck: 'rgba(255, 236, 214, 0.55)',
  /** Corona (el caliz de la fruta). */
  crown: ['#ff8a8a', '#c8293d', '#7e1424'],
  /** Anilla del seguro, dorada. */
  pin: ['#fff1b0', '#ffc23a', '#a8700e'],
  fuse: '#6b4a2a',
  leaf: '#62c046',
  leafOutline: '#2a6b22',
  mouth: '#4a0710',
  teeth: '#fffaf0',
  cheek: 'rgba(255, 190, 150, 0.6)',
} as const;

/** Chispa de la punta de la mecha: pequena en vuelo, grande y con rayos encendida. */
function paintSpark(ctx: Ctx, x: number, y: number, lit: boolean): void {
  const r = lit ? 14 : 8;
  const spark = ctx.createRadialGradient(x, y, 0, x, y, r);
  spark.addColorStop(0, 'rgba(255, 255, 235, 1)');
  spark.addColorStop(0.35, lit ? 'rgba(255, 214, 80, 0.95)' : 'rgba(255, 176, 64, 0.9)');
  spark.addColorStop(1, 'rgba(255, 90, 30, 0)');
  ctx.fillStyle = spark;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (!lit) return;
  ctx.strokeStyle = 'rgba(255, 238, 150, 0.95)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
    ctx.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13);
    ctx.stroke();
  }
}

/**
 * Granada (T-021): una granada de fruta roja y gordita con su corona de cinco puntas, una anilla dorada colgando y la
 * mecha. `lit`: ya cayo y cuenta para explotar; la mecha chisporrotea, abre mucho los ojos y aprieta los dientes en una
 * sonrisa de "alla va". Sin encender (en vuelo y de fantasma), cara decidida y sonrisa.
 */
export function paintGrenade(ctx: Ctx, lit: boolean): void {
  const C = GRENADE_COLORS;
  const cx = GRENADE_SIZE.footX;
  const cy = GRENADE_SIZE.bodyY;
  const rx = 32;
  const ry = 31;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Mecha: sale del centro de la corona y sube en curva hasta la punta.
  const crownY = cy - ry - 2;
  const { tipX, tipY } = GRENADE_SIZE;
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(cx, crownY - 6);
  ctx.bezierCurveTo(cx - 6, crownY - 20, tipX - 14, tipY + 12, tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = C.fuse;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Trenzado de la mecha.
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.55)';
  ctx.lineWidth = 1.2;
  for (const t of [0.25, 0.5, 0.75]) {
    const x = cx + (tipX - cx) * t - 3 * (1 - t);
    const y = crownY - 6 + (tipY - crownY + 6) * t;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 1.5);
    ctx.lineTo(x + 2, y + 1.5);
    ctx.stroke();
  }
  paintSpark(ctx, tipX, tipY, lit);

  // Cuerpo: piel con la luz arriba a la izquierda.
  const skin = lit ? C.skinLit : C.skin;
  const body = ctx.createRadialGradient(cx - 12, cy - 14, 3, cx, cy, rx + 6);
  body.addColorStop(0, skin[0]);
  body.addColorStop(0.45, skin[1]);
  body.addColorStop(1, skin[2]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  // Motitas claras de la piel y dos vetas suaves.
  for (const [dx, dy] of [
    [-18, 10],
    [-6, 20],
    [10, 16],
    [20, -4],
    [-22, -6],
    [6, -18],
    [22, 12],
  ] as const) {
    circle(ctx, cx + dx, cy + dy, 1.4, C.speck);
  }
  ctx.strokeStyle = 'rgba(120, 10, 30, 0.28)';
  ctx.lineWidth = 2;
  for (const dx of [-13, 13]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 0.45, cy - ry + 4);
    ctx.quadraticCurveTo(cx + dx * 1.4, cy + 2, cx + dx * 0.6, cy + ry - 5);
    ctx.stroke();
  }
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Corona: un cuello corto y cinco puntas abiertas.
  const crown = ctx.createLinearGradient(0, crownY - 14, 0, crownY + 6);
  crown.addColorStop(0, C.crown[0]);
  crown.addColorStop(0.5, C.crown[1]);
  crown.addColorStop(1, C.crown[2]);
  ctx.beginPath();
  ctx.moveTo(cx - 11, crownY + 5);
  ctx.lineTo(cx - 10, crownY - 4);
  const points = [-13, -6.5, 0, 6.5, 13];
  points.forEach((px, i) => {
    const up = i === 2 ? 15 : i % 2 === 0 ? 12 : 13.5;
    ctx.lineTo(cx + px * 0.95, crownY - up);
    if (i < points.length - 1) ctx.lineTo(cx + (px + points[i + 1]) / 2, crownY - 6);
  });
  ctx.lineTo(cx + 10, crownY - 4);
  ctx.lineTo(cx + 11, crownY + 5);
  ctx.closePath();
  ctx.fillStyle = crown;
  ctx.fill();
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Una hojita a la izquierda de la corona.
  leafShape(ctx, cx - 9, crownY - 2, 16, 6, Math.PI + 0.35);
  ctx.fillStyle = C.leaf;
  ctx.fill();
  ctx.strokeStyle = C.leafOutline;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Anilla del seguro, colgando a la derecha de la corona.
  const pinX = cx + 15;
  const pinY = crownY + 3;
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.arc(pinX + 4, pinY + 5, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.pin[1];
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.strokeStyle = C.pin[0];
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(pinX + 4, pinY + 5, 6.5, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();

  // Cara, mirando un poco a la derecha (por donde llegan los gusanos).
  const eyeY = cy - 3;
  const eyes = [cx - 10, cx + 11];
  for (const ex of eyes) {
    const w = lit ? 8 : 6.5;
    const h = lit ? 9.5 : 7.5;
    ellipse(ctx, ex, eyeY, w, h, '#ffffff');
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, w, h, 0, 0, Math.PI * 2);
    ctx.stroke();
    circle(ctx, ex + (lit ? 1.5 : 2.2), eyeY + (lit ? 0 : 1), lit ? 2.6 : 3.4, '#1d0a12');
    circle(ctx, ex + 0.6, eyeY - 2, 1.2, '#ffffff');
    // Cejas: decididas (bajan hacia dentro) o muy altas de emocion.
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    if (lit) {
      ctx.moveTo(ex - 6, eyeY - 14);
      ctx.quadraticCurveTo(ex, eyeY - 18, ex + 6, eyeY - 14);
    } else {
      const inner = ex < cx ? 1 : -1;
      ctx.moveTo(ex - 6 * inner, eyeY - 13);
      ctx.lineTo(ex + 6 * inner, eyeY - 10);
    }
    ctx.stroke();
  }
  if (lit) {
    // Sonrisa de dientes apretados.
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy + 12);
    ctx.quadraticCurveTo(cx + 1, cy + 22, cx + 13, cy + 11);
    ctx.quadraticCurveTo(cx + 1, cy + 15, cx - 11, cy + 12);
    ctx.closePath();
    ctx.fillStyle = C.teeth;
    ctx.fill();
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1.2;
    for (const dx of [-5, 1, 7]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 13);
      ctx.lineTo(cx + dx + 0.5, cy + 17);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 11);
    ctx.quadraticCurveTo(cx + 2, cy + 19, cx + 11, cy + 9);
    ctx.stroke();
  }
  ellipse(ctx, cx - 20, cy + 9, 5.5, 3.5, C.cheek);
  ellipse(ctx, cx + 21, cy + 8, 5.5, 3.5, C.cheek);
  // Reflejo.
  ellipse(ctx, cx - 14, cy - 18, 9, 5, 'rgba(255, 255, 255, 0.5)', -0.6);
}

/** Grano de granada: una gotita roja translucida, la particula de la explosion. */
export const ARIL_SIZE = { width: 18, height: 22 } as const;

export function paintAril(ctx: Ctx, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.06);
  ctx.bezierCurveTo(w * 0.92, h * 0.34, w * 0.94, h * 0.9, w * 0.5, h * 0.94);
  ctx.bezierCurveTo(w * 0.06, h * 0.9, w * 0.08, h * 0.34, w * 0.5, h * 0.06);
  ctx.closePath();
  const g = ctx.createRadialGradient(w * 0.38, h * 0.42, 1, w * 0.5, h * 0.6, w * 0.6);
  g.addColorStop(0, '#ffd2d8');
  g.addColorStop(0.45, '#ff3f5a');
  g.addColorStop(1, '#a3102c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#5a0716';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ellipse(ctx, w * 0.38, h * 0.4, w * 0.12, h * 0.1, 'rgba(255, 255, 255, 0.8)', -0.4);
}

// ---------------------------------------------------------------------------
// Muro de hielo (O-05, O-09 a O-11)

/**
 * Bloque del muro de hielo: un cubo de hielo gordito, visto de frente y un poco desde arriba, con su cara de arriba
 * nevada, cristales a los pies y una cara de frio decidido que mira a la derecha. Mide algo menos de una casilla de
 * ancho para que, en una columna de tres, se lean tres bloques.
 */
export const ICE_BLOCK_SIZE = { width: 160, height: 172, footX: 80, footY: 164 } as const;

/** Desgaste que se ve, con la vida: el mismo reparto que el muro de escudo (T-024). */
export type IceWear = WallWear;
export const ICE_WEARS: readonly IceWear[] = [0, 1, 2];
export const iceWear = (fraction: number): IceWear => wallWear(fraction);

/** Paleta del hielo (guia de graficos, seccion 10): la de la mina de hielo, mas clara y transparente. */
export const ICE_COLORS = {
  outline: '#1f5a8a',
  /** Cara de delante: arriba, medio y abajo. */
  front: ['#effbff', '#a8e4ff', '#5cb2e6'],
  /** Cara de arriba, iluminada. */
  top: ['#ffffff', '#d6f3ff'],
  snow: '#ffffff',
  crack: '#1f5a8a',
  /** Lo que se ve en una muesca: hielo de dentro, mas azul. */
  chip: '#7cc8f0',
  mouth: '#123a5a',
  cheek: 'rgba(255, 130, 170, 0.45)',
  drop: ['#e8f8ff', '#3f8fc8'],
} as const;

/** Contorno del bloque: cara de delante con las esquinas redondeadas y, encima, la de arriba en trapecio. */
const FRONT = { left: 26, right: 134, top: 62, bottom: 160, r: 16 } as const;
const TOP = { backLeft: 40, backRight: 120, backY: 42 } as const;

function frontPath(ctx: Ctx): void {
  const { left, right, top, bottom, r } = FRONT;
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.quadraticCurveTo(right, top, right, top + r);
  ctx.lineTo(right + 2, bottom - r);
  ctx.quadraticCurveTo(right + 2, bottom, right - r, bottom);
  ctx.lineTo(left + r, bottom);
  ctx.quadraticCurveTo(left - 2, bottom, left - 2, bottom - r);
  ctx.lineTo(left, top + r);
  ctx.quadraticCurveTo(left, top, left + r, top);
  ctx.closePath();
}

function topPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(FRONT.left + 4, FRONT.top + 2);
  ctx.quadraticCurveTo(TOP.backLeft - 6, TOP.backY + 4, TOP.backLeft + 4, TOP.backY);
  ctx.lineTo(TOP.backRight - 4, TOP.backY);
  ctx.quadraticCurveTo(TOP.backRight + 6, TOP.backY + 4, FRONT.right - 4, FRONT.top + 2);
  ctx.closePath();
}

/** Muesca que el desgaste le quita a una esquina de arriba: un trozo en forma de triangulo mellado. */
function paintChip(ctx: Ctx, x: number, y: number, size: number, flip: boolean): void {
  const s = flip ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * s, y + size * 0.2);
  ctx.lineTo(x - size * 0.45 * s, y + size * 0.55);
  ctx.lineTo(x - size * 0.6 * s, y + size * 1.05);
  ctx.lineTo(x + size * 0.15 * s, y + size * 0.75);
  ctx.closePath();
  ctx.fillStyle = ICE_COLORS.chip;
  ctx.fill();
  ctx.strokeStyle = ICE_COLORS.outline;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Grieta en zigzag de puntos `points` (relativos al bloque). */
function paintCrack(ctx: Ctx, points: ReadonlyArray<readonly [number, number]>, width: number): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = width + 2.2;
  ctx.stroke();
  ctx.strokeStyle = ICE_COLORS.crack;
  ctx.lineWidth = width;
  ctx.stroke();
}

/**
 * Bloque del muro de hielo (T-021) con su desgaste: entero (cejas decididas, boca de "brrr"); mordido (una muesca, una
 * grieta y cejas de preocupacion); casi roto (dos muescas, mas grietas y una gota que se derrite por un lado).
 */
export function paintIceBlock(ctx: Ctx, wear: IceWear): void {
  const C = ICE_COLORS;
  const cx = ICE_BLOCK_SIZE.footX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Nieve a los pies, por detras.
  ellipse(ctx, cx, FRONT.bottom - 2, 62, 12, '#dff4ff');

  // Cara de arriba.
  const top = ctx.createLinearGradient(0, TOP.backY, 0, FRONT.top);
  top.addColorStop(0, C.top[0]);
  top.addColorStop(1, C.top[1]);
  topPath(ctx);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Cara de delante: hielo con la luz arriba, una franja de brillo en diagonal y vetas de refraccion.
  const front = ctx.createLinearGradient(FRONT.left, FRONT.top, FRONT.right * 0.7, FRONT.bottom);
  front.addColorStop(0, C.front[0]);
  front.addColorStop(0.5, C.front[1]);
  front.addColorStop(1, C.front[2]);
  frontPath(ctx);
  ctx.fillStyle = front;
  ctx.fill();
  ctx.save();
  frontPath(ctx);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.moveTo(FRONT.left + 18, FRONT.bottom);
  ctx.lineTo(FRONT.left + 44, FRONT.top);
  ctx.lineTo(FRONT.left + 60, FRONT.top);
  ctx.lineTo(FRONT.left + 34, FRONT.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(FRONT.left + 42, FRONT.bottom);
  ctx.lineTo(FRONT.left + 68, FRONT.top);
  ctx.lineTo(FRONT.left + 74, FRONT.top);
  ctx.lineTo(FRONT.left + 48, FRONT.bottom);
  ctx.closePath();
  ctx.fill();
  // Burbujitas atrapadas.
  for (const [x, y, r] of [
    [FRONT.right - 22, FRONT.bottom - 22, 3.2],
    [FRONT.right - 34, FRONT.bottom - 14, 2],
    [FRONT.left + 16, FRONT.bottom - 30, 2.4],
  ] as const) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  frontPath(ctx);
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Arista de arriba, clara: donde da la luz.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(FRONT.left + 12, FRONT.top + 4);
  ctx.lineTo(FRONT.right - 12, FRONT.top + 4);
  ctx.stroke();

  // Gorro de nieve en lo alto, con dos goterones que caen por delante.
  ctx.fillStyle = C.snow;
  ctx.beginPath();
  ctx.moveTo(FRONT.left + 6, FRONT.top + 4);
  ctx.quadraticCurveTo(TOP.backLeft, TOP.backY - 6, cx - 10, TOP.backY - 3);
  ctx.quadraticCurveTo(cx + 8, TOP.backY - 10, TOP.backRight, TOP.backY - 2);
  ctx.quadraticCurveTo(FRONT.right + 2, TOP.backY + 6, FRONT.right - 6, FRONT.top + 4);
  ctx.quadraticCurveTo(FRONT.right - 14, FRONT.top + 16, FRONT.right - 22, FRONT.top + 6);
  ctx.quadraticCurveTo(cx + 18, FRONT.top + 10, cx + 6, FRONT.top + 6);
  ctx.quadraticCurveTo(cx - 20, FRONT.top + 20, cx - 28, FRONT.top + 6);
  ctx.quadraticCurveTo(FRONT.left + 16, FRONT.top + 12, FRONT.left + 6, FRONT.top + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(63, 143, 200, 0.85)';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Desgaste: muescas y grietas.
  if (wear >= 1) {
    paintChip(ctx, FRONT.right - 2, FRONT.top + 10, 18, false);
    paintCrack(
      ctx,
      [
        [FRONT.right - 18, FRONT.top + 24],
        [FRONT.right - 28, FRONT.top + 40],
        [FRONT.right - 22, FRONT.top + 52],
        [FRONT.right - 34, FRONT.top + 70],
      ],
      2.2,
    );
  }
  if (wear >= 2) {
    paintChip(ctx, FRONT.left + 2, FRONT.top + 14, 15, true);
    paintCrack(
      ctx,
      [
        [FRONT.left + 14, FRONT.bottom - 6],
        [FRONT.left + 26, FRONT.bottom - 26],
        [FRONT.left + 20, FRONT.bottom - 38],
        [FRONT.left + 34, FRONT.bottom - 54],
      ],
      2.2,
    );
    paintCrack(
      ctx,
      [
        [cx + 6, FRONT.bottom - 4],
        [cx + 14, FRONT.bottom - 18],
        [cx + 8, FRONT.bottom - 28],
      ],
      1.8,
    );
  }

  // Cara, mirando a la derecha.
  const eyeY = FRONT.top + 44;
  const eyes = [cx - 12, cx + 16];
  for (const ex of eyes) {
    ellipse(ctx, ex, eyeY, 8, 9.5, '#ffffff');
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 8, 9.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    circle(ctx, ex + 3, eyeY + 1, 3.6, '#0f2a44');
    circle(ctx, ex + 1.8, eyeY - 1.6, 1.3, '#ffffff');
    // Cejas: decididas entero; de preocupacion con desgaste.
    ctx.lineWidth = 3;
    ctx.beginPath();
    const inner = ex < cx ? 1 : -1;
    if (wear === 0) {
      ctx.moveTo(ex - 7 * inner, eyeY - 15);
      ctx.lineTo(ex + 7 * inner, eyeY - 11);
    } else {
      ctx.moveTo(ex - 7 * inner, eyeY - 12);
      ctx.lineTo(ex + 7 * inner, eyeY - 17);
    }
    ctx.stroke();
  }
  // Boca: "brrr" ondulada, apretada si esta muy gastado.
  ctx.strokeStyle = C.mouth;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  const mouthY = eyeY + 20;
  ctx.moveTo(cx - 8, mouthY);
  for (let i = 1; i <= 4; i++) ctx.quadraticCurveTo(cx - 8 + i * 5 - 2.5, mouthY + (i % 2 ? -3.5 : 3.5) * (wear === 2 ? 0.6 : 1), cx - 8 + i * 5, mouthY);
  ctx.stroke();
  ellipse(ctx, cx - 24, eyeY + 14, 6, 3.8, C.cheek);
  ellipse(ctx, cx + 30, eyeY + 13, 6, 3.8, C.cheek);
  if (wear === 2) {
    // Gota que se derrite por un lado.
    ctx.fillStyle = C.drop[0];
    ctx.beginPath();
    ctx.moveTo(FRONT.right - 6, eyeY - 6);
    ctx.quadraticCurveTo(FRONT.right + 1, eyeY + 4, FRONT.right - 6, eyeY + 7);
    ctx.quadraticCurveTo(FRONT.right - 13, eyeY + 4, FRONT.right - 6, eyeY - 6);
    ctx.fill();
    ctx.strokeStyle = C.drop[1];
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Cristales a los pies, por delante.
  for (const [x, h, lean] of [
    [FRONT.left + 6, 18, -0.35],
    [FRONT.left + 18, 12, -0.1],
    [FRONT.right - 16, 14, 0.15],
    [FRONT.right - 4, 20, 0.4],
  ] as const) {
    ctx.save();
    ctx.translate(x, FRONT.bottom + 2);
    ctx.rotate(lean);
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(4.5, 0);
    ctx.closePath();
    ctx.fillStyle = '#e8f8ff';
    ctx.fill();
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }
}
