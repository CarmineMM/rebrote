import { type Ctx, circle, ellipse } from '../canvasKit';
import type { Barrel, ShooterCannons, ShooterDesign, ShooterVariant } from './design';
import { SHOOTER_COLORS, type ShooterColors, bodyFill, curveTube, fillStroke, paintBaseLeaves, paintEye, paintMouth, shine } from './kit';

/**
 * Propuesta "Cactus" del rediseno (T-016, X-01 b): un cactus gordito de pie, con costillas y pinchos de pelusa y un
 * mechon lanudo en la coronilla. Cada canon es un brazo que apunta hacia los gusanos. Al fusionarse crece, le sale otro
 * brazo y el mechon se hace mas grande; el de 3 canones luce un higo chumbo en el mechon.
 * Sin flor en la cabeza ni brazos levantados: asi no recuerda al cactus de otro juego.
 */

const SIZE = { width: 160, height: 180, footX: 80, footY: 174 } as const;

/** Columna: centro (`x`), medio ancho, arriba de la cupula y suelo. */
function column(cannons: ShooterCannons) {
  const g = cannons - 1;
  return { x: 72, hw: 28 + g * 2.5, top: 42 - g * 5, bottom: 172 };
}

/** Brazos-canon: nacen dentro de la columna (se pintan detras), salen por la derecha y suben un poco hacia la boca. */
const BARRELS: Record<ShooterCannons, readonly Barrel[]> = {
  1: [{ y: 92, mouthX: 146, h: 30, fromX: 84, fromY: 102 }],
  2: [
    { y: 76, mouthX: 145, h: 25, fromX: 84, fromY: 85 },
    { y: 112, mouthX: 150, h: 25, fromX: 86, fromY: 120 },
  ],
  3: [
    { y: 63, mouthX: 143, h: 22, fromX: 84, fromY: 70 },
    { y: 93, mouthX: 151, h: 22, fromX: 86, fromY: 99 },
    { y: 123, mouthX: 146, h: 22, fromX: 88, fromY: 128 },
  ],
};

function eye(cannons: ShooterCannons) {
  const c = column(cannons);
  return { x: c.x - 3, y: c.top + 38, rx: 13, ry: 15 };
}

/** Por donde sale cada brazo de la columna: ahi destella el nuevo al fusionarse. */
function marks(cannons: ShooterCannons) {
  const c = column(cannons);
  return BARRELS[cannons].map((barrel) => ({ x: c.x + c.hw, y: barrel.fromY - 2, r: 6 }));
}

/** Medallita en la nuca: arriba a la izquierda de la cupula, medio fuera. */
function medal(cannons: ShooterCannons) {
  const c = column(cannons);
  const a = -2.55;
  const r = c.hw * 1.12;
  return { x: c.x + Math.cos(a) * r, y: c.top + c.hw + Math.sin(a) * r };
}

/** Columna con la cupula redonda y la base algo mas ancha, como si se apoyara. */
function columnPath(ctx: Ctx, cannons: ShooterCannons): void {
  const { x, hw, top, bottom } = column(cannons);
  const dome = top + hw;
  ctx.beginPath();
  ctx.moveTo(x - hw * 1.04, bottom);
  ctx.bezierCurveTo(x - hw * 1.12, bottom - 40, x - hw * 1.06, dome + 30, x - hw, dome);
  ctx.arc(x, dome, hw, Math.PI, 0);
  ctx.bezierCurveTo(x + hw * 1.06, dome + 30, x + hw * 1.12, bottom - 40, x + hw * 1.04, bottom);
  ctx.quadraticCurveTo(x, bottom + 4, x - hw * 1.04, bottom);
  ctx.closePath();
}

/** Areola: bolita de pelusa clara con contorno, de donde salen los pinchos. */
function spine(ctx: Ctx, x: number, y: number, colors: ShooterColors, size = 2.4): void {
  circle(ctx, x, y, size, colors.spine);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();
}

/** Pincho que asoma por el borde, hacia fuera (`angle`): tambien se ve en la silueta. */
function edgeSpine(ctx: Ctx, x: number, y: number, angle: number, colors: ShooterColors, length = 6): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(angle) * 2, y - Math.sin(angle) * 2);
  ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = colors.spine;
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

/**
 * Un brazo-canon: brazo gordito de cactus que sale de la columna, se dobla un poco hacia arriba y termina redondo, con
 * la boca abierta en la punta. Costilla a lo largo y un par de pinchos.
 */
function paintArm(ctx: Ctx, barrel: Barrel, colors: ShooterColors): void {
  const { fromX, fromY, mouthX, y, h } = barrel;
  const tip = { x: mouthX - h * 0.42, y };
  const via = { x: fromX + (tip.x - fromX) * 0.62, y: fromY + 1 };
  curveTube(ctx, { x: fromX, y: fromY }, via, tip, h * 1.06, h * 0.92, true);
  const tube = ctx.createLinearGradient(0, y - h * 0.5, 0, fromY + h * 0.5);
  tube.addColorStop(0, colors.body[0]);
  tube.addColorStop(0.4, colors.body[1]);
  tube.addColorStop(1, colors.body[2]);
  fillStroke(ctx, tube, colors.outline, 3);
  // Costilla a lo largo del brazo y dos pinchos encima.
  ctx.beginPath();
  ctx.moveTo(fromX + 12, fromY + 2);
  ctx.quadraticCurveTo(via.x, via.y + 2, tip.x - 2, y + 2);
  ctx.strokeStyle = colors.rib;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fromX + 14, fromY - h * 0.3);
  ctx.quadraticCurveTo(via.x, via.y - h * 0.32, tip.x - 4, y - h * 0.28);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(2, h * 0.12);
  ctx.lineCap = 'round';
  ctx.stroke();
  edgeSpine(ctx, fromX + 26, fromY - h * 0.53, -1.75, colors, 5);
  edgeSpine(ctx, tip.x - 8, y - h * 0.47, -1.35, colors, 5);
  paintMouth(ctx, mouthX, y, h, colors);
}

/** Mechon lanudo de la coronilla: bolitas de pelusa; mas grande al fusionarse. */
function paintTuft(ctx: Ctx, x: number, top: number, cannons: ShooterCannons, colors: ShooterColors): void {
  const puffs = cannons === 1 ? 4 : cannons === 2 ? 5 : 6;
  const span = 12 + cannons * 4;
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    const px = x - span + t * span * 2;
    const py = top + 4 - Math.sin(t * Math.PI) * (5 + cannons);
    const r = 6 + Math.sin(t * Math.PI) * 2;
    circle(ctx, px, py, r, colors.spine);
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Las bolitas se tapan unas a otras: el relleno de encima borra los contornos de dentro.
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    const px = x - span + t * span * 2;
    const py = top + 4 - Math.sin(t * Math.PI) * (5 + cannons);
    circle(ctx, px, py, 4.6 + Math.sin(t * Math.PI) * 2, colors.spine);
  }
  ellipse(ctx, x - span * 0.4, top - 2, 4, 2.4, 'rgba(255, 255, 255, 0.8)', -0.4);
}

/** Higo chumbo del de 3 canones, prendido en el mechon. */
function paintFruit(ctx: Ctx, x: number, y: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 9, -0.35, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 9);
  g.addColorStop(0, '#ffc2dc');
  g.addColorStop(0.5, '#ff5c9a');
  g.addColorStop(1, '#c42a6a');
  fillStroke(ctx, g, '#7a1d4c', 1.8);
  for (const [dx, dy] of [
    [-2, -3],
    [2.5, 1],
    [-1, 4],
  ] as const) {
    circle(ctx, x + dx, y + dy, 0.9, '#fff0a0');
  }
  ellipse(ctx, x - 2.4, y - 3.6, 2.2, 1.4, 'rgba(255, 255, 255, 0.7)', -0.6);
}

function paint(ctx: Ctx, cannons: ShooterCannons, variant: ShooterVariant): void {
  const colors = SHOOTER_COLORS[variant];
  const c = column(cannons);

  paintBaseLeaves(ctx, c.x + 6, c.bottom - 2, cannons, 0.95);

  // Pinchos que asoman por el borde izquierdo y la cupula (detras del cuerpo: solo se ve la punta).
  for (let yy = c.top + c.hw * 1.4; yy < c.bottom - 14; yy += 24) edgeSpine(ctx, c.x - c.hw * 1.06, yy, Math.PI + 0.25, colors, 8);
  for (const a of [-2.5, -2.05]) edgeSpine(ctx, c.x + Math.cos(a) * c.hw * 0.98, c.top + c.hw + Math.sin(a) * c.hw * 0.98, a, colors, 8);

  // Brazos-canon detras de la columna, para que le salgan del costado.
  for (const barrel of BARRELS[cannons]) paintArm(ctx, barrel, colors);

  columnPath(ctx, cannons);
  fillStroke(ctx, bodyFill(ctx, c.x, c.top + c.hw * 1.6, c.hw * 1.7, colors), colors.outline, 3.5);

  // Costillas que siguen la cupula, con sus pinchos.
  ctx.save();
  columnPath(ctx, cannons);
  ctx.clip();
  ctx.strokeStyle = colors.rib;
  ctx.lineWidth = 2.4;
  const ribs = [-0.62, 0.62];
  for (const k of ribs) {
    ctx.beginPath();
    ctx.moveTo(c.x + k * c.hw * 1.02, c.bottom);
    ctx.bezierCurveTo(c.x + k * c.hw * 1.04, c.bottom - 50, c.x + k * c.hw, c.top + c.hw * 0.9, c.x + k * c.hw * 0.42, c.top + 3);
    ctx.stroke();
  }
  ctx.restore();
  const e = eye(cannons);
  for (const k of ribs) {
    for (let yy = c.top + c.hw * 0.75; yy < c.bottom - 8; yy += 22) {
      const sx = c.x + k * c.hw * (yy < c.top + c.hw ? 0.8 : 1);
      // Sin pinchos sobre el ojo ni la mejilla.
      if (Math.abs(sx - e.x) < e.rx + 10 && Math.abs(yy - e.y) < e.ry + 26) continue;
      spine(ctx, sx, yy, colors);
    }
  }

  paintTuft(ctx, c.x, c.top, cannons, colors);
  if (cannons === 3) paintFruit(ctx, c.x - 13, c.top - 10);

  // Cara: ojo grande mirando a la derecha y mejilla.
  paintEye(ctx, e, colors.outline, cannons);
  ctx.beginPath();
  ctx.moveTo(e.x + 1, e.y + e.ry + 9);
  ctx.quadraticCurveTo(e.x + 8, e.y + e.ry + 14, e.x + 15, e.y + e.ry + 8);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ellipse(ctx, e.x - 13, e.y + e.ry + 9, 7, 4.2, colors.cheek);
  shine(ctx, c.x - c.hw * 0.48, c.top + c.hw * 0.6, 7, 12, 0.2);
  // Brillo largo por el lado iluminado.
  ctx.beginPath();
  ctx.moveTo(c.x - c.hw * 0.78, c.top + c.hw * 1.3);
  ctx.quadraticCurveTo(c.x - c.hw * 0.86, c.bottom - 50, c.x - c.hw * 0.78, c.bottom - 22);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 5;
  ctx.stroke();
}

export const CACTUS_SHOOTER: ShooterDesign = {
  id: 'cactus',
  size: SIZE,
  barrels: BARRELS,
  marks,
  medal,
  eye,
  paint,
};
