import { type Ctx, circle, ellipse } from './canvasKit';

/**
 * Arte de Morris, el Imparable (T-042), jefe del brote 4, sin Phaser: lo registra `textures.ts` y lo colocan `morrisView.ts`
 * (en el tablero y cuando se prepara) y la foto de la ficha (`portrait.ts`). El Morris real fue el primer gran gusano de
 * internet: un estudiante solo queria contar las maquinas de la red, pero un fallo lo hacia copiarse una y otra vez. En el
 * juego no para de soltar gusanos y pide perdon todo el rato, asi que es un gusano enorme con cara de apuro, nada
 * amenazante. Para no confundirse con Creeper (otro gusano, con un monitor por cabeza) no lleva pantalla: su cuerpo dice de
 * donde salen sus gusanos. Tres propuestas (MR-08), que se comparan en `/proposals/jefes.html`:
 * - **Enjambre** (`swarm`, la recomendada): un gusano enorme hecho de gusanos pequenos apretados y enredados, que asoman la
 *   cara; de la coronilla le salen tres como pelos. Al soltar uno, se le desprende de verdad.
 * - **Copias** (`copies`): su cuerpo es una fila de copias de su cabeza, cada vez mas pequenas y todas pidiendo perdon, con
 *   un contorno corrido detras, como una copia mal alineada.
 * - **Cable** (`cable`): un gusano de cable de red amarillo (el grueso de 1988) con tomas negras de las que asoman gusanitos,
 *   y una clavija en la coronilla.
 * Mismo estilo que el resto (guia de graficos, seccion 10): degradado con la luz arriba a la izquierda, contorno oscuro del
 * mismo tono, un reflejo suave y cara tierna (ojos con brillo, mejillas). Mira a la izquierda, como todos los enemigos.
 */

export type MorrisDesign = 'swarm' | 'copies' | 'cable';

/**
 * Lo que pone la cara: tranquilo (con apuro), mordiendo (sin pararse, MR-06), dolorido, "¡uy!" (se le escapa un gusano o se
 * llena la sobrecarga) y "perdon" (habla o celebra con los ojos apretados de verguenza).
 */
export type MorrisMood = 'idle' | 'bite' | 'hurt' | 'oops' | 'sorry';

export const MORRIS_MOODS: readonly MorrisMood[] = ['idle', 'bite', 'hurt', 'oops', 'sorry'];

export interface MorrisProposal {
  readonly id: MorrisDesign;
  readonly letter: string;
  readonly name: string;
  /** Nombre corto, para el rotulo del tablero de la galeria. */
  readonly short: string;
  readonly about: string;
}

/** Las propuestas de la galeria (MR-08). Sus textos no los ve el jugador: van en espanol sin `src/i18n/`. */
export const MORRIS_DESIGNS: readonly MorrisProposal[] = [
  {
    id: 'swarm',
    letter: 'A',
    name: 'Enjambre de gusanos',
    short: 'Enjambre',
    about:
      'Un gusano enorme hecho de gusanos pequeños apretados y enredados, que asoman la cara; de la coronilla le salen tres como pelos, y un parche en la frente. Cada vez que suelta un gusano, se le desprende uno del cuerpo y se mete en la tierra.',
  },
  {
    id: 'copies',
    letter: 'B',
    name: 'Fila de copias',
    short: 'Copias',
    about: 'Su cuerpo es una fila de copias de su propia cabeza, cada vez más pequeñas y todas pidiendo perdón, con un contorno corrido detrás, como una copia mal alineada. Al soltar un gusano, la última copia salta.',
  },
  {
    id: 'cable',
    letter: 'C',
    name: 'Cable de red',
    short: 'Cable',
    about: 'Un gusano de cable de red amarillo, el grueso de 1988, en anillos con tomas negras de las que asoman gusanitos, y una clavija en la coronilla con sus lucecitas.',
  },
];

/** La que usa el juego: la recomendada (MR-08) mientras Carmine no elija otra en `/proposals/jefes.html`. */
export const MORRIS_DESIGN: MorrisDesign = 'swarm';

// ---------------------------------------------------------------------------
// Medidas y montaje

/**
 * Lienzos de las piezas, en pixeles de diseno (160 por casilla, como el gusano). La cabeza se coloca por el centro de su
 * circulo (`cx`, `cy`); los anillos, por su centro. El gusanito (`wormlet`) es el que se le suelta, y el que sale al
 * deshacerse; la libreta (`tally`), la de cuando se prepara.
 */
export const MORRIS_SIZE = {
  head: { width: 230, height: 230, cx: 115, cy: 134, r: 74 },
  segment: { size: 156, r: 62 },
  wormlet: { width: 84, height: 60, cx: 42, cy: 34 },
} as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Un anillo del cuerpo, de la cola a la cabeza: donde va (pies en 0, 0), su tamano y cual de sus dos dibujos lleva. */
export interface MorrisSegment extends Point {
  readonly scale: number;
  readonly variant: 0 | 1;
}

/** Montaje de una propuesta (pies en 0, 0, mirando a la izquierda). */
export interface MorrisRig {
  readonly segments: readonly MorrisSegment[];
  /** Centro del circulo de la cabeza. */
  readonly head: Point;
  /** Cuanto sube cada anillo con la joroba al andar. */
  readonly hump: number;
  /** Boca respecto a los pies: de ahi sale el mordisco. */
  readonly mouth: Point;
  /** Pico del bocadillo respecto a los pies: encima de la cabeza. */
  readonly bubble: Point;
  /** Donde le salen los gusanos que suelta (respecto al anillo de donde salen). */
  readonly shedFrom: Point;
  /** Caja holgada para el doble clic de la ficha (T-010), respecto a los pies. */
  readonly hitBox: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
}

const LOW_BODY: readonly MorrisSegment[] = [
  { x: 156, y: -38, scale: 0.56, variant: 1 },
  { x: 112, y: -50, scale: 0.72, variant: 0 },
  { x: 62, y: -62, scale: 0.86, variant: 1 },
  { x: 8, y: -72, scale: 1, variant: 0 },
];

export const MORRIS_RIGS: Record<MorrisDesign, MorrisRig> = {
  swarm: {
    segments: LOW_BODY,
    head: { x: -60, y: -118 },
    hump: 8,
    mouth: { x: -96, y: -84 },
    bubble: { x: -40, y: -250 },
    shedFrom: { x: 0, y: -48 },
    hitBox: { left: -150, right: 200, top: -230, bottom: 14 },
  },
  copies: {
    segments: [
      { x: 160, y: -44, scale: 0.5, variant: 1 },
      { x: 118, y: -56, scale: 0.64, variant: 0 },
      { x: 68, y: -68, scale: 0.78, variant: 1 },
      { x: 12, y: -78, scale: 0.92, variant: 0 },
    ],
    head: { x: -60, y: -124 },
    hump: 9,
    mouth: { x: -96, y: -90 },
    bubble: { x: -40, y: -236 },
    shedFrom: { x: 0, y: -10 },
    hitBox: { left: -150, right: 200, top: -220, bottom: 14 },
  },
  cable: {
    segments: LOW_BODY,
    head: { x: -60, y: -118 },
    hump: 7,
    mouth: { x: -96, y: -84 },
    bubble: { x: -40, y: -246 },
    shedFrom: { x: 0, y: -40 },
    hitBox: { left: -150, right: 200, top: -230, bottom: 14 },
  },
};

// ---------------------------------------------------------------------------
// Colores

/** Ciruela: el morado de los gusanos, mas hondo, como las tropas de Morris (Sombra, T-041). Mejillas y luces calidas. */
export const MORRIS_SKIN = {
  head: ['#f2e4ff', '#9c76d2', '#52347e'] as const,
  outline: '#2b1746',
  blush: 'rgba(255, 128, 150, 0.55)',
  freckle: 'rgba(57, 255, 136, 0.9)',
} as const;

/** Los gusanos pequenos del enjambre y los que suelta: algo mas oscuros que su cabeza. */
export const WORMLET = {
  body: ['#f3e8ff', '#a687d8', '#5c3f8c'] as const,
  outline: '#2b1746',
  highlight: 'rgba(255, 255, 255, 0.45)',
} as const;

/** Cable de red amarillo (el grueso de 1988), sus tomas negras y sus luces. */
const CABLE = {
  rubber: ['#fff6c4', '#ffcf2e', '#b98407'] as const,
  outline: '#5a3b00',
  tap: ['#6a6f80', '#30333f', '#14151c'] as const,
  tapOutline: '#0b0c10',
  lights: ['#39ff88', '#ffb347'] as const,
  pins: '#f3c64a',
} as const;

/** Parche de la frente (el Morris real se arreglo con parches) y el sudor. */
const PATCH = { fill: '#ffe9c7', edge: '#c9925c', dots: '#d9a774' } as const;
const SWEAT = { fill: '#c8ecff', edge: '#3f8fc8' } as const;

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

function stroke(ctx: Ctx, color: string | CanvasGradient, width: number): void {
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
function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.5): void {
  ellipse(ctx, x, y, rx, ry, `rgba(255, 255, 255, ${alpha})`, -0.5);
}

/** Gota de sudor: la del apuro de Morris. */
function sweat(ctx: Ctx, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.85, y + size * 0.3, x, y + size * 0.75);
  ctx.quadraticCurveTo(x - size * 0.85, y + size * 0.3, x, y - size);
  ctx.fillStyle = SWEAT.fill;
  ctx.fill();
  stroke(ctx, SWEAT.edge, 1.6);
  ellipse(ctx, x - size * 0.2, y + size * 0.1, size * 0.16, size * 0.26, 'rgba(255, 255, 255, 0.85)');
}

/**
 * Un gusanito como un tubo con contorno que sigue el arco de `cx`, `cy` y radio `rad` de `a0` a `a1`, con su cabecita al
 * final (en `a1`) mirando hacia fuera. `face`: si se le ven los ojos. Es la pieza del enjambre, de sus "pelos" y de los que
 * se le sueltan.
 */
function curlWorm(ctx: Ctx, cx: number, cy: number, rad: number, a0: number, a1: number, width: number, face = true): void {
  const ccw = a1 < a0;
  const arc = () => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, a0, a1, ccw);
  };
  arc();
  stroke(ctx, WORMLET.outline, width + 6);
  arc();
  stroke(ctx, WORMLET.body[1], width);
  // Banda de luz por el lado de arriba del tubo.
  ctx.save();
  ctx.translate(-width * 0.12, -width * 0.18);
  arc();
  stroke(ctx, WORMLET.highlight, width * 0.32);
  ctx.restore();
  // Anillos del gusanito: rayitas oscuras a lo largo del tubo.
  const steps = Math.max(2, Math.round((Math.abs(a1 - a0) * rad) / (width * 1.1)));
  for (let i = 1; i < steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx + nx * (rad - width * 0.38), cy + ny * (rad - width * 0.38));
    ctx.lineTo(cx + nx * (rad + width * 0.38), cy + ny * (rad + width * 0.38));
    stroke(ctx, 'rgba(35, 19, 59, 0.35)', 1.6);
  }
  // Cabecita al final del arco.
  const hx = cx + Math.cos(a1) * rad;
  const hy = cy + Math.sin(a1) * rad;
  const hr = width * 0.62;
  circle(ctx, hx, hy, hr + 3, WORMLET.outline);
  circle(ctx, hx, hy, hr, radial(ctx, hx, hy, hr, WORMLET.body));
  if (!face) return;
  // Mira hacia donde iba el arco: dos ojitos y una boca de apuro.
  const t = ccw ? -1 : 1;
  const dx = -Math.sin(a1) * t;
  const dy = Math.cos(a1) * t;
  const ex = hx + dx * hr * 0.25;
  const ey = hy + dy * hr * 0.25 - hr * 0.15;
  const side = { x: -dy, y: dx };
  for (const s of [-1, 1]) {
    const x = ex + side.x * s * hr * 0.36;
    const y = ey + side.y * s * hr * 0.36;
    circle(ctx, x, y, hr * 0.3, '#ffffff');
    circle(ctx, x + dx * hr * 0.08, y + dy * hr * 0.08, hr * 0.16, INK);
  }
}

// ---------------------------------------------------------------------------
// Cara (comun a las tres)

/** Ceja de apuro: la punta de dentro (hacia la otra) mas alta, como quien pide perdon. `inner`: hacia donde queda la otra. */
function sorryBrow(ctx: Ctx, x: number, y: number, rx: number, inner: 1 | -1, width: number): void {
  ctx.beginPath();
  ctx.moveTo(x - inner * rx * 0.95, y + 2);
  ctx.quadraticCurveTo(x, y - 3, x + inner * rx * 0.85, y - rx * 0.55);
  stroke(ctx, MORRIS_SKIN.outline, width);
}

/** Ojo: blanco con contorno, la pupila mirando a la izquierda y un brillo; cerrado de verguenza o apretado de dolor. */
function eye(ctx: Ctx, x: number, y: number, rx: number, ry: number, mood: MorrisMood, front: boolean, k: number): void {
  if (mood === 'hurt') {
    const dir = front ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x - dir * rx * 0.6, y - ry * 0.55);
    ctx.lineTo(x + dir * rx * 0.45, y);
    ctx.lineTo(x - dir * rx * 0.6, y + ry * 0.55);
    stroke(ctx, INK, 3.6 * k);
    return;
  }
  if (mood === 'sorry') {
    // Ojos apretados de verguenza: dos arcos hacia abajo.
    ctx.beginPath();
    ctx.arc(x, y - ry * 0.15, rx * 0.7, Math.PI * 0.15, Math.PI * 0.85);
    stroke(ctx, INK, 3.6 * k);
    return;
  }
  const wide = mood === 'oops' ? 1.14 : 1;
  ellipse(ctx, x, y, rx * wide, ry * wide, '#ffffff');
  ctx.beginPath();
  ctx.ellipse(x, y, rx * wide, ry * wide, 0, 0, Math.PI * 2);
  stroke(ctx, MORRIS_SKIN.outline, 2.6 * k);
  const pupil = Math.min(rx, ry) * (mood === 'oops' ? 0.34 : mood === 'bite' ? 0.5 : 0.56);
  const px = x - rx * (mood === 'oops' ? 0.1 : 0.34);
  const py = y + (mood === 'bite' ? ry * 0.12 : 1);
  circle(ctx, px, py, pupil, INK);
  circle(ctx, px - pupil * 0.35, py - pupil * 0.5, pupil * 0.42, '#ffffff');
  if (mood === 'bite') {
    // Mordiendo, los parpados de arriba bajan un poco: lo siente, pero tiene que comer.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = MORRIS_SKIN.head[1];
    ctx.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, ry * 0.6);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - rx, y - ry * 0.42);
    ctx.lineTo(x + rx, y - ry * 0.42);
    stroke(ctx, MORRIS_SKIN.outline, 2.6 * k);
  }
}

/** Boca: sonrisa temblona, abierta mordiendo, mueca de dolor, "o" de sorpresa o dientes apretados de "¡perdon!". */
function mouth(ctx: Ctx, mood: MorrisMood, x: number, y: number, k: number): void {
  switch (mood) {
    case 'bite': {
      ctx.beginPath();
      ctx.ellipse(x, y + 2 * k, 19 * k, 15 * k, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3a0f2e';
      ctx.fill();
      stroke(ctx, MORRIS_SKIN.outline, 3 * k);
      ellipse(ctx, x + 2 * k, y + 9 * k, 9 * k, 5 * k, '#ff7fa8');
      // Dos dientecitos arriba: muerde sin querer hacer dano.
      for (const dx of [-7, 4]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * k, y - 12 * k);
        ctx.lineTo(x + (dx + 6) * k, y - 12 * k);
        ctx.lineTo(x + (dx + 3) * k, y - 4 * k);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      return;
    }
    case 'hurt': {
      ctx.beginPath();
      ctx.moveTo(x - 14 * k, y + 4 * k);
      for (let i = 0; i <= 4; i++) ctx.lineTo(x - 14 * k + i * 7 * k, y + (i % 2 === 0 ? 4 : -2) * k);
      stroke(ctx, INK, 3.2 * k);
      return;
    }
    case 'oops': {
      ellipse(ctx, x, y + 2 * k, 8 * k, 10 * k, '#3a0f2e');
      ctx.beginPath();
      ctx.ellipse(x, y + 2 * k, 8 * k, 10 * k, 0, 0, Math.PI * 2);
      stroke(ctx, MORRIS_SKIN.outline, 2.6 * k);
      return;
    }
    case 'sorry': {
      // Dientes apretados en una sonrisa de apuro.
      roundRect(ctx, x - 15 * k, y - 5 * k, 30 * k, 13 * k, 6 * k);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      stroke(ctx, MORRIS_SKIN.outline, 2.8 * k);
      ctx.beginPath();
      ctx.moveTo(x - 13 * k, y + 1.5 * k);
      ctx.lineTo(x + 13 * k, y + 1.5 * k);
      for (const dx of [-6, 0, 6]) {
        ctx.moveTo(x + dx * k, y - 4 * k);
        ctx.lineTo(x + dx * k, y + 7 * k);
      }
      stroke(ctx, 'rgba(43, 23, 70, 0.55)', 1.6 * k);
      return;
    }
    default: {
      // Sonrisa temblona: "lo siento, de verdad".
      ctx.beginPath();
      ctx.moveTo(x - 15 * k, y);
      ctx.bezierCurveTo(x - 9 * k, y + 8 * k, x - 4 * k, y - 3 * k, x + 1 * k, y + 4 * k);
      ctx.bezierCurveTo(x + 6 * k, y + 10 * k, x + 11 * k, y + 2 * k, x + 14 * k, y - 2 * k);
      stroke(ctx, INK, 3.4 * k);
    }
  }
}

/**
 * La cara de Morris sobre un circulo de centro `cx`, `cy` y radio `r` (la cabeza o una copia suya): ojos grandes, cejas de
 * apuro, mejillas, boca segun `mood` y sudor. Todo escala con `r` (el de la cabeza es 74).
 */
function paintFace(ctx: Ctx, cx: number, cy: number, r: number, mood: MorrisMood): void {
  const k = r / MORRIS_SIZE.head.r;
  const front = { x: cx - 30 * k, y: cy - 8 * k, rx: 19 * k, ry: 23 * k };
  const back = { x: cx + 12 * k, y: cy - 13 * k, rx: 15 * k, ry: 19 * k };
  if (mood !== 'hurt') {
    ellipse(ctx, front.x - 4 * k, front.y + front.ry + 12 * k, 12 * k, 7 * k, MORRIS_SKIN.blush);
    ellipse(ctx, back.x + 10 * k, back.y + back.ry + 12 * k, 9 * k, 6 * k, MORRIS_SKIN.blush);
  }
  eye(ctx, back.x, back.y, back.rx, back.ry, mood, false, k);
  eye(ctx, front.x, front.y, front.rx, front.ry, mood, true, k);
  // Cejas de apuro, mas altas aun con el susto.
  const lift = mood === 'oops' ? 8 * k : mood === 'sorry' ? 4 * k : 0;
  sorryBrow(ctx, front.x, front.y - front.ry - 6 * k - lift, front.rx, 1, 4 * k);
  sorryBrow(ctx, back.x, back.y - back.ry - 6 * k - lift, back.rx, -1, 3.6 * k);
  mouth(ctx, mood, cx - 34 * k, cy + 34 * k, k);
  // Sudor: una gota siempre (va con prisa y lo sabe), y mas con el susto o el dolor.
  sweat(ctx, cx + 44 * k, cy - 36 * k, 9 * k);
  if (mood === 'oops' || mood === 'hurt') sweat(ctx, cx + 56 * k, cy - 6 * k, 7 * k);
  if (mood === 'hurt') {
    // Una lagrimita.
    ellipse(ctx, front.x - 2 * k, front.y + front.ry + 4 * k, 4 * k, 6 * k, SWEAT.fill);
  }
}

/** Circulo de la cabeza (o de una copia): degradado ciruela con contorno, reflejo y pecas de pixel verde en la nuca. */
function paintHeadBall(ctx: Ctx, cx: number, cy: number, r: number, colors: readonly [string, string, string], outline: string): void {
  circle(ctx, cx, cy, r, radial(ctx, cx, cy, r, colors));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  stroke(ctx, outline, 4.2 * (r / MORRIS_SIZE.head.r) + 0.6);
  shine(ctx, cx - r * 0.38, cy - r * 0.5, r * 0.3, r * 0.15, 0.45);
  const k = r / MORRIS_SIZE.head.r;
  ctx.fillStyle = MORRIS_SKIN.freckle;
  for (const [dx, dy, s] of [
    [40, 4, 7],
    [52, 16, 5],
    [36, 20, 4.5],
    [50, -10, 4],
  ] as const) {
    ctx.fillRect(cx + dx * k, cy + dy * k, s * k, s * k);
  }
}

/** Parche en la frente: una tirita con sus puntitos (el Morris real se paro con parches). */
function patch(ctx: Ctx, x: number, y: number, k: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  roundRect(ctx, -20 * k, -7 * k, 40 * k, 14 * k, 7 * k);
  ctx.fillStyle = PATCH.fill;
  ctx.fill();
  stroke(ctx, PATCH.edge, 2 * k);
  roundRect(ctx, -7 * k, -6 * k, 14 * k, 12 * k, 3 * k);
  ctx.fillStyle = '#fff6e6';
  ctx.fill();
  for (const dx of [-14, -10, 10, 14]) for (const dy of [-2.5, 2.5]) circle(ctx, dx * k, dy * k, 1.2 * k, PATCH.dots);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cabeza

/** Lo de detras de la cabeza: los "pelos" del enjambre o la clavija del cable. */
function paintCrown(ctx: Ctx, design: MorrisDesign, cx: number, cy: number, r: number): void {
  if (design === 'swarm') {
    // Tres gusanitos le salen de la coronilla como pelos, enroscados hacia arriba.
    curlWorm(ctx, cx - 22, cy - r - 2, 24, Math.PI * 0.55, -Math.PI * 0.3, 15);
    curlWorm(ctx, cx + 14, cy - r - 10, 22, Math.PI * 0.45, -Math.PI * 0.5, 14);
    curlWorm(ctx, cx + 44, cy - r + 14, 19, Math.PI * 0.75, -Math.PI * 0.05, 13);
    return;
  }
  if (design === 'cable') {
    // Clavija de red: cuerpo transparente con sus contactos dorados y la pestana, con dos lucecitas.
    ctx.save();
    ctx.translate(cx + 14, cy - r + 4);
    ctx.rotate(0.22);
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-8, -18);
    ctx.lineTo(8, -18);
    ctx.lineTo(8, 10);
    stroke(ctx, CABLE.outline, 13);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -18);
    stroke(ctx, CABLE.rubber[1], 9);
    roundRect(ctx, -18, -52, 36, 36, 6);
    ctx.fillStyle = 'rgba(220, 240, 255, 0.82)';
    ctx.fill();
    stroke(ctx, '#3b4a5a', 3);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = CABLE.pins;
      ctx.fillRect(-14 + i * 5, -50, 3, 12);
    }
    ctx.beginPath();
    ctx.moveTo(-10, -24);
    ctx.lineTo(-4, -34);
    ctx.lineTo(6, -34);
    stroke(ctx, '#3b4a5a', 3);
    circle(ctx, -10, -42 + 10, 3.4, CABLE.lights[0]);
    circle(ctx, 10, -42 + 10, 3.4, CABLE.lights[1]);
    ctx.restore();
  }
}

/** Cabeza de Morris en la propuesta `design` con la cara `mood`, en su lienzo (`MORRIS_SIZE.head`). */
export function paintMorrisHead(ctx: Ctx, design: MorrisDesign, mood: MorrisMood): void {
  const { cx, cy, r } = MORRIS_SIZE.head;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  paintCrown(ctx, design, cx, cy, r);
  if (design === 'copies') {
    // La copia mal alineada: un contorno corrido detras.
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 10, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(156, 118, 210, 0.35)';
    ctx.fill();
    ctx.setLineDash([10, 8]);
    stroke(ctx, 'rgba(43, 23, 70, 0.55)', 3);
    ctx.setLineDash([]);
  }
  const colors = design === 'cable' ? CABLE.rubber : MORRIS_SKIN.head;
  const outline = design === 'cable' ? CABLE.outline : MORRIS_SKIN.outline;
  paintHeadBall(ctx, cx, cy, r, colors, outline);
  if (design === 'swarm') patch(ctx, cx + 26, cy - r + 22, 1);
  if (design === 'cable') {
    // Banda negra de una toma alrededor del cuello.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(20, 21, 28, 0.7)';
    ctx.fillRect(cx + r * 0.55, cy - r, 12, r * 2);
    ctx.restore();
  }
  paintFace(ctx, cx, cy, r, mood);
}

// ---------------------------------------------------------------------------
// Anillos

/** Anillo del enjambre: un ovillo de gusanitos enredados que asoman la cara. Dos dibujos (`variant`) para que no se repita. */
function paintSwarmSegment(ctx: Ctx, variant: 0 | 1): void {
  const c = MORRIS_SIZE.segment.size / 2;
  const r = MORRIS_SIZE.segment.r;
  // Fondo del ovillo: lo oscuro de entre los gusanos.
  circle(ctx, c, c + 2, r * 0.84, radial(ctx, c, c, r, ['#b99de2', '#6f52a2', '#3b2662']));
  const loops =
    variant === 0
      ? [
          [c - 12, c + 10, 34, Math.PI * 0.9, Math.PI * 2.1, true],
          [c + 16, c - 12, 30, Math.PI * 1.2, Math.PI * 2.4, true],
          [c - 4, c - 18, 28, Math.PI * 0.1, Math.PI * 1.1, false],
          [c + 10, c + 18, 30, Math.PI * 1.9, Math.PI * 0.8, true],
          [c - 22, c - 6, 24, Math.PI * 1.6, Math.PI * 2.6, false],
        ]
      : [
          [c + 10, c + 8, 34, Math.PI * 0.2, Math.PI * 1.3, true],
          [c - 16, c - 10, 30, Math.PI * 1.9, Math.PI * 0.8, true],
          [c + 6, c - 20, 26, Math.PI * 0.9, Math.PI * 2.0, false],
          [c - 10, c + 20, 28, Math.PI * 1.3, Math.PI * 2.3, true],
          [c + 24, c - 2, 22, Math.PI * 0.6, Math.PI * 1.7, false],
        ];
  for (const [x, y, rad, a0, a1, face] of loops) curlWorm(ctx, x as number, y as number, rad as number, a0 as number, a1 as number, 19, face as boolean);
  // Pecas de pixel verde: siguen siendo virus.
  ctx.fillStyle = MORRIS_SKIN.freckle;
  ctx.fillRect(c + 30, c + 24, 5, 5);
  ctx.fillRect(c - 36, c - 26, 4, 4);
}

/** Anillo de copias: una copia de su cabeza, mas pequena, con la misma cara de apuro y su contorno corrido. */
function paintCopySegment(ctx: Ctx, variant: 0 | 1): void {
  const c = MORRIS_SIZE.segment.size / 2;
  const r = 56;
  ctx.beginPath();
  ctx.arc(c + 9, c - 8, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(156, 118, 210, 0.35)';
  ctx.fill();
  ctx.setLineDash([8, 7]);
  stroke(ctx, 'rgba(43, 23, 70, 0.5)', 2.6);
  ctx.setLineDash([]);
  paintHeadBall(ctx, c, c, r, MORRIS_SKIN.head, MORRIS_SKIN.outline);
  paintFace(ctx, c, c, r, variant === 0 ? 'idle' : 'sorry');
}

/** Anillo de cable: tres vueltas de cable amarillo con una toma negra en medio, y un gusanito que asoma de ella. */
function paintCableSegment(ctx: Ctx, variant: 0 | 1): void {
  const c = MORRIS_SIZE.segment.size / 2;
  const r = MORRIS_SIZE.segment.r;
  const coil = (y: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(c, y, rx, ry, 0, 0, Math.PI * 2);
    stroke(ctx, CABLE.outline, 26);
    ctx.beginPath();
    ctx.ellipse(c, y, rx, ry, 0, 0, Math.PI * 2);
    stroke(ctx, CABLE.rubber[1], 19);
    ctx.beginPath();
    ctx.ellipse(c - 2, y - 4, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.9);
    stroke(ctx, CABLE.rubber[0], 6);
  };
  circle(ctx, c, c, r * 0.8, radial(ctx, c, c, r, ['#d9a21a', '#8a6005', '#4a3200']));
  coil(c + 24, r * 0.82, r * 0.3);
  coil(c, r * 0.9, r * 0.34);
  coil(c - 24, r * 0.78, r * 0.3);
  // La toma: una abrazadera negra con su luz y un agujerito del que asoma un gusanito.
  const tx = c + (variant === 0 ? -6 : 10);
  roundRect(ctx, tx - 20, c - 22, 40, 44, 9);
  ctx.fillStyle = radial(ctx, tx, c, 30, CABLE.tap);
  ctx.fill();
  stroke(ctx, CABLE.tapOutline, 3);
  circle(ctx, tx + 10, c - 12, 3.6, CABLE.lights[variant]);
  circle(ctx, tx - 4, c + 6, 10, '#05060a');
  circle(ctx, tx - 7, c + 4, 3.2, '#ffffff');
  circle(ctx, tx - 1, c + 4, 3.2, '#ffffff');
  circle(ctx, tx - 7.6, c + 4.6, 1.6, INK);
  circle(ctx, tx - 1.6, c + 4.6, 1.6, INK);
}

const SEGMENT_PAINTERS: Record<MorrisDesign, (ctx: Ctx, variant: 0 | 1) => void> = {
  swarm: paintSwarmSegment,
  copies: paintCopySegment,
  cable: paintCableSegment,
};

/** Anillo de Morris en la propuesta `design`, con su dibujo `variant`, en su lienzo (`MORRIS_SIZE.segment`). */
export function paintMorrisSegment(ctx: Ctx, design: MorrisDesign, variant: 0 | 1): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  SEGMENT_PAINTERS[design](ctx, variant);
}

/**
 * El gusanito que se le suelta (y los que salen al deshacerse): un gusano pequeno enroscado en C, del color de los del
 * enjambre, con cara de susto. En su lienzo (`MORRIS_SIZE.wormlet`), mirando a la izquierda.
 */
export function paintMorrisWormlet(ctx: Ctx): void {
  const { cx, cy } = MORRIS_SIZE.wormlet;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  curlWorm(ctx, cx + 4, cy - 2, 18, -Math.PI * 0.1, Math.PI * 1.15, 15);
}

// ---------------------------------------------------------------------------
// Cuando se prepara (rondas 7 y 8)

/**
 * Libreta de cuando se prepara (T-042): Morris cuenta las maquinas de la red, como el de verdad, en una tablilla con
 * `cols` x `rows` casillas; en cada una que cuenta se le cuela una copia suya (un gusanito), cada vez mas. La vista pinta
 * las contadas encima (`tallyCell`). Sin letras: no hay texto que traducir.
 */
export const MORRIS_TALLY = { width: 140, height: 112, cols: 6, rows: 4, cell: 18, left: 16, top: 30 } as const;

/** La tablilla de madera con su pinza y su hoja cuadriculada, sin ninguna maquina contada. */
export function paintMorrisTally(ctx: Ctx): void {
  const { width, height, cols, rows, cell, left, top } = MORRIS_TALLY;
  roundRect(ctx, 4, 8, width - 8, height - 12, 10);
  ctx.fillStyle = radial(ctx, width / 2, height / 2, width * 0.7, ['#e7b27a', '#b9783f', '#7a4a20']);
  ctx.fill();
  stroke(ctx, '#4a2a10', 3);
  roundRect(ctx, 11, 20, width - 22, height - 30, 4);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  stroke(ctx, '#c9b79a', 1.6);
  // Pinza de metal arriba.
  roundRect(ctx, width / 2 - 22, 3, 44, 16, 5);
  ctx.fillStyle = radial(ctx, width / 2, 10, 24, ['#f3f7fd', '#a8b6cc', '#4d5a74']);
  ctx.fill();
  stroke(ctx, '#1c2232', 2.4);
  // Una maquina por casilla: una caja gris con una lucecita apagada.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = left + c * cell;
      const y = top + r * cell;
      roundRect(ctx, x + 2, y + 3, cell - 4, cell - 6, 3);
      ctx.fillStyle = '#c9cfdb';
      ctx.fill();
      stroke(ctx, '#6a7488', 1.4);
      circle(ctx, x + cell - 6, y + cell - 7, 1.6, '#8a93a6');
    }
  }
}

/** Una maquina contada: se le ha colado una copia de Morris, un gusanito ciruela con su luz verde. Del tamano de una casilla. */
export function paintMorrisTallyMark(ctx: Ctx): void {
  const s = MORRIS_TALLY.cell;
  roundRect(ctx, 2, 3, s - 4, s - 6, 3);
  ctx.fillStyle = '#efe6ff';
  ctx.fill();
  stroke(ctx, MORRIS_SKIN.outline, 1.4);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2 + 1, 4.2, Math.PI * 0.95, Math.PI * 2.15);
  stroke(ctx, WORMLET.outline, 5.4);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2 + 1, 4.2, Math.PI * 0.95, Math.PI * 2.15);
  stroke(ctx, WORMLET.body[1], 3.4);
  circle(ctx, s - 5, s - 6, 1.8, '#39ff88');
}

/** Orden en que se cuentan las maquinas: salteado, para que no se llene de una esquina a otra. Fijo, para que no baile. */
export function tallyOrder(): number[] {
  const { cols, rows } = MORRIS_TALLY;
  const total = cols * rows;
  return Array.from({ length: total }, (_, i) => i).sort((a, b) => ((a * 7) % total) - ((b * 7) % total));
}

/** Esquina de arriba a la izquierda de la casilla `index` en el lienzo de la tablilla. */
export function tallyCell(index: number): Point {
  const { cols, cell, left, top } = MORRIS_TALLY;
  return { x: left + (index % cols) * cell, y: top + Math.floor(index / cols) * cell };
}
