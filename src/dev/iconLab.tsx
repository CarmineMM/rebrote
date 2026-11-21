import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ICON, ICON_IDS, MASKABLE_SAFE_RADIUS, ICON_SIZE, THEME_COLOR, iconDataUrl, iconInfo, type IconId } from '../icons/iconArt';
import './iconLab.css';

/**
 * Galeria de propuestas del icono (T-028): `npm run dev` y abrir `/iconos.html`. Cada propuesta, en la pestana del
 * navegador (clara y oscura), a 16, 32, 180 y 512 pixeles sobre fondo claro y oscuro, recortada como la recorta Android
 * y en la pantalla de inicio de un iPhone. Los dibujos salen de `src/icons/iconArt.ts`, el mismo que usa
 * `npm run icons`. No la ve el jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin
 * `src/i18n/`.
 */

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Lo que pinta el navegador a ese tamano en pixeles de pantalla, ampliado sin suavizar para ver cada pixel. */
function Pixels({ src, size, zoom }: { src: string; size: number; zoom: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(image, 0, 0, size, size);
    };
    image.src = src;
  }, [src, size]);
  return <canvas ref={canvas} className="icon-pixels" width={size} height={size} style={{ width: size * zoom, height: size * zoom }} />;
}

/** El icono a `size` pixeles de pantalla de verdad (en una pantalla de alta densidad, menos pixeles CSS). */
function Exact({ src, size }: { src: string; size: number }) {
  const css = size / (window.devicePixelRatio || 1);
  return <img src={src} width={css} height={css} alt="" />;
}

function Sizes({ id, theme }: { id: IconId; theme: 'light' | 'dark' }) {
  const tab = iconDataUrl(id, 'tab');
  return (
    <div className={`icon-sizes is-${theme}`}>
      <span className="icon-sizes-label">{theme === 'light' ? 'Fondo claro' : 'Fondo oscuro'}</span>
      <figure>
        <img src={tab} width={16} height={16} alt="" />
        <figcaption>16</figcaption>
      </figure>
      <figure>
        <img src={tab} width={32} height={32} alt="" />
        <figcaption>32</figcaption>
      </figure>
      <figure>
        <Pixels src={tab} size={16} zoom={6} />
        <figcaption>16 px de verdad, ×6</figcaption>
      </figure>
      <figure>
        <Pixels src={tab} size={32} zoom={3} />
        <figcaption>32 px de verdad, ×3</figcaption>
      </figure>
      <figure>
        <Exact src={iconDataUrl(id, 'full')} size={180} />
        <figcaption>180 · iPhone</figcaption>
      </figure>
      <figure>
        <Exact src={iconDataUrl(id, 'tile')} size={512} />
        <figcaption>512 · aplicación</figcaption>
      </figure>
    </div>
  );
}

function BrowserTab({ id, theme }: { id: IconId; theme: 'light' | 'dark' }) {
  return (
    <div className={`icon-browser is-${theme}`}>
      <div className="icon-tab is-other">
        <span className="icon-tab-generic" />
        <span>Otra pestaña</span>
      </div>
      <div className="icon-tab">
        <img src={iconDataUrl(id, 'tab')} width={16} height={16} alt="" />
        <span>Rebrote</span>
        <span className="icon-tab-close">×</span>
      </div>
    </div>
  );
}

/** Formas en las que Android recorta un icono maskable (radio de las esquinas, en % del lado). */
const ANDROID_SHAPES: ReadonlyArray<readonly [string, string]> = [
  ['Círculo', '50%'],
  ['Squircle', '38%'],
  ['Cuadrado redondeado', '18%'],
];

function Android({ id }: { id: IconId }) {
  const src = iconDataUrl(id, 'maskable');
  const safe = (2 * MASKABLE_SAFE_RADIUS * 100) / ICON_SIZE;
  return (
    <div className="icon-android">
      {ANDROID_SHAPES.map(([name, radius]) => (
        <figure key={name}>
          <img src={src} width={96} height={96} alt="" style={{ borderRadius: radius }} />
          <figcaption>{name}</figcaption>
        </figure>
      ))}
      <figure>
        <span className="icon-safe">
          <img src={src} width={96} height={96} alt="" />
          <span className="icon-safe-ring" style={{ width: `${safe}%`, height: `${safe}%` }} />
        </span>
        <figcaption>Sin recortar · zona segura</figcaption>
      </figure>
    </div>
  );
}

function Iphone({ id }: { id: IconId }) {
  return (
    <div className="icon-iphone">
      <figure>
        <img src={iconDataUrl(id, 'full')} width={60} height={60} alt="" />
        <figcaption>Rebrote</figcaption>
      </figure>
      <figure className="is-ghost">
        <span />
        <figcaption>Notas</figcaption>
      </figure>
      <figure className="is-ghost">
        <span />
        <figcaption>Fotos</figcaption>
      </figure>
    </div>
  );
}

function Proposal({ id, index }: { id: IconId; index: number }) {
  const { name, summary } = iconInfo(id);
  return (
    <section className="icon-proposal">
      <header>
        <h2>
          {LETTERS[index]} · {name} <code>{id}</code>
          {id === ICON && <span className="icon-current">la que genera npm run icons</span>}
        </h2>
        <p>{summary}</p>
      </header>
      <div className="icon-row">
        <BrowserTab id={id} theme="light" />
        <BrowserTab id={id} theme="dark" />
      </div>
      <Sizes id={id} theme="light" />
      <Sizes id={id} theme="dark" />
      <div className="icon-row">
        <Android id={id} />
        <Iphone id={id} />
      </div>
    </section>
  );
}

function IconLab() {
  const [only, setOnly] = useState<IconId | null>(null);
  const shown = only ? [only] : ICON_IDS;
  return (
    <div className="icon-lab">
      <header className="icon-bar">
        <h1>
          Rebrote · iconos <span>T-028</span>
        </h1>
        <div className="icon-tools">
          <button type="button" className={only === null ? 'is-on' : ''} onClick={() => setOnly(null)}>
            Las tres
          </button>
          {ICON_IDS.map((id, i) => (
            <button key={id} type="button" className={only === id ? 'is-on' : ''} onClick={() => setOnly(id)}>
              {LETTERS[i]} · {iconInfo(id).name}
            </button>
          ))}
        </div>
      </header>
      <p className="icon-notes">
        16 y 32: la pestaña, sin fondo y simplificada. 180: iPhone, cuadrada y a sangre (iOS redondea las esquinas). 512:
        icono de aplicación con su ficha. Android recorta el maskable con la forma que quiera: el brote tiene que caber
        entero en la zona segura. Color de la barra en móvil:{' '}
        <span className="icon-swatch" style={{ background: THEME_COLOR }} /> <code>{THEME_COLOR}</code>, el cielo de la portada.
      </p>
      <main className="icon-list">
        {shown.map((id) => (
          <Proposal key={id} id={id} index={ICON_IDS.indexOf(id)} />
        ))}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<IconLab />);
