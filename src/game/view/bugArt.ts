import { type Ctx, circle, ellipse } from './canvasKit';

/**
 * Arte de las tropas del brote 3, el de Brain (T-038), sin Phaser. Brain era un virus de sector de arranque, no un gusano:
 * sus tropas son bichos nuevos. Hay tres propuestas para los Lurker (`LURKER_DESIGNS`) y tres para el Skipper
 * (`SKIPPER_DESIGNS`), que compara la galeria `/proposals/bichos.html` antes de elegir (LK-01).
 *
 * Cada bicho va en piezas, como el gusano, para que se mueva: el cuerpo, la cabeza (una textura por cara), las patas (una
 * textura que se repite, mas oscura en el lado de atras) y, el acorazado, su armadura de sectores (un casco y dos placas
 * que se caen con la vida). El Skipper lleva ademas la pata de saltar en dos trozos, muslo y pierna, que se doblan al
 * agacharse y se estiran al saltar. Donde va cada pieza lo dice su montaje (`LURKER_RIGS`, `SKIPPER_RIGS`), en pixeles de
 * diseno con 160 por casilla, los pies en 0, 0 y mirando a la izquierda, por donde avanza.
 *
 * Mismo estilo que el resto (guia de graficos, seccion 10): degradado con la luz arriba a la izquierda, contorno oscuro
 * del mismo tono, reflejo suave, ojos con brillo y mejillas. La armadura es un mapa de sectores de disco con alguno
 * marcado como defectuoso: Brain marcaba sectores defectuosos para esconder en ellos su copia.
 */

// ---------------------------------------------------------------------------
// Propuestas

export type LurkerDesign = 'leaf' | 'chameleon' | 'hood';
export type SkipperDesign = 'grasshopper' | 'flea' | 'spring';

/** Las tres tropas que llegan ocultas. El acorazado lleva los colores de la base y la armadura de sectores encima. */
export type LurkerVariant = 'base' | 'spitter' | 'armored';
export const LURKER_VARIANTS: readonly LurkerVariant[] = ['base', 'spitter', 'armored'];

/** Caras de un Lurker: tranquilo, atacando (mordiendo o cargando el escupitajo) y dolorido. */
export type LurkerMood = 'idle' | 'attack' | 'hurt';
export const LURKER_MOODS: readonly LurkerMood[] = ['idle', 'attack', 'hurt'];

/** Caras del Skipper: tranquilo, agachado para saltar, en el aire, dolorido y mordiendo un escudo. */
export type SkipperMood = 'idle' | 'ready' | 'air' | 'hurt' | 'bite';
export const SKIPPER_MOODS: readonly SkipperMood[] = ['idle', 'ready', 'air', 'hurt', 'bite'];

interface Proposal<T extends string> {
  readonly id: T;
  readonly letter: string;
  readonly name: string;
  readonly about: string;
}

export const LURKER_DESIGNS: ReadonlyArray<Proposal<LurkerDesign>> = [
  {
    id: 'leaf',
    letter: 'A',
    name: 'Insecto hoja',
    about:
      'Un insecto palo con el cuerpo de hoja de otoño, nervios y bordes ondulados, el cuello alto de mantis y los bracitos recogidos. Se esconde haciéndose pasar por una hoja caída. El escupidor es una hoja roja de arce; el acorazado, la misma hoja con placas de sectores.',
  },
  {
    id: 'chameleon',
    letter: 'B',
    name: 'Camaleón',
    about:
      'Un camaleón regordete con cresta, cola enroscada y un ojo de torreta que gira. Cambia de color para esconderse: el escupidor es el mismo bicho con los colores al revés (turquesa con manchas naranjas).',
  },
  {
    id: 'hood',
    letter: 'C',
    name: 'Encapuchado',
    about:
      'Un bichito escondido bajo una capa con capucha, como un fantasma de disfraz, con el estampado de un mapa de sectores y uno rojo marcado como defectuoso. Solo se le ven los ojos y los piececitos. El más "Brain": se escondía detrás de una copia limpia del disco.',
  },
];

export const SKIPPER_DESIGNS: ReadonlyArray<Proposal<SkipperDesign>> = [
  {
    id: 'grasshopper',
    letter: 'A',
    name: 'Saltamontes',
    about:
      'Un saltamontes rosa (los hay de verdad) con alas plegadas, antenas largas y unos muslos enormes con rayas en espiga. Rosa para que se lea sobre el césped y no se confunda con las plantas.',
  },
  {
    id: 'flea',
    letter: 'B',
    name: 'Pulga',
    about: 'Una pulga redonda y brillante, color castaña, con la cabecita pequeña, cuatro pelillos y unas patas de atrás muy fuertes. Pequeña y rápida.',
  },
  {
    id: 'spring',
    letter: 'C',
    name: 'Grillo de muelles',
    about:
      'Un grillo morado con muelles en vez de piernas de saltar y el botón de encendido en el lomo: un virus de arranque que rebota. Al agacharse los muelles se aprietan.',
  },
];

/** Las que usa el juego: Carmine eligio el camaleon (B) y el saltamontes (A) en la galeria el 22 nov 2026 (LK-01). */
export const LURKER_DESIGN: LurkerDesign = 'chameleon';
export const SKIPPER_DESIGN: SkipperDesign = 'grasshopper';

// ---------------------------------------------------------------------------
// Medidas y montaje

/**
 * Lienzos de las piezas, en pixeles de diseno. `cx`, `cy` es el punto por el que se coloca cada una (el ancla del cuerpo,
 * el centro de la cabeza); la pata cuelga de su cadera (`hipX`, `hipY`).
 */
export const BUG_SIZE = {
  body: { width: 220, height: 160, cx: 110, cy: 96 },
  head: { width: 140, height: 140, cx: 70, cy: 80 },
  leg: { width: 70, height: 90, hipX: 24, hipY: 22 },
  /** Muslo y pierna de saltar del Skipper: horizontales, del eje (`pivotX`, `pivotY`) a la punta (`tipX`). */
  thigh: { width: 96, height: 44, pivotX: 14, pivotY: 22, tipX: 70 },
  shin: { width: 92, height: 32, pivotX: 10, pivotY: 16, tipX: 74 },
  /** Brillo de los ojos de un oculto (LK-02): lo unico que no se apaga en la silueta. */
  glow: { size: 32 },
} as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Una pata: donde esta su cadera, si es del lado de atras (detras del cuerpo y mas oscura) y su fase al andar (0 a 1). */
export interface LegMount extends Point {
  readonly far: boolean;
  readonly phase: number;
}

/** Montaje de un Lurker (pies en 0, 0, mirando a la izquierda). */
export interface LurkerRig {
  /** Donde va el ancla del cuerpo (`BUG_SIZE.body.cx`, `cy`). */
  readonly body: Point;
  /** Centro de la cabeza. Va a la altura del canon de las disparadoras: ahi les dan las semillas. */
  readonly head: Point;
  readonly legs: readonly LegMount[];
  /** Cuanto giran las patas al andar, en grados, hacia delante y hacia atras. */
  readonly legSwing: number;
  /** Ojos respecto al centro de la cabeza: ahi brillan cuando esta oculto (LK-02). */
  readonly eyes: ReadonlyArray<Point & { readonly r: number }>;
  /** Boca respecto al centro de la cabeza: de ahi sale el escupitajo. */
  readonly mouth: Point;
  /** Medallita de nivel respecto al centro de la cabeza: en la nuca, sin tapar los ojos. */
  readonly medal: Point;
  /** Caja holgada para el doble clic de la ficha (T-010). */
  readonly hitBox: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
}

/** Montaje del Skipper (pies en 0, 0, mirando a la izquierda). */
export interface SkipperRig {
  readonly body: Point;
  readonly head: Point;
  /** Cadera de la pata de saltar y donde apoya el pie en reposo. */
  readonly hip: Point;
  readonly foot: Point;
  /** Patas pequenas de delante. */
  readonly legs: readonly LegMount[];
  readonly legSwing: number;
  readonly eyes: ReadonlyArray<Point & { readonly r: number }>;
  readonly mouth: Point;
  readonly medal: Point;
  readonly hitBox: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
}

export const LURKER_RIGS: Record<LurkerDesign, LurkerRig> = {
  leaf: {
    body: { x: 16, y: -50 },
    head: { x: -50, y: -82 },
    legs: [
      { x: -14, y: -50, far: true, phase: 0.5 },
      { x: 16, y: -50, far: true, phase: 0 },
      { x: 46, y: -48, far: true, phase: 0.5 },
      { x: -22, y: -46, far: false, phase: 0 },
      { x: 8, y: -46, far: false, phase: 0.5 },
      { x: 38, y: -44, far: false, phase: 0 },
    ],
    legSwing: 13,
    eyes: [
      { x: -25, y: -12, r: 9 },
      { x: 18, y: -16, r: 7 },
    ],
    mouth: { x: -14, y: 24 },
    medal: { x: 30, y: 2 },
    hitBox: { left: -96, right: 110, top: -150, bottom: 10 },
  },
  chameleon: {
    body: { x: 14, y: -50 },
    head: { x: -46, y: -76 },
    legs: [
      { x: -12, y: -34, far: true, phase: 0.5 },
      { x: 42, y: -34, far: true, phase: 0 },
      { x: -20, y: -30, far: false, phase: 0 },
      { x: 34, y: -30, far: false, phase: 0.5 },
    ],
    legSwing: 16,
    eyes: [{ x: -10, y: -6, r: 11 }],
    mouth: { x: -26, y: 14 },
    // En la nuca, detras del ojo de torreta: mas atras no tapa el ojo ni con el tamano del nivel 10.
    medal: { x: 33, y: 12 },
    hitBox: { left: -92, right: 112, top: -140, bottom: 10 },
  },
  hood: {
    body: { x: 8, y: -46 },
    head: { x: -26, y: -86 },
    legs: [
      { x: -18, y: -14, far: true, phase: 0.5 },
      { x: 30, y: -14, far: true, phase: 0 },
      { x: -30, y: -12, far: false, phase: 0 },
      { x: 4, y: -10, far: false, phase: 0.5 },
      { x: 38, y: -12, far: false, phase: 0 },
    ],
    legSwing: 22,
    eyes: [
      { x: -22, y: 2, r: 9 },
      { x: -2, y: 0, r: 7.5 },
    ],
    mouth: { x: -14, y: 20 },
    medal: { x: 30, y: -8 },
    hitBox: { left: -88, right: 96, top: -152, bottom: 10 },
  },
};

export const SKIPPER_RIGS: Record<SkipperDesign, SkipperRig> = {
  grasshopper: {
    body: { x: 18, y: -52 },
    head: { x: -38, y: -70 },
    hip: { x: 22, y: -52 },
    foot: { x: 52, y: 0 },
    legs: [
      { x: -20, y: -40, far: true, phase: 0.5 },
      { x: -4, y: -38, far: true, phase: 0 },
      { x: -26, y: -36, far: false, phase: 0 },
      { x: -8, y: -34, far: false, phase: 0.5 },
    ],
    legSwing: 10,
    eyes: [{ x: -6, y: -8, r: 9 }],
    mouth: { x: -12, y: 20 },
    medal: { x: 18, y: -18 },
    hitBox: { left: -80, right: 110, top: -150, bottom: 10 },
  },
  flea: {
    body: { x: 12, y: -52 },
    head: { x: -40, y: -50 },
    hip: { x: 22, y: -44 },
    foot: { x: 46, y: 0 },
    legs: [
      { x: -22, y: -32, far: true, phase: 0.5 },
      { x: -4, y: -28, far: true, phase: 0 },
      { x: -26, y: -28, far: false, phase: 0 },
      { x: -8, y: -24, far: false, phase: 0.5 },
    ],
    legSwing: 10,
    eyes: [{ x: -6, y: -4, r: 8 }],
    mouth: { x: -18, y: 10 },
    medal: { x: 14, y: -14 },
    hitBox: { left: -76, right: 96, top: -126, bottom: 10 },
  },
  spring: {
    body: { x: 14, y: -54 },
    head: { x: -38, y: -68 },
    hip: { x: 24, y: -48 },
    foot: { x: 44, y: 0 },
    legs: [
      { x: -20, y: -36, far: true, phase: 0.5 },
      { x: -2, y: -34, far: true, phase: 0 },
      { x: -24, y: -32, far: false, phase: 0 },
      { x: -6, y: -30, far: false, phase: 0.5 },
    ],
    legSwing: 10,
    eyes: [
      { x: -10, y: -6, r: 9 },
      { x: 8, y: -8, r: 7 },
    ],
    mouth: { x: -12, y: 16 },
    medal: { x: 18, y: -18 },
    hitBox: { left: -78, right: 100, top: -150, bottom: 10 },
  },
};

// ---------------------------------------------------------------------------
// Colores

interface BugPalette {
  readonly outline: string;
  /** Claro, medio y oscuro del cuerpo. */
  readonly skin: readonly [string, string, string];
  /** Nervios de la hoja, manchas o el estampado de la capa. */
  readonly accent: string;
  /** Barriga o reves, mas claro. */
  readonly belly: string;
  readonly cheek: string;
  /** Luces de virus: pecas de pixel. */
  readonly led: string;
  /** Boca de morder o, el escupidor, de pinon. */
  readonly mouth: 'bite' | 'pucker';
}

/** Colores de los Lurker: los de la base (tambien del acorazado) y los del escupidor, en cada propuesta. */
export const LURKER_PALETTES: Record<LurkerDesign, Record<'base' | 'spitter', BugPalette>> = {
  leaf: {
    base: {
      outline: '#6b3408',
      skin: ['#fff1c2', '#ffb43c', '#d6701a'],
      accent: '#a8500e',
      belly: '#ffe39a',
      cheek: 'rgba(255, 110, 90, 0.55)',
      led: 'rgba(57, 255, 136, 0.95)',
      mouth: 'bite',
    },
    spitter: {
      outline: '#6a0f18',
      skin: ['#ffe0d6', '#ff5a4a', '#c4242c'],
      accent: '#8e1420',
      belly: '#ffb8a8',
      cheek: 'rgba(255, 200, 110, 0.6)',
      led: 'rgba(57, 255, 136, 0.95)',
      mouth: 'pucker',
    },
  },
  chameleon: {
    base: {
      outline: '#6b2606',
      skin: ['#ffe9d2', '#ff9b4e', '#d85c1c'],
      accent: '#2cc7b4',
      belly: '#ffe0b2',
      cheek: 'rgba(255, 90, 120, 0.5)',
      led: 'rgba(57, 255, 136, 0.95)',
      mouth: 'bite',
    },
    spitter: {
      outline: '#0b4a48',
      skin: ['#dcfffa', '#3fd2c4', '#16918a'],
      accent: '#ff8a3a',
      belly: '#c8fff4',
      cheek: 'rgba(255, 120, 150, 0.55)',
      led: 'rgba(255, 220, 90, 0.95)',
      mouth: 'pucker',
    },
  },
  hood: {
    base: {
      outline: '#4e3510',
      skin: ['#fff6e0', '#ecd09a', '#b98d4c'],
      accent: '#5fd0c8',
      belly: '#fff1cf',
      cheek: 'rgba(255, 120, 140, 0.55)',
      led: 'rgba(57, 255, 136, 0.95)',
      mouth: 'bite',
    },
    spitter: {
      outline: '#4d1048',
      skin: ['#ffe2f8', '#e486d6', '#a8409c'],
      accent: '#ffd25a',
      belly: '#ffd6f3',
      cheek: 'rgba(255, 110, 140, 0.55)',
      led: 'rgba(57, 255, 136, 0.95)',
      mouth: 'pucker',
    },
  },
};

const SKIPPER_PALETTES: Record<SkipperDesign, BugPalette & { readonly wing: string; readonly limb: readonly [string, string] }> = {
  grasshopper: {
    outline: '#6e1848',
    skin: ['#ffe6f3', '#ff8cc8', '#d04a92'],
    accent: '#a82a6c',
    belly: '#fff1b8',
    cheek: 'rgba(255, 90, 120, 0.55)',
    led: 'rgba(57, 255, 136, 0.95)',
    mouth: 'bite',
    wing: 'rgba(255, 246, 252, 0.78)',
    limb: ['#ffb0d8', '#c8407f'],
  },
  flea: {
    outline: '#3e0d08',
    skin: ['#ffd6c8', '#d8573e', '#80201a'],
    accent: '#5a140e',
    belly: '#ffb89e',
    cheek: 'rgba(255, 150, 150, 0.6)',
    led: 'rgba(57, 255, 136, 0.95)',
    mouth: 'bite',
    wing: 'rgba(255, 240, 230, 0.5)',
    limb: ['#f08a6a', '#8e2a1c'],
  },
  spring: {
    outline: '#24135e',
    skin: ['#ede4ff', '#9c7cff', '#5234c2'],
    accent: '#39ff88',
    belly: '#d8ccff',
    cheek: 'rgba(255, 120, 190, 0.55)',
    led: 'rgba(57, 255, 136, 0.95)',
    mouth: 'bite',
    wing: 'rgba(240, 236, 255, 0.6)',
    limb: ['#b9a2ff', '#5a3cc8'],
  },
};

/**
 * Armadura de sectores del Lurker acorazado: placas de metal oscuro con un mapa de sectores de disco (casillas
 * turquesa) y alguno rojo, tachado: un sector defectuoso, donde Brain escondia su copia.
 */
const SECTOR_ARMOR = {
  light: '#7d8ca6',
  mid: '#4a566d',
  dark: '#272e3d',
  outline: '#11151e',
  cell: '#5fd3c9',
  cellDim: '#2f7f86',
  bad: '#ff5a5f',
  rivet: '#dfe6f0',
} as const;

/** Tinta de la silueta de un oculto (LK-02): el morado de la corrupcion. Sus ojos brillan en verde neon. */
export const HIDDEN_LOOK = { fill: 0x2b2034, alpha: 0.9, eyes: '#39ff88' } as const;

// ---------------------------------------------------------------------------
// Utilidades

function radial(ctx: Ctx, x: number, y: number, r: number, colors: readonly [string, string, string]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x, y, r);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);
  return g;
}

function stroke(ctx: Ctx, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
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

/** Pecas de pixel de virus (las luces de las tropas de todos los brotes). */
function freckles(ctx: Ctx, color: string, spots: ReadonlyArray<readonly [number, number, number]>): void {
  ctx.fillStyle = color;
  for (const [x, y, s] of spots) ctx.fillRect(x - s / 2, y - s / 2, s, s);
}

/** Ojo con brillo, la pupila mirando hacia donde va (la izquierda). Dolorido, apretado (>_<). */
function eye(ctx: Ctx, x: number, y: number, rx: number, ry: number, outline: string, hurt: boolean, front: boolean, look = -0.38): void {
  if (hurt) {
    const dir = front ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x - dir * rx * 0.55, y - ry * 0.55);
    ctx.lineTo(x + dir * rx * 0.45, y);
    ctx.lineTo(x - dir * rx * 0.55, y + ry * 0.55);
    stroke(ctx, '#1d1030', 3.2);
    return;
  }
  ellipse(ctx, x, y, rx, ry, '#ffffff');
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  stroke(ctx, outline, 2.2);
  const pupil = Math.min(rx, ry) * 0.55;
  const px = x + rx * look;
  const py = y + 1;
  circle(ctx, px, py, pupil, '#1d1030');
  circle(ctx, px - pupil * 0.35, py - pupil * 0.5, pupil * 0.4, '#ffffff');
}

/** Ceja decidida sobre un ojo (atacando o a punto de saltar). */
function brow(ctx: Ctx, x: number, y: number, rx: number, ry: number, outline: string): void {
  ctx.beginPath();
  ctx.moveTo(x - rx, y - ry - 2);
  ctx.lineTo(x + rx * 0.6, y - ry + 4);
  stroke(ctx, outline, 3);
}

/**
 * Boca de un bicho en (`x`, `y`). La de morder: sonrisa con un dientecito; atacando, abierta con dientes; dolorida, de
 * "ay". La de pinon (el escupidor): labios en punta con una gotita; cargando, los mofletes hinchados.
 */
function mouth(ctx: Ctx, kind: 'bite' | 'pucker', mood: LurkerMood, x: number, y: number, palette: BugPalette, width = 1): void {
  const outline = palette.outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (mood === 'hurt') {
    ellipse(ctx, x, y + 1, 5.5 * width, 4.5, '#3a1020');
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 5.5 * width, 4.5, 0, 0, Math.PI * 2);
    stroke(ctx, outline, 2);
    return;
  }
  if (kind === 'pucker') {
    if (mood === 'attack') {
      ellipse(ctx, x + 10, y - 2, 7, 6, palette.cheek);
      ellipse(ctx, x, y, 6.5, 5.5, '#ff5c9a');
      ctx.beginPath();
      ctx.ellipse(x, y, 6.5, 5.5, 0, 0, Math.PI * 2);
      stroke(ctx, outline, 2.2);
      circle(ctx, x - 1, y, 2.2, '#3a1020');
    } else {
      ellipse(ctx, x + 8, y - 3, 6, 4, palette.cheek);
      ellipse(ctx, x, y, 5, 4, '#ff5c9a');
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
      stroke(ctx, outline, 2);
      // Gotita de moco.
      ellipse(ctx, x - 3, y + 7, 2.6, 3.4, '#6dffad');
      ctx.beginPath();
      ctx.ellipse(x - 3, y + 7, 2.6, 3.4, 0, 0, Math.PI * 2);
      stroke(ctx, '#0e6a3a', 1.3);
    }
    return;
  }
  if (mood === 'attack') {
    ctx.beginPath();
    ctx.moveTo(x - 9 * width, y - 3);
    ctx.quadraticCurveTo(x, y + 12, x + 9 * width, y - 4);
    ctx.closePath();
    ctx.fillStyle = '#3a1020';
    ctx.fill();
    stroke(ctx, outline, 2.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 6 * width, y - 3, 3.2, 3.6);
    ctx.fillRect(x + 2 * width, y - 3.4, 3.2, 3.6);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x - 8 * width, y - 2);
  ctx.quadraticCurveTo(x, y + 6, x + 8 * width, y - 3);
  stroke(ctx, outline, 2.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 2, y + 0.6, 3.4, 3.2);
}

/** Casillas de un mapa de sectores dentro de un rectangulo, con un sector defectuoso (rojo y tachado) en `bad`. */
function sectorGrid(ctx: Ctx, x: number, y: number, cols: number, rows: number, cell: number, bad: readonly number[]): void {
  const gap = cell * 0.28;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const cx = x + col * (cell + gap);
      const cy = y + row * (cell + gap);
      const broken = bad.includes(i);
      ctx.fillStyle = broken ? SECTOR_ARMOR.bad : (i * 7) % 3 === 0 ? SECTOR_ARMOR.cellDim : SECTOR_ARMOR.cell;
      ctx.fillRect(cx, cy, cell, cell);
      if (broken) {
        ctx.beginPath();
        ctx.moveTo(cx + 1, cy + 1);
        ctx.lineTo(cx + cell - 1, cy + cell - 1);
        ctx.moveTo(cx + cell - 1, cy + 1);
        ctx.lineTo(cx + 1, cy + cell - 1);
        stroke(ctx, '#4a0a12', 1.4);
      }
    }
  }
}

function rivet(ctx: Ctx, x: number, y: number, r = 2.4): void {
  circle(ctx, x, y, r + 1, SECTOR_ARMOR.outline);
  circle(ctx, x, y, r, SECTOR_ARMOR.rivet);
}

/** Relleno y contorno de una placa de la armadura de sectores con la forma del camino ya trazado. */
function armorFill(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, SECTOR_ARMOR.light);
  g.addColorStop(0.45, SECTOR_ARMOR.mid);
  g.addColorStop(1, SECTOR_ARMOR.dark);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, SECTOR_ARMOR.outline, 3);
}

/** Pata articulada de cadera a pie pasando por la rodilla, con grosor `width` que adelgaza hacia el pie. */
function jointedLeg(ctx: Ctx, points: readonly Point[], width: number, fill: string, outline: string): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  };
  path();
  stroke(ctx, outline, width + 3.4);
  path();
  stroke(ctx, fill, width);
}

// ---------------------------------------------------------------------------
// Lurker A: insecto hoja

/** Borde de la hoja: almendra con lobulos, de `front` a `tip`, vista algo desde arriba. */
function leafOutline(ctx: Ctx, front: number, tip: number, half: number, lobes: number): void {
  const steps = 48;
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = front + (tip - front) * t;
    const w = half * Math.sin(Math.PI * Math.pow(t, 0.78)) * (1 + 0.07 * Math.sin(t * Math.PI * lobes));
    top.push({ x, y: -w * 0.78 });
    bottom.push({ x, y: w * 0.62 });
  }
  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (const p of top) ctx.lineTo(p.x, p.y);
  for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i].x, bottom[i].y);
  ctx.closePath();
}

function paintLeafBody(ctx: Ctx, palette: BugPalette): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const front = -56;
  const tip = 86;
  const half = 34;
  ctx.save();
  ctx.rotate(-0.07);
  // Canto de la hoja: un poco de grosor por debajo.
  ctx.save();
  ctx.translate(0, 5);
  leafOutline(ctx, front, tip, half, 7);
  ctx.fillStyle = palette.accent;
  ctx.fill();
  stroke(ctx, palette.outline, 3);
  ctx.restore();
  leafOutline(ctx, front, tip, half, 7);
  const g = ctx.createLinearGradient(front, -half, tip, half);
  g.addColorStop(0, palette.skin[0]);
  g.addColorStop(0.45, palette.skin[1]);
  g.addColorStop(1, palette.skin[2]);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, palette.outline, 3.4);
  // Nervio central y nervios de los lados, hacia la punta.
  ctx.beginPath();
  ctx.moveTo(front + 6, -1);
  ctx.quadraticCurveTo(14, -6, tip - 4, 1);
  stroke(ctx, palette.accent, 3);
  for (let i = 0; i < 6; i++) {
    const t = 0.16 + i * 0.13;
    const x = front + (tip - front) * t;
    const reach = half * Math.sin(Math.PI * Math.pow(t, 0.78)) * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, -2);
    ctx.quadraticCurveTo(x + 8, -reach * 0.5, x + 16, -reach * 0.72);
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 8, reach * 0.36, x + 15, reach * 0.52);
    stroke(ctx, palette.accent, 1.8);
  }
  // Rabito de la hoja, enroscado en la punta.
  ctx.beginPath();
  ctx.moveTo(tip - 2, 1);
  ctx.quadraticCurveTo(tip + 12, 2, tip + 12, -8);
  ctx.quadraticCurveTo(tip + 12, -14, tip + 6, -12);
  stroke(ctx, palette.outline, 5);
  ctx.beginPath();
  ctx.moveTo(tip - 2, 1);
  ctx.quadraticCurveTo(tip + 12, 2, tip + 12, -8);
  ctx.quadraticCurveTo(tip + 12, -14, tip + 6, -12);
  stroke(ctx, palette.accent, 2.4);
  freckles(ctx, palette.led, [
    [22, -16, 4.5],
    [32, -10, 3.5],
    [46, -18, 3],
    [58, -8, 3.5],
  ]);
  ellipse(ctx, -14, -16, 18, 6, 'rgba(255, 255, 255, 0.4)', -0.15);
  ctx.restore();

  // Cuello alto de mantis, hasta la cabeza.
  const neck = [
    { x: front + 10, y: -4 },
    { x: front - 2, y: -18 },
    { x: front - 8, y: -30 },
  ];
  jointedLeg(ctx, neck, 11, palette.skin[1], palette.outline);
  ellipse(ctx, front + 2, -14, 3, 7, 'rgba(255, 255, 255, 0.35)', 0.5);
  // Bracitos recogidos, como rezando, con una hojita en el codo.
  for (const [dx, dy, far] of [
    [6, -2, true],
    [0, 0, false],
  ] as const) {
    const arm = [
      { x: front + 2 + dx, y: -14 + dy },
      { x: front - 12 + dx, y: 4 + dy },
      { x: front - 6 + dx, y: -8 + dy },
    ];
    jointedLeg(ctx, arm, 6, far ? palette.accent : palette.skin[1], palette.outline);
    ctx.save();
    ctx.translate(front - 12 + dx, 4 + dy);
    ctx.rotate(2.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(5, -5, 11, 0);
    ctx.quadraticCurveTo(5, 5, 0, 0);
    ctx.fillStyle = far ? palette.accent : palette.belly;
    ctx.fill();
    stroke(ctx, palette.outline, 1.6);
    ctx.restore();
  }
}

function paintLeafHead(ctx: Ctx, mood: LurkerMood, palette: BugPalette): void {
  const outline = palette.outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Antenas finas con una hojita en la punta, hacia atras.
  for (const [x0, x1, y1] of [
    [-4, 44, -66],
    [6, 56, -52],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, -26);
    ctx.quadraticCurveTo(x0 + 4, -56, x1, y1);
    stroke(ctx, outline, 2.6);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(0.3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, -6, 13, 0);
    ctx.quadraticCurveTo(6, 6, 0, 0);
    ctx.fillStyle = palette.skin[1];
    ctx.fill();
    stroke(ctx, outline, 1.6);
    ctx.restore();
  }
  // Cabeza triangular de mantis: ancha arriba, con los ojos en las esquinas, y la boca abajo.
  ctx.beginPath();
  ctx.moveTo(-36, -12);
  ctx.quadraticCurveTo(-4, -36, 32, -18);
  ctx.quadraticCurveTo(30, 14, -2, 32);
  ctx.quadraticCurveTo(-30, 24, -36, -12);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, -2, 0, 40, palette.skin);
  ctx.fill();
  stroke(ctx, outline, 3.4);
  // Pecas de pixel en la nuca.
  freckles(ctx, palette.led, [
    [20, 4, 4.5],
    [14, 12, 3.5],
    [24, -4, 3],
  ]);
  const eyes = [
    { x: -25, y: -12, rx: 14, ry: 16, front: true },
    { x: 18, y: -16, rx: 11, ry: 13, front: false },
  ];
  for (const e of eyes) eye(ctx, e.x, e.y, e.rx, e.ry, outline, mood === 'hurt', e.front);
  if (mood === 'attack') for (const e of eyes) brow(ctx, e.x, e.y, e.rx, e.ry, outline);
  ellipse(ctx, -24, 10, 6, 4, palette.cheek);
  mouth(ctx, palette.mouth, mood, -12, 20, palette);
  ellipse(ctx, -6, -24, 11, 4.5, 'rgba(255, 255, 255, 0.45)', -0.25);
}

function paintLeafLeg(ctx: Ctx, palette: BugPalette): void {
  const { hipX, hipY } = BUG_SIZE.leg;
  // Rodilla baja, casi a la altura de la cadera: asi las seis patas no tapan la hoja como un peine.
  const knee = { x: hipX + 15, y: hipY + 4 };
  const foot = { x: hipX + 9, y: hipY + 48 };
  // Hojita del muslo, por debajo, como las patas de los insectos hoja de verdad.
  ctx.save();
  ctx.translate(hipX + 4, hipY + 3);
  ctx.rotate(0.25);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, 7, 13, 1);
  ctx.quadraticCurveTo(6, -2, 0, 0);
  ctx.fillStyle = palette.skin[1];
  ctx.fill();
  stroke(ctx, palette.outline, 1.4);
  ctx.restore();
  jointedLeg(ctx, [{ x: hipX, y: hipY }, knee, foot], 4.6, palette.skin[2], palette.outline);
  ellipse(ctx, foot.x - 3, foot.y + 1, 5, 2.6, palette.outline);
}

function paintLeafHelmet(ctx: Ctx): void {
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, -24);
  ctx.quadraticCurveTo(-2, -40, 10, -30);
  ctx.lineTo(12, -20);
  ctx.quadraticCurveTo(-1, -26, -12, -15);
  ctx.closePath();
  armorFill(ctx, -14, -40, 12, -14);
  sectorGrid(ctx, -8, -30, 3, 1, 4, [1]);
  rivet(ctx, -10, -18, 1.8);
  rivet(ctx, 9, -22, 1.8);
}

/** Placas del acorazado sobre la hoja: la de delante y la de atras. */
function paintLeafPlate(ctx: Ctx, part: 0 | 1): void {
  ctx.save();
  ctx.rotate(-0.07);
  ctx.lineJoin = 'round';
  const x0 = part === 0 ? -34 : 12;
  const w = part === 0 ? 44 : 50;
  ctx.beginPath();
  ctx.moveTo(x0, -10);
  ctx.quadraticCurveTo(x0 + w * 0.5, -36, x0 + w, -12);
  ctx.lineTo(x0 + w - 2, 8);
  ctx.quadraticCurveTo(x0 + w * 0.5, 14, x0 + 2, 8);
  ctx.closePath();
  armorFill(ctx, x0, -30, x0 + w, 12);
  sectorGrid(ctx, x0 + 8, -16, part === 0 ? 4 : 5, 2, 5, part === 0 ? [5] : [2]);
  rivet(ctx, x0 + 5, 2);
  rivet(ctx, x0 + w - 6, 2);
  ellipse(ctx, x0 + 12, -16, 8, 3, 'rgba(255, 255, 255, 0.25)', -0.2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Lurker B: camaleon

function paintChameleonBody(ctx: Ctx, palette: BugPalette): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Cola enroscada, detras.
  ctx.beginPath();
  ctx.moveTo(40, 6);
  ctx.bezierCurveTo(70, 10, 96, -2, 90, -24);
  ctx.bezierCurveTo(86, -40, 64, -38, 64, -24);
  ctx.bezierCurveTo(64, -14, 76, -14, 78, -22);
  stroke(ctx, palette.outline, 15);
  ctx.beginPath();
  ctx.moveTo(40, 6);
  ctx.bezierCurveTo(70, 10, 96, -2, 90, -24);
  ctx.bezierCurveTo(86, -40, 64, -38, 64, -24);
  ctx.bezierCurveTo(64, -14, 76, -14, 78, -22);
  stroke(ctx, palette.skin[1], 9.5);
  // Cuerpo gordito.
  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 34, -0.08, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -6, -6, 58, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.4);
  // Barriga clara.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 34, -0.08, 0, Math.PI * 2);
  ctx.clip();
  ellipse(ctx, -4, 30, 52, 16, palette.belly);
  // Manchas de pixel que cambian de color.
  ctx.fillStyle = palette.accent;
  for (const [x, y, s] of [
    [-26, -12, 7],
    [-12, -20, 5],
    [6, -10, 8],
    [22, -22, 6],
    [30, -4, 7],
    [-2, 6, 5],
    [-30, 4, 5],
  ] as const) {
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
  // Cresta del lomo: bultitos.
  for (let i = 0; i < 6; i++) {
    const x = -32 + i * 12;
    const y = -31 + Math.abs(i - 2.2) * 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 3);
    ctx.quadraticCurveTo(x, y - 7, x + 5, y + 3);
    ctx.fillStyle = palette.skin[0];
    ctx.fill();
    stroke(ctx, palette.outline, 2.2);
  }
  freckles(ctx, palette.led, [
    [14, 2, 4],
    [26, 10, 3],
  ]);
  ellipse(ctx, -20, -16, 16, 7, 'rgba(255, 255, 255, 0.42)', -0.3);
}

function paintChameleonHead(ctx: Ctx, mood: LurkerMood, palette: BugPalette): void {
  const outline = palette.outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Casco de la cabeza (la cresta alta de atras) y la cabeza con su hocico.
  ctx.beginPath();
  ctx.moveTo(-40, 8);
  ctx.quadraticCurveTo(-40, -22, -10, -28);
  ctx.quadraticCurveTo(14, -52, 34, -40);
  ctx.quadraticCurveTo(40, -12, 30, 12);
  ctx.quadraticCurveTo(12, 30, -14, 26);
  ctx.quadraticCurveTo(-36, 22, -40, 8);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, -6, -6, 44, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.4);
  // Rayas del casco.
  ctx.beginPath();
  ctx.moveTo(-2, -30);
  ctx.quadraticCurveTo(14, -40, 30, -34);
  ctx.moveTo(4, -22);
  ctx.quadraticCurveTo(18, -30, 32, -24);
  stroke(ctx, palette.accent, 2.6);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(18, -6, 6, 6);
  ctx.fillRect(10, 4, 4.5, 4.5);
  freckles(ctx, palette.led, [
    [24, 8, 4],
    [28, -2, 3],
  ]);
  // Ojo de torreta: un cono de escamas con la pupila asomando.
  const ex = -10;
  const ey = -6;
  ctx.beginPath();
  ctx.arc(ex, ey, 17, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, ex, ey, 18, palette.skin);
  ctx.fill();
  stroke(ctx, outline, 3);
  ctx.beginPath();
  ctx.arc(ex - 1, ey, 12, 0, Math.PI * 2);
  stroke(ctx, palette.accent, 2);
  if (mood === 'hurt') {
    eye(ctx, ex - 2, ey, 9, 9, outline, true, true);
  } else {
    circle(ctx, ex - 3, ey, 8.5, '#ffffff');
    ctx.beginPath();
    ctx.arc(ex - 3, ey, 8.5, 0, Math.PI * 2);
    stroke(ctx, outline, 2);
    circle(ctx, ex - 6, ey + 1, 4.6, '#1d1030');
    circle(ctx, ex - 7.5, ey - 1, 1.8, '#ffffff');
    if (mood === 'attack') brow(ctx, ex - 2, ey - 2, 12, 12, outline);
  }
  // Bocaza de camaleon de lado a lado.
  ellipse(ctx, -18, 12, 6, 4, palette.cheek);
  if (palette.mouth === 'pucker') {
    mouth(ctx, 'pucker', mood, -34, 10, palette);
  } else if (mood === 'attack') {
    // Bocaza abierta de lado a lado, con la lengua y dos dientes: va a morder.
    ctx.beginPath();
    ctx.moveTo(-41, 5);
    ctx.quadraticCurveTo(-20, 36, 7, 14);
    ctx.quadraticCurveTo(-16, 8, -41, 5);
    ctx.closePath();
    ctx.fillStyle = '#3a1020';
    ctx.fill();
    stroke(ctx, outline, 2.6);
    ellipse(ctx, -18, 21, 8, 3.8, '#ff6f9c', 0.15);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-33, 7, 3.6, 4.2);
    ctx.fillRect(-12, 10.5, 3.6, 4.2);
  } else if (mood === 'hurt') {
    mouth(ctx, 'bite', 'hurt', -24, 14, palette);
  } else {
    ctx.beginPath();
    ctx.moveTo(-38, 8);
    ctx.quadraticCurveTo(-18, 20, 6, 12);
    stroke(ctx, outline, 2.6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-26, 12.4, 3.2, 3.2);
  }
  ellipse(ctx, -24, -20, 10, 4.5, 'rgba(255, 255, 255, 0.45)', -0.4);
}

function paintChameleonLeg(ctx: Ctx, palette: BugPalette): void {
  const { hipX, hipY } = BUG_SIZE.leg;
  const elbow = { x: hipX - 9, y: hipY + 14 };
  const foot = { x: hipX + 4, y: hipY + 28 };
  jointedLeg(ctx, [{ x: hipX, y: hipY }, elbow, foot], 9, palette.skin[1], palette.outline);
  // Pie de pinza: dos dedos gorditos.
  for (const dx of [-5, 5]) {
    ctx.beginPath();
    ctx.ellipse(foot.x + dx, foot.y + 2, 4.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.skin[2];
    ctx.fill();
    stroke(ctx, palette.outline, 2);
  }
}

function paintChameleonHelmet(ctx: Ctx): void {
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, -26);
  ctx.quadraticCurveTo(14, -54, 36, -42);
  ctx.quadraticCurveTo(40, -26, 34, -14);
  ctx.quadraticCurveTo(14, -28, -2, -18);
  ctx.closePath();
  armorFill(ctx, -4, -52, 38, -14);
  sectorGrid(ctx, 10, -38, 3, 2, 4.5, [4]);
  rivet(ctx, 2, -22, 2);
  rivet(ctx, 32, -20, 2);
}

function paintChameleonPlate(ctx: Ctx, part: 0 | 1): void {
  ctx.lineJoin = 'round';
  const x0 = part === 0 ? -46 : -2;
  const w = part === 0 ? 46 : 50;
  ctx.beginPath();
  ctx.moveTo(x0 + 2, -8);
  ctx.quadraticCurveTo(x0 + w * 0.5, -46, x0 + w, -10);
  ctx.lineTo(x0 + w - 4, 6);
  ctx.quadraticCurveTo(x0 + w * 0.5, 0, x0 + 4, 8);
  ctx.closePath();
  armorFill(ctx, x0, -36, x0 + w, 8);
  sectorGrid(ctx, x0 + 9, -22, 4, 2, 5, part === 0 ? [6] : [1]);
  rivet(ctx, x0 + 6, 2);
  rivet(ctx, x0 + w - 7, 0);
  ellipse(ctx, x0 + 14, -22, 8, 3, 'rgba(255, 255, 255, 0.25)', -0.3);
}

// ---------------------------------------------------------------------------
// Lurker C: encapuchado

/** La capa: una campana con el bajo festoneado, con el estampado del mapa de sectores. */
function cloakPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-36, -44);
  ctx.quadraticCurveTo(10, -58, 40, -30);
  ctx.quadraticCurveTo(62, -8, 64, 30);
  // Bajo con festones, de atras adelante.
  const scallops = 6;
  const x0 = 64;
  const x1 = -66;
  for (let i = 1; i <= scallops; i++) {
    const xa = x0 + ((x1 - x0) * (i - 0.5)) / scallops;
    const xb = x0 + ((x1 - x0) * i) / scallops;
    ctx.quadraticCurveTo(xa, 44, xb, 32);
  }
  ctx.quadraticCurveTo(-64, -8, -36, -44);
  ctx.closePath();
}

function paintHoodBody(ctx: Ctx, palette: BugPalette): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  cloakPath(ctx);
  ctx.fillStyle = radial(ctx, -6, -14, 76, palette.skin);
  ctx.fill();
  ctx.save();
  cloakPath(ctx);
  ctx.clip();
  // Estampado: filas de sectores, uno rojo y tachado.
  ctx.globalAlpha = 0.55;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 9; col++) {
      const x = -58 + col * 14 + (row % 2) * 7;
      const y = -34 + row * 14;
      ctx.fillStyle = palette.accent;
      ctx.fillRect(x, y, 7, 7);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff5a5f';
  ctx.fillRect(16, -6, 9, 9);
  ctx.beginPath();
  ctx.moveTo(17, -5);
  ctx.lineTo(24, 2);
  ctx.moveTo(24, -5);
  ctx.lineTo(17, 2);
  stroke(ctx, '#4a0a12', 1.6);
  // Pliegues.
  ctx.beginPath();
  ctx.moveTo(-30, -8);
  ctx.quadraticCurveTo(-36, 14, -38, 32);
  ctx.moveTo(6, -6);
  ctx.quadraticCurveTo(4, 16, 0, 34);
  ctx.moveTo(38, -4);
  ctx.quadraticCurveTo(44, 14, 44, 32);
  stroke(ctx, 'rgba(0, 0, 0, 0.12)', 5);
  ctx.restore();
  cloakPath(ctx);
  stroke(ctx, palette.outline, 3.4);
  freckles(ctx, palette.led, [
    [44, 4, 4],
    [50, 14, 3],
  ]);
  ellipse(ctx, -28, -24, 16, 7, 'rgba(255, 255, 255, 0.4)', -0.5);
}

function paintHoodHead(ctx: Ctx, mood: LurkerMood, palette: BugPalette): void {
  const outline = palette.outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Punta de la capucha, caida hacia atras, con su borla.
  ctx.beginPath();
  ctx.moveTo(6, -30);
  ctx.quadraticCurveTo(40, -46, 60, -18);
  ctx.quadraticCurveTo(44, -22, 24, -6);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 30, -26, 34, palette.skin);
  ctx.fill();
  stroke(ctx, outline, 3);
  circle(ctx, 61, -16, 6.5, palette.outline);
  circle(ctx, 61, -16, 5, palette.accent);
  // Capucha.
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 36, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -4, -4, 40, palette.skin);
  ctx.fill();
  stroke(ctx, outline, 3.4);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = palette.accent;
  for (const [x, y] of [
    [10, -26],
    [20, -14],
    [24, 2],
    [18, 16],
    [2, -30],
  ] as const) {
    ctx.fillRect(x, y, 6, 6);
  }
  ctx.globalAlpha = 1;
  freckles(ctx, palette.led, [
    [26, -6, 4],
    [22, 10, 3],
  ]);
  // Hueco de la cara: oscuro, y dentro los ojos y la boca.
  ctx.beginPath();
  ctx.ellipse(-12, 4, 21, 24, 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1430';
  ctx.fill();
  stroke(ctx, palette.skin[2], 4);
  ctx.beginPath();
  ctx.ellipse(-12, 4, 21, 24, 0.12, 0, Math.PI * 2);
  stroke(ctx, outline, 1.6);
  const eyes = [
    { x: -22, y: 2, rx: 9, ry: 11, front: true },
    { x: -2, y: 0, rx: 7.5, ry: 9.5, front: false },
  ];
  for (const e of eyes) eye(ctx, e.x, e.y, e.rx, e.ry, '#0c0818', mood === 'hurt', e.front);
  if (mood === 'attack') for (const e of eyes) brow(ctx, e.x, e.y, e.rx, e.ry, palette.skin[0]);
  const dark = { ...palette, outline: palette.skin[0] };
  mouth(ctx, palette.mouth, mood, -14, 20, dark, 0.85);
  ellipse(ctx, 4, -26, 12, 5, 'rgba(255, 255, 255, 0.45)', -0.2);
}

function paintHoodLeg(ctx: Ctx, palette: BugPalette): void {
  const { hipX, hipY } = BUG_SIZE.leg;
  const foot = { x: hipX - 2, y: hipY + 10 };
  jointedLeg(ctx, [{ x: hipX, y: hipY }, foot], 6, palette.skin[2], palette.outline);
  ctx.beginPath();
  ctx.ellipse(foot.x - 3, foot.y + 1, 7, 4.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.skin[1];
  ctx.fill();
  stroke(ctx, palette.outline, 2.2);
}

function paintHoodHelmet(ctx: Ctx): void {
  ctx.lineJoin = 'round';
  // Aro de metal alrededor de la cara y una placa en la coronilla.
  ctx.beginPath();
  ctx.ellipse(-12, 4, 24, 27, 0.12, 0, Math.PI * 2);
  ctx.ellipse(-12, 4, 19, 22, 0.12, 0, Math.PI * 2, true);
  armorFill(ctx, -36, -24, 12, 30);
  rivet(ctx, -12, -22, 2);
  rivet(ctx, -34, 8, 2);
  rivet(ctx, 8, 14, 2);
  ctx.beginPath();
  ctx.moveTo(-6, -30);
  ctx.quadraticCurveTo(12, -42, 28, -24);
  ctx.lineTo(22, -14);
  ctx.quadraticCurveTo(10, -26, -2, -22);
  ctx.closePath();
  armorFill(ctx, -6, -40, 28, -14);
  sectorGrid(ctx, 4, -30, 3, 1, 4, [2]);
}

function paintHoodPlate(ctx: Ctx, part: 0 | 1): void {
  ctx.lineJoin = 'round';
  const x0 = part === 0 ? -50 : 0;
  const w = part === 0 ? 48 : 54;
  ctx.beginPath();
  ctx.moveTo(x0 + 4, -16);
  ctx.quadraticCurveTo(x0 + w * 0.5, -36, x0 + w, -18);
  ctx.lineTo(x0 + w + 2, 14);
  ctx.quadraticCurveTo(x0 + w * 0.5, 20, x0, 14);
  ctx.closePath();
  armorFill(ctx, x0, -32, x0 + w, 18);
  sectorGrid(ctx, x0 + 9, -18, 4, 3, 5, part === 0 ? [9] : [2]);
  rivet(ctx, x0 + 6, 8);
  rivet(ctx, x0 + w - 4, 8);
  ellipse(ctx, x0 + 14, -20, 9, 3, 'rgba(255, 255, 255, 0.25)', -0.2);
}

// ---------------------------------------------------------------------------
// Lurker: pintores por propuesta

type BodyPainter = (ctx: Ctx, palette: BugPalette) => void;
type HeadPainter = (ctx: Ctx, mood: LurkerMood, palette: BugPalette) => void;

const LURKER_PAINTERS: Record<
  LurkerDesign,
  { body: BodyPainter; head: HeadPainter; leg: BodyPainter; helmet: (ctx: Ctx) => void; plate: (ctx: Ctx, part: 0 | 1) => void }
> = {
  leaf: { body: paintLeafBody, head: paintLeafHead, leg: paintLeafLeg, helmet: paintLeafHelmet, plate: paintLeafPlate },
  chameleon: { body: paintChameleonBody, head: paintChameleonHead, leg: paintChameleonLeg, helmet: paintChameleonHelmet, plate: paintChameleonPlate },
  hood: { body: paintHoodBody, head: paintHoodHead, leg: paintHoodLeg, helmet: paintHoodHelmet, plate: paintHoodPlate },
};

const paletteOf = (design: LurkerDesign, variant: LurkerVariant): BugPalette => LURKER_PALETTES[design][variant === 'spitter' ? 'spitter' : 'base'];

/** Cuerpo de un Lurker, en su lienzo (`BUG_SIZE.body`). */
export function paintLurkerBody(ctx: Ctx, design: LurkerDesign, variant: LurkerVariant): void {
  ctx.translate(BUG_SIZE.body.cx, BUG_SIZE.body.cy);
  LURKER_PAINTERS[design].body(ctx, paletteOf(design, variant));
}

/** Cabeza de un Lurker con su cara, en su lienzo (`BUG_SIZE.head`). */
export function paintLurkerHead(ctx: Ctx, design: LurkerDesign, variant: LurkerVariant, mood: LurkerMood): void {
  ctx.translate(BUG_SIZE.head.cx, BUG_SIZE.head.cy);
  LURKER_PAINTERS[design].head(ctx, mood, paletteOf(design, variant));
}

/** Una pata de un Lurker, colgando de su cadera, en su lienzo (`BUG_SIZE.leg`). */
export function paintLurkerLeg(ctx: Ctx, design: LurkerDesign, variant: LurkerVariant): void {
  LURKER_PAINTERS[design].leg(ctx, paletteOf(design, variant));
}

/** Casco de sectores del acorazado, en el lienzo de la cabeza. */
export function paintLurkerHelmet(ctx: Ctx, design: LurkerDesign): void {
  ctx.translate(BUG_SIZE.head.cx, BUG_SIZE.head.cy);
  LURKER_PAINTERS[design].helmet(ctx);
}

/** Una de las dos placas de sectores del acorazado (0, la de delante), en el lienzo del cuerpo. */
export function paintLurkerPlate(ctx: Ctx, design: LurkerDesign, part: 0 | 1): void {
  ctx.translate(BUG_SIZE.body.cx, BUG_SIZE.body.cy);
  LURKER_PAINTERS[design].plate(ctx, part);
}

/** Brillo de un ojo de un oculto (LK-02): verde neon suave, en su lienzo cuadrado (`BUG_SIZE.glow`). */
export function paintEyeGlow(ctx: Ctx): void {
  const c = BUG_SIZE.glow.size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, '#f4fff8');
  g.addColorStop(0.28, HIDDEN_LOOK.eyes);
  g.addColorStop(0.6, 'rgba(57, 255, 136, 0.35)');
  g.addColorStop(1, 'rgba(57, 255, 136, 0)');
  circle(ctx, c, c, c, g);
}

// ---------------------------------------------------------------------------
// Skipper

type SkipperPalette = (typeof SKIPPER_PALETTES)[SkipperDesign];

/** Cara del Skipper: los ojos y la boca segun lo que hace. */
function skipperFace(ctx: Ctx, mood: SkipperMood, palette: SkipperPalette, eyes: ReadonlyArray<{ x: number; y: number; rx: number; ry: number }>, mx: number, my: number): void {
  const outline = palette.outline;
  eyes.forEach((e, i) => {
    if (mood === 'air') {
      // En el aire, ojos muy abiertos de "¡yupi!".
      eye(ctx, e.x, e.y, e.rx * 1.08, e.ry * 1.1, outline, false, i === 0, -0.2);
    } else {
      eye(ctx, e.x, e.y, e.rx, e.ry, outline, mood === 'hurt', i === 0);
    }
    if (mood === 'ready' || mood === 'bite') brow(ctx, e.x, e.y, e.rx, e.ry, outline);
  });
  ellipse(ctx, mx - 6, my - 8, 5.5, 3.6, palette.cheek);
  ctx.lineCap = 'round';
  if (mood === 'air') {
    ellipse(ctx, mx, my, 6, 7, '#3a1020');
    ctx.beginPath();
    ctx.ellipse(mx, my, 6, 7, 0, 0, Math.PI * 2);
    stroke(ctx, outline, 2.2);
    ellipse(ctx, mx, my + 3, 3.6, 2.4, '#ff6f9c');
  } else if (mood === 'ready') {
    // Sonrisa apretada de quien va a saltar.
    ctx.beginPath();
    ctx.moveTo(mx - 8, my - 1);
    ctx.quadraticCurveTo(mx, my + 5, mx + 7, my - 2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    stroke(ctx, outline, 2.2);
    ctx.beginPath();
    ctx.moveTo(mx - 7, my + 1);
    ctx.lineTo(mx + 6, my);
    stroke(ctx, outline, 1.2);
  } else {
    mouth(ctx, palette.mouth, mood === 'bite' ? 'attack' : mood === 'hurt' ? 'hurt' : 'idle', mx, my, palette, 0.9);
  }
}

function antenna(ctx: Ctx, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, outline: string, tip?: string): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  stroke(ctx, outline, 2.4);
  if (tip) {
    circle(ctx, x1, y1, 7, 'rgba(57, 255, 136, 0.3)');
    circle(ctx, x1, y1, 4.2, tip);
  }
}

function paintGrasshopperBody(ctx: Ctx, palette: SkipperPalette): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Abdomen largo con anillos.
  ctx.beginPath();
  ctx.moveTo(-26, -10);
  ctx.quadraticCurveTo(30, -22, 74, -4);
  ctx.quadraticCurveTo(80, 4, 70, 10);
  ctx.quadraticCurveTo(20, 22, -22, 16);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, palette.skin[1]);
  g.addColorStop(0.55, palette.skin[2]);
  g.addColorStop(0.56, palette.belly);
  g.addColorStop(1, palette.belly);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, palette.outline, 3.2);
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 13;
    ctx.beginPath();
    ctx.moveTo(x, -14 + i * 1.6);
    ctx.quadraticCurveTo(x + 3, 2, x - 1, 16 - i * 1.2);
    stroke(ctx, palette.accent, 1.6);
  }
  // Ala plegada encima, transparente, con nervios.
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.quadraticCurveTo(40, -30, 84, -10);
  ctx.quadraticCurveTo(48, -6, -6, -6);
  ctx.closePath();
  ctx.fillStyle = palette.wing;
  ctx.fill();
  stroke(ctx, palette.outline, 2.2);
  ctx.beginPath();
  ctx.moveTo(-2, -13);
  ctx.quadraticCurveTo(40, -20, 78, -10);
  stroke(ctx, palette.accent, 1.2);
  // Escudo del pecho (el pronoto), como una silla de montar.
  ctx.beginPath();
  ctx.moveTo(-40, -16);
  ctx.quadraticCurveTo(-22, -30, -2, -20);
  ctx.quadraticCurveTo(0, -2, -6, 10);
  ctx.quadraticCurveTo(-26, 16, -38, 6);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, -22, -8, 28, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3);
  ctx.beginPath();
  ctx.moveTo(-34, -6);
  ctx.quadraticCurveTo(-20, -12, -6, -6);
  stroke(ctx, palette.accent, 1.6);
  freckles(ctx, palette.led, [
    [-24, -14, 4],
    [-14, -10, 3],
  ]);
  ellipse(ctx, -26, -20, 9, 3.6, 'rgba(255, 255, 255, 0.45)', -0.3);
}

function paintGrasshopperHead(ctx: Ctx, mood: SkipperMood, palette: SkipperPalette): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  antenna(ctx, 0, -24, 10, -70, 62, -66, palette.outline);
  antenna(ctx, 8, -22, 26, -60, 76, -46, palette.outline);
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 28, 0.25, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -4, -4, 30, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.2);
  freckles(ctx, palette.led, [
    [14, 4, 3.6],
    [12, 12, 2.8],
  ]);
  skipperFace(ctx, mood, palette, [{ x: -6, y: -8, rx: 11, ry: 13 }], -12, 18);
  ellipse(ctx, -6, -24, 8, 3.6, 'rgba(255, 255, 255, 0.45)', -0.3);
}

function paintFleaBody(ctx: Ctx, palette: SkipperPalette): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Pelillos del lomo.
  for (const [x, y, a] of [
    [-10, -34, -0.5],
    [6, -38, -0.2],
    [22, -34, 0.2],
    [36, -24, 0.5],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + Math.sin(a) * 12, y - Math.cos(a) * 10);
    stroke(ctx, palette.outline, 2.2);
  }
  // Cuerpo redondo y brillante, algo inclinado hacia delante.
  ctx.beginPath();
  ctx.ellipse(8, -2, 42, 36, -0.18, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, 0, -8, 48, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.4);
  // Placas del cuerpo.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(8, -2, 42, 36, -0.18, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-30 + i * 20, 0, 12, 40, 0.1, -Math.PI / 2, Math.PI / 2);
    stroke(ctx, palette.accent, 2);
  }
  ellipse(ctx, 6, 30, 40, 10, palette.belly);
  ctx.restore();
  freckles(ctx, palette.led, [
    [26, -10, 4],
    [34, 0, 3],
  ]);
  ellipse(ctx, -8, -22, 16, 8, 'rgba(255, 255, 255, 0.55)', -0.4);
  ellipse(ctx, 22, -26, 5, 3, 'rgba(255, 255, 255, 0.5)', -0.2);
}

function paintFleaHead(ctx: Ctx, mood: SkipperMood, palette: SkipperPalette): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  antenna(ctx, 0, -16, 6, -34, 22, -36, palette.outline);
  // Hociquito.
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.quadraticCurveTo(-30, 12, -32, 22);
  stroke(ctx, palette.outline, 5.4);
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.quadraticCurveTo(-30, 12, -32, 22);
  stroke(ctx, palette.skin[1], 2.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -3, -3, 24, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.2);
  skipperFace(ctx, mood, palette, [{ x: -6, y: -4, rx: 9.5, ry: 11 }], -14, 10);
  ellipse(ctx, -4, -13, 7, 3, 'rgba(255, 255, 255, 0.5)', -0.3);
}

function paintSpringBody(ctx: Ctx, palette: SkipperPalette): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(6, -2, 42, 30, -0.06, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -2, -8, 46, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.4);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(6, -2, 42, 30, -0.06, 0, Math.PI * 2);
  ctx.clip();
  ellipse(ctx, 4, 26, 42, 12, palette.belly);
  // Alas de grillo, con su raya.
  ctx.beginPath();
  ctx.moveTo(-28, -20);
  ctx.quadraticCurveTo(12, -40, 50, -10);
  ctx.quadraticCurveTo(16, -4, -24, -4);
  ctx.closePath();
  ctx.fillStyle = palette.wing;
  ctx.fill();
  stroke(ctx, palette.outline, 2);
  ctx.restore();
  // Boton de encendido en el lomo, verde neon.
  circle(ctx, 14, -16, 10, palette.outline);
  circle(ctx, 14, -16, 8, '#1c1430');
  ctx.beginPath();
  ctx.arc(14, -15, 4.6, -Math.PI * 0.3, Math.PI * 1.3);
  stroke(ctx, palette.accent, 2.2);
  ctx.beginPath();
  ctx.moveTo(14, -22);
  ctx.lineTo(14, -16);
  stroke(ctx, palette.accent, 2.2);
  freckles(ctx, palette.led, [
    [34, 2, 4],
    [40, 10, 3],
  ]);
  ellipse(ctx, -14, -18, 12, 5, 'rgba(255, 255, 255, 0.45)', -0.4);
}

function paintSpringHead(ctx: Ctx, mood: SkipperMood, palette: SkipperPalette): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  antenna(ctx, -2, -20, 0, -48, 20, -54, palette.outline, '#39ff88');
  antenna(ctx, 8, -20, 22, -44, 40, -44, palette.outline, '#39ff88');
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 23, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -4, -4, 28, palette.skin);
  ctx.fill();
  stroke(ctx, palette.outline, 3.2);
  skipperFace(
    ctx,
    mood,
    palette,
    [
      { x: -10, y: -6, rx: 10, ry: 12 },
      { x: 8, y: -8, rx: 8, ry: 10 },
    ],
    -12,
    14,
  );
  ellipse(ctx, -8, -17, 8, 3.4, 'rgba(255, 255, 255, 0.45)', -0.3);
}

/** Muslo de saltar, del eje (la cadera) a la rodilla, horizontal: el gordo con rayas en espiga. */
function paintThigh(ctx: Ctx, design: SkipperDesign, palette: SkipperPalette): void {
  const { pivotX, pivotY, tipX } = BUG_SIZE.thigh;
  ctx.lineJoin = 'round';
  const thick = design === 'flea' ? 13 : design === 'spring' ? 10 : 12;
  ctx.beginPath();
  ctx.moveTo(pivotX - 6, pivotY);
  ctx.quadraticCurveTo(pivotX + 10, pivotY - thick - 4, pivotX + 30, pivotY - thick);
  ctx.quadraticCurveTo(tipX - 4, pivotY - 6, tipX + 6, pivotY);
  ctx.quadraticCurveTo(tipX - 4, pivotY + 6, pivotX + 30, pivotY + thick * 0.8);
  ctx.quadraticCurveTo(pivotX + 6, pivotY + thick, pivotX - 6, pivotY);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, pivotY - thick, 0, pivotY + thick);
  g.addColorStop(0, palette.skin[0]);
  g.addColorStop(0.45, palette.limb[0]);
  g.addColorStop(1, palette.limb[1]);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, palette.outline, 3);
  if (design === 'grasshopper') {
    // Rayas en espiga.
    for (let i = 0; i < 5; i++) {
      const x = pivotX + 10 + i * 9;
      ctx.beginPath();
      ctx.moveTo(x, pivotY - thick * 0.6 + i * 0.8);
      ctx.lineTo(x + 5, pivotY);
      ctx.lineTo(x, pivotY + thick * 0.5 - i * 0.6);
      stroke(ctx, palette.accent, 1.6);
    }
  }
  circle(ctx, tipX + 2, pivotY, 5, palette.limb[1]);
  ctx.beginPath();
  ctx.arc(tipX + 2, pivotY, 5, 0, Math.PI * 2);
  stroke(ctx, palette.outline, 2);
  ellipse(ctx, pivotX + 22, pivotY - thick * 0.45, 10, 3, 'rgba(255, 255, 255, 0.4)', -0.1);
}

/** Pierna de saltar, de la rodilla al pie, horizontal. El grillo de muelles lleva un muelle con un taco de goma. */
function paintShin(ctx: Ctx, design: SkipperDesign, palette: SkipperPalette): void {
  const { pivotX, pivotY, tipX } = BUG_SIZE.shin;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (design === 'spring') {
    // Muelle plateado: una espiral vista de lado.
    const coils = 6;
    const x0 = pivotX + 2;
    const x1 = tipX - 8;
    ctx.beginPath();
    for (let i = 0; i <= coils * 12; i++) {
      const t = i / (coils * 12);
      const x = x0 + (x1 - x0) * t;
      const y = pivotY + Math.sin(t * coils * Math.PI * 2) * 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    stroke(ctx, '#2a2f3a', 5.4);
    ctx.beginPath();
    for (let i = 0; i <= coils * 12; i++) {
      const t = i / (coils * 12);
      const x = x0 + (x1 - x0) * t;
      const y = pivotY + Math.sin(t * coils * Math.PI * 2) * 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    stroke(ctx, '#e4ebf5', 2.6);
    // Taco de goma.
    roundRect(ctx, tipX - 10, pivotY - 9, 14, 18, 6);
    ctx.fillStyle = '#ff5a8a';
    ctx.fill();
    stroke(ctx, palette.outline, 2.4);
    return;
  }
  jointedLeg(
    ctx,
    [
      { x: pivotX, y: pivotY },
      { x: tipX, y: pivotY },
    ],
    design === 'flea' ? 7 : 5.5,
    palette.limb[1],
    palette.outline,
  );
  // Pinchitos.
  for (let i = 0; i < 4; i++) {
    const x = pivotX + 16 + i * 13;
    ctx.beginPath();
    ctx.moveTo(x, pivotY - 3);
    ctx.lineTo(x + 4, pivotY - 8);
    stroke(ctx, palette.outline, 1.8);
  }
  // Pie.
  ctx.beginPath();
  ctx.ellipse(tipX + 2, pivotY + 2, 7, 4, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = palette.limb[1];
  ctx.fill();
  stroke(ctx, palette.outline, 2);
}

/** Pata pequena de delante del Skipper, colgando de su cadera. */
function paintSkipperLeg(ctx: Ctx, design: SkipperDesign, palette: SkipperPalette): void {
  const { hipX, hipY } = BUG_SIZE.leg;
  const drop = SKIPPER_RIGS[design].legs[2].y * -1;
  const knee = { x: hipX - 8, y: hipY + drop * 0.45 };
  const foot = { x: hipX - 2, y: hipY + drop };
  jointedLeg(ctx, [{ x: hipX, y: hipY }, knee, foot], 4.4, palette.limb[1], palette.outline);
  ellipse(ctx, foot.x - 3, foot.y + 1, 4.6, 2.4, palette.outline);
}

const SKIPPER_PAINTERS: Record<SkipperDesign, { body: (ctx: Ctx, p: SkipperPalette) => void; head: (ctx: Ctx, mood: SkipperMood, p: SkipperPalette) => void }> = {
  grasshopper: { body: paintGrasshopperBody, head: paintGrasshopperHead },
  flea: { body: paintFleaBody, head: paintFleaHead },
  spring: { body: paintSpringBody, head: paintSpringHead },
};

export function paintSkipperBody(ctx: Ctx, design: SkipperDesign): void {
  ctx.translate(BUG_SIZE.body.cx, BUG_SIZE.body.cy);
  SKIPPER_PAINTERS[design].body(ctx, SKIPPER_PALETTES[design]);
}

export function paintSkipperHead(ctx: Ctx, design: SkipperDesign, mood: SkipperMood): void {
  ctx.translate(BUG_SIZE.head.cx, BUG_SIZE.head.cy);
  SKIPPER_PAINTERS[design].head(ctx, mood, SKIPPER_PALETTES[design]);
}

export function paintSkipperThigh(ctx: Ctx, design: SkipperDesign): void {
  paintThigh(ctx, design, SKIPPER_PALETTES[design]);
}

export function paintSkipperShin(ctx: Ctx, design: SkipperDesign): void {
  paintShin(ctx, design, SKIPPER_PALETTES[design]);
}

export function paintSkipperFrontLeg(ctx: Ctx, design: SkipperDesign): void {
  paintSkipperLeg(ctx, design, SKIPPER_PALETTES[design]);
}

// ---------------------------------------------------------------------------
// Pata de saltar: muslo y pierna con cinematica inversa

/** Largo de muslo y pierna, en pixeles de diseno (de eje a punta en sus lienzos). */
export const HOP_LEG = {
  thigh: BUG_SIZE.thigh.tipX - BUG_SIZE.thigh.pivotX,
  shin: BUG_SIZE.shin.tipX - BUG_SIZE.shin.pivotX,
} as const;

/**
 * Angulos (en radianes, 0 hacia la derecha) del muslo y de la pierna para que la pata vaya de la cadera `hip` al pie
 * `foot` con la rodilla arriba, detras, como la de un saltamontes. Si el pie queda mas lejos de lo que llega la pata, se
 * estira hacia el.
 */
export function hopLegAngles(hip: Point, foot: Point): { thigh: number; shin: number; knee: Point } {
  const a = HOP_LEG.thigh;
  const b = HOP_LEG.shin;
  const toFoot = Math.atan2(foot.y - hip.y, foot.x - hip.x);
  // Hasta donde llega: ni mas que la pata estirada ni menos que doblada del todo.
  const d = Math.min(a + b - 0.01, Math.max(Math.abs(a - b) + 0.01, Math.hypot(foot.x - hip.x, foot.y - hip.y)));
  const reached = { x: hip.x + Math.cos(toFoot) * d, y: hip.y + Math.sin(toFoot) * d };
  // Ley de los cosenos: el angulo en la cadera entre la linea al pie y el muslo. La rodilla va hacia arriba (y negativas).
  const atHip = Math.acos((a * a + d * d - b * b) / (2 * a * d));
  const thigh = toFoot - atHip;
  const knee = { x: hip.x + Math.cos(thigh) * a, y: hip.y + Math.sin(thigh) * a };
  const shin = Math.atan2(reached.y - knee.y, reached.x - knee.x);
  return { thigh, shin, knee };
}
