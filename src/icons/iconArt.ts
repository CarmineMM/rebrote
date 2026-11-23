/**
 * Icono del juego (T-028), dibujado con codigo. Es el dibujo maestro: de aqui salen el favicon de la pestana y los
 * iconos de aplicacion (`npm run icons`, `scripts/icons/build.ts`) y lo ensena la galeria de propuestas
 * (`/propuestas/iconos.html`, `src/dev/iconLab.tsx`). Propuestas: el brote del logo de la portada (solo, en la "O" o en la tierra)
 * y la disparadora del juego (en color o en silueta). Carmine eligio la disparadora en color (W-03, `ICON`): sale de
 * su propio pintor (`SHOOTER.paint`) escrito en SVG con `SvgCanvas`, asi que si la disparadora cambia, el icono la
 * sigue al pasar `npm run icons`.
 *
 * Todo se dibuja en un lienzo de 512 x 512 y sale como SVG. Cada propuesta tiene su motivo y su ficha de fondo.
 * Formas (W-02):
 * - `tab`: la pestana. Sin fondo y simplificado, para que a 16 px se lea.
 * - `tile`: icono de aplicacion de 192 y 512. Ficha de color con las esquinas redondeadas.
 * - `full`: iPhone. Ficha cuadrada a sangre y sin transparencia: iOS redondea las esquinas el solo.
 * - `maskable`: Android. A sangre, con el motivo entero dentro de la zona segura (el circulo central de radio 40 %).
 *
 * Sin Phaser ni React: lo importan la galeria (Vite), el script (Node) y los tests.
 */
import { SHOOTER } from '../game/view/shooterShape';
import { SvgCanvas, type SvgCanvasOptions, type SvgSink } from './svgCanvas';

/** Lado del lienzo, en unidades del SVG. */
export const ICON_SIZE = 512;

/** Zona segura de un icono maskable: Android puede recortar todo lo que quede fuera de este circulo centrado. */
export const MASKABLE_SAFE_RADIUS = 0.4 * ICON_SIZE;

/** Propuestas de la galeria (W-03). */
export type IconId = 'sprout' | 'letter' | 'soil' | 'shooter' | 'silhouette';
export const ICON_IDS: readonly IconId[] = ['sprout', 'letter', 'soil', 'shooter', 'silhouette'];

/** Propuesta que usa el juego (W-03, 21 nov 2026): la que genera `npm run icons`. */
export const ICON: IconId = 'shooter';

export type IconVariant = 'tab' | 'tile' | 'full' | 'maskable';
export const ICON_VARIANTS: readonly IconVariant[] = ['tab', 'tile', 'full', 'maskable'];

/** Color de la barra del navegador en movil: el azul de arriba del cielo de la portada (`textures.ts`). */
export const THEME_COLOR = '#2a80d2';

/** Rectangulo en unidades del lienzo. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Aspecto general del icono. */
const LOOK = {
  /** Margen del brote en la pestana, en fraccion del lado: casi nada, que a 16 px cada pixel cuenta. */
  tabMargin: 0.02,
  /** Margen del brote en la ficha (de aplicacion y de iPhone). */
  tileMargin: 0.16,
  /** Lo que el brote se queda dentro de la zona segura del maskable, en unidades del lienzo. */
  safeInset: 8,
  /** Radio de las esquinas de la ficha de aplicacion, en fraccion del lado. */
  tileRadius: 0.2,
} as const;

/** Colores del brote del logo (`.title-sprout` en `styles.css`) y de las letras del titulo. */
const INK = {
  outline: '#1d4a17',
  stem: '#2f8a28',
  leafLeft: '#9be564',
  leafRight: '#74cc48',
  vein: '#3f8f2c',
  letterShadow: '#143515',
  soil: '#8a5a32',
  soilOutline: '#3d2614',
  soilLight: '#b07d4c',
  soilDark: '#6a4224',
  /** Silueta en la pestana: un verde que se ve sobre pestana clara y oscura. */
  silhouetteTab: '#3f9a35',
} as const;

const n = (value: number) => +value.toFixed(2);

interface Style {
  fill?: string;
  stroke?: string;
  width?: number;
  evenodd?: boolean;
  opacity?: number;
}

interface Transform {
  tx: number;
  ty: number;
  k: number;
}

/**
 * Dibujo en construccion: junta el SVG y va midiendo lo que ocupa (con el grosor del trazo), para colocarlo despues.
 * Los caminos solo usan comandos absolutos con pares de numeros (M, L, C, Q, Z): asi la caja de sus puntos de control
 * contiene la curva y la medida nunca se queda corta.
 */
class Drawing implements SvgSink {
  readonly parts: string[] = [];
  readonly defs: string[] = [];
  box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  private t: Transform = { tx: 0, ty: 0, k: 1 };
  private ids = 0;
  private readonly prefix: string;

  /** `prefix`: con que empiezan los id de sus degradados, distinto para el fondo y el motivo del mismo icono. */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  path(d: string, style: Style, measured = true): this {
    if (measured) {
      const numbers = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      const pad = style.stroke ? (style.width ?? 1) / 2 : 0;
      for (let i = 0; i + 1 < numbers.length; i += 2) this.extend(numbers[i], numbers[i + 1], pad);
    }
    this.parts.push(`<path d="${d}"${attrs(style)}/>`);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, style: Style, measured = true): this {
    return this.path(ellipsePath(cx, cy, rx, ry), style, measured);
  }

  /** Lo de `draw` sale movido y escalado. */
  group(tx: number, ty: number, k: number, draw: () => void): this {
    const outer = this.t;
    this.t = { tx: outer.tx + outer.k * tx, ty: outer.ty + outer.k * ty, k: outer.k * k };
    this.parts.push(`<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(k)})">`);
    draw();
    this.parts.push('</g>');
    this.t = outer;
    return this;
  }

  /** Degradado en las unidades de la caja de la forma (0 a 1). Devuelve el `fill` que lo usa. */
  linear(from: [number, number], to: [number, number], stops: ReadonlyArray<readonly [number, string]>): string {
    const id = this.id();
    this.defs.push(
      `<linearGradient id="${id}" x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}">${stopsOf(stops)}</linearGradient>`,
    );
    return `url(#${id})`;
  }

  part(svg: string): void {
    this.parts.push(svg);
  }

  def(svg: string): void {
    this.defs.push(svg);
  }

  id(): string {
    return `${this.prefix}${++this.ids}`;
  }

  extend(x: number, y: number, pad: number): void {
    const { tx, ty, k } = this.t;
    const px = tx + k * x;
    const py = ty + k * y;
    const p = k * pad;
    this.box = {
      x0: Math.min(this.box.x0, px - p),
      y0: Math.min(this.box.y0, py - p),
      x1: Math.max(this.box.x1, px + p),
      y1: Math.max(this.box.y1, py + p),
    };
  }
}

function attrs(style: Style): string {
  let out = ` fill="${style.fill ?? 'none'}"`;
  if (style.stroke) {
    out += ` stroke="${style.stroke}" stroke-width="${n(style.width ?? 1)}" stroke-linejoin="round" stroke-linecap="round"`;
  }
  if (style.evenodd) out += ' fill-rule="evenodd"';
  if (style.opacity !== undefined) out += ` opacity="${style.opacity}"`;
  return out;
}

function stopsOf(stops: ReadonlyArray<readonly [number, string]>): string {
  return stops.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('');
}

/** Elipse con cuatro curvas (sin arcos, para poder medirla como los demas caminos). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5523;
  const kx = k * rx;
  const ky = k * ry;
  return [
    `M${n(cx + rx)} ${n(cy)}`,
    `C${n(cx + rx)} ${n(cy + ky)} ${n(cx + kx)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}`,
    `C${n(cx - kx)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + ky)} ${n(cx - rx)} ${n(cy)}`,
    `C${n(cx - rx)} ${n(cy - ky)} ${n(cx - kx)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}`,
    `C${n(cx + kx)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - ky)} ${n(cx + rx)} ${n(cy)} Z`,
  ].join(' ');
}

/** Con degradados, nervios y sombras, o plano y con contornos gruesos (la pestana). */
type Detail = 'full' | 'simple';

// ---------------------------------------------------------------------------
// El brote

/** Caminos del brote del logo (`Sprout` en `TitleScreen.tsx`), en su caja de 48 x 40. */
const SPROUT = {
  stem: 'M24 40 C24 33 23 27 24 19',
  leafLeft: 'M24 23 C14 25 5 19 3 8 C14 6 22 12 24 23 Z',
  leafRight: 'M24 19 C29 9 38 3 46 5 C45 15 35 22 24 19 Z',
  veinLeft: 'M23 21 C17 18 11 14 7 10',
  veinRight: 'M25 18 C30 12 36 8 42 7',
  /** Grosor del tallo y del contorno: el del logo y, en la pestana, mas gordos. */
  stemWidth: { full: 4.5, simple: 6 },
  outline: { full: 2.4, simple: 3.4 },
} as const;

/** El tallo, antes de lo que lo tape en su base (la tierra). */
function drawStem(d: Drawing, detail: Detail): void {
  const width = SPROUT.stemWidth[detail];
  const outline = SPROUT.outline[detail];
  d.path(SPROUT.stem, { stroke: INK.outline, width: width + outline });
  d.path(SPROUT.stem, { stroke: INK.stem, width }, false);
}

/** Las dos hojas, encima del tallo. */
function drawLeaves(d: Drawing, detail: Detail): void {
  const outline = SPROUT.outline[detail];
  const full = detail === 'full';
  const left = full
    ? d.linear([0, 0], [1, 1], [
        [0, '#d4f7a0'],
        [0.45, INK.leafLeft],
        [1, '#62bd3e'],
      ])
    : INK.leafLeft;
  const right = full
    ? d.linear([1, 0], [0, 1], [
        [0, '#b4ec7c'],
        [0.45, INK.leafRight],
        [1, '#4a9f35'],
      ])
    : INK.leafRight;
  d.path(SPROUT.leafLeft, { fill: left, stroke: INK.outline, width: outline });
  d.path(SPROUT.leafRight, { fill: right, stroke: INK.outline, width: outline });
  if (full) {
    d.path(SPROUT.veinLeft, { stroke: INK.vein, width: 1.1, opacity: 0.7 }, false);
    d.path(SPROUT.veinRight, { stroke: INK.vein, width: 1.1, opacity: 0.7 }, false);
  }
}

function drawSprout(d: Drawing, detail: Detail): void {
  drawStem(d, detail);
  drawLeaves(d, detail);
}

// ---------------------------------------------------------------------------
// Propuestas: el motivo (en sus unidades) y la ficha de fondo (en las del lienzo, sabiendo donde quedo el motivo)

interface Proposal {
  /** Nombre y una frase, para la galeria. */
  name: string;
  summary: string;
  motif(d: Drawing, detail: Detail): void;
  background(d: Drawing, motif: Box): void;
}

/** Ficha a todo el lienzo, que luego recorta la forma (`tile`) o el sistema. */
function backdrop(d: Drawing, fill: string): void {
  d.path(`M0 0 L${ICON_SIZE} 0 L${ICON_SIZE} ${ICON_SIZE} L0 ${ICON_SIZE} Z`, { fill });
}

const PROPOSALS: Record<IconId, Proposal> = {
  // A: el brote solo, sobre el verde oscuro del juego.
  sprout: {
    name: 'Brote solo',
    summary: 'Las dos hojas del logo, grandes, sobre el verde oscuro del juego.',
    motif(d, detail) {
      if (detail === 'full') d.ellipse(24, 41.5, 10, 2.4, { fill: '#000000', opacity: 0.3 });
      drawSprout(d, detail);
    },
    background(d) {
      backdrop(
        d,
        // Vertical y no radial: un degradado radial hace pesar el PNG de 512 mas de 50 kB.
        d.linear([0, 0], [0, 1], [
          [0, '#3f7f2f'],
          [0.6, '#21511b'],
          [1, '#10200f'],
        ]),
      );
    },
  },

  // B: la "O" del titulo con su brote, sobre la madera del cartel del lema.
  letter: {
    name: 'La O del título',
    summary: 'La «O» de REBROTE con el brote encima, como en la portada, sobre la madera del cartel del lema.',
    motif(d, detail) {
      const full = detail === 'full';
      const outer = ellipsePath(50, 74, 38, 42);
      const inner = full ? ellipsePath(50, 74, 14, 21) : ellipsePath(50, 74, 15, 22);
      const ring = `${outer} ${inner}`;
      const outline = full ? 4.2 : 6;
      // Sombra dura bajo la letra, como el `drop-shadow` del titulo.
      if (full) d.group(0, 6, 1, () => d.path(ring, { fill: INK.letterShadow, stroke: INK.letterShadow, width: outline, evenodd: true }));
      const face = full
        ? d.linear([0, 0], [0, 1], [
            [0, '#f6ffd8'],
            [0.26, '#c2f285'],
            [0.58, '#74cc48'],
            [1, '#3a8f2b'],
          ])
        : '#8ad957';
      d.path(ring, { fill: face, stroke: INK.outline, width: outline, evenodd: true });
      d.group(10, -31, 1.67, () => drawSprout(d, detail));
    },
    background(d) {
      backdrop(
        d,
        d.linear([0, 0], [0, 1], [
          [0, '#9a6840'],
          [1, '#5a3820'],
        ]),
      );
      // Vetas de la madera.
      for (const [y, bend] of [
        [96, 14],
        [210, -10],
        [330, 12],
        [430, -8],
      ] as const) {
        d.path(`M-10 ${y} C140 ${y + bend} 360 ${y - bend} 522 ${y}`, { stroke: '#3d2412', width: 7, opacity: 0.18 }, false);
      }
    },
  },

  // C: el brote saliendo de un monton de tierra, con el cielo y el cesped de la portada.
  soil: {
    name: 'Brote en la tierra',
    summary: 'El brote recién salido de su montón de tierra, con el cielo y el césped de la portada.',
    motif(d, detail) {
      const full = detail === 'full';
      drawStem(d, detail);
      d.path('M7 44 C10 34 38 34 41 44 Z', { fill: INK.soil, stroke: INK.soilOutline, width: SPROUT.outline[detail] });
      if (full) {
        d.ellipse(17, 40.5, 1.6, 1, { fill: INK.soilLight }, false);
        d.ellipse(30, 39.6, 1.3, 0.9, { fill: INK.soilLight }, false);
        d.ellipse(24, 42, 1.2, 0.8, { fill: INK.soilDark }, false);
        d.ellipse(34.5, 42.2, 1, 0.7, { fill: INK.soilDark }, false);
      }
      drawLeaves(d, detail);
    },
    background(d, motif) {
      skyAndGrass(d, motif);
    },
  },

  // D: la disparadora del juego, pintada por su propio pintor, con el cielo y el cesped de la portada.
  shooter: {
    name: 'Disparadora',
    summary: 'La disparadora de ahora, tal cual la pinta el juego, con el cielo y el césped de la portada.',
    motif(d, detail) {
      drawShooter(d, detail, detail === 'full' ? {} : { strokeScale: SHOOTER_TAB_STROKE, opaqueOnly: true });
    },
    background(d, motif) {
      skyAndGrass(d, motif);
    },
  },

  // E: la silueta de la disparadora, de un solo color, recortada contra el cielo de la portada.
  silhouette: {
    name: 'Silueta de la disparadora',
    summary: 'La forma de la disparadora de un solo color, recortada contra el cielo y el césped de la portada.',
    motif(d, detail) {
      drawShooter(d, detail, { silhouette: detail === 'full' ? INK.outline : INK.silhouetteTab });
    },
    background(d, motif) {
      skyAndGrass(d, motif);
    },
  },
};

/** Grosor de los trazos de la disparadora en la pestana, para que el contorno no desaparezca a 16 px. */
const SHOOTER_TAB_STROKE = 1.8;

/**
 * La disparadora del juego (`SHOOTER`, la que este eligida en `shooterShape.ts`), de un canon y sin elemento, pintada
 * por su pintor de Canvas en SVG. Si la disparadora se redibuja, el icono la sigue. En grande lleva su sombra en el
 * suelo.
 */
function drawShooter(d: Drawing, detail: Detail, options: SvgCanvasOptions): void {
  const { footX, footY } = SHOOTER.size;
  if (detail === 'full' && !options.silhouette) d.ellipse(footX - 6, footY + 1, 54, 9, { fill: '#000000', opacity: 0.22 });
  SHOOTER.paint(new SvgCanvas(d, options).ctx, 1, 'normal');
}

/** Cielo de la portada con dos nubes y la loma de cesped a la altura de los pies del motivo. */
function skyAndGrass(d: Drawing, motif: Box): void {
  backdrop(
    d,
    d.linear([0, 0], [0, 1], [
      [0, '#2a80d2'],
      [0.2, '#3d9be3'],
      [0.55, '#79c4f1'],
      [0.85, '#c8ebfb'],
    ]),
  );
  // Nubes, arriba a los lados.
  for (const [cx, cy, s] of [
    [92, 118, 1],
    [418, 168, 0.8],
  ] as const) {
    d.ellipse(cx, cy, 46 * s, 20 * s, { fill: '#ffffff', opacity: 0.85 }, false);
    d.ellipse(cx - 18 * s, cy - 12 * s, 24 * s, 18 * s, { fill: '#ffffff', opacity: 0.85 }, false);
    d.ellipse(cx + 16 * s, cy - 16 * s, 28 * s, 22 * s, { fill: '#ffffff', opacity: 0.85 }, false);
  }
  // La loma de cesped: el motivo se apoya en ella.
  const y = n(motif.y1 - 0.07 * (motif.y1 - motif.y0));
  const grass = d.linear([0, 0], [0, 1], [
    [0, '#86d65a'],
    [1, '#3f9a35'],
  ]);
  d.path(`M-20 ${y + 18} C120 ${y - 22} 380 ${y - 22} 532 ${y + 14} L532 532 L-20 532 Z`, { fill: grass, stroke: '#2f7a25', width: 8 }, false);
}

// ---------------------------------------------------------------------------
// Composicion

/** Nombre y frase de cada propuesta, para la galeria. */
export function iconInfo(id: IconId): { name: string; summary: string } {
  const { name, summary } = PROPOSALS[id];
  return { name, summary };
}

interface Placed {
  drawing: Drawing;
  /** Donde queda el motivo en el lienzo, con el grosor de sus trazos. */
  box: Box;
  tx: number;
  ty: number;
  k: number;
}

/** Dibuja el motivo y lo encaja: en la pestana y la ficha, en su margen; en el maskable, dentro de la zona segura. */
function placeMotif(id: IconId, variant: IconVariant): Placed {
  const drawing = new Drawing('m');
  PROPOSALS[id].motif(drawing, variant === 'tab' ? 'simple' : 'full');
  const { x0, y0, x1, y1 } = drawing.box;
  const w = x1 - x0;
  const h = y1 - y0;
  let k: number;
  if (variant === 'maskable') {
    k = (MASKABLE_SAFE_RADIUS - LOOK.safeInset) / Math.hypot(w / 2, h / 2);
  } else {
    const margin = variant === 'tab' ? LOOK.tabMargin : LOOK.tileMargin;
    k = (ICON_SIZE * (1 - 2 * margin)) / Math.max(w, h);
  }
  const tx = ICON_SIZE / 2 - k * (x0 + w / 2);
  const ty = ICON_SIZE / 2 - k * (y0 + h / 2);
  const box = { x0: tx + k * x0, y0: ty + k * y0, x1: tx + k * x1, y1: ty + k * y1 };
  return { drawing, box, tx, ty, k };
}

/** Donde queda el brote en el lienzo de 512 (para los tests y la galeria). */
export function motifBox(id: IconId, variant: IconVariant): Box {
  return placeMotif(id, variant).box;
}

/** El icono entero como SVG de 512 x 512. */
export function iconSvg(id: IconId, variant: IconVariant): string {
  const motif = placeMotif(id, variant);
  const back = new Drawing('b');
  let clip = '';
  let clipped = '';
  if (variant !== 'tab') {
    PROPOSALS[id].background(back, motif.box);
    if (variant === 'tile') {
      const r = LOOK.tileRadius * ICON_SIZE;
      back.defs.push(`<clipPath id="tile"><rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${r}"/></clipPath>`);
      clip = ' clip-path="url(#tile)"';
      clipped = `<rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${r}" fill="none" stroke="#000000" stroke-opacity="0.18" stroke-width="6"/>`;
    }
  }
  const defs = [...back.defs, ...motif.drawing.defs];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" width="${ICON_SIZE}" height="${ICON_SIZE}">`,
    defs.length ? `<defs>${defs.join('')}</defs>` : '',
    `<g${clip}>`,
    ...back.parts,
    `<g transform="translate(${n(motif.tx)} ${n(motif.ty)}) scale(${n(motif.k)})">`,
    ...motif.drawing.parts,
    '</g>',
    clipped,
    '</g>',
    '</svg>',
  ].join('');
}

/** Para usar el SVG en un `<img>` o en un `<link>`. */
export function iconDataUrl(id: IconId, variant: IconVariant): string {
  return `data:image/svg+xml,${encodeURIComponent(iconSvg(id, variant))}`;
}
