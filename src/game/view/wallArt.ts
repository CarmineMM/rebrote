import { type Ctx, circle, ellipse, leafShape } from './canvasKit';
import { BARK_SCALES, LEAF, SHOOTER_COLORS, fillStroke } from './shooters/kit';

/**
 * Muro (T-024): el escudo sembrado solo. Sin Phaser: lo pintan las texturas (`textures.ts`), la foto de la ficha y los
 * tests. Medidas en pixeles de su textura (diseno, 160 px por casilla), con los pies en el suelo como la disparadora.
 *
 * Es una cupula gordita y achaparrada forrada de escamas de corteza en filas, solapadas como las de una pina o la
 * coraza de un armadillo, con un gorro de musgo y un brote de dos hojas en lo alto, raicillas y hojas verdes a los pies.
 * Mira a la derecha, por donde llegan los gusanos, con cara de defensor decidido. Con el desgaste pierde escamas (se ve
 * la madera clara de dentro, con sus anillos), se agrieta y se le nota el apuro.
 */
export const WALL_SIZE = { width: 160, height: 180, footX: 80, footY: 174 } as const;

/** Desgaste que se ve: entero, mordido y casi roto. */
export type WallWear = 0 | 1 | 2;
export const WALL_WEARS: readonly WallWear[] = [0, 1, 2];

/** Con esta fraccion de vida o menos pasa al desgaste 1 y al 2 (T-024: "se ve su desgaste a medida que pierde vida"). */
export const WALL_WEAR_AT = [0.66, 0.33] as const;

/** Desgaste que se ve con `fraction` de la vida llena (de 0 a 1). */
export function wallWear(fraction: number): WallWear {
  if (fraction <= WALL_WEAR_AT[1]) return 2;
  return fraction <= WALL_WEAR_AT[0] ? 1 : 0;
}

/** Colores de una escama de corteza: lo que comparten el muro y la disparadora de escudo (`shooters/bulb.ts`). */
export interface BarkScaleColors {
  /** Labio claro del borde de abajo, donde da la luz. */
  rim: string;
  /** Borde de abajo. */
  edge: string;
  /** Sombra que cada escama deja sobre la de debajo. */
  shade: string;
  /** Corteza lisa donde va la cara, para que se lea entre las escamas: centro, medio y borde (transparente). */
  face: readonly [string, string, string];
}

/**
 * Paleta del muro (guia de graficos, seccion 10): corteza, madera de dentro y musgo. La corteza y su contorno son los de
 * la disparadora de escudo (`SHOOTER_COLORS.shield`), para que se vea que son el mismo elemento.
 */
export const WALL_COLORS = {
  /** Contorno de la cupula y de la cara. */
  outline: SHOOTER_COLORS.shield.outline,
  /** Corteza: luz, tono y sombra. */
  bark: SHOOTER_COLORS.shield.body,
  /** Escamas: las mismas que la disparadora de escudo. */
  scale: BARK_SCALES,
  /** Madera de dentro (donde falta una escama o hay un mordisco) y sus anillos. */
  wood: ['#fbeccb', '#f3dcae', '#dcb57c'],
  ring: '#c79a62',
  /** Musgo del gorro: luz, tono y sombra; contorno y motas. */
  moss: ['#e2f6ae', '#b9e27a', '#8fcf5a'],
  mossOutline: '#3f6a1e',
  mossSpeck: ['rgba(63, 106, 30, 0.35)', 'rgba(244, 255, 214, 0.7)'],
  cheek: 'rgba(255, 120, 100, 0.42)',
  /** Gota de sudor del desgaste 2. */
  sweat: ['#e8f8ff', '#3f8fc8'],
} as const;

/**
 * Una escama: centro de su borde de abajo (`x`, `y`), medio ancho y lo que baja la punta. Lo de arriba lo tapa la fila
 * de encima.
 */
export interface BarkScale {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Camino de una escama: lados rectos que suben (los tapa la fila de encima) y abajo una punta redondeada. */
export function barkScalePath(ctx: Ctx, s: BarkScale): void {
  ctx.beginPath();
  ctx.moveTo(s.x - s.w, s.y - s.h * 2.2);
  ctx.lineTo(s.x - s.w, s.y);
  scaleTip(ctx, s, 0);
  ctx.lineTo(s.x + s.w, s.y - s.h * 2.2);
  ctx.closePath();
}

/** Borde de abajo de la escama, desplazado `dy` (sigue el camino actual). */
function scaleTip(ctx: Ctx, s: BarkScale, dy: number): void {
  const { x, w, h } = s;
  const y = s.y + dy;
  ctx.bezierCurveTo(x - w, y + h * 0.62, x - w * 0.42, y + h, x, y + h);
  ctx.bezierCurveTo(x + w * 0.42, y + h, x + w, y + h * 0.62, x + w, y);
}

/** Solo el borde de abajo, como camino abierto. */
function scaleEdgePath(ctx: Ctx, s: BarkScale, dy: number, inset = 0): void {
  const t = { x: s.x, y: s.y, w: s.w - inset, h: s.h - inset };
  ctx.beginPath();
  ctx.moveTo(t.x - t.w, t.y + dy);
  scaleTip(ctx, t, dy);
}

/**
 * Pinta una escama: primero su sombra sobre la de debajo, luego la escama con `fill` (el degradado de todo el cuerpo,
 * para que la luz siga de una escama a otra) y su labio claro y su borde. `line` escala los trazos.
 */
export function paintBarkScale(ctx: Ctx, s: BarkScale, fill: string | CanvasGradient, colors: BarkScaleColors, line = 1): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  scaleEdgePath(ctx, s, 2.6 * line);
  ctx.strokeStyle = colors.shade;
  ctx.lineWidth = 5 * line;
  ctx.stroke();
  barkScalePath(ctx, s);
  ctx.fillStyle = fill;
  ctx.fill();
  scaleEdgePath(ctx, s, -2 * line, 1.6 * line);
  ctx.strokeStyle = colors.rim;
  ctx.lineWidth = 2 * line;
  ctx.stroke();
  scaleEdgePath(ctx, s, 0);
  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = 2 * line;
  ctx.stroke();
}

/** Corteza lisa y clara bajo la cara, que se funde con las escamas de alrededor. */
export function paintBarkFace(ctx: Ctx, x: number, y: number, r: number, colors: BarkScaleColors): void {
  const g = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
  g.addColorStop(0, colors.face[0]);
  g.addColorStop(0.62, colors.face[1]);
  g.addColorStop(1, colors.face[2]);
  circle(ctx, x, y, r, g);
}

/**
 * Filas de escamas que cubren un cuerpo redondo, de abajo arriba (en el orden en que se pintan: cada fila tapa lo de
 * arriba de la anterior). `halfWidth(y)` es el medio ancho del cuerpo a esa altura; las escamas se estrechan y suben
 * hacia los lados para que el cuerpo se vea redondo, y las filas van al tresbolillo.
 */
export function barkScaleRows(
  centerX: number,
  rows: readonly number[],
  halfWidth: (y: number) => number,
  perRow: number,
  h: number,
  bend: number,
): BarkScale[] {
  const scales: BarkScale[] = [];
  rows.forEach((rowY, r) => {
    const hw = halfWidth(rowY);
    const stagger = r % 2 === 0 ? 0 : 0.5;
    for (let k = -1; k <= perRow; k++) {
      const phi = -Math.PI / 2 + ((k + 0.25 + stagger) / perRow) * Math.PI;
      if (Math.abs(phi) > Math.PI / 2 + 0.2) continue;
      const c = Math.max(0, Math.cos(phi));
      const w = ((hw * Math.PI) / perRow / 2) * 1.12 * (0.5 + 0.5 * c);
      scales.push({ x: centerX + hw * Math.sin(phi), y: rowY - bend * (1 - c), w, h: h * (0.65 + 0.35 * c) });
    }
  });
  return scales;
}

/**
 * Encoge las escamas que se saldrian de una textura de `width` x `height`. Las del borde las recorta el cuerpo y no se
 * ven, pero asi nada pinta fuera de la textura (lo vigilan los tests).
 */
export function scalesInside(scales: readonly BarkScale[], width: number, height: number, margin = 6): BarkScale[] {
  return scales
    .map((s) => ({ ...s, w: Math.min(s.w, s.x - margin, width - margin - s.x), h: Math.min(s.h, height - margin - s.y) }))
    .filter((s) => s.w > 2 && s.h > 2);
}

// --- Cupula

/** Cupula: centro de lo ancho, medio ancho, lo que sube y lo que baja hasta el suelo. */
const DOME = { x: 80, cy: 128, rw: 64, up: 70, down: 42 } as const;
const DOME_TOP = DOME.cy - DOME.up;
const DOME_BOTTOM = DOME.cy + DOME.down;
/** Puntos del contorno: muchos, para que los mordiscos salgan redondos. */
const OUTLINE_POINTS = 200;
/** Arriba casi una elipse algo llena; abajo una base ancha y plana con las esquinas redondas. */
const UPPER = { x: 0.9 } as const;
const LOWER = { x: 0.6, y: 0.55 } as const;

interface Point {
  x: number;
  y: number;
}

/** Punto del contorno en el angulo `t` (como en Canvas: 0 a la derecha, positivo hacia abajo). */
function domePoint(t: number): Point {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const sx = Math.sign(c);
  if (s < 0) return { x: DOME.x + DOME.rw * sx * Math.abs(c) ** UPPER.x, y: DOME.cy + DOME.up * s };
  return { x: DOME.x + DOME.rw * sx * Math.abs(c) ** LOWER.x, y: DOME.cy + DOME.down * s ** LOWER.y };
}

/** Medio ancho de la cupula a la altura `y`. */
function domeHalfWidth(y: number): number {
  if (y <= DOME_TOP || y >= DOME_BOTTOM) return 0;
  if (y <= DOME.cy) {
    const s = (DOME.cy - y) / DOME.up;
    return DOME.rw * Math.sqrt(1 - s * s) ** UPPER.x;
  }
  const s = ((y - DOME.cy) / DOME.down) ** (1 / LOWER.y);
  return DOME.rw * Math.sqrt(Math.max(0, 1 - s * s)) ** LOWER.x;
}

/** Mordiscos del desgaste 2: en el lado derecho, abajo, donde muerden los gusanos (angulo central y medio ancho). */
const BITES = [
  { t: 0.1, half: 0.13, depth: 9 },
  { t: 0.36, half: 0.12, depth: 7.5 },
] as const;

function biteDepth(t: number, wear: WallWear): number {
  if (wear < 2) return 0;
  let depth = 0;
  for (const bite of BITES) {
    const u = (t - bite.t) / bite.half;
    if (Math.abs(u) < 1) depth = Math.max(depth, bite.depth * Math.sqrt(1 - u * u));
  }
  return depth;
}

/** Contorno de la cupula, con los mordiscos si toca. Cada punto dice si esta mordido. */
function domeOutline(wear: WallWear): Array<Point & { bitten: boolean }> {
  const points: Array<Point & { bitten: boolean }> = [];
  for (let i = 0; i < OUTLINE_POINTS; i++) {
    const t = (i / OUTLINE_POINTS) * Math.PI * 2;
    const p = domePoint(t);
    const depth = biteDepth(t, wear);
    if (depth > 0) {
      const dx = p.x - DOME.x;
      const dy = p.y - DOME.cy;
      const length = Math.hypot(dx, dy);
      points.push({ x: p.x - (dx / length) * depth, y: p.y - (dy / length) * depth, bitten: true });
    } else points.push({ ...p, bitten: false });
  }
  return points;
}

/** Camino suave por los puntos (cerrado): curvas por los puntos medios. */
function smoothPath(ctx: Ctx, points: readonly Point[], closed: boolean): void {
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  ctx.beginPath();
  if (closed) {
    const start = mid(points[points.length - 1], points[0]);
    ctx.moveTo(start.x, start.y);
    points.forEach((p, i) => {
      const m = mid(p, points[(i + 1) % points.length]);
      ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
    });
    ctx.closePath();
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const m = mid(points[i], points[i + 1]);
    ctx.quadraticCurveTo(points[i].x, points[i].y, m.x, m.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

// --- Escamas y desgaste

/** Filas de escamas de la cupula, de abajo arriba (altura del borde de abajo en el centro). */
const SCALE_ROWS = [168, 151, 134, 117, 100, 83, 66] as const;
const SCALES = scalesInside(barkScaleRows(DOME.x, SCALE_ROWS, (y) => domeHalfWidth(y - 6) + 4, 6, 15, 9), WALL_SIZE.width, WALL_SIZE.height);

/** Donde faltan escamas en cada desgaste: se quita la que quede mas cerca de cada punto. */
const MISSING_AT: Record<WallWear, readonly Point[]> = {
  0: [],
  1: [
    { x: 54, y: 133 },
    { x: 106, y: 150 },
  ],
  2: [
    { x: 54, y: 133 },
    { x: 106, y: 150 },
    { x: 32, y: 96 },
    { x: 39, y: 149 },
    { x: 87, y: 168 },
  ],
};

function missingScales(wear: WallWear): Set<BarkScale> {
  const missing = new Set<BarkScale>();
  for (const p of MISSING_AT[wear]) {
    let best = SCALES[0];
    for (const s of SCALES) if (Math.hypot(s.x - p.x, s.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = s;
    missing.add(best);
  }
  return missing;
}

/** Hueco de una escama caida: madera clara con sus anillos y el borde roto de lo que queda arriba. */
function paintSocket(ctx: Ctx, s: BarkScale): void {
  barkScalePath(ctx, s);
  const g = ctx.createRadialGradient(s.x - s.w * 0.3, s.y - s.h * 0.4, 1, s.x, s.y, s.w * 1.4);
  g.addColorStop(0, WALL_COLORS.wood[0]);
  g.addColorStop(0.55, WALL_COLORS.wood[1]);
  g.addColorStop(1, WALL_COLORS.wood[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  barkScalePath(ctx, s);
  ctx.clip();
  ctx.strokeStyle = WALL_COLORS.ring;
  ctx.lineWidth = 1.6;
  for (const k of [0.32, 0.62, 0.95]) {
    ctx.beginPath();
    ctx.ellipse(s.x - s.w * 0.12, s.y - s.h * 0.1, s.w * k, s.h * k * 1.05, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  circle(ctx, s.x - s.w * 0.12, s.y - s.h * 0.1, 1.6, WALL_COLORS.ring);
  ctx.restore();
  // Borde de abajo, roto en dientes: ahi estaba la escama.
  ctx.beginPath();
  ctx.moveTo(s.x - s.w, s.y);
  const teeth = 5;
  for (let i = 1; i <= teeth; i++) {
    const t = i / teeth;
    const x = s.x - s.w + 2 * s.w * t;
    const dip = Math.sin(t * Math.PI) * s.h * 0.85;
    ctx.lineTo(x - s.w / teeth, s.y + dip + (i % 2 ? 2.5 : -1.5));
    ctx.lineTo(x, s.y + dip * 0.9);
  }
  ctx.strokeStyle = WALL_COLORS.outline;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Grieta: una linea quebrada oscura con un filo claro al lado, como madera rajada. */
function paintCrack(ctx: Ctx, points: readonly Point[], width: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + 1.4, p.y + 1.2) : ctx.lineTo(p.x + 1.4, p.y + 1.2)));
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.85)';
  ctx.lineWidth = width * 0.55;
  ctx.stroke();
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = WALL_COLORS.outline;
  ctx.lineWidth = width;
  ctx.stroke();
}

const CRACKS: Record<WallWear, ReadonlyArray<{ width: number; points: readonly Point[] }>> = {
  0: [],
  1: [
    {
      width: 2.8,
      points: [
        { x: 44, y: 127 },
        { x: 37, y: 120 },
        { x: 41, y: 112 },
        { x: 32, y: 104 },
      ],
    },
  ],
  2: [
    {
      width: 3.2,
      points: [
        { x: 44, y: 127 },
        { x: 37, y: 120 },
        { x: 41, y: 112 },
        { x: 32, y: 104 },
        { x: 34, y: 97 },
      ],
    },
    {
      width: 3,
      points: [
        { x: 136, y: 146 },
        { x: 128, y: 143 },
        { x: 124, y: 151 },
        { x: 116, y: 148 },
      ],
    },
    {
      width: 2.6,
      points: [
        { x: 70, y: 170 },
        { x: 66, y: 161 },
        { x: 72, y: 154 },
        { x: 67, y: 146 },
      ],
    },
  ],
};

// --- Partes

/** Raicillas asomando bajo la cupula. */
function paintRoots(ctx: Ctx): void {
  ctx.lineCap = 'round';
  for (const [dx, bend] of [
    [-0.6, -7],
    [-0.25, -3],
    [0.12, 3],
    [0.45, 6],
    [0.7, 8],
  ] as const) {
    const sx = DOME.x + DOME.rw * dx;
    ctx.beginPath();
    ctx.moveTo(sx, DOME_BOTTOM - 3);
    ctx.quadraticCurveTo(sx + bend * 0.4, DOME_BOTTOM + 3, sx + bend, DOME_BOTTOM + 6);
    ctx.strokeStyle = '#7a5a2e';
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = '#d9b77a';
    ctx.lineWidth = 1.7;
    ctx.stroke();
  }
}

/** Hojas verdes a los pies, por detras: sigue siendo una planta. */
function paintBaseLeaves(ctx: Ctx): void {
  const { x, rw } = DOME;
  const leaves: Array<readonly [number, number, number, number, number]> = [
    [x - rw * 0.86, DOME_BOTTOM - 14, Math.PI + 0.62, 24, 8],
    [x + rw * 0.86, DOME_BOTTOM - 14, -0.62, 22, 8],
    [x - rw * 0.6, DOME_BOTTOM - 3, Math.PI + 0.18, 34, 10],
    [x + rw * 0.6, DOME_BOTTOM - 3, -0.18, 32, 10],
  ];
  for (const [lx, ly, angle, length, width] of leaves) {
    leafShape(ctx, lx, ly, length, width, angle);
    const g = ctx.createLinearGradient(lx - 24, ly - 12, lx + 24, ly);
    g.addColorStop(0, LEAF.light);
    g.addColorStop(1, LEAF.dark);
    fillStroke(ctx, g, LEAF.outline, 2);
  }
}

/**
 * Gorro de musgo: bolitas (centro y radio) que siguen la coronilla, mas gruesas por detras (a la izquierda) y finas sobre
 * la frente para no tapar la cara, con un par de goterones que cuelgan.
 */
const MOSS_TUFTS: ReadonlyArray<readonly [number, number, number]> = (() => {
  const tufts: Array<readonly [number, number, number]> = [];
  // Cada una: angulo en el contorno de la cupula, cuanto se mete hacia dentro y radio.
  const along: ReadonlyArray<readonly [number, number, number]> = [
    [-Math.PI + 0.62, 5, 10],
    [-Math.PI + 0.86, 5, 11.5],
    [-Math.PI + 1.12, 4, 12.5],
    [-Math.PI / 2 - 0.2, 4, 12.5],
    [-Math.PI / 2 + 0.1, 4, 12],
    [-Math.PI / 2 + 0.38, 4, 10.5],
    [-0.88, 4, 8.5],
    // Segunda fila, mas adentro.
    [-Math.PI + 0.8, 14, 8.5],
    [-Math.PI + 1.15, 14, 9.5],
    [-Math.PI / 2 - 0.05, 12, 9],
    // Goterones.
    [-Math.PI + 0.72, 20, 5.5],
    [-Math.PI + 1.3, 21, 5],
  ];
  for (const [t, inset, r] of along) {
    const p = domePoint(t);
    const dx = p.x - DOME.x;
    const dy = p.y - DOME.cy;
    const length = Math.hypot(dx, dy);
    tufts.push([p.x - (dx / length) * inset, p.y - (dy / length) * inset, r]);
  }
  return tufts;
})();

/** Bolitas que se le caen al gorro con el desgaste 2 (las del borde de la frente y un goteron). */
const MOSS_LOST = new Set([6, 11]);

function paintMoss(ctx: Ctx, wear: WallWear): void {
  const { mossOutline } = WALL_COLORS;
  const tufts = wear === 2 ? MOSS_TUFTS.filter((_, i) => !MOSS_LOST.has(i)) : MOSS_TUFTS;
  for (const [x, y, r] of tufts) circle(ctx, x, y, r + 2.4, mossOutline);
  const g = ctx.createRadialGradient(62, 58, 3, 78, 72, 42);
  g.addColorStop(0, WALL_COLORS.moss[0]);
  g.addColorStop(0.5, WALL_COLORS.moss[1]);
  g.addColorStop(1, WALL_COLORS.moss[2]);
  for (const [x, y, r] of tufts) circle(ctx, x, y, r, g);
  // Motas: oscuras abajo a la derecha de cada bolita, claras arriba a la izquierda.
  for (const [x, y, r] of tufts) {
    circle(ctx, x + r * 0.35, y + r * 0.3, r * 0.16, WALL_COLORS.mossSpeck[0]);
    circle(ctx, x - r * 0.35, y - r * 0.38, r * 0.2, WALL_COLORS.mossSpeck[1]);
  }
}

/** Brote de dos hojas en lo alto del musgo; con el desgaste se le van doblando las hojas. */
function paintSprout(ctx: Ctx, wear: WallWear): void {
  const droop = wear === 2 ? 0.55 : wear === 1 ? 0.15 : 0;
  const base = { x: 80, y: 56 };
  const tip = { x: 82 + droop * 6, y: 40 + droop * 5 };
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(base.x - 3, (base.y + tip.y) / 2, tip.x, tip.y);
  ctx.strokeStyle = LEAF.outline;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#62c046';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const [angle, length] of [
    [-2.35 - droop * 1.1, 21],
    [-0.75 + droop * 1.1, 23],
  ] as const) {
    leafShape(ctx, tip.x, tip.y, length, 7.5, angle);
    const g = ctx.createLinearGradient(tip.x - 18, tip.y - 18, tip.x + 18, tip.y + 6);
    g.addColorStop(0, '#9be36c');
    g.addColorStop(1, LEAF.dark);
    fillStroke(ctx, g, LEAF.outline, 2);
  }
}

/** Ojos: el cercano (a la izquierda) algo mayor; miran a la derecha. */
const EYES = [
  { x: 90, y: 110, rx: 12.5, ry: 14.5 },
  { x: 117, y: 108, rx: 10.5, ry: 13 },
] as const;

function paintEyes(ctx: Ctx, wear: WallWear): void {
  const { outline } = WALL_COLORS;
  for (const e of EYES) {
    ellipse(ctx, e.x, e.y, e.rx, e.ry, '#ffffff');
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    const pupil = e.rx * (wear === 2 ? 0.48 : 0.58);
    const px = e.x + e.rx * 0.34;
    const py = e.y + e.ry * 0.12;
    circle(ctx, px, py, pupil, '#24160a');
    circle(ctx, px + pupil * 0.35, py - pupil * 0.45, pupil * 0.42, '#ffffff');
    circle(ctx, px - pupil * 0.45, py + pupil * 0.45, pupil * 0.18, '#ffffff');
  }
}

/** Cejas: firmes y decididas (0), preocupadas (1) y muy apuradas (2). */
function paintBrows(ctx: Ctx, wear: WallWear): void {
  ctx.strokeStyle = WALL_COLORS.outline;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  // Por ceja: punto de fuera, de dentro y lo que se curva. Dentro es hacia el hueco entre los ojos.
  const tilt = wear === 0 ? 4 : wear === 1 ? -5 : -7;
  for (const [i, side] of [
    [0, -1],
    [1, 1],
  ] as const) {
    const e = EYES[i];
    const top = e.y - e.ry - 6;
    const outer = { x: e.x + side * e.rx * 0.95, y: top - tilt * 0.5 };
    const inner = { x: e.x - side * e.rx * 0.75, y: top + tilt * 0.5 };
    ctx.beginPath();
    ctx.moveTo(outer.x, outer.y);
    ctx.quadraticCurveTo(e.x, top - 3 - (wear === 0 ? 0 : 1.5), inner.x, inner.y);
    ctx.stroke();
  }
}

/** Boca: sonrisita (0), abierta de apuro (1) o dientes apretados (2). */
function paintMouth(ctx: Ctx, wear: WallWear): void {
  const { outline } = WALL_COLORS;
  const x = 104;
  const y = 134;
  ctx.strokeStyle = outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (wear === 0) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 2);
    ctx.quadraticCurveTo(x, y + 6, x + 9, y - 3);
    ctx.stroke();
    return;
  }
  if (wear === 1) {
    // Boquita abierta y torcida de apuro, con la lengua.
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 1);
    ctx.bezierCurveTo(x - 5, y - 5, x + 5, y - 6, x + 7, y);
    ctx.bezierCurveTo(x + 6, y + 6, x - 5, y + 7, x - 7, y + 1);
    ctx.closePath();
    fillStroke(ctx, '#6a2a1a', outline, 2.4);
    ellipse(ctx, x + 0.5, y + 3, 3.6, 2, '#ff8a8a');
    return;
  }
  // Dientes apretados: boca ancha y redondeada, dientes blancos.
  const w = 11;
  const h = 6;
  const r = 4;
  ctx.beginPath();
  ctx.moveTo(x - w + r, y - h);
  ctx.lineTo(x + w - r, y - h);
  ctx.quadraticCurveTo(x + w, y - h, x + w, y - h + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x - w + r, y + h);
  ctx.quadraticCurveTo(x - w, y + h, x - w, y + h - r);
  ctx.lineTo(x - w, y - h + r);
  ctx.quadraticCurveTo(x - w, y - h, x - w + r, y - h);
  ctx.closePath();
  fillStroke(ctx, '#ffffff', outline, 2.6);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - w + 1, y);
  ctx.lineTo(x + w - 1, y);
  for (const dx of [-5, 0, 5]) {
    ctx.moveTo(x + dx, y - h + 1);
    ctx.lineTo(x + dx, y + h - 1);
  }
  ctx.stroke();
}

function paintSweat(ctx: Ctx): void {
  const x = 137;
  const y = 90;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.quadraticCurveTo(x + 8.5, y + 1, x, y + 5);
  ctx.quadraticCurveTo(x - 8.5, y + 1, x, y - 12);
  ctx.closePath();
  fillStroke(ctx, WALL_COLORS.sweat[0], WALL_COLORS.sweat[1], 2);
  ellipse(ctx, x - 2, y - 0.5, 1.6, 3, '#ffffff');
}

/**
 * Pinta el muro con su desgaste: raicillas y hojas detras, la cupula de escamas (con huecos, grietas y mordiscos segun
 * el desgaste), el gorro de musgo con su brote y la cara.
 */
export function paintWall(ctx: Ctx, wear: WallWear): void {
  const { outline } = WALL_COLORS;
  ctx.save();
  paintRoots(ctx);
  paintBaseLeaves(ctx);

  // Cupula con la luz arriba a la izquierda. El mismo degradado rellena cada escama: la luz sigue de una a otra.
  const outlinePoints = domeOutline(wear);
  const bark = ctx.createRadialGradient(DOME.x - DOME.rw * 0.42, DOME.cy - DOME.up * 0.5, 6, DOME.x + 4, DOME.cy - 6, DOME.rw * 1.2);
  bark.addColorStop(0, WALL_COLORS.bark[0]);
  bark.addColorStop(0.5, WALL_COLORS.bark[1]);
  bark.addColorStop(1, WALL_COLORS.bark[2]);
  smoothPath(ctx, outlinePoints, true);
  ctx.fillStyle = bark;
  ctx.fill();

  ctx.save();
  smoothPath(ctx, outlinePoints, true);
  ctx.clip();
  const missing = missingScales(wear);
  for (const s of SCALES) {
    if (missing.has(s)) paintSocket(ctx, s);
    else paintBarkScale(ctx, s, bark, WALL_COLORS.scale);
  }
  // Cara sobre corteza lisa y clara, que se funde con las escamas.
  paintBarkFace(ctx, 105, 120, 33, WALL_COLORS.scale);
  // Madera al aire en los mordiscos.
  if (wear === 2) {
    const bitten = outlinePoints.filter((p) => p.bitten);
    smoothPath(ctx, bitten, false);
    ctx.strokeStyle = WALL_COLORS.wood[1];
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = WALL_COLORS.ring;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // Reflejo suave arriba a la izquierda, bajo el musgo.
  ellipse(ctx, DOME.x - DOME.rw * 0.55, DOME.cy - DOME.up * 0.3, 12, 7, 'rgba(255, 255, 255, 0.35)', -1);
  for (const crack of CRACKS[wear]) paintCrack(ctx, crack.points, crack.width);
  ctx.restore();

  smoothPath(ctx, outlinePoints, true);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();

  paintSprout(ctx, wear);
  paintMoss(ctx, wear);

  // Cara: mejillas, ojos, cejas y boca.
  ellipse(ctx, 75, 130, 9, 5, WALL_COLORS.cheek);
  ellipse(ctx, 131, 127, 5, 4, WALL_COLORS.cheek);
  paintEyes(ctx, wear);
  paintBrows(ctx, wear);
  paintMouth(ctx, wear);
  if (wear === 2) paintSweat(ctx);
  ctx.restore();
}
