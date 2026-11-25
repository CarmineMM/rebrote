import { useId, type CSSProperties } from 'react';

/**
 * Letras del logo, sin fuente: cada una es un trazo gordo dibujado a mano (`GLYPHS`) que se pinta en capas (sombra,
 * contorno oscuro, relleno y brillo), igual en todos los aparatos. Estan las de REBROTE, INVERNADERO y GREENHOUSE: una
 * palabra nueva en el titulo necesita sus letras aqui (un test avisa). Las usa el titulo (`TitleLogo`) y las propuestas
 * de `/proposals/logo.html`.
 */

export interface Glyph {
  /** Ancho del trazo central; la letra ocupa ademas medio trazo y el contorno a cada lado. */
  w: number;
  d: string;
  /** Punta donde brota una hoja o una flor: x, y y hacia donde apunta (grados). */
  tip: [number, number, number];
  /** Brillo de arriba a la izquierda. */
  shine: [number, number];
}

/** Alto de las mayusculas (del centro del trazo de arriba al de abajo). */
export const CAP = 120;
export const STROKE = 28;
export const HALF = STROKE / 2;
export const RIM = 7;
/** Lo que la letra sobresale de su trazo central: medio trazo y el contorno. */
export const OUTER = HALF + RIM;
/** Cuanto baja la sombra de cada letra. */
export const DROP = 7;
/** Hueco entre los rellenos de dos letras: sus contornos casi se tocan. */
const SPACING = 2 * RIM + 3;

export const GLYPHS: Record<string, Glyph> = {
  R: { w: 58, d: 'M0 120 V0 H30 C62 0 62 62 30 62 H0 M32 62 L58 120', tip: [0, 0, -125], shine: [-4, 22] },
  E: { w: 50, d: 'M50 0 H0 V120 H50 M0 60 H40', tip: [50, 0, -40], shine: [-4, 22] },
  B: { w: 58, d: 'M0 60 V0 H28 C56 0 56 60 28 60 H0 V120 H32 C62 120 62 60 32 60', tip: [0, 0, -125], shine: [-4, 22] },
  O: { w: 66, d: 'M33 0 A33 60 0 1 1 33 120 A33 60 0 1 1 33 0 Z', tip: [33, 0, -90], shine: [6, 34] },
  T: { w: 64, d: 'M0 0 H64 M32 0 V120', tip: [64, 0, -40], shine: [8, -3] },
  I: { w: 0, d: 'M0 0 V120', tip: [0, 0, -90], shine: [-4, 22] },
  N: { w: 56, d: 'M0 120 V0 L56 120 V0', tip: [56, 0, -50], shine: [-4, 22] },
  V: { w: 64, d: 'M0 0 L32 120 L64 0', tip: [64, 0, -50], shine: [1, 18] },
  A: { w: 68, d: 'M0 120 L34 0 L68 120 M17 82 H51', tip: [34, 0, -90], shine: [29, 10] },
  D: { w: 58, d: 'M0 0 V120 H22 C70 120 70 0 22 0 Z', tip: [0, 0, -125], shine: [-4, 22] },
  G: { w: 62, d: 'M58 20 C50 6 42 0 32 0 C-10 0 -10 120 32 120 C52 120 62 106 62 86 V68 H38', tip: [58, 20, -40], shine: [6, 36] },
  H: { w: 56, d: 'M0 0 V120 M56 0 V120 M0 60 H56', tip: [56, 0, -50], shine: [-4, 22] },
  U: { w: 58, d: 'M0 0 V78 C0 134 58 134 58 78 V0', tip: [58, 0, -50], shine: [-4, 22] },
  S: { w: 56, d: 'M54 18 C46 4 36 0 28 0 C6 0 0 16 0 30 C0 62 56 54 56 88 C56 106 44 120 26 120 C14 120 4 114 0 102', tip: [54, 18, -40], shine: [6, 22] },
};

export interface PlacedLetter {
  glyph: Glyph;
  /** Donde empieza el trazo central de la letra. */
  x: number;
  i: number;
}

/** Coloca las letras una tras otra; `width` llega del borde izquierdo de la primera al derecho de la ultima. */
export function layoutWord(word: string): { letters: PlacedLetter[]; width: number } {
  const letters: PlacedLetter[] = [];
  let x = OUTER;
  [...word].forEach((ch, i) => {
    const glyph = GLYPHS[ch] ?? GLYPHS.I;
    letters.push({ glyph, x, i });
    x += glyph.w + STROKE + SPACING;
  });
  const last = letters[letters.length - 1];
  return { letters, width: last ? last.x + last.glyph.w + OUTER : 0 };
}

export const polar = (x: number, y: number, angle: number, r: number): [number, number] => [
  x + Math.cos((angle * Math.PI) / 180) * r,
  y + Math.sin((angle * Math.PI) / 180) * r,
];

/** Ids de los degradados: varios logos en la misma pagina no pueden compartirlos. */
export function useSvgId(): (name: string) => string {
  const base = 'lg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name) => `${base}-${name}`;
}

export const cssVars = (v: Record<string, string | number>): CSSProperties => v as CSSProperties;
export const delays = (...s: number[]): CSSProperties => ({ animationDelay: s.map((n) => `${n.toFixed(2)}s`).join(', ') });

/** Degradado de arriba abajo de una letra, en sus coordenadas. */
export function LetterGradient({ id, stops }: { id: string; stops: string[] }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={-HALF} x2="0" y2={CAP + HALF}>
      {stops.map((color, k) => (
        <stop key={k} offset={k / (stops.length - 1)} stopColor={color} />
      ))}
    </linearGradient>
  );
}

/** Una letra en capas: sombra caida, contorno, relleno y brillo. */
export function LetterStrokes({ glyph, fill, rim, shadow }: { glyph: Glyph; fill: string; rim: string; shadow: string }) {
  const [sx, sy] = glyph.shine;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={glyph.d} stroke={shadow} strokeWidth={STROKE + 2 * RIM} transform={`translate(0 ${DROP})`} />
      <path d={glyph.d} stroke={rim} strokeWidth={STROKE + 2 * RIM} />
      <path d={glyph.d} stroke={fill} strokeWidth={STROKE} />
      <ellipse cx={sx} cy={sy} rx="4.5" ry="8.5" fill="#fff" opacity="0.75" transform={`rotate(18 ${sx} ${sy})`} />
    </g>
  );
}

/** Hojita que sale de una punta, apuntando hacia `angle`. */
export function Leaf({ angle, fill = '#9be564', rim = '#1d4a17', vein = '#4f9a2f', size = 1 }: { angle: number; fill?: string; rim?: string; vein?: string; size?: number }) {
  return (
    <g transform={`rotate(${angle}) scale(${size})`}>
      <path d="M12 0 C18 -12 38 -15 52 -2 C38 10 20 9 12 0 Z" fill={fill} stroke={rim} strokeWidth="3" strokeLinejoin="round" />
      <path d="M15 0 Q30 -3 46 -2" fill="none" stroke={vein} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/** Florecita de cinco petalos centrada en (0, 0). */
export function Flower({ petal, core = '#ffd23f', rim }: { petal: string; core?: string; rim: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((k) => {
        const [x, y] = polar(0, 0, k * 72 - 90, 8);
        return <circle key={k} cx={x} cy={y} r="7" fill={petal} stroke={rim} strokeWidth="2.5" />;
      })}
      <circle r="6" fill={core} stroke="#7a4a10" strokeWidth="2.5" />
    </g>
  );
}
