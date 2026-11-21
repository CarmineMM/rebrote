import * as Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { viewFor } from '../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import type { CannonCount, ElementType } from '../game/core/plants';
import { SHOOTER_DESIGNS } from '../game/view/shooters/catalog';
import { FLAIRS, type FlairId } from './levelFlair';
import {
  BoardLabScene,
  DESIGN_NAMES,
  LAB_SCENES,
  LevelsScene,
  ShowcaseScene,
  SilhouetteScene,
  type BoardCastId,
  type LabView,
  type ShowcaseLook,
} from './shooterLabScenes';
import './shooterLab.css';

/**
 * Galeria de propuestas de la disparadora (T-016, fase 1): `npm run dev` y abrir `/disparadoras.html`. No la ve el
 * jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin pasar por `src/i18n/`, y los botones
 * llaman directamente a sus escenas (no es el juego: no hace falta el `EventBus`).
 *
 * Carmine eligio "Brote" (X-03) y es la disparadora del juego; la de antes queda como `legacy`. La vista "Niveles"
 * ensena el jardincito de los niveles con premio (T-027) y como quedaria combinado con las otras propuestas.
 */

/** Que es cada forma y que mirar, para Carmine. */
const ABOUT: Record<string, string> = {
  legacy: 'La de antes, guardada tal cual (`shooters/legacy.ts`): cabeza redonda sobre un tallo, cañones rectos desde la cara y un punto dorado por cañón. Para volver a ella, ponerla como SHOOTER en shooterShape.ts.',
  bulb: 'La del juego desde el 21 nov 2026 (X-03). Bulbo gordito sentado en la tierra, sin tallo, con raicillas. Los cañones le salen del hombro como brotes nuevos, con un capullo abierto en la punta.',
  cactus: 'Cactus de pie con costillas y pinchos de pelusa. Cada cañón es un brazo que apunta a los gusanos. Mechón lanudo en la coronilla; sin flor ni brazos levantados.',
  pod: 'Vaina de pie con la punta enroscada, abierta hacia los gusanos: enseña una semilla dorada por cañón y cada semilla es una boca.',
};

const LOOKS: Array<{ id: ShowcaseLook; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'wilted', label: 'Marchita' },
  { id: 'dimmed', label: 'Oscurecida' },
  { id: 'lifted', label: 'Levantada' },
];

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

const VARIANTS: Array<{ id: 'normal' | ElementType; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'fire', label: 'Fuego' },
  { id: 'ice', label: 'Hielo' },
];

const TABS: ReadonlyArray<readonly [LabView, string]> = [
  ['showcase', 'Vitrina'],
  ['board', 'Tablero'],
  ['silhouette', 'Silueta'],
  ['levels', 'Niveles'],
];

const shuffled = (count: number) => {
  const order = Array.from({ length: count }, (_v, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

function ShooterLab() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [view, setView] = useState<LabView>('showcase');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [cast, setCast] = useState<BoardCastId>('bulb');
  const [flair, setFlair] = useState<FlairId | 'none'>('none');
  const [levelDesign, setLevelDesign] = useState('bulb');
  const [variant, setVariant] = useState<'normal' | ElementType>('normal');
  const [cannons, setCannons] = useState<CannonCount>(2);
  const [firing, setFiring] = useState(true);
  const [look, setLook] = useState<ShowcaseLook>('normal');
  const [level, setLevel] = useState(1);
  const [names, setNames] = useState(false);
  const [order, setOrder] = useState(() => shuffled(SHOOTER_DESIGNS.length));

  // El juego se crea con su nivel grafico; cambiarlo lo vuelve a crear, como en el juego.
  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const { renderScale } = QUALITY_PROFILES[quality];
    const bounds = parent.getBoundingClientRect();
    const fit = viewFor(bounds.width / bounds.height);
    const created = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: Math.max(1, Math.round(fit.width * renderScale)),
      height: Math.max(1, Math.round(fit.height * renderScale)),
      backgroundColor: '#1d2b1f',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { powerPreference: 'high-performance' },
      audio: { noAudio: true },
    });
    created.scene.add(LAB_SCENES.showcase, ShowcaseScene, view === 'showcase', { quality });
    created.scene.add(LAB_SCENES.board, BoardLabScene, view === 'board', { quality, cast, flair });
    created.scene.add(LAB_SCENES.silhouette, SilhouetteScene, view === 'silhouette', { quality, names, order });
    created.scene.add(LAB_SCENES.levels, LevelsScene, view === 'levels', { quality, ...levelsData() });
    game.current = created;
    (window as unknown as { __lab?: Phaser.Game }).__lab = created;
    setLevel(1);
    setLook('normal');
    setFiring(true);
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: lo demas cambia de escena sin recrear el juego.
  }, [quality]);

  const start = (next: LabView, data: object) => {
    const g = game.current;
    if (!g) return;
    for (const key of Object.values(LAB_SCENES)) if (g.scene.isActive(key)) g.scene.stop(key);
    g.scene.start(LAB_SCENES[next], { quality, ...data });
  };

  const showcase = () => game.current?.scene.getScene(LAB_SCENES.showcase) as ShowcaseScene | undefined;

  /** Lo que pinta la vista "Niveles": forma, variante y canones. */
  function levelsData(next: { design?: string; variant?: 'normal' | ElementType; cannons?: CannonCount } = {}) {
    const chosen = next.variant ?? variant;
    return { design: next.design ?? levelDesign, element: chosen === 'normal' ? null : chosen, cannons: next.cannons ?? cannons };
  }

  /** Vuelve a sembrar la vitrina (todo a nivel 1, como recien sembrado). */
  const replay = (mode: 'sprout' | 'grow') => {
    showcase()?.replay(mode);
    setLevel(1);
    setLook('normal');
    setFiring(true);
  };

  const pickView = (next: LabView) => {
    setView(next);
    if (next === 'showcase') {
      setLevel(1);
      setLook('normal');
      setFiring(true);
      start(next, {});
    } else if (next === 'board') start(next, { cast, flair });
    else if (next === 'levels') start(next, levelsData());
    else start(next, { names, order });
  };

  const pickCast = (next: BoardCastId) => {
    setCast(next);
    start('board', { cast: next, flair });
  };

  return (
    <div className="lab">
      <header className="lab-bar">
        <h1>
          Disparadora · formas <span>T-016 y T-027, solo desarrollo</span>
        </h1>
        <nav className="lab-tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={view === id ? 'is-on' : ''} onClick={() => pickView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="lab-tools">
          {view === 'showcase' && (
            <>
              <button onClick={() => replay('sprout')}>Sembrar</button>
              <button onClick={() => replay('grow')}>Fusionar 1 → 2 → 3</button>
              <button onClick={() => setLevel(showcase()?.nextLevel() ?? 1)}>Nivel {level} → siguiente</button>
              <button
                className={firing ? 'is-on' : ''}
                onClick={() => {
                  showcase()?.setFiring(!firing);
                  setFiring(!firing);
                }}
              >
                Disparar
              </button>
              <select
                value={look}
                onChange={(event) => {
                  const next = event.target.value as ShowcaseLook;
                  showcase()?.setLook(next);
                  setLook(next);
                }}
              >
                {LOOKS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}
          {view === 'board' && (
            <>
              <select value={cast} onChange={(event) => pickCast(event.target.value)}>
                <option value="mix">Todas (un carril cada una)</option>
                {SHOOTER_DESIGNS.map((design) => (
                  <option key={design.id} value={design.id}>
                    {DESIGN_NAMES[design.id]}
                  </option>
                ))}
              </select>
              <select
                value={flair}
                title="Adorno de nivel"
                onChange={(event) => {
                  const next = event.target.value as FlairId | 'none';
                  setFlair(next);
                  start('board', { cast, flair: next });
                }}
              >
                <option value="none">Jardincito (el del juego)</option>
                {FLAIRS.filter((option) => option.id !== 'garden').map((option) => (
                  <option key={option.id} value={option.id}>
                    Jardincito {option.name}
                  </option>
                ))}
              </select>
              <span className="lab-hint">Clic en una planta: dispara</span>
            </>
          )}
          {view === 'levels' && (
            <>
              <button onClick={() => start('levels', levelsData())}>Ver aparecer</button>
              <select
                value={levelDesign}
                onChange={(event) => {
                  setLevelDesign(event.target.value);
                  start('levels', levelsData({ design: event.target.value }));
                }}
              >
                {SHOOTER_DESIGNS.map((design) => (
                  <option key={design.id} value={design.id}>
                    {DESIGN_NAMES[design.id]}
                  </option>
                ))}
              </select>
              <select
                value={variant}
                onChange={(event) => {
                  const next = event.target.value as 'normal' | ElementType;
                  setVariant(next);
                  start('levels', levelsData({ variant: next }));
                }}
              >
                {VARIANTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={cannons}
                onChange={(event) => {
                  const next = Number(event.target.value) as CannonCount;
                  setCannons(next);
                  start('levels', levelsData({ cannons: next }));
                }}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'cañón' : 'cañones'}
                  </option>
                ))}
              </select>
            </>
          )}
          {view === 'silhouette' && (
            <>
              <button
                className={names ? 'is-on' : ''}
                onClick={() => {
                  setNames(!names);
                  start('silhouette', { names: !names, order });
                }}
              >
                Mostrar nombres
              </button>
              <button
                onClick={() => {
                  const next = shuffled(SHOOTER_DESIGNS.length);
                  setOrder(next);
                  start('silhouette', { names, order: next });
                }}
              >
                Barajar
              </button>
            </>
          )}
          <select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)} title="Nivel gráfico">
            {QUALITY_LEVELS.map((q) => (
              <option key={q} value={q}>
                {QUALITY_NAMES[q]}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="lab-stage" ref={host} />
      <footer className="lab-notes" hidden={view === 'silhouette'}>
        {view === 'levels' || (view === 'board' && flair !== 'none') ? (
          <>
            {FLAIRS.map((option) => (
              <p key={option.id}>
                <b>{option.name}.</b> {option.about}
              </p>
            ))}
            <p className="lab-ask">
              Niveles con premio (5 plata, 10 oro, 15 rubí, 20 cristal, como la medallita): Carmine eligió el jardincito y ya está en el juego. Las otras
              tres filas lo enseñan combinado con ellas, por si se quiere mezclar alguna.
            </p>
          </>
        ) : (
          <>
            {SHOOTER_DESIGNS.map((design) => (
              <p key={design.id}>
                <b>{DESIGN_NAMES[design.id]}.</b> {ABOUT[design.id]}
              </p>
            ))}
            <p className="lab-ask">
              Carmine eligió &quot;Brote&quot; y se queda el verde (X-01 a X-03): ya está en el juego. La de antes queda como &quot;Legacy&quot;; cactus y vaina, solo aquí.
            </p>
          </>
        )}
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<ShooterLab />);
