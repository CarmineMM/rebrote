import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LANGUAGES, setLanguage, type Language } from '../i18n';
import { useLanguage } from '../ui/useText';
import { MOCKUP_IDS, Mockup, type MockupId } from './greenhouseMockups';
import '../styles.css';
import './greenhouseLab.css';

/**
 * Galeria de propuestas del Invernadero: `npm run dev` y abrir `/proposals/invernadero.html`. Tres maquetas con la tienda ya
 * abierta (poderes y disparadora juntos), el menu a la derecha y "Volver a la portada" abajo a la izquierda, cada una a
 * 1600 x 900, 812 x 375 y 568 x 320. Cada marco es un `iframe` de ese tamano con la maqueta sola (`?solo=lab`), asi que
 * los `@media` responden como en el juego. Se puede comprar y mejorar: el progreso vive solo en la pagina. No la ve el
 * jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

const params = new URLSearchParams(location.search);
const solo = MOCKUP_IDS.find((id) => id === params.get('solo')) ?? null;
const startSeeds = Number(params.get('semillas') ?? 1040) || 0;
const startLanguage = LANGUAGES.find((l) => l === params.get('idioma')) ?? 'es';
setLanguage(startLanguage);

const INFO: Record<MockupId, { name: string; about: string[] }> = {
  lab: {
    name: 'Laboratorio de Patty',
    about: [
      'La que pediste. Sin las plantas del jardín: estamos dentro del invernadero, de día, con su armazón de hierro blanco, enredaderas que cuelgan de la viga, rayos de sol, motas de polvo y una balda con matraces que burbujean.',
      'La tienda ya está abierta, como una vitrina de madera con su placa: arriba los tres poderes, cada uno bajo una campana de cristal y con su etiqueta de laboratorio; abajo la disparadora en su maceta, con su lámpara de cultivo, y su nivel base. Patty junto al menú, como ahora. El menú a la derecha (Siguiente brote, Ruta, Historia) y "Volver a la portada" abajo a la izquierda.',
    ],
  },
  refuge: {
    name: 'Refugio en la noche',
    about: [
      'El invernadero convertido en refugio. Fuera es de noche y está la corrupción: lluvia de bits, colinas con circuitos que laten, relámpagos morados y, de vez en cuando, un gusano que pasa por detrás del cristal. Dentro, tablas clavadas y cinta en los cristales, sacos terreros, una alfombra, guirnaldas y una lámpara que se mece y da luz cálida.',
      'La tienda es la despensa: los poderes guardados en tarros con tapa de corcho y etiqueta de papel de estraza; la disparadora en una lata, bajo la luz. Mismo menú y misma "Volver a la portada", en tonos de madera.',
    ],
  },
  stall: {
    name: 'Puesto en la azotea',
    about: [
      'Al atardecer, en una azotea de la ciudad: el puesto de Patty con el toldo a rayas del icono de la tienda. Detrás, la ciudad enciende sus ventanas una a una, pasan pájaros y en el horizonte de la derecha asoma el brillo verde y morado de la corrupción. Guirnaldas, luciérnagas y macetas en el pretil.',
      'Los poderes asoman de cajas de fruta con su pizarra de precio; la disparadora, en su maceta sobre el mostrador. Patty asoma junto al puesto. Mismo menú y misma "Volver a la portada".',
    ],
  },
};

const FRAMES = [
  { w: 1600, h: 900, s: 0.5 },
  { w: 812, h: 375, s: 1 },
  { w: 568, h: 320, s: 1 },
] as const;

const SEED_OPTIONS = [
  { label: 'Tras el brote 1 (1040)', value: 1040 },
  { label: 'Sin semillas (0)', value: 0 },
  { label: 'Muchas (99 999)', value: 99_999 },
] as const;

function Gallery() {
  const [tab, setTab] = useState<MockupId>(() => MOCKUP_IDS.find((id) => id === params.get('propuesta')) ?? 'lab');
  const [seeds, setSeeds] = useState(startSeeds);
  const [round, setRound] = useState(0);
  const language = useLanguage();
  const src = `/proposals/invernadero.html?solo=${tab}&semillas=${seeds}&idioma=${language}`;
  return (
    <div className="ghl">
      <header className="ghl-bar">
        <h1>
          Invernadero <span>propuestas</span>
        </h1>
        <nav className="ghl-tabs">
          {MOCKUP_IDS.map((id, i) => (
            <button key={id} type="button" className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
              {i + 1}. {INFO[id].name}
            </button>
          ))}
        </nav>
        <div className="ghl-tools">
          <select value={seeds} onChange={(e) => setSeeds(Number(e.target.value))} aria-label="Semillas">
            {SEED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {LANGUAGES.map((l: Language) => (
            <button key={l} type="button" className={language === l ? 'is-on' : ''} onClick={() => setLanguage(l)}>
              {l.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={() => setRound((r) => r + 1)}>
            Volver a empezar
          </button>
        </div>
      </header>
      <main className="ghl-main">
        <section className="ghl-about">
          <h2>
            {MOCKUP_IDS.indexOf(tab) + 1}. {INFO[tab].name}
          </h2>
          {INFO[tab].about.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <a href={src} target="_blank" rel="noreferrer">
            Abrir a pantalla completa ↗
          </a>
        </section>
        <div className="ghl-frames">
          {FRAMES.map(({ w, h, s }) => (
            <figure key={w} className="ghl-frame">
              <figcaption>
                {w} × {h}
                {s !== 1 && <small> (al {Math.round(s * 100)} %)</small>}
              </figcaption>
              <div className="ghl-screen" style={{ width: w * s, height: h * s }}>
                <iframe key={`${src}:${round}`} title={`${INFO[tab].name} a ${w} × ${h}`} src={src} style={{ width: w, height: h, transform: `scale(${s})` }} />
              </div>
            </figure>
          ))}
        </div>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
if (solo) {
  document.documentElement.classList.add('ghl-solo');
  root.render(<Mockup id={solo} seeds={startSeeds} />);
} else {
  root.render(<Gallery />);
}
