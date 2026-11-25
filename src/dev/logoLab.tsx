import { useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { LOGOS, LOGO_IDS, type LogoId } from './logoArt';
import './logoLab.css';

/**
 * Propuestas del logo: `npm run dev` y abrir `/proposals/logo.html`. Cada propuesta, en la portada a 1600 x 900,
 * 812 x 375 y 568 x 320, en el sitio del titulo de ahora y con el menu a la derecha para ver que no se pisan. El
 * decorado es un apano: en el juego lo pinta Phaser (`TitleScene`). No la ve el jugador (`npm run build` no la incluye),
 * asi que sus textos van en espanol sin `src/i18n/`; el lema y las palabras del logo si salen de los diccionarios.
 */

interface Words {
  label: string;
  word: string;
  tagline: string;
  night: boolean;
}

const WORDS: Words[] = [
  { label: 'Portada', word: 'REBROTE', tagline: es.title.tagline, night: false },
  { label: 'Portada (inglés)', word: 'REBROTE', tagline: en.title.tagline, night: false },
  { label: 'Invernadero', word: es.greenhouse.logo, tagline: es.greenhouse.hello('Ana'), night: true },
  { label: 'Greenhouse', word: en.greenhouse.logo, tagline: en.greenhouse.hello('Ana'), night: true },
];

const SIZES: { width: number; height: number; scale: number }[] = [
  { width: 1600, height: 900, scale: 0.5 },
  { width: 812, height: 375, scale: 1 },
  { width: 568, height: 320, scale: 1 },
];

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
      <ellipse cx="0" cy="0" rx="90" ry="28" />
      <ellipse cx="-38" cy="-18" rx="40" ry="30" />
      <ellipse cx="22" cy="-26" rx="48" ry="38" />
      <ellipse cx="62" cy="-6" rx="34" ry="24" />
    </g>
  );
}

/** Decorado parecido a la portada (de dia) o al refugio del Invernadero (de noche), apoyado abajo. */
function Backdrop({ night }: { night: boolean }) {
  return (
    <svg className="lab-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="lab-sky-day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fa7ee" />
          <stop offset="0.55" stopColor="#a9dcff" />
        </linearGradient>
        <linearGradient id="lab-sky-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1838" />
          <stop offset="0.6" stopColor="#2c2f63" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#lab-sky-${night ? 'night' : 'day'})`} />
      {night ? (
        <g fill="#fff8d0">
          {Array.from({ length: 40 }, (_, k) => (
            <circle key={k} cx={(k * 397) % 1600} cy={(k * 131) % 380} r={1 + (k % 3)} opacity={0.4 + (k % 4) * 0.15} />
          ))}
          <circle cx="1240" cy="120" r="46" fill="#fff3c4" />
        </g>
      ) : (
        <g className="lab-clouds">
          <Cloud x={980} y={150} s={1.3} />
          <Cloud x={1380} y={250} s={1} />
          <Cloud x={560} y={300} s={0.8} />
        </g>
      )}
      <g fill={night ? '#22442f' : '#9fd98a'}>
        <ellipse cx="300" cy="520" rx="520" ry="120" />
        <ellipse cx="1200" cy="530" rx="620" ry="130" />
      </g>
      <rect y="470" width="1600" height="80" rx="40" fill={night ? '#1d3a26' : '#4f9e3a'} />
      <g fill={night ? '#244a2f' : '#5fb444'}>
        {Array.from({ length: 22 }, (_, k) => (
          <circle key={k} cx={k * 78} cy={480} r={46} />
        ))}
      </g>
      <rect y="520" width="1600" height="380" fill={night ? '#2b5a35' : '#7cc95a'} />
      <g fill={night ? '#326640' : '#8bd468'}>
        {Array.from({ length: 40 }, (_, k) => (
          <rect key={k} x={260 + (k % 10) * 134} y={540 + Math.floor(k / 10) * 92} width="134" height="92" opacity={(k + Math.floor(k / 10)) % 2 ? 1 : 0} />
        ))}
      </g>
      <rect x="0" y="520" width="200" height="380" fill={night ? '#3d2a1a' : '#7a4a2a'} />
      <rect x="200" y="520" width="60" height="380" fill={night ? '#6c6a5c' : '#e3d3a8'} />
      <g fill={night ? '#173a22' : '#3e8f35'}>
        <circle cx="40" cy="20" r="150" />
        <circle cx="230" cy="-30" r="140" />
        <circle cx="400" cy="10" r="110" />
      </g>
    </svg>
  );
}

/** El sitio del menu de la derecha, con sus medidas de verdad (`--panel-w`, `--panel-right` de `styles.css`). */
function FakePanel() {
  return (
    <div className="lab-panel">
      <span className="lab-panel-btn is-main" />
      <span className="lab-panel-btn" />
      <span className="lab-panel-btn" />
      <span className="lab-panel-btn" />
    </div>
  );
}

function Screen({ id, words, width, height, scale, play }: { id: LogoId; words: Words; width: number; height: number; scale: number; play: number }) {
  const { Logo } = LOGOS[id];
  return (
    <figure className="lab-frame-wrap" style={{ width: width * scale } as CSSProperties}>
      <div className="lab-frame-box" style={{ width: width * scale, height: height * scale }}>
        <div className="lab-frame" style={{ width, height, transform: `scale(${scale})` }}>
          <Backdrop night={words.night} />
          <header key={`${play}-${words.word}`} className={`lab-brand is-${id}`}>
            <Logo word={words.word} />
            <p className="lab-tagline">{words.tagline}</p>
          </header>
          <FakePanel />
        </div>
      </div>
      <figcaption>
        {width} × {height}
      </figcaption>
    </figure>
  );
}

function LogoLab() {
  // `?pantalla=2` empieza con el Invernadero (el numero es la posicion en `WORDS`).
  const [words, setWords] = useState(() => Math.min(WORDS.length - 1, Math.max(0, Number(new URLSearchParams(location.search).get('pantalla')) || 0)));
  const [play, setPlay] = useState(0);
  const [still, setStill] = useState(false);
  return (
    <div className={`lab${still ? ' is-still' : ''}`}>
      <header className="lab-bar">
        <h1>Logo · propuestas</h1>
        <nav className="lab-jump">
          {LOGO_IDS.map((id) => (
            <a key={id} href={`#${id}`}>
              {LOGOS[id].name}
            </a>
          ))}
        </nav>
        <label>
          Pantalla{' '}
          <select value={words} onChange={(e) => setWords(Number(e.target.value))}>
            {WORDS.map((w, k) => (
              <option key={k} value={k}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setPlay((p) => p + 1)}>
          ↻ Repetir entrada
        </button>
        <label>
          <input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} /> Movimiento reducido
        </label>
      </header>
      {LOGO_IDS.map((id) => (
        <section key={id} id={id} className="lab-proposal">
          <h2>{LOGOS[id].name}</h2>
          <p>{LOGOS[id].idea}</p>
          <div className="lab-screens">
            {SIZES.map((size) => (
              <Screen key={size.width} id={id} words={WORDS[words]} {...size} play={play} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<LogoLab />);
