import { type Ctx, circle, ellipse } from './canvasKit';

/**
 * Arte de Brain, el Cerebro (T-039), jefe del brote 3, sin Phaser: lo registra `textures.ts` y lo colocan `brainView.ts` (en
 * el tablero y cuando se prepara) y la foto de la ficha (`portrait.ts`). Brain fue el primer virus de PC: se escondia de quien
 * miraba el disco. En el juego avanza oculto y a saltos, asi que va de pie sobre algo que salta. Para no parecerse a Creeper
 * (tumbado, con un monitor por cabeza) ni a Elk Cloner (de pie, con un disquete), es un cerebro, sin pantalla ni disquete
 * (BR-01). Tres propuestas, que se comparan en `/propuestas/jefes.html`:
 * - **Cupula** (`dome`): un cerebro rosa bajo una cupula de cristal, sobre un platillo de metal con luces y cuatro patas con
 *   muelles. Muerde con la mandibula del platillo.
 * - **Pogo** (`pogo`): un cerebro con parches de sectores tachados (los que Brain marcaba como defectuosos para esconderse)
 *   que bota sobre un saltador de muelle agarrado con sus bracitos.
 * - **Cables** (`cables`): un cerebro con una antena que salta como un pulpo sobre seis cables con clavijas.
 * Mismo estilo que el resto (guia de graficos, seccion 10): degradado con la luz arriba a la izquierda, contorno oscuro del
 * mismo tono, un reflejo suave y cara tierna (ojos con brillo, mejillas). Mira a la izquierda, como todos los enemigos.
 */

export type BrainDesign = 'dome' | 'pogo' | 'cables';

/** Lo que pone la cara: tranquilo, mordiendo, dolorido, agachado para saltar, en el aire, enfadado (fase 2) y burlon. */
export type BrainMood = 'idle' | 'bite' | 'hurt' | 'ready' | 'air' | 'angry' | 'smug';

export const BRAIN_MOODS: readonly BrainMood[] = ['idle', 'bite', 'hurt', 'ready', 'air', 'angry', 'smug'];

export interface BrainProposal {
  readonly id: BrainDesign;
  readonly letter: string;
  readonly name: string;
  /** Nombre corto, para el rotulo del tablero de la galeria. */
  readonly short: string;
  readonly about: string;
}

/** Las propuestas de la galeria (BR-01). Sus textos no los ve el jugador: van en espanol sin `src/i18n/`. */
export const BRAIN_DESIGNS: readonly BrainProposal[] = [
  {
    id: 'dome',
    letter: 'A',
    name: 'Cúpula sobre patas de muelle',
    short: 'Cúpula',
    about: 'Un cerebro rosa bajo una cúpula de cristal, sobre un platillo con luces y cuatro patas de muelle que se aprietan antes de cada salto. Muerde con la mandíbula del platillo.',
  },
  {
    id: 'pogo',
    letter: 'B',
    name: 'Sectores tachados en un pogo',
    short: 'Pogo',
    about: 'Un cerebro con parches de sectores rojos tachados (los que Brain marcaba como defectuosos para esconderse) que bota sobre un saltador de muelle, agarrado con sus bracitos.',
  },
  {
    id: 'cables',
    letter: 'C',
    name: 'Cerebro con tentáculos de cable',
    short: 'Cables',
    about: 'Un cerebro con una antena que parpadea, que salta como un pulpo sobre seis cables acabados en clavijas.',
  },
];

/** La que usa el juego: la cupula (BR-01, Carmine la eligio en `/propuestas/jefes.html` el 23 nov 2026). Las otras quedan como referencia. */
export const BRAIN_DESIGN: BrainDesign = 'dome';

// ---------------------------------------------------------------------------
// Medidas y montaje

/**
 * Lienzos de las piezas, en pixeles de diseno (160 por casilla, como el gusano). El cuerpo se coloca por su ancla (`cx`, `cy`):
 * donde le salen las patas. La cara va encima del cuerpo, centrada en `rig.face`. La cupula (solo `dome`) tiene el lienzo y el
 * ancla del cuerpo. Cada pata cuelga de su cadera (`hipX`, `hipY`); el pogo, de lo alto del manillar.
 */
export const BRAIN_SIZE = {
  body: { width: 260, height: 240, cx: 130, cy: 196 },
  face: { width: 150, height: 150, cx: 75, cy: 60 },
  leg: { width: 80, height: 124, hipX: 40, hipY: 12 },
  cable: { width: 64, height: 132, hipX: 32, hipY: 8 },
  pogo: { width: 120, height: 152, hipX: 60, hipY: 12 },
} as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Una pata: su cadera respecto al ancla del cuerpo, si va detras (y mas oscura), su angulo en reposo y su fase al temblar. */
export interface BrainLeg extends Point {
  readonly far: boolean;
  readonly angle: number;
  readonly phase: number;
}

/** Montaje de una propuesta (pies en 0, 0, mirando a la izquierda). */
export interface BrainRig {
  /** Donde va el ancla del cuerpo de pie, en reposo. */
  readonly body: Point;
  /** Centro de la cara respecto al ancla del cuerpo. */
  readonly face: Point;
  /** Patas (o el pogo): que textura llevan y donde. */
  readonly limb: 'leg' | 'cable' | 'pogo';
  readonly legs: readonly BrainLeg[];
  /** Cuanto se aprietan las patas al agacharse (fraccion de su largo) y cuanto se estiran al despegar. */
  readonly squeeze: number;
  readonly stretch: number;
  /** Ojos respecto al ancla del cuerpo: ahi brillan cuando esta oculto, como los Lurker (LK-02). */
  readonly eyes: ReadonlyArray<Point & { readonly r: number }>;
  /** Boca respecto al ancla del cuerpo: de ahi sale el mordisco. */
  readonly mouth: Point;
  /** Pico del bocadillo respecto al ancla del cuerpo: encima de la cabeza. */
  readonly bubble: Point;
  /** Luz de la antena (solo `cables`), respecto al ancla del cuerpo, o null. */
  readonly antenna: Point | null;
  /** Caja holgada para el doble clic de la ficha (T-010), respecto a los pies. */
  readonly hitBox: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
}

/** Del lienzo del cuerpo a coordenadas respecto a su ancla. */
const fromBody = (x: number, y: number): Point => ({ x: x - BRAIN_SIZE.body.cx, y: y - BRAIN_SIZE.body.cy });

/** Ojos de cada propuesta en el lienzo del cuerpo: el de delante, mas grande; el de detras, algo mas atras y mas pequeno. */
const EYES: Record<BrainDesign, ReadonlyArray<{ x: number; y: number; rx: number; ry: number }>> = {
  dome: [
    { x: 84, y: 112, rx: 13, ry: 16 },
    { x: 114, y: 108, rx: 11, ry: 14 },
  ],
  pogo: [
    { x: 88, y: 112, rx: 14, ry: 17 },
    { x: 120, y: 108, rx: 12, ry: 15 },
  ],
  cables: [
    { x: 86, y: 108, rx: 14, ry: 17 },
    { x: 118, y: 104, rx: 12, ry: 15 },
  ],
};

/** Boca en el lienzo del cuerpo: en el platillo (cupula) o en el cerebro. */
const MOUTHS: Record<BrainDesign, Point> = {
  dome: { x: 70, y: 184 },
  pogo: { x: 92, y: 146 },
  cables: { x: 90, y: 140 },
};

/** Centro de la cara en el lienzo del cuerpo (el de su lienzo, `BRAIN_SIZE.face`). */
const FACE_AT: Record<BrainDesign, Point> = {
  dome: { x: 96, y: 128 },
  pogo: { x: 100, y: 122 },
  cables: { x: 98, y: 118 },
};

const rigEyes = (design: BrainDesign) => EYES[design].map((e) => ({ ...fromBody(e.x, e.y), r: e.rx }));

export const BRAIN_RIGS: Record<BrainDesign, BrainRig> = {
  dome: {
    body: { x: 0, y: -98 },
    face: fromBody(FACE_AT.dome.x, FACE_AT.dome.y),
    limb: 'leg',
    legs: [
      { x: -60, y: -8, far: true, angle: 20, phase: 0 },
      { x: 34, y: -10, far: true, angle: -20, phase: 0.5 },
      { x: -30, y: 2, far: false, angle: 10, phase: 0.25 },
      { x: 62, y: 0, far: false, angle: -16, phase: 0.75 },
    ],
    squeeze: 0.32,
    stretch: 0.12,
    eyes: rigEyes('dome'),
    mouth: fromBody(MOUTHS.dome.x, MOUTHS.dome.y),
    bubble: fromBody(140, 26),
    antenna: null,
    hitBox: { left: -110, right: 110, top: -280, bottom: 14 },
  },
  pogo: {
    body: { x: 0, y: -132 },
    face: fromBody(FACE_AT.pogo.x, FACE_AT.pogo.y),
    limb: 'pogo',
    legs: [{ x: 0, y: 0, far: false, angle: 0, phase: 0 }],
    squeeze: 0.28,
    stretch: 0.1,
    eyes: rigEyes('pogo'),
    mouth: fromBody(MOUTHS.pogo.x, MOUTHS.pogo.y),
    bubble: fromBody(140, 48),
    antenna: null,
    hitBox: { left: -100, right: 100, top: -300, bottom: 14 },
  },
  cables: {
    body: { x: 0, y: -108 },
    face: fromBody(FACE_AT.cables.x, FACE_AT.cables.y),
    limb: 'cable',
    legs: [
      { x: -50, y: -12, far: true, angle: 30, phase: 0 },
      { x: 8, y: -14, far: true, angle: 0, phase: 0.33 },
      { x: 56, y: -12, far: true, angle: -30, phase: 0.66 },
      { x: -64, y: -4, far: false, angle: 20, phase: 0.16 },
      { x: -10, y: 0, far: false, angle: 4, phase: 0.5 },
      { x: 46, y: -2, far: false, angle: -22, phase: 0.83 },
    ],
    squeeze: 0.26,
    stretch: 0.14,
    eyes: rigEyes('cables'),
    mouth: fromBody(MOUTHS.cables.x, MOUTHS.cables.y),
    bubble: fromBody(150, 16),
    antenna: fromBody(166, 22),
    hitBox: { left: -110, right: 110, top: -290, bottom: 14 },
  },
};

// ---------------------------------------------------------------------------
// Colores

/** El cerebro: rosa con pliegues mas oscuros. La version del pogo, algo mas viva, porque no lleva cristal delante. */
export const BRAIN_FLESH = {
  skin: ['#ffe0ec', '#ff97c4', '#c94a86'] as const,
  outline: '#6e1a44',
  fold: '#d65f94',
  foldLight: '#ffc6dd',
  blush: 'rgba(255, 92, 154, 0.5)',
} as const;

/** Metal del platillo, las patas y las clavijas. */
export const BRAIN_METAL = {
  steel: ['#f3f7fd', '#a8b6cc', '#4d5a74'] as const,
  dark: ['#8a97ad', '#4b566c', '#222a3a'] as const,
  outline: '#1c2232',
  rubber: ['#5a5070', '#2e2840', '#15111f'] as const,
  brass: ['#fff2b8', '#ffcf4a', '#a8700e'] as const,
  brassOutline: '#5a3a06',
  lights: ['#39ff88', '#ff5f7a'] as const,
} as const;

/** Cristal de la cupula: casi transparente, con un borde azulado y reflejos blancos. */
export const BRAIN_GLASS = { fill: 'rgba(200, 240, 255, 0.16)', rim: 'rgba(150, 222, 255, 0.9)', edge: 'rgba(30, 80, 112, 0.6)' } as const;

/** Pogo: palo y manillar rojos, muelle de acero y puños negros. */
const POGO = { pole: ['#ffd0c8', '#ff5a5f', '#a3142c'] as const, outline: '#5a0a18', grip: '#2a2238' } as const;

/** Cables: goma azul oscura con brillo, y la luz de la antena. */
const CABLE = { rubber: ['#8aa0c8', '#43557c', '#1c253d'] as const, outline: '#0e1426', band: '#141a2a' } as const;

/** Parche de sectores (pogo): como la armadura de los Lurker acorazados, con algun sector rojo tachado. */
const SECTORS = { plate: '#3a4458', cell: '#5fd3c9', cellDark: '#2f7f86', bad: '#ff5a5f', tape: 'rgba(255, 246, 214, 0.85)', outline: '#11151e' } as const;

/** Tinta de la cara. */
const INK = '#1d1030';

// ---------------------------------------------------------------------------
// Utilidades

function radial(ctx: Ctx, x: number, y: number, r: number, colors: readonly [string, string, string]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  return g;
}

function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, colors: readonly [string, string, string]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);
  return g;
}

function stroke(ctx: Ctx, color: string, width: number): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Reflejo suave arriba a la izquierda de una forma redonda. */
function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.55): void {
  ellipse(ctx, x, y, rx, ry, `rgba(255, 255, 255, ${alpha})`, -0.5);
}

/**
 * Silueta del cerebro: un ovalo con la orilla abollada (lobulos), de `cx`, `cy` y radios `rx`, `ry`. Sirve para rellenar y
 * para el contorno.
 */
function brainPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  const bumps = 13;
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2;
    const a1 = ((i + 0.5) / bumps) * Math.PI * 2;
    const a2 = ((i + 1) / bumps) * Math.PI * 2;
    const p0 = { x: cx + Math.cos(a0) * rx, y: cy + Math.sin(a0) * ry };
    const bulge = 1.09 + 0.03 * Math.sin(i * 2.7);
    const c = { x: cx + Math.cos(a1) * rx * bulge, y: cy + Math.sin(a1) * ry * bulge };
    const p2 = { x: cx + Math.cos(a2) * rx, y: cy + Math.sin(a2) * ry };
    if (i === 0) ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
  }
  ctx.closePath();
}

/**
 * El cerebro: relleno rosa con degradado, pliegues (surcos que serpentean) y reflejo. `faceSide` deja libre de pliegues la
 * parte de la cara (delante, a la izquierda), para que los ojos se lean.
 */
function paintBrainMass(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  brainPath(ctx, cx, cy, rx, ry);
  ctx.fillStyle = radial(ctx, cx, cy, Math.max(rx, ry), BRAIN_FLESH.skin);
  ctx.fill();
  ctx.save();
  brainPath(ctx, cx, cy, rx, ry);
  ctx.clip();
  // Surcos: curvas que serpentean de delante atras, mas en la parte de arriba y de atras (la cara va delante y abajo).
  const folds: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [
      [-0.55, -0.62],
      [-0.2, -0.78],
      [0.15, -0.6],
      [0.5, -0.72],
      [0.85, -0.4],
    ],
    [
      [-0.2, -0.3],
      [0.1, -0.42],
      [0.35, -0.22],
      [0.62, -0.36],
      [0.9, -0.05],
    ],
    [
      [0.18, 0.05],
      [0.4, -0.08],
      [0.58, 0.12],
      [0.8, 0.02],
      [0.95, 0.3],
    ],
    [
      [0.3, 0.45],
      [0.5, 0.32],
      [0.68, 0.52],
      [0.86, 0.42],
    ],
  ];
  for (const fold of folds) {
    ctx.beginPath();
    fold.forEach(([fx, fy], i) => {
      const x = cx + fx * rx;
      const y = cy + fy * ry;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const [px, py] = fold[i - 1];
        ctx.quadraticCurveTo(cx + ((px + fx) / 2) * rx, cy + ((py + fy) / 2 - 0.14) * ry, x, y);
      }
    });
    stroke(ctx, BRAIN_FLESH.fold, 4.2);
    ctx.save();
    ctx.translate(-1.6, -1.8);
    stroke(ctx, BRAIN_FLESH.foldLight, 1.6);
    ctx.restore();
  }
  ctx.restore();
  brainPath(ctx, cx, cy, rx, ry);
  stroke(ctx, BRAIN_FLESH.outline, 3.4);
  shine(ctx, cx - rx * 0.42, cy - ry * 0.55, rx * 0.26, ry * 0.14);
}

/** Muelle de acero de `x` (centro) entre `top` y `bottom`, con `coils` vueltas de `width` de ancho. */
function spring(ctx: Ctx, x: number, top: number, bottom: number, width: number, coils: number): void {
  const step = (bottom - top) / coils;
  // Las vueltas de atras, mas oscuras; luego las de delante.
  for (const front of [false, true]) {
    for (let i = 0; i < coils; i++) {
      const y = top + i * step;
      ctx.beginPath();
      if (front) {
        ctx.moveTo(x - width / 2, y + step * 0.5);
        ctx.quadraticCurveTo(x, y + step * 1.15, x + width / 2, y + step * 0.5);
      } else {
        ctx.moveTo(x - width / 2, y + step * 0.5);
        ctx.quadraticCurveTo(x, y - step * 0.15, x + width / 2, y + step * 0.5);
      }
      stroke(ctx, BRAIN_METAL.outline, 6);
      stroke(ctx, front ? BRAIN_METAL.steel[1] : BRAIN_METAL.dark[1], 3.6);
      if (front) {
        ctx.beginPath();
        ctx.moveTo(x - width * 0.32, y + step * 0.68);
        ctx.quadraticCurveTo(x - width * 0.1, y + step * 0.86, x + width * 0.05, y + step * 0.86);
        stroke(ctx, BRAIN_METAL.steel[0], 1.4);
      }
    }
  }
}

/** Parche de sectores pegado con cinta: una rejilla de `cols` x `rows`, con los sectores `bad` en rojo y tachados. */
function sectorPatch(ctx: Ctx, x: number, y: number, angle: number, cols: number, rows: number, bad: readonly number[]): void {
  const cell = 9;
  const w = cols * cell + 6;
  const h = rows * cell + 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  roundRect(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fillStyle = SECTORS.plate;
  ctx.fill();
  stroke(ctx, SECTORS.outline, 2.2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = -w / 2 + 3 + c * cell;
      const cy = -h / 2 + 3 + r * cell;
      ctx.fillStyle = bad.includes(i) ? SECTORS.bad : (r + c) % 2 === 0 ? SECTORS.cell : SECTORS.cellDark;
      ctx.fillRect(cx + 1, cy + 1, cell - 2, cell - 2);
      if (bad.includes(i)) {
        ctx.beginPath();
        ctx.moveTo(cx + 1.5, cy + 1.5);
        ctx.lineTo(cx + cell - 1.5, cy + cell - 1.5);
        ctx.moveTo(cx + cell - 1.5, cy + 1.5);
        ctx.lineTo(cx + 1.5, cy + cell - 1.5);
        stroke(ctx, '#ffffff', 1.4);
      }
    }
  }
  // Dos tiras de cinta en las esquinas.
  ctx.fillStyle = SECTORS.tape;
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  ctx.rotate(-0.7);
  ctx.fillRect(-7, -3, 14, 6);
  ctx.restore();
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.7);
  ctx.fillRect(-7, -3, 14, 6);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cuerpos

/** Platillo de la cupula: metal con una banda de luces delante y la mandibula a la izquierda (la pinta la cara). */
function paintSaucer(ctx: Ctx): void {
  const cx = 130;
  const cy = 184;
  // Barriga del platillo.
  ctx.beginPath();
  ctx.ellipse(cx, cy, 94, 28, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, cx, cy - 28, cx, cy + 28, BRAIN_METAL.steel);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 3.2);
  // Borde de arriba, donde se apoya la cupula.
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, 86, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, cx, cy - 24, cx, cy + 8, BRAIN_METAL.dark);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 2);
  // Luces de la banda, por la parte de delante.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.16 + (i / 8) * 0.68);
    const x = cx + Math.cos(a) * 88;
    const y = cy + 4 + Math.sin(a) * 20;
    const color = BRAIN_METAL.lights[i % 2];
    circle(ctx, x, y, 5.2, BRAIN_METAL.outline);
    circle(ctx, x, y, 3.8, color);
    circle(ctx, x - 1.2, y - 1.3, 1.3, '#ffffff');
  }
  shine(ctx, cx - 46, cy - 14, 22, 5, 0.6);
}

function paintDomeBody(ctx: Ctx): void {
  // El cerebro va detras del platillo: asoma por encima, dentro de la cupula.
  paintBrainMass(ctx, 132, 118, 70, 56);
  paintSaucer(ctx);
}

/** La cupula de cristal (solo `dome`): va por encima de la cara, que se ve a traves. */
export function paintBrainGlass(ctx: Ctx): void {
  const cx = 130;
  const cy = 114;
  const rx = 90;
  const ry = 86;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, BRAIN_SIZE.body.width, 178);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = BRAIN_GLASS.fill;
  ctx.fill();
  stroke(ctx, BRAIN_GLASS.edge, 5);
  stroke(ctx, BRAIN_GLASS.rim, 2.6);
  // Reflejos: un arco grueso arriba a la izquierda, otro fino a la derecha y un destello.
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 12, ry - 12, 0, Math.PI * 1.08, Math.PI * 1.42);
  stroke(ctx, 'rgba(255, 255, 255, 0.7)', 7);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 10, ry - 10, 0, Math.PI * 1.55, Math.PI * 1.66);
  stroke(ctx, 'rgba(255, 255, 255, 0.55)', 4);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 8, ry - 8, 0, Math.PI * 1.85, Math.PI * 1.97);
  stroke(ctx, 'rgba(255, 255, 255, 0.35)', 3);
  const sx = cx - 52;
  const sy = cy - 50;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 9);
  ctx.lineTo(sx + 2.2, sy - 2.2);
  ctx.lineTo(sx + 9, sy);
  ctx.lineTo(sx + 2.2, sy + 2.2);
  ctx.lineTo(sx, sy + 9);
  ctx.lineTo(sx - 2.2, sy + 2.2);
  ctx.lineTo(sx - 9, sy);
  ctx.lineTo(sx - 2.2, sy - 2.2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
  ctx.restore();
}

function paintPogoBody(ctx: Ctx): void {
  // Bracitos que bajan al manillar (el ancla), con manoplas.
  for (const [hx, from] of [
    [104, 96],
    [156, 160],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(from, 170);
    ctx.quadraticCurveTo(hx - 6, 186, hx, BRAIN_SIZE.body.cy);
    stroke(ctx, BRAIN_FLESH.outline, 10);
    stroke(ctx, BRAIN_FLESH.skin[1], 6.5);
  }
  paintBrainMass(ctx, 130, 116, 80, 62);
  sectorPatch(ctx, 168, 74, 0.18, 3, 2, [4]);
  sectorPatch(ctx, 194, 128, -0.22, 2, 3, [1, 4]);
  sectorPatch(ctx, 128, 64, -0.08, 3, 2, [0]);
  for (const hx of [104, 156]) {
    circle(ctx, hx, BRAIN_SIZE.body.cy, 9, BRAIN_FLESH.outline);
    circle(ctx, hx, BRAIN_SIZE.body.cy, 7, radial(ctx, hx, BRAIN_SIZE.body.cy, 7, BRAIN_FLESH.skin));
  }
}

function paintCablesBody(ctx: Ctx): void {
  // Antena: un alambre con una bola de luz verde, que la vista hace parpadear.
  ctx.beginPath();
  ctx.moveTo(150, 60);
  ctx.quadraticCurveTo(150, 36, 166, 22);
  stroke(ctx, BRAIN_METAL.outline, 5);
  stroke(ctx, BRAIN_METAL.steel[1], 2.6);
  circle(ctx, 166, 22, 8.5, BRAIN_METAL.outline);
  circle(ctx, 166, 22, 6.5, radial(ctx, 166, 22, 6.5, ['#f4fff8', '#39ff88', '#139a52']));
  paintBrainMass(ctx, 130, 112, 74, 58);
  // Banda de conectores por debajo, de donde salen los cables.
  ctx.beginPath();
  ctx.ellipse(130, 174, 74, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, 130, 154, 130, 194, CABLE.rubber);
  ctx.fill();
  stroke(ctx, CABLE.outline, 3);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.12 + (i / 5) * 0.76);
    const x = 130 + Math.cos(a) * 62;
    const y = 176 + Math.sin(a) * 12;
    roundRect(ctx, x - 6, y - 4, 12, 8, 2);
    ctx.fillStyle = CABLE.band;
    ctx.fill();
    circle(ctx, x - 2, y, 1.4, BRAIN_METAL.brass[1]);
    circle(ctx, x + 2, y, 1.4, BRAIN_METAL.brass[1]);
  }
  shine(ctx, 92, 164, 16, 4, 0.4);
}

const BODY_PAINTERS: Record<BrainDesign, (ctx: Ctx) => void> = { dome: paintDomeBody, pogo: paintPogoBody, cables: paintCablesBody };

export function paintBrainBody(ctx: Ctx, design: BrainDesign): void {
  BODY_PAINTERS[design](ctx);
}

// ---------------------------------------------------------------------------
// Patas

/** Pata de muelle (`dome`): barra de acero, muelle y almohadilla de goma. */
function paintSpringLeg(ctx: Ctx): void {
  const { hipX: x, hipY: top } = BRAIN_SIZE.leg;
  // Barra de arriba.
  roundRect(ctx, x - 7, top - 4, 14, 38, 6);
  ctx.fillStyle = linear(ctx, x - 7, 0, x + 7, 0, BRAIN_METAL.steel);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 2.6);
  circle(ctx, x, top, 6, BRAIN_METAL.dark[1]);
  circle(ctx, x, top, 2.4, BRAIN_METAL.steel[0]);
  spring(ctx, x, top + 32, top + 88, 26, 5);
  // Pie: almohadilla de goma.
  roundRect(ctx, x - 9, top + 86, 18, 12, 4);
  ctx.fillStyle = BRAIN_METAL.dark[1];
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 2.2);
  ctx.beginPath();
  ctx.ellipse(x, top + 102, 21, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, x, top + 102, 21, BRAIN_METAL.rubber);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 2.4);
  shine(ctx, x - 8, top + 98, 7, 2.4, 0.4);
}

/** Cable con clavija (`cables`): goma que serpentea y acaba en una clavija de laton con dos patillas. */
function paintCableLeg(ctx: Ctx): void {
  const { hipX: x, hipY: top } = BRAIN_SIZE.cable;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.bezierCurveTo(x + 16, top + 30, x - 16, top + 62, x, top + 96);
  };
  path();
  stroke(ctx, CABLE.outline, 15);
  path();
  stroke(ctx, CABLE.rubber[1], 10);
  ctx.save();
  ctx.translate(-2.5, 0);
  path();
  stroke(ctx, CABLE.rubber[0], 2.6);
  ctx.restore();
  // Clavija.
  roundRect(ctx, x - 10, top + 94, 20, 18, 4);
  ctx.fillStyle = linear(ctx, x - 10, 0, x + 10, 0, BRAIN_METAL.brass);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.brassOutline, 2.4);
  for (const px of [x - 5, x + 5]) {
    roundRect(ctx, px - 2, top + 111, 4, 12, 1.5);
    ctx.fillStyle = BRAIN_METAL.steel[1];
    ctx.fill();
    stroke(ctx, BRAIN_METAL.outline, 1.4);
  }
  shine(ctx, x - 5, top + 99, 3, 4, 0.6);
}

/** Saltador (`pogo`): manillar con punos, palo rojo, reposapies, muelle y contera de goma. */
function paintPogo(ctx: Ctx): void {
  const { hipX: x, hipY: top } = BRAIN_SIZE.pogo;
  // Manillar.
  roundRect(ctx, x - 36, top - 5, 72, 10, 5);
  ctx.fillStyle = linear(ctx, 0, top - 5, 0, top + 5, POGO.pole);
  ctx.fill();
  stroke(ctx, POGO.outline, 2.4);
  for (const gx of [x - 36, x + 24]) {
    roundRect(ctx, gx, top - 6, 12, 12, 4);
    ctx.fillStyle = POGO.grip;
    ctx.fill();
    stroke(ctx, POGO.outline, 1.6);
  }
  // Palo.
  roundRect(ctx, x - 6, top, 12, 70, 5);
  ctx.fillStyle = linear(ctx, x - 6, 0, x + 6, 0, POGO.pole);
  ctx.fill();
  stroke(ctx, POGO.outline, 2.4);
  // Reposapies.
  roundRect(ctx, x - 28, top + 60, 56, 9, 3);
  ctx.fillStyle = linear(ctx, 0, top + 60, 0, top + 69, BRAIN_METAL.steel);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 2.2);
  spring(ctx, x, top + 70, top + 118, 28, 5);
  // Contera.
  roundRect(ctx, x - 5, top + 116, 10, 12, 3);
  ctx.fillStyle = BRAIN_METAL.steel[1];
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 1.8);
  ctx.beginPath();
  ctx.ellipse(x, top + 132, 16, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, x, top + 132, 16, BRAIN_METAL.rubber);
  ctx.fill();
  stroke(ctx, BRAIN_METAL.outline, 2.2);
}

const LIMB_PAINTERS: Record<BrainRig['limb'], (ctx: Ctx) => void> = { leg: paintSpringLeg, cable: paintCableLeg, pogo: paintPogo };

/** La pata (o el saltador) de la propuesta. */
export function paintBrainLimb(ctx: Ctx, design: BrainDesign): void {
  LIMB_PAINTERS[BRAIN_RIGS[design].limb](ctx);
}

/** Lienzo de la pata de cada propuesta. */
export function brainLimbSize(design: BrainDesign): { readonly width: number; readonly height: number; readonly hipX: number; readonly hipY: number } {
  return BRAIN_SIZE[BRAIN_RIGS[design].limb];
}

// ---------------------------------------------------------------------------
// Caras

/** Ojo: blanco con contorno, la pupila hacia `look` (a la izquierda) y un brillo. Con `lid`, el parpado de arriba cae. */
function eye(ctx: Ctx, x: number, y: number, rx: number, ry: number, mood: BrainMood, front: boolean): void {
  if (mood === 'hurt') {
    const dir = front ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x - dir * rx * 0.6, y - ry * 0.55);
    ctx.lineTo(x + dir * rx * 0.45, y);
    ctx.lineTo(x - dir * rx * 0.6, y + ry * 0.55);
    stroke(ctx, INK, 3.4);
    return;
  }
  const wide = mood === 'air' ? 1.12 : 1;
  ellipse(ctx, x, y, rx * wide, ry * wide, '#ffffff');
  ctx.beginPath();
  ctx.ellipse(x, y, rx * wide, ry * wide, 0, 0, Math.PI * 2);
  stroke(ctx, BRAIN_FLESH.outline, 2.4);
  const pupil = Math.min(rx, ry) * (mood === 'air' ? 0.4 : mood === 'angry' || mood === 'bite' ? 0.5 : 0.58);
  const look = mood === 'ready' ? -0.45 : -0.36;
  const px = x + rx * look;
  const py = y + (mood === 'smug' ? ry * 0.2 : 1);
  circle(ctx, px, py, pupil, INK);
  circle(ctx, px - pupil * 0.35, py - pupil * 0.5, pupil * 0.42, '#ffffff');
  if (mood === 'smug') {
    // Parpado a medio cerrar: burlon.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = BRAIN_FLESH.skin[1];
    ctx.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, ry * 0.95);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - rx, y - ry * 0.05);
    ctx.lineTo(x + rx, y - ry * 0.05);
    stroke(ctx, BRAIN_FLESH.outline, 2.6);
  }
}

/** Ceja: decidida (agachado o mordiendo) o fruncida (enfadado, fase 2). */
function brow(ctx: Ctx, x: number, y: number, rx: number, ry: number, angry: boolean): void {
  ctx.beginPath();
  const tilt = angry ? 0.5 : 0.28;
  ctx.moveTo(x - rx * 1.05, y - ry * (1.25 + tilt));
  ctx.lineTo(x + rx * 0.95, y - ry * (1.25 - tilt * 0.4));
  stroke(ctx, BRAIN_FLESH.outline, angry ? 4.6 : 3.8);
}

/** Boca en el cerebro (pogo y cables): sonrisa ladina, abierta con colmillos, temblona, apretada, en o, o una mueca. */
function fleshMouth(ctx: Ctx, mood: BrainMood, x: number, y: number): void {
  switch (mood) {
    case 'bite': {
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 15, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a0f2a';
      ctx.fill();
      stroke(ctx, BRAIN_FLESH.outline, 2.6);
      ellipse(ctx, x + 2, y + 9, 8, 3.5, '#ff6f9e');
      for (const tx of [x - 8, x + 6]) {
        ctx.beginPath();
        ctx.moveTo(tx - 3.5, y - 8);
        ctx.lineTo(tx + 3.5, y - 8);
        ctx.lineTo(tx, y - 1);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      return;
    }
    case 'hurt': {
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 2);
      for (let i = 1; i <= 4; i++) ctx.lineTo(x - 12 + i * 6, y + (i % 2 ? -3 : 3));
      stroke(ctx, BRAIN_FLESH.outline, 3);
      return;
    }
    case 'ready':
    case 'angry': {
      roundRect(ctx, x - 13, y - 5, 26, 11, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      stroke(ctx, BRAIN_FLESH.outline, 2.4);
      ctx.beginPath();
      ctx.moveTo(x - 13, y + 0.5);
      ctx.lineTo(x + 13, y + 0.5);
      for (const tx of [x - 6, x, x + 6]) {
        ctx.moveTo(tx, y - 5);
        ctx.lineTo(tx, y + 6);
      }
      stroke(ctx, BRAIN_FLESH.outline, 1.4);
      return;
    }
    case 'air': {
      ctx.beginPath();
      ctx.ellipse(x, y, 6.5, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a0f2a';
      ctx.fill();
      stroke(ctx, BRAIN_FLESH.outline, 2.4);
      return;
    }
    case 'smug': {
      ctx.beginPath();
      ctx.moveTo(x - 15, y - 2);
      ctx.quadraticCurveTo(x, y + 14, x + 16, y - 6);
      ctx.quadraticCurveTo(x + 2, y + 4, x - 15, y - 2);
      ctx.fillStyle = '#4a0f2a';
      ctx.fill();
      stroke(ctx, BRAIN_FLESH.outline, 2.4);
      return;
    }
    default: {
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 1);
      ctx.quadraticCurveTo(x, y + 9, x + 13, y - 4);
      stroke(ctx, BRAIN_FLESH.outline, 3);
    }
  }
}

/** Mandibula del platillo (cupula): una rejilla de metal que sonrie y, al morder, se abre con dientes de acero. */
function saucerJaw(ctx: Ctx, mood: BrainMood, x: number, y: number): void {
  const open = mood === 'bite' ? 14 : mood === 'air' ? 7 : mood === 'smug' ? 5 : 0;
  const frown = mood === 'angry' || mood === 'hurt' ? -5 : mood === 'ready' ? 0 : 4;
  ctx.save();
  // Boca abierta: hueco oscuro con dientes arriba y abajo.
  if (open > 0) {
    ctx.beginPath();
    ctx.ellipse(x, y + open * 0.3, 22, 4 + open * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#12091c';
    ctx.fill();
    stroke(ctx, BRAIN_METAL.outline, 2.4);
    if (mood === 'bite') {
      for (let i = 0; i < 5; i++) {
        const tx = x - 16 + i * 8;
        ctx.beginPath();
        ctx.moveTo(tx - 3.4, y - 3);
        ctx.lineTo(tx + 3.4, y - 3);
        ctx.lineTo(tx, y + 3);
        ctx.closePath();
        ctx.fillStyle = BRAIN_METAL.steel[0];
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx - 3.4, y + open * 0.6 + 4);
        ctx.lineTo(tx + 3.4, y + open * 0.6 + 4);
        ctx.lineTo(tx, y + open * 0.6 - 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else {
    // Cerrada: una ranura de rejilla con la curva del humor.
    ctx.beginPath();
    ctx.moveTo(x - 22, y - frown * 0.3);
    ctx.quadraticCurveTo(x, y + frown, x + 22, y - frown * 0.3);
    stroke(ctx, BRAIN_METAL.outline, 6);
    stroke(ctx, '#12091c', 3.6);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 8, y - 4 + Math.abs(i) * 0.2);
      ctx.lineTo(x + i * 8, y + 4 + frown * 0.4);
      stroke(ctx, BRAIN_METAL.steel[1], 1.6);
    }
  }
  ctx.restore();
}

/**
 * Cara de Brain en su lienzo (`BRAIN_SIZE.face`, centrado en la cara de la propuesta): ojos en el cerebro, mejillas y la boca
 * (en el platillo con la cupula, en el cerebro en las otras dos).
 */
export function paintBrainFace(ctx: Ctx, design: BrainDesign, mood: BrainMood): void {
  const { cx, cy } = BRAIN_SIZE.face;
  const at = FACE_AT[design];
  ctx.save();
  ctx.translate(cx - at.x, cy - at.y);
  const [front, back] = EYES[design];
  if (mood === 'idle' || mood === 'smug') {
    ellipse(ctx, front.x - 4, front.y + front.ry + 9, 9, 5, BRAIN_FLESH.blush);
  }
  eye(ctx, back.x, back.y, back.rx, back.ry, mood, false);
  eye(ctx, front.x, front.y, front.rx, front.ry, mood, true);
  if (mood === 'ready' || mood === 'bite' || mood === 'angry') {
    brow(ctx, back.x, back.y, back.rx, back.ry, mood === 'angry');
    brow(ctx, front.x, front.y, front.rx, front.ry, mood === 'angry');
  }
  const mouth = MOUTHS[design];
  if (design === 'dome') saucerJaw(ctx, mood, mouth.x, mouth.y);
  else fleshMouth(ctx, mood, mouth.x, mouth.y);
  if (mood === 'hurt') {
    // Una gotita de sudor.
    ctx.beginPath();
    ctx.moveTo(back.x + back.rx + 6, back.y - back.ry);
    ctx.quadraticCurveTo(back.x + back.rx + 12, back.y - 2, back.x + back.rx + 6, back.y + 2);
    ctx.quadraticCurveTo(back.x + back.rx, back.y - 2, back.x + back.rx + 6, back.y - back.ry);
    ctx.fillStyle = '#bfe9ff';
    ctx.fill();
    stroke(ctx, '#3f8fc8', 1.4);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cuando se prepara (rondas 6 y 7)

/**
 * Mapa de sectores que va marcando mientras se prepara (T-039): una rejilla de `SECTOR_MAP.cols` x `rows` en un panel, donde
 * cada vez mas sectores salen rojos y tachados, los que el Brain real marcaba como defectuosos para esconderse en ellos. La
 * vista pinta los marcados encima (`sectorCell`).
 */
export const SECTOR_MAP = { width: 136, height: 104, cols: 8, rows: 5, cell: 14, left: 12, top: 26 } as const;

/** Panel del mapa de sectores, sin ninguno marcado: rejilla turquesa con su rotulo pixelado. */
export function paintSectorMap(ctx: Ctx): void {
  const { width, height, cols, rows, cell, left, top } = SECTOR_MAP;
  roundRect(ctx, 3, 3, width - 6, height - 6, 10);
  ctx.fillStyle = linear(ctx, 0, 3, 0, height, ['#4a5670', '#2a3244', '#161b26']);
  ctx.fill();
  stroke(ctx, SECTORS.outline, 3);
  roundRect(ctx, 9, 8, width - 18, 12, 3);
  ctx.fillStyle = '#0e131c';
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 3 === 2 ? BRAIN_METAL.lights[1] : BRAIN_METAL.lights[0];
    ctx.fillRect(14 + i * 8, 11, 5, 6);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? SECTORS.cell : SECTORS.cellDark;
      ctx.fillRect(left + c * cell + 1, top + r * cell + 1, cell - 2, cell - 2);
    }
  }
  shine(ctx, 32, 14, 16, 3, 0.25);
}

/** Un sector marcado como defectuoso: rojo y tachado, del tamano de una casilla del mapa. */
export function paintBadSector(ctx: Ctx): void {
  const s = SECTOR_MAP.cell;
  ctx.fillStyle = SECTORS.bad;
  ctx.fillRect(1, 1, s - 2, s - 2);
  ctx.beginPath();
  ctx.moveTo(3, 3);
  ctx.lineTo(s - 3, s - 3);
  ctx.moveTo(s - 3, 3);
  ctx.lineTo(3, s - 3);
  stroke(ctx, '#ffffff', 2);
}

/** Orden en que se marcan los sectores: salteado, para que no se llene de una esquina a otra. Fijo, para que no baile. */
export function sectorOrder(): number[] {
  const { cols, rows } = SECTOR_MAP;
  const total = cols * rows;
  return Array.from({ length: total }, (_, i) => i).sort((a, b) => ((a * 37) % total) - ((b * 37) % total));
}

/** Esquina de arriba a la izquierda del sector `index` en el lienzo del mapa. */
export function sectorCell(index: number): Point {
  const { cols, cell, left, top } = SECTOR_MAP;
  return { x: left + (index % cols) * cell, y: top + Math.floor(index / cols) * cell };
}
