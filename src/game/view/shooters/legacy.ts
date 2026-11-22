import { type Ctx, circle, ellipse, leafShape, smallFlower } from '../canvasKit';
import { medalCenter } from '../levelMedal';
import type { ShooterCannons, ShooterDesign, ShooterVariant } from './design';

/**
 * La disparadora de siempre (T-001 a T-015), guardada tal cual como `legacy` al empezar su rediseno (T-016): cabeza
 * redonda sobre un tallo, canones rectos que salen de la cara, un punto dorado en el tallo por canon y hojas a los pies.
 * Para volver a ella basta con ponerla como `SHOOTER` en `shooterShape.ts`.
 */

/** Punto de apoyo de la disparadora dentro de su textura (los pies). 160 de ancho: una casilla. */
const SIZE = { width: 160, height: 180, footX: 80, footY: 174 } as const;

/**
 * Canones segun cuantos tenga (T-006), de arriba abajo, en pixeles de su textura: centro en altura (`y`), desde donde
 * sale de la cara (`fromX`), boca (`mouthX`) y alto del tubo (`h`). Son rectos: nacen a la altura de su boca.
 */
const BARRELS = {
  1: [{ y: 79, fromX: 96, fromY: 79, mouthX: 148, h: 32 }],
  2: [
    { y: 70, fromX: 94, fromY: 70, mouthX: 145, h: 25 },
    { y: 97, fromX: 96, fromY: 97, mouthX: 150, h: 25 },
  ],
  3: [
    { y: 61, fromX: 92, fromY: 61, mouthX: 143, h: 21 },
    { y: 84, fromX: 94, fromY: 84, mouthX: 151, h: 21 },
    { y: 107, fromX: 92, fromY: 107, mouthX: 145, h: 21 },
  ],
} as const;

/**
 * Puntos del tallo, uno por canon, de abajo arriba. La medallita de nivel (T-003) no los tapa: va en la nuca, arriba a
 * la izquierda de la cabeza.
 */
const DOTS = [
  { x: 76, y: 158 },
  { x: 73, y: 147 },
  { x: 71.5, y: 136 },
] as const;
const DOT_RADIUS = 5;

/** Cabeza: centro y radio. Crece un poco con cada fusion. */
function head(cannons: ShooterCannons): { x: number; y: number; r: number } {
  return { x: 76, y: 80, r: 44 + cannons * 2 };
}

/** Ojo (elipse): mira a la derecha, por donde llegan los gusanos. */
const EYE = { x: 72, y: 70, rx: 13, ry: 15 } as const;

/** Colores de cada variante. Tallo y hojas de la base son siempre verdes: sigue siendo una planta. */
interface LegacyPalette {
  /** Contorno de cabeza, canones y ojo. */
  outline: string;
  /** Cabeza: luz, tono y sombra. */
  head: readonly [string, string, string];
  /** Canon: arriba y abajo. */
  tube: readonly [string, string];
  /** Borde de la boca del canon y su fondo. */
  mouth: string;
  bore: string;
  /** Lo que brilla en el fondo de cada canon, si tiene: una brasa (fuego) o escarcha (hielo). */
  boreGlow: string | null;
  /** Hojas del brote de la coronilla. */
  sprout: string;
  sproutOutline: string;
  /** Flor de la de 3 canones: petalos y centro. */
  flower: readonly [string, string];
  cheek: string;
}

const PALETTES: Record<ShooterVariant, LegacyPalette> = {
  normal: {
    outline: '#2a6b22',
    head: ['#d0f59a', '#80d153', '#4aa236'],
    tube: ['#9be36c', '#3f9a35'],
    mouth: '#6cc24a',
    bore: '#1c3d15',
    boreGlow: null,
    sprout: '#62c046',
    sproutOutline: '#2a6b22',
    flower: ['#ffb3d1', '#ffd23f'],
    cheek: 'rgba(255, 130, 130, 0.38)',
  },
  // Fuego (T-004): cabeza de guindilla madura, canones de brasa y un brote como una llamita.
  fire: {
    outline: '#8a2410',
    head: ['#fff0b0', '#ff8f3a', '#e0401c'],
    tube: ['#ffd27a', '#e2581f'],
    mouth: '#ffa04d',
    bore: '#4a1208',
    boreGlow: '#ffcf4a',
    sprout: '#ffb22e',
    sproutOutline: '#b5450f',
    flower: ['#fff3a0', '#ff6a2a'],
    cheek: 'rgba(255, 70, 50, 0.42)',
  },
  // Hielo (T-005): cabeza de escarcha azul clara, canones de hielo con un brillo frio dentro y un brote de cristal.
  // Mejillas mas sonrosadas: tiene frio.
  ice: {
    outline: '#1f5a8a',
    head: ['#f4fcff', '#9fdcff', '#4a9fd8'],
    tube: ['#e4f7ff', '#6cbce8'],
    mouth: '#b8e8ff',
    bore: '#0f3350',
    boreGlow: '#c8f4ff',
    sprout: '#d4f2ff',
    sproutOutline: '#2f74a8',
    flower: ['#ffffff', '#7fd0ff'],
    cheek: 'rgba(255, 110, 160, 0.5)',
  },
  // Escudo (T-024): la misma corteza con musgo que las demas formas (`SHOOTER_COLORS.shield` en kit.ts), copiada aqui.
  shield: {
    outline: '#4a2c12',
    head: ['#f6e3bc', '#c9945a', '#8a5a2e'],
    tube: ['#e8cfa0', '#9a6a3a'],
    mouth: '#b9e27a',
    bore: '#2a1a0c',
    boreGlow: '#a8e070',
    sprout: '#8fcf5a',
    sproutOutline: '#3f6a1e',
    flower: ['#fff1c8', '#e0a040'],
    cheek: 'rgba(255, 120, 100, 0.4)',
  },
};

/** Contorno de lo verde de la planta (hojas de la base y puntos del tallo). */
const LEAF_OUTLINE = '#2a6b22';

/**
 * Cabeza redonda, canones y hojas a los pies. Mira hacia la derecha, por donde llegan los gusanos.
 * Al fusionarse (T-006) crece un poco: mas canones, cabeza algo mayor, una hoja mas en la base y en el brote,
 * y la de 3 canones luce una flor en la coronilla. Un punto en el tallo por canon.
 * Las variantes (fuego, T-004; hielo, T-005) cambian solo los colores: la forma es la misma.
 */
function paint(ctx: Ctx, cannons: ShooterCannons, variant: ShooterVariant): void {
  const palette = PALETTES[variant];
  const { footX, footY } = SIZE;
  const { outline } = palette;
  const { x: headX, y: headY, r: headR } = head(cannons);

  // Hojas de la base: dos, y una mas por cada fusion, mas cortas y levantadas.
  const baseLeaves: Array<readonly [number, number, number]> = [
    [Math.PI + 0.35, 52, 15],
    [-0.35, 50, 15],
  ];
  if (cannons >= 2) baseLeaves.unshift([-0.95, 36, 11]);
  if (cannons >= 3) baseLeaves.unshift([Math.PI + 0.95, 34, 11]);
  for (const [angle, length, width] of baseLeaves) {
    leafShape(ctx, footX, footY - 4, length, width, angle);
    const g = ctx.createLinearGradient(footX - 50, footY - 30, footX + 50, footY);
    g.addColorStop(0, '#5fb846');
    g.addColorStop(1, '#2f7a26');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = LEAF_OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Tallo
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3f9a35';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(footX, footY - 4);
  ctx.quadraticCurveTo(footX - 16, footY - 44, footX - 4, footY - 74);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190, 245, 150, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(footX + 3, footY - 8);
  ctx.quadraticCurveTo(footX - 10, footY - 44, footX + 1, footY - 72);
  ctx.stroke();

  // Un punto por canon en el tallo: semillitas doradas, de abajo arriba.
  for (const dot of DOTS.slice(0, cannons)) {
    const g = ctx.createRadialGradient(dot.x - 1.5, dot.y - 1.5, 0.5, dot.x, dot.y, DOT_RADIUS);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.6, '#ffe36b');
    g.addColorStop(1, '#e0a92a');
    circle(ctx, dot.x, dot.y, DOT_RADIUS, g);
    ctx.strokeStyle = LEAF_OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Canones (van detras de la cabeza para que salgan de la cara)
  for (const barrel of BARRELS[cannons]) {
    const { y, fromX, mouthX, h } = barrel;
    const tube = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    tube.addColorStop(0, palette.tube[0]);
    tube.addColorStop(1, palette.tube[1]);
    ctx.fillStyle = tube;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(fromX, y - h / 2, mouthX - fromX, h, h * 0.31);
    ctx.fill();
    ctx.stroke();
    ellipse(ctx, mouthX, y, h * 0.28, h * 0.6, palette.mouth);
    ctx.beginPath();
    ctx.ellipse(mouthX, y, h * 0.28, h * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ellipse(ctx, mouthX + 2, y, h * 0.16, h * 0.375, palette.bore);
    if (palette.boreGlow) {
      ellipse(ctx, mouthX + 2.5, y + h * 0.06, h * 0.08, h * 0.2, palette.boreGlow);
    }
  }

  // Cabeza
  const headFill = ctx.createRadialGradient(headX - 16, headY - 20, 6, headX, headY, headR + 4);
  headFill.addColorStop(0, palette.head[0]);
  headFill.addColorStop(0.45, palette.head[1]);
  headFill.addColorStop(1, palette.head[2]);
  circle(ctx, headX, headY, headR, headFill);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Brote en la coronilla: dos hojas, tres al fusionar, y la de 3 canones con una flor.
  const sproutY = headY - headR + 2;
  const sprout = cannons >= 2 ? [-2.15, -1.6, -1.0] : [-2.0, -1.15];
  for (const angle of sprout) {
    leafShape(ctx, 74, sproutY, 26, 8, angle);
    ctx.fillStyle = palette.sprout;
    ctx.fill();
    ctx.strokeStyle = palette.sproutOutline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (cannons === 3) {
    const fx = 74 + Math.cos(-1.6) * 26;
    const fy = sproutY + Math.sin(-1.6) * 26;
    smallFlower(ctx, fx, fy, 6, palette.flower[0], palette.flower[1]);
    ctx.strokeStyle = 'rgba(176, 60, 110, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(fx, fy, 4.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ojo mirando a la derecha, con brillo, y mejilla sonrojada. Con 3 canones, una ceja decidida.
  const eye = EYE;
  ellipse(ctx, eye.x, eye.y, eye.rx, eye.ry, '#ffffff');
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y, eye.rx, eye.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, 77, 72, 7, '#1a2614');
  circle(ctx, 80, 68, 2.6, '#ffffff');
  if (cannons === 3) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(61, 50);
    ctx.quadraticCurveTo(72, 46, 84, 53);
    ctx.stroke();
  }
  ellipse(ctx, 58, 96, 8, 4.5, palette.cheek);
  // Reflejo en la cabeza
  ellipse(ctx, headX - 22, headY - 28, 12, 7, 'rgba(255, 255, 255, 0.35)', -0.6);
}

export const LEGACY_SHOOTER: ShooterDesign = {
  id: 'legacy',
  size: SIZE,
  barrels: BARRELS,
  marks: (cannons) => DOTS.slice(0, cannons).map((dot) => ({ ...dot, r: DOT_RADIUS })),
  medal: (cannons) => medalCenter(head(cannons)),
  eye: () => EYE,
  paint,
};
