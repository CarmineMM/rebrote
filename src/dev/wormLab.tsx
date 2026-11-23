import * as Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { viewFor } from '../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import { WORM_FLAIRS, type WormFlairId } from './wormFlair';
import { WORM_LAB_SCENES, WormBoardScene, WormLevelsScene, type LevelRange, type TroopChoice, type WormLabView } from './wormLabScenes';
import './shooterLab.css';

/**
 * Galeria de adornos de nivel de los gusanos: `npm run dev` y abrir `/proposals/gusanos.html`. Cuatro propuestas para marcar los
 * tramos de nivel (5, 10, 15 y 20) de las tres tropas sin tocar su dibujo, como el jardincito de las disparadoras
 * (T-027). No la ve el jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

const TABS: ReadonlyArray<readonly [WormLabView, string]> = [
  ['levels', 'Niveles'],
  ['board', 'Tablero'],
];

const TROOP_OPTIONS: ReadonlyArray<readonly [TroopChoice, string]> = [
  ['worm', 'Gusano'],
  ['armored', 'Acorazado'],
  ['spitter', 'Escupidor'],
  ['mix', 'Las tres mezcladas'],
];

function WormLab() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [view, setView] = useState<WormLabView>('levels');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [troop, setTroop] = useState<TroopChoice>('worm');
  const [flair, setFlair] = useState<WormFlairId>('trail');
  const [range, setRange] = useState<LevelRange>('outbreak1');

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
    created.scene.add(WORM_LAB_SCENES.levels, WormLevelsScene, view === 'levels', { quality, troop });
    created.scene.add(WORM_LAB_SCENES.board, WormBoardScene, view === 'board', { quality, flair, range });
    game.current = created;
    (window as unknown as { __wormLab?: Phaser.Game }).__wormLab = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: lo demas cambia de escena sin recrear el juego.
  }, [quality]);

  const start = (next: WormLabView, data: object) => {
    const g = game.current;
    if (!g) return;
    for (const key of Object.values(WORM_LAB_SCENES)) if (g.scene.isActive(key)) g.scene.stop(key);
    g.scene.start(WORM_LAB_SCENES[next], { quality, ...data });
  };

  const pickView = (next: WormLabView) => {
    setView(next);
    start(next, next === 'levels' ? { troop } : { flair, range });
  };

  return (
    <div className="lab">
      <header className="lab-bar">
        <h1>
          Gusanos · adorno de nivel <span>propuestas, solo desarrollo</span>
        </h1>
        <nav className="lab-tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={view === id ? 'is-on' : ''} onClick={() => pickView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="lab-tools">
          {view === 'levels' && (
            <>
              <button onClick={() => start('levels', { troop })}>Ver aparecer</button>
              <select
                value={troop}
                onChange={(event) => {
                  const next = event.target.value as TroopChoice;
                  setTroop(next);
                  start('levels', { troop: next });
                }}
              >
                {TROOP_OPTIONS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          )}
          {view === 'board' && (
            <>
              <select
                value={flair}
                onChange={(event) => {
                  const next = event.target.value as WormFlairId;
                  setFlair(next);
                  start('board', { flair: next, range });
                }}
              >
                {WORM_FLAIRS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.letter} · {option.name}
                  </option>
                ))}
              </select>
              <select
                value={range}
                onChange={(event) => {
                  const next = event.target.value as LevelRange;
                  setRange(next);
                  start('board', { flair, range: next });
                }}
              >
                <option value="outbreak1">Niveles del final del brote 1 (3 a 10)</option>
                <option value="all">Niveles 1 a 20</option>
              </select>
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
      <footer className="lab-notes">
        {WORM_FLAIRS.map((option) => (
          <p key={option.id}>
            <b>
              {option.letter} · {option.name}.
            </b>{' '}
            {option.about}
          </p>
        ))}
        <p className="lab-ask">
          Tramos como la medallita: 5 plata, 10 oro, 15 rubí, 20 cristal (en el brote 1 los enemigos llegan al 10). Carmine eligió el aura (D) y ya está en el juego
          (T-030): la llevan todos los de nivel 5 o más. Las otras tres columnas la enseñan combinada con ellas, como referencia.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<WormLab />);
