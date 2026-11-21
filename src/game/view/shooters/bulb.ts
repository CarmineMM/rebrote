import { type Ctx, ellipse, leafShape } from '../canvasKit';
import type { Barrel, ShooterCannons, ShooterDesign, ShooterVariant } from './design';
import { LEAF, SHOOTER_COLORS, type ShooterColors, bodyFill, curveTube, fillStroke, paintEye, paintMouth, paintSprout, shine } from './kit';

/**
 * Propuesta "Brote" del rediseno (T-016, X-01 a): un bulbo gordito sentado en la tierra, sin tallo, con raicillas y un
 * brote de hojas en la punta. Los canones le salen del hombro como brotes nuevos: tallitos que suben, se doblan hacia
 * los gusanos y terminan en un capullo abierto. Al fusionarse el bulbo engorda y le sale otro brote.
 */

const SIZE = { width: 160, height: 180, footX: 80, footY: 174 } as const;

/** Bulbo: centro de la barriga (`x`, `cy`), medio ancho y medio alto, suelo y punta del cuello. */
function bulb(cannons: ShooterCannons) {
  const g = cannons - 1;
  const rw = 43 + g * 3;
  const rh = 45 + g * 2.5;
  const bottom = 171;
  const cy = bottom - rh;
  return { x: 70, cy, rw, rh, bottom, tipY: cy - rh - 14 - g * 3 };
}

/** Brotes-canon: nacen dentro del bulbo (se pintan detras), suben y se doblan hasta su boca. */
const BARRELS: Record<ShooterCannons, readonly Barrel[]> = {
  1: [{ y: 82, mouthX: 148, h: 27, fromX: 94, fromY: 108 }],
  2: [
    { y: 66, mouthX: 145, h: 23, fromX: 90, fromY: 94 },
    { y: 106, mouthX: 150, h: 23, fromX: 104, fromY: 126 },
  ],
  3: [
    { y: 55, mouthX: 143, h: 20, fromX: 86, fromY: 84 },
    { y: 87, mouthX: 151, h: 20, fromX: 102, fromY: 106 },
    { y: 120, mouthX: 147, h: 20, fromX: 110, fromY: 136 },
  ],
};

function eye(cannons: ShooterCannons) {
  const b = bulb(cannons);
  return { x: b.x - 2, y: b.cy - 13 - (cannons - 1) * 2, rx: 14, ry: 16 };
}

/** Por donde asoma cada brote del bulbo: ahi destella el nuevo al fusionarse. */
function marks(cannons: ShooterCannons) {
  const b = bulb(cannons);
  return BARRELS[cannons].map((barrel) => {
    // Punto del borde del bulbo en direccion al brote.
    const a = Math.atan2((barrel.fromY - 6 - b.cy) / b.rh, (barrel.fromX + 12 - b.x) / b.rw);
    return { x: b.x + Math.cos(a) * b.rw, y: b.cy + Math.sin(a) * b.rh, r: 6 };
  });
}

/** Medallita en la nuca: arriba a la izquierda de la barriga, sobre el borde. */
function medal(cannons: ShooterCannons) {
  const b = bulb(cannons);
  const a = -2.5;
  return { x: b.x + Math.cos(a) * b.rw * 1.02, y: b.cy + Math.sin(a) * b.rh * 1.02 };
}

/** Camino del bulbo: barriga ancha y apoyada, hombros redondos y un cuello que se afila hacia la punta. */
function bulbPath(ctx: Ctx, cannons: ShooterCannons): void {
  const { x, cy, rw, rh, bottom, tipY } = bulb(cannons);
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  ctx.bezierCurveTo(x + rw * 0.82, bottom + 1, x + rw * 1.04, cy + rh * 0.55, x + rw, cy);
  ctx.bezierCurveTo(x + rw * 0.96, cy - rh * 0.62, x + rw * 0.42, cy - rh * 0.82, x + 9, tipY + 12);
  ctx.quadraticCurveTo(x + 4, tipY + 4, x + 3, tipY);
  ctx.quadraticCurveTo(x - 1, tipY + 5, x - 7, tipY + 12);
  ctx.bezierCurveTo(x - rw * 0.42, cy - rh * 0.82, x - rw * 0.96, cy - rh * 0.62, x - rw, cy);
  ctx.bezierCurveTo(x - rw * 1.04, cy + rh * 0.55, x - rw * 0.82, bottom + 1, x, bottom);
  ctx.closePath();
}

/**
 * Un brote-canon: tallito que sale del hombro hacia arriba, se dobla hacia los gusanos y se afila hasta un capullo:
 * copa de hoja que se abre en la boca, con dos petalos que se doblan hacia fuera. El primero lleva una hojita.
 */
function paintShoot(ctx: Ctx, barrel: Barrel, colors: ShooterColors, withLeaf: boolean): void {
  const { fromX, fromY, mouthX, y, h } = barrel;
  const neck = { x: mouthX - h * 0.75, y };
  const via = { x: fromX + (neck.x - fromX) * 0.18, y: y - 2 };
  const from = { x: fromX, y: fromY };

  // Tallito que se afila.
  curveTube(ctx, from, via, neck, h * 0.64, h * 0.4);
  const tube = ctx.createLinearGradient(0, y - h * 0.4, 0, fromY + h * 0.3);
  tube.addColorStop(0, colors.tube[0]);
  tube.addColorStop(1, colors.tube[1]);
  fillStroke(ctx, tube, colors.outline, 2.8);
  ctx.beginPath();
  ctx.moveTo(fromX + 2, fromY - 4);
  ctx.quadraticCurveTo(via.x - h * 0.12, via.y - h * 0.08, neck.x - 2, y - h * 0.1);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = Math.max(1.6, h * 0.09);
  ctx.lineCap = 'round';
  ctx.stroke();

  if (withLeaf) {
    leafShape(ctx, via.x + 6, via.y + h * 0.36, h * 0.8, h * 0.26, -2.5);
    const g = ctx.createLinearGradient(via.x - 20, via.y - 10, via.x + 10, via.y + 10);
    g.addColorStop(0, LEAF.light);
    g.addColorStop(1, LEAF.dark);
    fillStroke(ctx, g, LEAF.outline, 1.8);
  }

  // Petalos que se abren por fuera de la boca, arriba y abajo.
  for (const side of [-1, 1]) {
    leafShape(ctx, mouthX - h * 0.32, y + side * h * 0.42, h * 0.62, h * 0.24, side * 0.78);
    fillStroke(ctx, colors.sprout, colors.sproutOutline, 1.8);
  }
  // Copa del capullo: se ensancha del tallito a la boca.
  ctx.beginPath();
  ctx.moveTo(neck.x - h * 0.05, y - h * 0.2);
  ctx.bezierCurveTo(neck.x + h * 0.3, y - h * 0.24, mouthX - h * 0.25, y - h * 0.6, mouthX, y - h * 0.58);
  ctx.lineTo(mouthX, y + h * 0.58);
  ctx.bezierCurveTo(mouthX - h * 0.25, y + h * 0.6, neck.x + h * 0.3, y + h * 0.24, neck.x - h * 0.05, y + h * 0.2);
  ctx.closePath();
  const cup = ctx.createLinearGradient(0, y - h * 0.6, 0, y + h * 0.6);
  cup.addColorStop(0, colors.body[0]);
  cup.addColorStop(0.5, colors.sprout);
  cup.addColorStop(1, colors.body[2]);
  fillStroke(ctx, cup, colors.sproutOutline, 2.4);
  // Nervios de la copa.
  ctx.strokeStyle = colors.rib;
  ctx.lineWidth = 1.4;
  for (const k of [-0.28, 0.28]) {
    ctx.beginPath();
    ctx.moveTo(neck.x + h * 0.1, y + k * h * 0.3);
    ctx.quadraticCurveTo(mouthX - h * 0.3, y + k * h * 0.9, mouthX - 2, y + k * h * 1.5);
    ctx.stroke();
  }
  paintMouth(ctx, mouthX, y, h, colors);
}

/** Raicillas asomando bajo el bulbo. */
function paintRoots(ctx: Ctx, x: number, bottom: number, rw: number): void {
  ctx.lineCap = 'round';
  for (const [dx, bend] of [
    [-0.5, -6],
    [-0.15, -3],
    [0.2, 4],
    [0.52, 7],
  ] as const) {
    const sx = x + rw * dx;
    ctx.beginPath();
    ctx.moveTo(sx, bottom - 3);
    ctx.quadraticCurveTo(sx + bend * 0.4, bottom + 3, sx + bend, bottom + 6);
    ctx.strokeStyle = '#7a5a2e';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = '#d9b77a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function paint(ctx: Ctx, cannons: ShooterCannons, variant: ShooterVariant): void {
  const colors = SHOOTER_COLORS[variant];
  const b = bulb(cannons);

  paintRoots(ctx, b.x, b.bottom, b.rw);

  // Hojitas pegadas a la base del bulbo: dos, y una mas por fusion.
  const skirt: Array<readonly [number, number, number, number]> = [
    [b.x - b.rw * 0.62, b.bottom - 3, Math.PI + 0.22, 26],
    [b.x + b.rw * 0.62, b.bottom - 3, -0.22, 26],
  ];
  if (cannons >= 2) skirt.push([b.x - b.rw * 0.85, b.bottom - 10, Math.PI + 0.6, 20]);
  if (cannons >= 3) skirt.push([b.x + b.rw * 0.85, b.bottom - 10, -0.6, 20]);
  for (const [lx, ly, angle, length] of skirt) {
    leafShape(ctx, lx, ly, length, 8, angle);
    const g = ctx.createLinearGradient(lx - 20, ly - 10, lx + 20, ly);
    g.addColorStop(0, LEAF.light);
    g.addColorStop(1, LEAF.dark);
    fillStroke(ctx, g, LEAF.outline, 2);
  }

  // Brotes-canon detras del bulbo, para que le salgan del hombro. De abajo arriba: el de arriba tapa a los de abajo.
  BARRELS[cannons]
    .slice()
    .reverse()
    .forEach((barrel, i) => paintShoot(ctx, barrel, colors, i === cannons - 1));

  // Bulbo con la luz arriba a la izquierda.
  bulbPath(ctx, cannons);
  fillStroke(ctx, bodyFill(ctx, b.x, b.cy - 6, b.rw * 1.05, colors), colors.outline, 3.5);

  // Vetas de bulbo, de la base a la punta.
  ctx.save();
  bulbPath(ctx, cannons);
  ctx.clip();
  ctx.strokeStyle = colors.rib;
  ctx.lineWidth = 2.2;
  for (const side of [-1, 1]) {
    for (const k of [0.42, 0.78]) {
      ctx.beginPath();
      ctx.moveTo(b.x + side * b.rw * k * 0.5, b.bottom - 2);
      ctx.bezierCurveTo(b.x + side * b.rw * (k + 0.12), b.cy + b.rh * 0.3, b.x + side * b.rw * k, b.cy - b.rh * 0.7, b.x + 1, b.tipY + 8);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Brote en la punta: dos hojas, tres al fusionar, y la de 3 canones con una flor.
  const sprout = cannons >= 2 ? [-2.25, -1.7, -1.15] : [-2.1, -1.25];
  paintSprout(ctx, b.x + 3, b.tipY + 2, sprout, 24 + cannons * 1.5, colors, cannons === 3);

  // Cara: ojo grande mirando a la derecha, sonrisa pequena y mejilla.
  const e = eye(cannons);
  paintEye(ctx, e, colors.outline, cannons);
  ctx.beginPath();
  ctx.moveTo(e.x - 1, e.y + e.ry + 9);
  ctx.quadraticCurveTo(e.x + 7, e.y + e.ry + 15, e.x + 15, e.y + e.ry + 8);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ellipse(ctx, e.x - 17, e.y + e.ry + 8, 8, 4.5, colors.cheek);
  shine(ctx, b.x - b.rw * 0.5, b.cy - b.rh * 0.55, 12, 7);
}

export const BULB_SHOOTER: ShooterDesign = {
  id: 'bulb',
  size: SIZE,
  barrels: BARRELS,
  marks,
  medal,
  eye,
  paint,
};
