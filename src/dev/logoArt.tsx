import type { ReactNode } from 'react';
import { CAP, Flower, Leaf, LetterGradient, LetterStrokes, OUTER, RIM, STROKE, cssVars, delays, layoutWord, polar, useSvgId } from '../ui/logo/letters';
import { TitleLogo } from '../ui/logo/TitleLogo';

/**
 * Propuestas del logo (`/proposals/logo.html`). Carmine eligio "Huerto" y ya esta en el juego (`TitleLogo`); las otras
 * dos se quedan como referencia. Usan las mismas letras (`src/ui/logo/letters.tsx`) y se mueven con CSS (`logoLab.css`).
 */

export type LogoId = 'huerto' | 'reinicio' | 'feria';
export const LOGO_IDS: LogoId[] = ['huerto', 'reinicio', 'feria'];

/** Numeros al azar pero siempre los mismos, para que el logo no cambie al volver a pintar. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function LogoSvg({ id, box, width, children }: { id: LogoId; box: [number, number, number, number]; width: number; children: ReactNode }) {
  const [x, y, w, h] = box;
  return (
    <svg
      className={`logo-svg is-${id}`}
      viewBox={`${x} ${y} ${w} ${h}`}
      width={w}
      height={h}
      style={cssVars({ '--aspect': w / h, '--w': width })}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Brote de dos hojas con su tallo, de pie sobre (0, 0). */
function Sprout({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`} strokeLinejoin="round">
      <path d="M0 2 C0 -14 -2 -28 0 -44" fill="none" stroke="#1d4a17" strokeWidth="9" strokeLinecap="round" />
      <path d="M0 2 C0 -14 -2 -28 0 -44" fill="none" stroke="#3f9a35" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M0 -28 C-12 -26 -26 -32 -30 -50 C-13 -53 -2 -44 0 -28 Z" fill="#9be564" stroke="#1d4a17" strokeWidth="3" />
      <path d="M0 -40 C6 -55 19 -63 34 -61 C33 -46 19 -36 0 -40 Z" fill="#74cc48" stroke="#1d4a17" strokeWidth="3" />
    </g>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* B · Reinicio: la maquina se cuelga (parpadeo, pixeles morados de gusano) y la naturaleza la arregla con flores y una
   enredadera. Al final, el cursor de la terminal tambien echa un brote. */

const MINT = ['#f0fff6', '#a6f5c8', '#3fd18a', '#168a55'];
const CURSOR = ['#efe4ff', '#b996ff', '#7c4dff', '#4b22b8'];
const PIXEL_SPOTS: [number, number][] = [
  [-7, -7],
  [6, -15],
  [14, 3],
  [-1, 9],
];
/** Lo que dura cada vuelta del cuelgue y cuando empieza la primera (despues de escribir y de la enredadera). */
const REBOOT_START = 3;

function vine(width: number): { d: string; leaves: { x: number; y: number; angle: number }[] } {
  const y0 = CAP - 4;
  const step = 76;
  let d = `M-6 ${y0}`;
  const leaves: { x: number; y: number; angle: number }[] = [];
  let up = true;
  for (let x = -6; x < width + 30; x += step) {
    const peak = up ? y0 - 26 : y0 + 26;
    d += ` C${x + step * 0.33} ${peak} ${x + step * 0.66} ${peak} ${x + step} ${y0}`;
    leaves.push({ x: x + step / 2, y: y0 + (up ? -19 : 19), angle: up ? -70 - (leaves.length % 3) * 25 : 70 + (leaves.length % 3) * 25 });
    up = !up;
  }
  return { d, leaves };
}

export function LogoReinicio({ word }: { word: string }) {
  const id = useSvgId();
  const { letters, width } = layoutWord(word);
  const cursorX = width + 10;
  const typing = 0.11;
  const firstEnd = letters[0].x + letters[0].glyph.w + OUTER;
  const { d: vinePath, leaves } = vine(cursorX + 50);
  const random = seeded(word.length * 97 + 13);
  const bits = Array.from({ length: 8 }, (_, k) => ({
    x: width * (0.35 + random() * 0.7),
    y: 30 + random() * 80,
    delay: REBOOT_START + random() * 4,
    duration: 3.2 + random() * 2,
    teal: k % 3 === 0,
  }));
  return (
    <LogoSvg id="reinicio" box={[-10, -82, cursorX + 70, 82 + CAP + OUTER + 30]} width={width}>
      <defs>
        <LetterGradient id={id('mint')} stops={MINT} />
        <LetterGradient id={id('cursor')} stops={CURSOR} />
      </defs>
      <g className="lr-word">
        {letters.map(({ glyph, x, i }) => {
          const [tx, ty, ta] = glyph.tip;
          const [fx, fy] = polar(tx, ty, ta, 22);
          const bitten = i % 2 === 1;
          return (
            <g key={i} transform={`translate(${x} 0)`}>
              <g className="lr-type" style={delays(typing * i)}>
                <g className={`lr-glitch is-${i % 3}`} style={delays(REBOOT_START)}>
                  <path className="lr-ghost is-magenta" d={glyph.d} fill="none" stroke="#ff3fd0" strokeWidth={STROKE + 2 * RIM} strokeLinecap="round" strokeLinejoin="round" style={delays(REBOOT_START)} />
                  <path className="lr-ghost is-cyan" d={glyph.d} fill="none" stroke="#3ff2ff" strokeWidth={STROKE + 2 * RIM} strokeLinecap="round" strokeLinejoin="round" style={delays(REBOOT_START)} />
                  <LetterStrokes glyph={glyph} fill={`url(#${id('mint')})`} rim="#0b3b2e" shadow="#05241a" />
                  {bitten && (
                    <>
                      <g className="lr-pixels" style={delays(REBOOT_START)}>
                        {PIXEL_SPOTS.map(([px, py], k) => (
                          <rect key={k} x={tx + px - 5.5} y={ty + py - 5.5} width="11" height="11" fill={k % 2 ? '#2dd4bf' : '#8b5cf6'} stroke="#2a1150" strokeWidth="2.5" />
                        ))}
                      </g>
                      <g transform={`translate(${fx} ${fy})`}>
                        <g className="lr-bloom" style={delays(REBOOT_START)}>
                          <Flower petal={i % 4 === 1 ? '#fff4f8' : '#ffd1e6'} core="#ffd23f" rim="#8a3a5a" />
                        </g>
                      </g>
                    </>
                  )}
                </g>
              </g>
            </g>
          );
        })}
      </g>
      <g className="lr-vine" fill="none" strokeLinecap="round">
        <path d={vinePath} pathLength={1} stroke="#0b3b2e" strokeWidth="11" />
        <path d={vinePath} pathLength={1} stroke="#4cb83c" strokeWidth="5" />
      </g>
      {leaves.map(({ x, y, angle }, k) => (
        <g key={k} transform={`translate(${x} ${y})`}>
          <g className="lr-vleaf" style={delays(1.1 + (1.3 * x) / (cursorX + 50), REBOOT_START)}>
            <Leaf angle={angle} size={0.62} fill={k % 2 ? '#7fdc5a' : '#a6ec74'} rim="#0b3b2e" vein="#3c8f2c" />
          </g>
        </g>
      ))}
      <g transform={`translate(${cursorX} 0)`}>
        <g className="lr-cursor" style={cssVars({ '--run': cursorX - firstEnd, '--typing': `${(typing * letters.length).toFixed(2)}s`, '--steps': letters.length })}>
          <rect className="lr-caret" x="0" y={CAP - 26} width="46" height="26" rx="5" fill={`url(#${id('cursor')})`} stroke="#2a1150" strokeWidth="6" style={delays(typing * letters.length)} />
          <g transform={`translate(23 ${CAP - 30})`}>
            <g className="tl-pop" style={delays(typing * letters.length + 0.2)}>
              <g className="tl-sprout" style={delays(typing * letters.length + 0.8)}>
                <Sprout scale={0.9} />
              </g>
            </g>
          </g>
        </g>
      </g>
      {bits.map((bit, k) => (
        <rect
          key={k}
          className={`lr-bit${bit.teal ? ' is-teal' : ''}`}
          x={bit.x}
          y={bit.y}
          width="9"
          height="9"
          stroke="#2a1150"
          strokeWidth="2"
          style={{ animationDelay: `${bit.delay.toFixed(2)}s`, animationDuration: `${bit.duration.toFixed(2)}s` }}
        />
      ))}
    </LogoSvg>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* C · Feria: letras de colores de los elementos en arco, que hacen la ola, con un sol que gira detras y una disparadora
   que se asoma por encima del cartel, parpadea y mira a los lados. */

const FAIR: { stops: string[] }[] = [
  { stops: ['#f2ffd9', '#b5ec7a', '#62c23e', '#2f7f26'] },
  { stops: ['#fff3d6', '#ffc062', '#f07a24', '#b8460f'] },
  { stops: ['#eefcff', '#9fe0ff', '#45a6ec', '#1f61b0'] },
  { stops: ['#fffbe0', '#ffe46a', '#f5b51f', '#c07c0c'] },
  { stops: ['#fff0f7', '#ffb0d3', '#ec5f9c', '#a93169'] },
];

export function LogoFeria({ word }: { word: string }) {
  const id = useSvgId();
  const { letters, width } = layoutWord(word);
  const mid = width / 2;
  const radius = Math.max(1000, width * 1.45);
  const placed = letters.map((letter) => {
    const center = letter.x + letter.glyph.w / 2;
    const a = (center - mid) / radius;
    return { ...letter, px: mid + radius * Math.sin(a), py: radius * (1 - Math.cos(a)), deg: (a * 180) / Math.PI };
  });
  const drop = Math.max(...placed.map((p) => p.py));
  const top = -128;
  const sunY = 40;
  return (
    <LogoSvg id="feria" box={[-14, top, width + 28, -top + drop + CAP + OUTER + 24]} width={width}>
      <defs>
        {FAIR.map((c, k) => (
          <LetterGradient key={k} id={id(`fair${k}`)} stops={c.stops} />
        ))}
        <radialGradient id={id('rays')} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={-top + sunY}>
          <stop offset="0.2" stopColor="#fff6c2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('head')} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e4ffc0" />
          <stop offset="0.5" stopColor="#86d957" />
          <stop offset="1" stopColor="#3c9a30" />
        </radialGradient>
      </defs>
      <g transform={`translate(${mid} ${sunY})`}>
        <g className="lf-rays">
          {Array.from({ length: 16 }, (_, k) => {
            const r = -top + sunY;
            const [x1, y1] = polar(0, 0, k * 22.5 - 5, r);
            const [x2, y2] = polar(0, 0, k * 22.5 + 5, r);
            return <path key={k} d={`M0 0 L${x1} ${y1} L${x2} ${y2} Z`} fill={`url(#${id('rays')})`} />;
          })}
        </g>
      </g>
      <g transform={`translate(${mid} -34)`}>
        <g className="lf-peek">
          <g className="lf-duck">
            <g transform="translate(-6 -40)">
              <g className="lf-tuft">
                <Leaf angle={-120} size={0.8} />
                <Leaf angle={-55} size={0.95} fill="#74cc48" />
              </g>
            </g>
            <ellipse rx="50" ry="46" fill={`url(#${id('head')})`} stroke="#1d4a17" strokeWidth="5" />
            <ellipse cx="-30" cy="12" rx="8" ry="5" fill="#ff8fb5" opacity="0.6" />
            <ellipse cx="30" cy="12" rx="8" ry="5" fill="#ff8fb5" opacity="0.6" />
            <g className="lf-blink">
              <circle cy="-6" r="19" fill="#fff" stroke="#1d4a17" strokeWidth="3.5" />
              <g className="lf-look">
                <circle cy="-4" r="9.5" fill="#1d2b1f" />
                <circle cx="-3.5" cy="-8" r="3.2" fill="#fff" />
              </g>
            </g>
          </g>
        </g>
      </g>
      {placed.map(({ glyph, i, px, py, deg }) => (
        <g key={i} transform={`translate(${px} ${py}) rotate(${deg.toFixed(2)}) translate(${-glyph.w / 2} 0)`}>
          <g className="lf-drop" style={delays(0.07 * i)}>
            <g className="lf-wave" style={delays(1.4 + 0.11 * i)}>
              <LetterStrokes glyph={glyph} fill={`url(#${id(`fair${i % FAIR.length}`)})`} rim="#3b2210" shadow="#241405" />
            </g>
          </g>
        </g>
      ))}
    </LogoSvg>
  );
}

export const LOGOS: Record<LogoId, { name: string; idea: string; Logo: (props: { word: string }) => ReactNode }> = {
  huerto: {
    name: 'A · Huerto (la elegida, ya en el juego)',
    idea: 'Letras de tallo que brotan del suelo y se mecen. La "O" es una semilla rajada de la que sale el brote, hay hojas y flores en las puntas, y una mariposa ronda el nombre.',
    Logo: TitleLogo,
  },
  reinicio: {
    name: 'B · Reinicio',
    idea: 'El nombre se escribe como en una terminal. Cada pocos segundos la máquina se cuelga (parpadeo y píxeles morados de gusano) y la naturaleza la arregla: florecen las puntas y tiembla la enredadera. El cursor también echa un brote.',
    Logo: LogoReinicio,
  },
  feria: {
    name: 'C · Feria',
    idea: 'Cartel en arco con una letra de cada elemento (planta, fuego, hielo, oro, flor) que hacen la ola. Detrás gira el sol y por encima se asoma una disparadora que parpadea, mira a los lados y se agacha de vez en cuando.',
    Logo: LogoFeria,
  },
};
