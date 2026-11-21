import { type Ctx, circle, ellipse, leafShape, smallFlower } from '../canvasKit';
import type { Ellipse, Point, ShooterCannons, ShooterVariant } from './design';

/**
 * Lo que comparten las propuestas del rediseno de la disparadora (T-016): colores por variante y piezas que se repiten
 * (ojo, boca del canon, hojas de la base, brote). Los colores son los de siempre (guia de graficos, seccion 10):
 * disparadora verde, fuego naranja y rojo, hielo azul claro. La de siempre (`legacy.ts`) lleva su copia y no usa esto,
 * para que nada de aqui la cambie.
 */

export interface ShooterColors {
  /** Contorno del cuerpo, de los canones y del ojo. */
  outline: string;
  /** Cuerpo: luz, tono y sombra. */
  body: readonly [string, string, string];
  /** Canon: arriba y abajo. */
  tube: readonly [string, string];
  /** Borde de la boca del canon y su fondo. */
  mouth: string;
  bore: string;
  /** Lo que brilla en el fondo de cada canon: una brasa (fuego) o escarcha (hielo). */
  boreGlow: string | null;
  /** Vetas, costillas y surcos del cuerpo. */
  rib: string;
  /** Hojas del brote. */
  sprout: string;
  sproutOutline: string;
  /** Flor de la de 3 canones: petalos y centro. */
  flower: readonly [string, string];
  cheek: string;
  /** Pinchos (cactus) y lo claro de dentro (vaina). */
  spine: string;
  inner: readonly [string, string];
}

export const SHOOTER_COLORS: Record<ShooterVariant, ShooterColors> = {
  normal: {
    outline: '#2a6b22',
    body: ['#d0f59a', '#80d153', '#4aa236'],
    tube: ['#9be36c', '#3f9a35'],
    mouth: '#6cc24a',
    bore: '#1c3d15',
    boreGlow: null,
    rib: 'rgba(42, 107, 34, 0.32)',
    sprout: '#62c046',
    sproutOutline: '#2a6b22',
    flower: ['#ffb3d1', '#ffd23f'],
    cheek: 'rgba(255, 130, 130, 0.38)',
    spine: '#fff8d8',
    inner: ['#f6ffe0', '#c9ee9a'],
  },
  fire: {
    outline: '#8a2410',
    body: ['#fff0b0', '#ff8f3a', '#e0401c'],
    tube: ['#ffd27a', '#e2581f'],
    mouth: '#ffa04d',
    bore: '#4a1208',
    boreGlow: '#ffcf4a',
    rib: 'rgba(138, 36, 16, 0.3)',
    sprout: '#ffb22e',
    sproutOutline: '#b5450f',
    flower: ['#fff3a0', '#ff6a2a'],
    cheek: 'rgba(255, 70, 50, 0.42)',
    spine: '#fff3b0',
    inner: ['#fff6d0', '#ffc27a'],
  },
  ice: {
    outline: '#1f5a8a',
    body: ['#f4fcff', '#9fdcff', '#4a9fd8'],
    tube: ['#e4f7ff', '#6cbce8'],
    mouth: '#b8e8ff',
    bore: '#0f3350',
    boreGlow: '#c8f4ff',
    rib: 'rgba(31, 90, 138, 0.28)',
    sprout: '#d4f2ff',
    sproutOutline: '#2f74a8',
    flower: ['#ffffff', '#7fd0ff'],
    cheek: 'rgba(255, 110, 160, 0.5)',
    spine: '#ffffff',
    inner: ['#ffffff', '#d2efff'],
  },
};

/** Verde de las hojas de la base: siempre verdes, sea cual sea la variante (sigue siendo una planta). */
export const LEAF = { light: '#5fb846', dark: '#2f7a26', outline: '#2a6b22' } as const;

/** Semilla dorada (las marcas de cada canon, como los puntos del tallo de la de siempre). */
export const GOLD = ['#fffbe0', '#ffe36b', '#e0a92a'] as const;

/** Rellena y perfila el camino actual. */
export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, outline: string, lineWidth: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Degradado radial del cuerpo con la luz arriba a la izquierda. */
export function bodyFill(ctx: Ctx, x: number, y: number, r: number, colors: ShooterColors): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.45, r * 0.12, x, y, r * 1.08);
  g.addColorStop(0, colors.body[0]);
  g.addColorStop(0.45, colors.body[1]);
  g.addColorStop(1, colors.body[2]);
  return g;
}

/**
 * Ojo grande que mira a la derecha, por donde llegan los gusanos: blanco con contorno, pupila y brillo. Con 3 canones,
 * una ceja decidida (como en la de siempre).
 */
export function paintEye(ctx: Ctx, eye: Ellipse, outline: string, cannons: ShooterCannons): void {
  ellipse(ctx, eye.x, eye.y, eye.rx, eye.ry, '#ffffff');
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y, eye.rx, eye.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  const pupil = eye.rx * 0.54;
  circle(ctx, eye.x + eye.rx * 0.38, eye.y + eye.ry * 0.12, pupil, '#1a2614');
  circle(ctx, eye.x + eye.rx * 0.6, eye.y - eye.ry * 0.14, pupil * 0.37, '#ffffff');
  if (cannons === 3) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(eye.x - eye.rx * 0.85, eye.y - eye.ry * 1.33);
    ctx.quadraticCurveTo(eye.x, eye.y - eye.ry * 1.6, eye.x + eye.rx * 0.95, eye.y - eye.ry * 1.13);
    ctx.stroke();
  }
}

/** Boca de un canon mirando a la derecha: aro claro, fondo oscuro y, si tiene, el brillo de su elemento. */
export function paintMouth(ctx: Ctx, x: number, y: number, h: number, colors: ShooterColors): void {
  ellipse(ctx, x, y, h * 0.3, h * 0.6, colors.mouth);
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(x, y, h * 0.3, h * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, x + 2, y, h * 0.17, h * 0.38, colors.bore);
  if (colors.boreGlow) ellipse(ctx, x + 2.5, y + h * 0.06, h * 0.08, h * 0.2, colors.boreGlow);
}

/** Hojas a los pies: dos, y una mas por cada fusion, mas cortas y levantadas. */
export function paintBaseLeaves(ctx: Ctx, x: number, y: number, cannons: ShooterCannons, spread = 1): void {
  const leaves: Array<readonly [number, number, number]> = [
    [Math.PI + 0.3, 44 * spread, 13],
    [-0.3, 42 * spread, 13],
  ];
  if (cannons >= 2) leaves.unshift([-0.9, 30 * spread, 10]);
  if (cannons >= 3) leaves.unshift([Math.PI + 0.9, 28 * spread, 10]);
  for (const [angle, length, width] of leaves) {
    leafShape(ctx, x, y, length, width, angle);
    const g = ctx.createLinearGradient(x - 44, y - 26, x + 44, y);
    g.addColorStop(0, LEAF.light);
    g.addColorStop(1, LEAF.dark);
    fillStroke(ctx, g, LEAF.outline, 2);
  }
}

/** Brote de hojas desde (x, y) en las direcciones `angles`; con 3 canones, una flor en la punta de la central. */
export function paintSprout(ctx: Ctx, x: number, y: number, angles: readonly number[], length: number, colors: ShooterColors, flower: boolean): void {
  for (const angle of angles) {
    leafShape(ctx, x, y, length, length * 0.31, angle);
    fillStroke(ctx, colors.sprout, colors.sproutOutline, 2);
  }
  if (!flower) return;
  const middle = angles[Math.floor(angles.length / 2)];
  const fx = x + Math.cos(middle) * length;
  const fy = y + Math.sin(middle) * length;
  smallFlower(ctx, fx, fy, 6, colors.flower[0], colors.flower[1]);
  ctx.strokeStyle = 'rgba(176, 60, 110, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(fx, fy, 4.2, 0, Math.PI * 2);
  ctx.stroke();
}

/** Semilla dorada con contorno verde (marca de un canon). */
export function paintGoldSeed(ctx: Ctx, x: number, y: number, r: number, outline: string = LEAF.outline): void {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, GOLD[0]);
  g.addColorStop(0.6, GOLD[1]);
  g.addColorStop(1, GOLD[2]);
  circle(ctx, x, y, r, g);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Tubo curvo que se afila: deja preparado el camino de un tubo que va de `from` a `to` siguiendo una curva con control
 * `via`, de ancho `w0` a `w1`. Con `roundEnd`, la punta queda redonda.
 */
export function curveTube(ctx: Ctx, from: Point, via: Point, to: Point, w0: number, w1: number, roundEnd = false, steps = 18): void {
  const left: Point[] = [];
  const right: Point[] = [];
  let endAngle = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * via.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * via.y + t * t * to.y;
    const dx = 2 * u * (via.x - from.x) + 2 * t * (to.x - via.x);
    const dy = 2 * u * (via.y - from.y) + 2 * t * (to.y - via.y);
    const length = Math.hypot(dx, dy) || 1;
    const half = (w0 + (w1 - w0) * t) / 2;
    left.push({ x: x - (dy / length) * half, y: y + (dx / length) * half });
    right.push({ x: x + (dy / length) * half, y: y - (dx / length) * half });
    endAngle = Math.atan2(dy, dx);
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  if (roundEnd) ctx.arc(to.x, to.y, w1 / 2, endAngle + Math.PI / 2, endAngle - Math.PI / 2, true);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
}

/** Reflejo blanco suave. */
export function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation = -0.6): void {
  ellipse(ctx, x, y, rx, ry, 'rgba(255, 255, 255, 0.35)', rotation);
}
