import { type Ctx, circle, ellipse } from '../canvasKit';
import type { Barrel, ShooterCannons, ShooterDesign, ShooterVariant } from './design';
import { GOLD, LEAF, SHOOTER_COLORS, type ShooterColors, bodyFill, fillStroke, paintBaseLeaves, paintEye, paintSprout, shine } from './kit';

/**
 * Propuesta "Vaina" del rediseno (T-016, X-01 c): una vaina gordita de pie sobre un tallito corto, con la punta
 * enroscada. Se abre por el lado de los gusanos y asoma una semilla dorada por canon (como los puntos del tallo de la
 * de siempre), que sale disparada: cada semilla es una boca. Las semillas sobresalen del borde, asi que tambien se cuentan en la silueta. Al fusionarse la vaina se alarga y
 * asoma una semilla mas; la de 3 canones luce una flor en la punta.
 */

const SIZE = { width: 160, height: 180, footX: 80, footY: 174 } as const;

/** Vaina: linea central (`x`), medio ancho, punta de arriba, donde se une al tallo y la abertura de la derecha. */
function pod(cannons: ShooterCannons) {
  const g = cannons - 1;
  const top = 38 - g * 7;
  const bottom = 152;
  return { x: 68, hw: 37 + g * 2, top, bottom, slit: { x: 96, top: top + 22, bottom: bottom - 14, hw: 13 + g } };
}

/** Semillas: una por canon, de arriba abajo, asomadas por la abertura y por fuera del borde. */
const SEEDS: Record<ShooterCannons, ReadonlyArray<{ x: number; y: number; r: number }>> = {
  1: [{ x: 106, y: 96, r: 17 }],
  2: [
    { x: 105, y: 78, r: 14.5 },
    { x: 107, y: 111, r: 14.5 },
  ],
  3: [
    { x: 103, y: 62, r: 12.5 },
    { x: 108, y: 90, r: 12.5 },
    { x: 106, y: 118, r: 12.5 },
  ],
};


/** La semilla sale por su lado derecho. */
function seedBarrel(seed: { x: number; y: number; r: number }): Barrel {
  return { y: seed.y, mouthX: seed.x + seed.r * 0.9, h: seed.r * 1.2, fromX: seed.x - seed.r, fromY: seed.y };
}

const BARRELS: Record<ShooterCannons, readonly Barrel[]> = {
  1: SEEDS[1].map(seedBarrel),
  2: SEEDS[2].map(seedBarrel),
  3: SEEDS[3].map(seedBarrel),
};

function eye(cannons: ShooterCannons) {
  const p = pod(cannons);
  return { x: p.x - 6, y: p.top + 48 + (cannons - 1) * 3, rx: 13, ry: 15 };
}

const marks = (cannons: ShooterCannons) => SEEDS[cannons];

/** Medallita en la nuca: arriba a la izquierda de la vaina, donde empieza a afilarse. */
function medal(cannons: ShooterCannons) {
  const p = pod(cannons);
  return { x: p.x - p.hw * 0.72, y: p.top + 20 + (cannons - 1) * 3 };
}

/** Cascara: almendra gordita de pie, mas ancha abajo, que se afila hacia la punta. */
function shellPath(ctx: Ctx, cannons: ShooterCannons): void {
  const { x, hw, top, bottom } = pod(cannons);
  ctx.beginPath();
  ctx.moveTo(x + 4, bottom);
  ctx.bezierCurveTo(x - hw * 1.36, bottom - 4, x - hw * 1.2, top + 30, x - 2, top);
  ctx.bezierCurveTo(x + hw * 1.1, top + 20, x + hw * 1.42, bottom - 30, x + 4, bottom);
  ctx.closePath();
}

/** Abertura: una ranura alargada en el lado de los gusanos. */
function slitPath(ctx: Ctx, cannons: ShooterCannons): void {
  const { slit } = pod(cannons);
  ctx.beginPath();
  ctx.moveTo(slit.x - 4, slit.top);
  ctx.bezierCurveTo(slit.x + slit.hw * 1.6, slit.top + 16, slit.x + slit.hw * 1.6, slit.bottom - 16, slit.x - 6, slit.bottom);
  ctx.bezierCurveTo(slit.x - slit.hw * 1.2, slit.bottom - 20, slit.x - slit.hw * 1.2, slit.top + 20, slit.x - 4, slit.top);
  ctx.closePath();
}

/** Punta enroscada de la vaina. */
function paintCurl(ctx: Ctx, x: number, top: number, colors: ShooterColors): void {
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(x - 2, top + 6);
    ctx.quadraticCurveTo(x - 6, top - 10, x + 6, top - 12);
    ctx.quadraticCurveTo(x + 14, top - 12, x + 12, top - 4);
  };
  ctx.lineCap = 'round';
  trace();
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 8;
  ctx.stroke();
  trace();
  ctx.strokeStyle = colors.body[1];
  ctx.lineWidth = 4;
  ctx.stroke();
}

/** Semilla brillante con su contorno y un reflejo: sin agujero, para que no parezca un ojo. */
function paintSeed(ctx: Ctx, seed: { x: number; y: number; r: number }, colors: ShooterColors): void {
  const fill = GOLD;
  const { x, y, r } = seed;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, fill[0]);
  g.addColorStop(0.55, fill[1]);
  g.addColorStop(1, fill[2]);
  circle(ctx, x, y, r, g);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, x - r * 0.36, y - r * 0.4, r * 0.34, r * 0.2, 'rgba(255, 255, 255, 0.8)', -0.6);
  // Rabito de la semilla, hacia dentro de la vaina.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.95, y);
  ctx.lineTo(x - r * 1.3, y + 1);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function paint(ctx: Ctx, cannons: ShooterCannons, variant: ShooterVariant): void {
  const colors = SHOOTER_COLORS[variant];
  const p = pod(cannons);

  paintBaseLeaves(ctx, 80, 170, cannons);
  // Tallito corto, siempre verde.
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(80, 170);
  ctx.quadraticCurveTo(73, 162, p.x + 4, p.bottom - 6);
  ctx.strokeStyle = LEAF.outline;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.strokeStyle = '#3f9a35';
  ctx.lineWidth = 10;
  ctx.stroke();

  if (cannons === 3) paintSprout(ctx, p.x + 8, p.top - 10, [-2.0, -1.3], 18, colors, true);
  paintCurl(ctx, p.x, p.top, colors);

  shellPath(ctx, cannons);
  fillStroke(ctx, bodyFill(ctx, p.x - 8, p.top + (p.bottom - p.top) * 0.5, p.hw * 1.6, colors), colors.outline, 3.5);

  // Vetas de la cascara.
  ctx.save();
  shellPath(ctx, cannons);
  ctx.clip();
  ctx.strokeStyle = colors.rib;
  ctx.lineWidth = 2.2;
  for (const k of [0.5, 0.95]) {
    ctx.beginPath();
    ctx.moveTo(p.x + 2, p.bottom - 2);
    ctx.bezierCurveTo(p.x - p.hw * k, p.bottom - 30, p.x - p.hw * k, p.top + 40, p.x - 2, p.top + 4);
    ctx.stroke();
  }
  ctx.restore();

  // Abertura con lo claro de dentro.
  slitPath(ctx, cannons);
  const inner = ctx.createLinearGradient(p.slit.x - p.slit.hw, 0, p.slit.x + p.slit.hw * 1.6, 0);
  inner.addColorStop(0, colors.inner[1]);
  inner.addColorStop(1, colors.inner[0]);
  fillStroke(ctx, inner, colors.outline, 3);

  // Semillas asomadas, de abajo arriba para que la de arriba tape a la de abajo.
  for (const seed of SEEDS[cannons].slice().reverse()) paintSeed(ctx, seed, colors);

  // Cara: ojo grande mirando a la derecha, sonrisa y mejilla.
  const e = eye(cannons);
  paintEye(ctx, e, colors.outline, cannons);
  ctx.beginPath();
  ctx.moveTo(e.x - 4, e.y + e.ry + 8);
  ctx.quadraticCurveTo(e.x + 3, e.y + e.ry + 13, e.x + 10, e.y + e.ry + 7);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ellipse(ctx, e.x - 14, e.y + e.ry + 7, 7.5, 4.4, colors.cheek);
  shine(ctx, p.x - p.hw * 0.55, p.top + 34, 6, 13, 0.35);
}

export const POD_SHOOTER: ShooterDesign = {
  id: 'pod',
  size: SIZE,
  barrels: BARRELS,
  marks,
  medal,
  eye,
  paint,
};
