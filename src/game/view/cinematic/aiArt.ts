import { type Ctx, type Pt, glow, mirror, polylinePart, seeded, smoothPath } from './geometry';

/**
 * La IA (T-049, `docs/specs/04-historia.md`): una mujer de figura realista y proporciones humanas, dibujada solo como
 * silueta oscura. Su pelo largo son cables que caen hasta el suelo, se hunden en el y se ramifican como raices; sus ojos
 * son de luz verde azulada, el color de los circuitos del suelo corrupto. Se ve de espaldas (ante la pared de pantallas)
 * y de frente (a contraluz, en su fabrica). Sin Phaser: un pintor de Canvas 2D, como los personajes (ADR-0019).
 *
 * Tres propuestas de la misma idea (MC-05): cambian la postura y cuanto pelo de cable llega al suelo. `AI_DESIGN` elige
 * la del juego; la galeria (`/proposals/cinematica.html`) las ensena todas.
 */

export type AiView = 'back' | 'front';

/** Un mechon: el pelo desde la cabeza hasta el suelo y las raices que echa alli. En unidades de la figura (pies en 0, 0). */
export interface AiStrand {
  readonly hair: readonly Pt[];
  readonly roots: readonly (readonly Pt[])[];
}

/** Lo que cambia como se pinta: el borde de luz de contraluz y los brillos (niveles graficos, ADR-0006). */
export interface AiLook {
  readonly rim: boolean;
  readonly glows: boolean;
}

/**
 * Que parte se pinta: todo, o por capas para meter entre medias la luz de los cables. De frente, el pelo y sus raices van
 * detras del cuerpo (`behind`) y la luz que corre por ellos tiene que quedar debajo del cuerpo (`body`).
 */
export type AiPart = 'all' | 'behind' | 'body';

export interface AiDesign {
  readonly id: string;
  readonly label: string;
  readonly about: string;
  /** Pinta la silueta (o una parte) con los pies en (0, 0) y la cabeza hacia arriba (y negativa). */
  readonly paint: (ctx: Ctx, view: AiView, look: AiLook, part?: AiPart) => void;
  /** Los mechones de pelo-cable, para encenderlos uno a uno (plano 1.2) o hacer correr la luz por ellos (plano 1.3). */
  readonly strands: (view: AiView) => readonly AiStrand[];
}

/** Colores de la IA: la silueta, los cables apagados y la luz de los circuitos (la del suelo corrupto del tablero). */
export const AI_COLORS = {
  body: '#0a0910',
  bodyEdge: '#171521',
  cable: '#1b3134',
  cableShine: '#2f5b55',
  light: '#7dffc0',
  lightCore: '#e6fff4',
  lightDeep: '#39e58c',
  rim: 'rgba(170, 255, 220, 0.62)',
} as const;

/** Alto de la figura, de los pies a la coronilla: ocho cabezas. */
export const AI_HEIGHT = 626;

/** Donde estan sus ojos (vista de frente), en unidades de la figura. */
export const AI_EYES = { y: -578, dx: 12.5, rx: 7.6, ry: 2.9 } as const;

/** Lado derecho del cuerpo sin los brazos, de la nuca al bajo del vestido (lo izquierdo es su reflejo). */
const TORSO: readonly Pt[] = [
  { x: 11, y: -538 },
  { x: 13, y: -517 },
  { x: 34, y: -509 },
  { x: 61, y: -502 },
  { x: 75, y: -491 },
  { x: 77, y: -470 },
  { x: 64, y: -447 },
  { x: 58, y: -431 },
  { x: 54, y: -412 },
  { x: 46, y: -392 },
  { x: 47, y: -372 },
  { x: 59, y: -339 },
  { x: 69, y: -300 },
  { x: 75, y: -250 },
  { x: 81, y: -180 },
  { x: 89, y: -110 },
  { x: 99, y: -50 },
  { x: 113, y: -9 },
  { x: 109, y: 2 },
];

/** La cabeza, lado derecho, de la coronilla a la barbilla. */
const HEAD: readonly Pt[] = [
  { x: 0, y: -626 },
  { x: 21, y: -620 },
  { x: 31, y: -601 },
  { x: 33, y: -577 },
  { x: 29, y: -556 },
  { x: 19, y: -540 },
  { x: 0, y: -533 },
];

/** Un brazo: su linea central (del hombro a la mano) y lo ancho que es en cada punto. */
interface Limb {
  readonly line: readonly Pt[];
  readonly widths: readonly number[];
}

const ARM_DOWN: Limb = {
  line: [
    { x: 77, y: -484 },
    { x: 84, y: -436 },
    { x: 81, y: -390 },
    { x: 79, y: -346 },
    { x: 78, y: -302 },
    { x: 80, y: -276 },
  ],
  widths: [27, 23, 19, 17, 14, 15],
};

/** La mano hacia las pantallas (propuesta "Mano alzada"), vista de espaldas o de frente. */
const ARM_REACH: Limb = {
  line: [
    { x: 75, y: -487 },
    { x: 110, y: -505 },
    { x: 145, y: -522 },
    { x: 176, y: -546 },
    { x: 200, y: -570 },
    { x: 212, y: -588 },
  ],
  widths: [27, 23, 19, 17, 14, 15],
};

/** Traza un brazo con sus anchos: los dos bordes alrededor de su linea central, redondeado en la punta. */
function limbPath(ctx: Ctx, limb: Limb): void {
  const { line, widths } = limb;
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const half = widths[i] / 2;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  });
  const tip = line[line.length - 1];
  const before = line[line.length - 2];
  const len = Math.hypot(tip.x - before.x, tip.y - before.y) || 1;
  const end = { x: tip.x + ((tip.x - before.x) / len) * widths[widths.length - 1] * 0.8, y: tip.y + ((tip.y - before.y) / len) * widths[widths.length - 1] * 0.8 };
  smoothPath(ctx, [...left, end, ...right.reverse()], true, 0.9);
}

const flip = (limb: Limb): Limb => ({ line: limb.line.map((p) => ({ x: -p.x, y: p.y })), widths: limb.widths });

/** Como es cada propuesta: brazos, la masa del pelo (lado derecho, de la coronilla al suelo) y sus cables. */
interface AiShape {
  readonly id: string;
  readonly label: string;
  readonly about: string;
  /** Brazo derecho e izquierdo de la figura tal como se ve (en la vista de espaldas, el derecho es el suyo). */
  readonly arms: readonly [Limb, Limb];
  /** Masa del pelo de espaldas, lado derecho: de la coronilla al suelo. */
  readonly hairBack: readonly Pt[];
  /** Masa del pelo de frente (detras del cuerpo), lado derecho. */
  readonly hairFront: readonly Pt[];
  /** Mechones que llegan al suelo. */
  readonly strands: number;
  /** Hasta donde se abren las raices por el suelo, a cada lado. */
  readonly spread: number;
  /** Ramas de cada raiz. */
  readonly forks: number;
  /** El pelo cae por delante de un hombro (de frente): cuantos mechones. */
  readonly frontLocks: number;
  readonly seed: number;
}

/** La masa de pelo recto por la espalda, que se estrecha en un haz hasta el suelo. */
const STRAIGHT_BACK: readonly Pt[] = [
  { x: 0, y: -629 },
  { x: 25, y: -622 },
  { x: 37, y: -602 },
  { x: 41, y: -572 },
  { x: 43, y: -541 },
  { x: 53, y: -510 },
  { x: 59, y: -470 },
  { x: 56, y: -420 },
  { x: 47, y: -360 },
  { x: 39, y: -290 },
  { x: 33, y: -210 },
  { x: 27, y: -120 },
  { x: 23, y: -40 },
  { x: 21, y: 4 },
];

const STRAIGHT_FRONT: readonly Pt[] = [
  { x: 0, y: -630 },
  { x: 27, y: -624 },
  { x: 40, y: -604 },
  { x: 45, y: -574 },
  { x: 47, y: -544 },
  { x: 57, y: -517 },
  { x: 64, y: -480 },
  { x: 62, y: -420 },
  { x: 58, y: -340 },
  { x: 55, y: -240 },
  { x: 52, y: -130 },
  { x: 49, y: -40 },
  { x: 47, y: 4 },
];

/** El pelo que la envuelve como una capa, por encima de los hombros, mas ancho que el vestido al llegar al suelo. */
const CLOAK: readonly Pt[] = [
  { x: 0, y: -630 },
  { x: 28, y: -624 },
  { x: 42, y: -604 },
  { x: 47, y: -572 },
  { x: 52, y: -540 },
  { x: 74, y: -517 },
  { x: 95, y: -494 },
  { x: 104, y: -450 },
  { x: 107, y: -380 },
  { x: 110, y: -290 },
  { x: 117, y: -190 },
  { x: 128, y: -90 },
  { x: 142, y: -14 },
  { x: 146, y: 4 },
];

const SHAPES: readonly AiShape[] = [
  {
    id: 'ai-still',
    label: 'Erguida',
    about: 'De pie y quieta, con los brazos caídos. El pelo cae recto por la espalda en un haz y se abre en raíces por el suelo, a los dos lados. La recomendada: la quietud es lo que la distingue.',
    arms: [ARM_DOWN, flip(ARM_DOWN)],
    hairBack: STRAIGHT_BACK,
    hairFront: STRAIGHT_FRONT,
    strands: 12,
    spread: 470,
    forks: 2,
    frontLocks: 0,
    seed: 11,
  },
  {
    id: 'ai-reach',
    label: 'Mano alzada',
    about: 'Levanta una mano hacia las pantallas, como si las dirigiera. Menos pelo llega al suelo: un haz más estrecho y raíces más cortas, y de frente un mechón le cae por delante del hombro.',
    arms: [ARM_REACH, flip(ARM_DOWN)],
    hairBack: STRAIGHT_BACK,
    hairFront: STRAIGHT_FRONT,
    strands: 8,
    spread: 330,
    forks: 1,
    frontLocks: 3,
    seed: 23,
  },
  {
    id: 'ai-cloak',
    label: 'Manto de cables',
    about: 'El pelo la envuelve como una capa desde los hombros, más ancho que el vestido. Es la que más cables lleva al suelo: las raíces cubren todo lo que tiene delante.',
    arms: [ARM_DOWN, flip(ARM_DOWN)],
    hairBack: CLOAK,
    hairFront: CLOAK,
    strands: 20,
    spread: 640,
    forks: 3,
    frontLocks: 0,
    seed: 37,
  },
];

/** Lo ancho que es una masa (lado derecho) a una altura: interpolando entre sus puntos. */
function halfWidth(side: readonly Pt[], y: number): number {
  for (let i = 1; i < side.length; i++) {
    const a = side[i - 1];
    const b = side[i];
    if (y >= a.y && y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
  }
  return side[side.length - 1].x;
}

/** Los mechones de una propuesta en una vista: siguen la masa del pelo y, en el suelo, echan raices hacia fuera. */
function makeStrands(shape: AiShape, view: AiView): AiStrand[] {
  const side = view === 'back' ? shape.hairBack : shape.hairFront;
  const random = seeded(shape.seed + (view === 'back' ? 0 : 100));
  const strands: AiStrand[] = [];
  const count = shape.strands;
  for (let i = 0; i < count; i++) {
    // Reparto de un borde a otro de la masa, sin los bordes justos (se verian fuera de la silueta).
    const u = count === 1 ? 0 : -0.86 + (1.72 * i) / (count - 1);
    const wave = (random() - 0.5) * 0.18;
    const hair: Pt[] = [];
    for (let y = -612; y <= 0; y += 34) {
      const w = halfWidth(side, Math.min(-2, y));
      const sway = Math.sin(y / 70 + i) * 2.2;
      hair.push({ x: (u + wave * (y / -612)) * w * 0.92 + sway, y: y + (y < -560 ? Math.abs(u) * 26 : 0) });
    }
    const foot = hair[hair.length - 1];
    hair[hair.length - 1] = { x: foot.x, y: 0 };
    // Raices: hacia fuera por el suelo (que se acerca a quien mira: y positiva), con alguna rama.
    const dir = u === 0 ? (random() < 0.5 ? -1 : 1) : Math.sign(u);
    const reach = shape.spread * (0.45 + 0.55 * Math.abs(u)) * (0.75 + random() * 0.4);
    const forward = 18 + random() * 70;
    const main: Pt[] = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      main.push({ x: foot.x + dir * reach * t, y: forward * Math.sin(t * Math.PI * 0.6) + (random() - 0.5) * 6 });
    }
    const roots: Pt[][] = [main];
    for (let f = 0; f < shape.forks; f++) {
      const from = main[2 + Math.floor(random() * 3)];
      const len = reach * (0.25 + random() * 0.3);
      const angle = (random() < 0.5 ? -1 : 1) * (0.25 + random() * 0.45);
      const branch: Pt[] = [from];
      for (let s = 1; s <= 3; s++) {
        const t = s / 3;
        branch.push({ x: from.x + dir * len * t, y: from.y + Math.tan(angle) * len * t * 0.35 + 10 * t });
      }
      roots.push(branch);
    }
    strands.push({ hair, roots });
  }
  // Mechones que caen por delante del hombro (de frente): sobre el cuerpo, hasta la cintura.
  if (view === 'front') {
    for (let i = 0; i < shape.frontLocks; i++) {
      const x0 = 18 + i * 6;
      strands.push({
        hair: [
          { x: x0 - 4, y: -612 },
          { x: x0 + 12, y: -575 },
          { x: x0 + 22, y: -530 },
          { x: x0 + 18, y: -480 },
          { x: x0 + 10, y: -420 },
          { x: x0 + 4, y: -380 },
        ],
        roots: [],
      });
    }
  }
  return strands;
}

/** Traza el cuerpo entero: torso y vestido, cabeza y brazos (sin rellenar). */
/** Las piezas del cuerpo, cada una su camino: torso y vestido, cabeza y brazos. Se rellenan por separado. */
function bodyParts(shape: AiShape): ((ctx: Ctx) => void)[] {
  return [
    (ctx) => smoothPath(ctx, [...mirror(TORSO), ...TORSO], true, 0.85),
    (ctx) => smoothPath(ctx, [...HEAD, ...mirror(HEAD).slice(1, -1)], true),
    (ctx) => limbPath(ctx, shape.arms[0]),
    (ctx) => limbPath(ctx, shape.arms[1]),
  ];
}

/** Una linea quebrada como cable: grosor uniforme y un brillo fino encima. */
function cable(ctx: Ctx, points: readonly Pt[], width: number): void {
  if (points.length < 2) return;
  ctx.beginPath();
  smoothPath(ctx, points);
  ctx.lineWidth = width;
  ctx.strokeStyle = AI_COLORS.cable;
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, width * 0.28);
  ctx.strokeStyle = AI_COLORS.cableShine;
  ctx.stroke();
}

function paintShape(ctx: Ctx, shape: AiShape, view: AiView, look: AiLook, part: AiPart): void {
  const strands = makeStrands(shape, view);
  const hairSide = view === 'back' ? shape.hairBack : shape.hairFront;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hairMass = () => {
    ctx.beginPath();
    smoothPath(ctx, [...hairSide, ...mirror(hairSide).slice(1, -1)], true, 0.9);
  };

  // Las raices, en el suelo, por debajo de todo.
  if (part !== 'body') for (const strand of strands) for (const root of strand.roots) cable(ctx, root, 4.2);

  if (view === 'front' && part !== 'body') {
    // De frente, el pelo cae por detras: la masa y sus cables asoman por los lados.
    hairMass();
    ctx.fillStyle = AI_COLORS.body;
    ctx.fill();
    for (const strand of strands.slice(0, shape.strands)) cable(ctx, strand.hair, 3.2);
  }
  if (part === 'behind') {
    ctx.restore();
    return;
  }

  // El cuerpo, con el borde de luz de contraluz (el trazo que queda fuera del relleno).
  // Primero el borde de todas las piezas y luego su relleno: solo queda a la vista la mitad de fuera de la silueta.
  const parts = bodyParts(shape);
  if (look.rim) {
    ctx.save();
    if (look.glows) {
      ctx.shadowColor = AI_COLORS.light;
      ctx.shadowBlur = 14;
    }
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = AI_COLORS.rim;
    for (const part of parts) {
      ctx.beginPath();
      part(ctx);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = AI_COLORS.body;
  for (const part of parts) {
    ctx.beginPath();
    part(ctx);
    ctx.fill();
  }

  if (view === 'back') {
    // De espaldas, el pelo le tapa la espalda y baja en un haz hasta el suelo.
    hairMass();
    ctx.fillStyle = AI_COLORS.body;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = AI_COLORS.bodyEdge;
    ctx.stroke();
    for (const strand of strands) cable(ctx, strand.hair, 3.4);
  } else {
    // De frente: la raya del pelo sobre la cabeza y los mechones que caen por delante del hombro.
    for (const side of [-1, 1]) {
      cable(
        ctx,
        [
          { x: 0, y: -628 },
          { x: side * 20, y: -621 },
          { x: side * 31, y: -603 },
          { x: side * 38, y: -575 },
          { x: side * 42, y: -548 },
        ],
        2.6,
      );
    }
    for (const strand of strands.slice(shape.strands)) cable(ctx, strand.hair, 3);
  }
  ctx.restore();
}

/**
 * Los ojos de luz (vista de frente). `open` va de 0 (cerrados: una raya) a 1 (abiertos). Con brillos, un halo alrededor.
 */
export function paintAiEyes(ctx: Ctx, open: number, look: AiLook): void {
  if (open <= 0) return;
  const { y, dx, rx, ry } = AI_EYES;
  for (const side of [-1, 1]) {
    const x = side * dx;
    if (look.glows) glow(ctx, x, y, 26 * open, 'rgba(125, 255, 192, 0.55)');
    ctx.beginPath();
    ctx.ellipse(x, y, rx, Math.max(0.6, ry * open), side * -0.12, 0, Math.PI * 2);
    ctx.fillStyle = AI_COLORS.light;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.45, Math.max(0.4, ry * 0.5 * open), 0, 0, Math.PI * 2);
    ctx.fillStyle = AI_COLORS.lightCore;
    ctx.fill();
  }
}

/**
 * La luz que sube por un mechon (plano 1.2) o corre por el (plano 1.3): `from` y `to` son las fracciones de su largo,
 * contadas desde el suelo (las raices primero). Con brillos, el cable encendido brilla alrededor.
 */
export function paintLitStrand(ctx: Ctx, strand: AiStrand, from: number, to: number, look: AiLook, alpha = 1): void {
  if (to <= from || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (look.glows) {
    ctx.shadowColor = AI_COLORS.light;
    ctx.shadowBlur = 10;
  }
  const up = [...strand.hair].reverse();
  const piece = (points: readonly Pt[], a: number, b: number) => {
    const head = polylinePart(points, b);
    const tail = polylinePart(points, a);
    return head.slice(Math.max(0, tail.length - 1));
  };
  // Las raices se encienden en la primera quinta parte; el pelo, en el resto.
  const rootShare = strand.roots.length > 0 ? 0.2 : 0;
  const rootPart = (f: number) => Math.min(1, f / (rootShare || 1));
  const hairPart = (f: number) => (rootShare === 0 ? f : Math.max(0, (f - rootShare) / (1 - rootShare)));
  for (const root of strand.roots) {
    const reversed = [...root].reverse();
    const lit = piece(reversed, rootPart(from), rootPart(to));
    if (lit.length > 1) stroke(ctx, lit, 2.6);
  }
  const lit = piece(up, hairPart(from), hairPart(to));
  if (lit.length > 1) stroke(ctx, lit, 2.4);
  ctx.restore();
}

function stroke(ctx: Ctx, points: readonly Pt[], width: number): void {
  ctx.beginPath();
  smoothPath(ctx, points);
  ctx.lineWidth = width;
  ctx.strokeStyle = AI_COLORS.light;
  ctx.stroke();
  ctx.lineWidth = width * 0.4;
  ctx.strokeStyle = AI_COLORS.lightCore;
  ctx.stroke();
}

export const AI_DESIGNS: readonly AiDesign[] = SHAPES.map((shape) => {
  const cache = new Map<AiView, readonly AiStrand[]>();
  return {
    id: shape.id,
    label: shape.label,
    about: shape.about,
    paint: (ctx, view, look, part = 'all') => paintShape(ctx, shape, view, look, part),
    strands: (view) => {
      let strands = cache.get(view);
      if (!strands) {
        strands = makeStrands(shape, view);
        cache.set(view, strands);
      }
      return strands;
    },
  };
});

/** La propuesta que usa el juego (MC-05): la recomendada, mientras Carmine no elija otra en la galeria. */
export const AI_DESIGN: AiDesign = AI_DESIGNS[0];

export const aiDesignById = (id: string): AiDesign => AI_DESIGNS.find((design) => design.id === id) ?? AI_DESIGN;
