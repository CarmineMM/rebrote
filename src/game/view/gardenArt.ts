import { LIMITS } from '../config/balance';
import { isMilestoneLevel, milestonesReached } from '../core/plants';
import { type Ctx, circle, ellipse, leafShape, smallFlower } from './canvasKit';
import { MEDAL_TIERS } from './levelMedal';

/**
 * Jardincito de los niveles con premio (elegido por Carmine el 21 nov 2026): matas y flores que brotan a los pies de la
 * disparadora al llegar a los niveles 5, 10, 15 y 20, sin tocar su dibujo. Cada premio anade algo: margaritas (5),
 * botones de oro (10), un arbusto con bayas rojas (15) y flores de cristal que destellan (20), en los colores de la
 * medallita. Sin Phaser: el dibujo y donde va cada trozo. La vista esta en `levelGarden.ts`.
 *
 * Medidas en pixeles de su textura (diseno, 160 por casilla, como la disparadora).
 */

/** Textura de un trozo: `footY` es donde toca el suelo. */
export const GARDEN = { width: 72, height: 60, footY: 57 } as const;

/** Trozos: `a` la mata grande de detras a la izquierda, `b` la de detras a la derecha y `c` la pequena de delante. */
export type GardenPart = 'a' | 'b' | 'c';
export const GARDEN_PARTS: readonly GardenPart[] = ['a', 'b', 'c'];

/** Tramos con dibujo: uno por nivel con premio. */
export const GARDEN_TIERS = 4;

/** Tramo del jardincito de una planta de nivel `level`: cuantos premios lleva (0 sin jardincito, 4 en el 20). */
export function gardenTier(level: number): number {
  return Math.min(GARDEN_TIERS, milestonesReached(level));
}

/** Un trozo colocado: respecto a los pies de la planta, en anchos de casilla; delante o detras de ella; volteado o no. */
export interface GardenSpot {
  part: GardenPart;
  dx: number;
  dy: number;
  front: boolean;
  flip: boolean;
  /** Escala de la textura respecto a la de la disparadora (160 por casilla). */
  scale: number;
}

/**
 * Donde va cada trozo segun el tramo: detras, a los dos lados; delante, uno pequeno desde el 10 y otro desde el 15. Los
 * de delante van a los lados, sin tapar el centro de la planta.
 */
export function gardenSpots(tier: number): GardenSpot[] {
  if (tier < 1) return [];
  const scale = 1.4 + Math.min(tier, GARDEN_TIERS) * 0.1;
  const spots: GardenSpot[] = [
    { part: 'a', dx: -0.46, dy: -0.05, front: false, flip: false, scale },
    { part: 'b', dx: 0.44, dy: -0.07, front: false, flip: true, scale },
  ];
  if (tier >= 2) spots.push({ part: 'c', dx: -0.32, dy: 0.09, front: true, flip: false, scale });
  if (tier >= 3) spots.push({ part: 'c', dx: 0.3, dy: 0.1, front: true, flip: true, scale });
  return spots;
}

/** Los niveles con premio, de menor a mayor (para la guia y los tests). */
export const GARDEN_LEVELS: readonly number[] = Array.from({ length: LIMITS.maxLevel }, (_, i) => i + 1).filter(isMilestoneLevel);

const hex = (color: string): number => Number.parseInt(color.slice(1), 16);

function rgba(color: string, alpha: number): string {
  const n = hex(color);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Estrella de cuatro puntas. */
function star(ctx: Ctx, x: number, y: number, size: number, fill: string, outline: string): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.34;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Mata de hierba: hojas finas desde el suelo. */
function tuft(ctx: Ctx, x: number, y: number, blades: number, height: number): void {
  for (let i = 0; i < blades; i++) {
    const t = blades === 1 ? 0.5 : i / (blades - 1);
    const angle = -Math.PI / 2 + (t - 0.5) * 1.3;
    leafShape(ctx, x + (t - 0.5) * 10, y, height * (0.7 + 0.3 * Math.sin(t * Math.PI)), 3.6, angle);
    const g = ctx.createLinearGradient(x, y - height, x, y);
    g.addColorStop(0, '#9be36c');
    g.addColorStop(1, '#3f9a35');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2a6b22';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

/** Flor en su tallo: margarita (plata), boton de oro o flor de cristal. */
function stemFlower(ctx: Ctx, x: number, y: number, height: number, r: number, kind: 'daisy' | 'gold' | 'crystal'): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 3, y - height * 0.5, x + 1, y - height);
  ctx.strokeStyle = '#2a6b22';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = '#5fb846';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  const fx = x + 1;
  const fy = y - height;
  if (kind === 'crystal') {
    const p = MEDAL_TIERS[4];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(a - 0.32) * r * 0.75, fy + Math.sin(a - 0.32) * r * 0.75);
      ctx.lineTo(fx + Math.cos(a) * r * 1.5, fy + Math.sin(a) * r * 1.5);
      ctx.lineTo(fx + Math.cos(a + 0.32) * r * 0.75, fy + Math.sin(a + 0.32) * r * 0.75);
      ctx.closePath();
      const g = ctx.createLinearGradient(fx, fy, fx + Math.cos(a) * r * 1.5, fy + Math.sin(a) * r * 1.5);
      g.addColorStop(0, p.light);
      g.addColorStop(0.6, p.mid);
      g.addColorStop(1, p.dark);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    circle(ctx, fx, fy, r * 0.4, '#ffffff');
    return;
  }
  const [petal, center, outline] = kind === 'daisy' ? ['#ffffff', '#cdd6e2', '#5b6676'] : ['#ffe36b', '#e0a92a', '#6b4505'];
  smallFlower(ctx, fx, fy, r, petal, center);
  ctx.strokeStyle = rgba(outline, 0.55);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(fx + Math.cos(a) * r, fy + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  circle(ctx, fx, fy, r * 0.7, center);
}

/** Arbusto redondo: bolas de hojas solapadas. */
function bush(ctx: Ctx, x: number, y: number, width: number, height: number): void {
  const balls: Array<[number, number, number]> = [
    [-0.32, -0.38, 0.36],
    [0.3, -0.4, 0.34],
    [0, -0.62, 0.4],
    [-0.12, -0.3, 0.38],
    [0.2, -0.26, 0.34],
  ];
  for (const [dx, dy, r] of balls) {
    const bx = x + dx * width;
    const by = y + dy * height;
    const g = ctx.createRadialGradient(bx - 4, by - 5, 1, bx, by, r * width);
    g.addColorStop(0, '#8fd863');
    g.addColorStop(0.6, '#4aa236');
    g.addColorStop(1, '#2f7a26');
    circle(ctx, bx, by, r * width, g);
    ctx.strokeStyle = '#1f5a1a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, r * width, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Rellenos encima para borrar los contornos de dentro.
  for (const [dx, dy, r] of balls) circle(ctx, x + dx * width, y + dy * height, r * width - 1.6, '#4fa83a');
  ellipse(ctx, x - width * 0.18, y - height * 0.72, width * 0.14, height * 0.1, 'rgba(255, 255, 255, 0.35)', -0.4);
}

/** Baya brillante del color del rubi. */
function berry(ctx: Ctx, x: number, y: number, r: number): void {
  const p = MEDAL_TIERS[3];
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
  g.addColorStop(0, p.light);
  g.addColorStop(0.5, p.mid);
  g.addColorStop(1, p.dark);
  circle(ctx, x, y, r, g);
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.3, 'rgba(255, 255, 255, 0.8)');
}

/** Pinta el trozo `part` del jardincito del tramo `tier` (1 a 4). */
export function paintGardenPiece(ctx: Ctx, tier: number, part: GardenPart): void {
  const x = GARDEN.width / 2;
  const y = GARDEN.footY;
  const big = part === 'a';
  if (part === 'c') {
    tuft(ctx, x, y, 3, 14);
    if (tier === 1) stemFlower(ctx, x + 4, y, 12, 3.4, 'daisy');
    if (tier === 2) stemFlower(ctx, x + 4, y, 13, 3.6, 'gold');
    if (tier === 3) {
      berry(ctx, x - 5, y - 6, 3.6);
      berry(ctx, x + 4, y - 9, 3.6);
    }
    if (tier === 4) stemFlower(ctx, x + 3, y, 14, 3.4, 'crystal');
    return;
  }
  if (tier >= 3) bush(ctx, x, y, big ? 44 : 34, big ? 34 : 26);
  tuft(ctx, x + (big ? -14 : 12), y, big ? 5 : 4, big ? 26 : 20);
  if (tier === 1) {
    stemFlower(ctx, x - 6, y, big ? 26 : 20, 4.6, 'daisy');
    if (big) stemFlower(ctx, x + 8, y, 18, 4, 'daisy');
  }
  if (tier === 2) {
    stemFlower(ctx, x - 6, y, big ? 30 : 22, 5, 'gold');
    stemFlower(ctx, x + 8, y, big ? 21 : 16, 4.4, 'gold');
    if (big) stemFlower(ctx, x - 18, y, 16, 3.8, 'daisy');
  }
  if (tier === 3) {
    const berries: Array<[number, number]> = big
      ? [
          [-12, -18],
          [4, -27],
          [14, -14],
          [-2, -12],
        ]
      : [
          [-8, -14],
          [6, -20],
          [9, -9],
        ];
    for (const [dx, dy] of berries) berry(ctx, x + dx, y + dy, 4);
    if (big) stemFlower(ctx, x - 22, y, 20, 4.4, 'gold');
  }
  if (tier === 4) {
    stemFlower(ctx, x - 4, y, big ? 38 : 30, 5.4, 'crystal');
    if (big) stemFlower(ctx, x + 12, y, 28, 4.4, 'crystal');
    berry(ctx, x - 14, y - 14, 3.6);
    if (big) stemFlower(ctx, x - 24, y, 18, 3.8, 'gold');
    star(ctx, x + 18, y - 34, 4.5, '#ffffff', MEDAL_TIERS[4].dark);
  }
}
