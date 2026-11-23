import * as Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LURKER_DESIGN, LURKER_DESIGNS, SKIPPER_DESIGN, SKIPPER_DESIGNS, type LurkerDesign } from '../game/view/bugArt';
import { viewFor } from '../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import { BUG_ACTIONS, BUG_LAB_SCENES, BugBoardScene, BugLooksScene, type BugAction, type BugLabView } from './bugLabScenes';
import './shooterLab.css';

/**
 * Galeria de las tropas del brote 3 (T-038): `npm run dev` y abrir `/proposals/bichos.html`. Tres propuestas para los Lurker y tres
 * para el Skipper (LK-01), con la vista del juego (`BugView`). "Aspecto" las pone lado a lado; "Tablero" las suelta con las
 * reglas de verdad. No la ve el jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

const TABS: ReadonlyArray<readonly [BugLabView, string]> = [
  ['looks', 'Aspecto'],
  ['board', 'Tablero'],
];

function BugLab() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [view, setView] = useState<BugLabView>('looks');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [lurker, setLurker] = useState<LurkerDesign>(LURKER_DESIGN);

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
    created.scene.add(BUG_LAB_SCENES.looks, BugLooksScene, view === 'looks', { quality });
    created.scene.add(BUG_LAB_SCENES.board, BugBoardScene, view === 'board', { quality, lurker });
    game.current = created;
    (window as unknown as { __bugLab?: Phaser.Game }).__bugLab = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: lo demas cambia de escena sin recrear el juego.
  }, [quality]);

  const start = (next: BugLabView, data: { lurker?: LurkerDesign } = {}) => {
    const g = game.current;
    if (!g) return;
    for (const key of Object.values(BUG_LAB_SCENES)) if (g.scene.isActive(key)) g.scene.stop(key);
    g.scene.start(BUG_LAB_SCENES[next], { quality, lurker, ...data });
  };

  const act = (action: BugAction) => {
    const scene = game.current?.scene.getScene(BUG_LAB_SCENES.looks) as BugLooksScene | undefined;
    scene?.act(action);
  };

  return (
    <div className="lab">
      <header className="lab-bar">
        <h1>
          Bichos del brote 3 <span>Lurker y Skipper, solo desarrollo</span>
        </h1>
        <nav className="lab-tabs">
          {TABS.map(([id, name]) => (
            <button
              key={id}
              className={view === id ? 'is-on' : ''}
              onClick={() => {
                setView(id);
                start(id);
              }}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="lab-tools">
          {view === 'board' && (
            <select
              value={lurker}
              title="Propuesta de Lurker en los carriles de abajo"
              onChange={(event) => {
                const next = event.target.value as LurkerDesign;
                setLurker(next);
                start('board', { lurker: next });
              }}
            >
              {LURKER_DESIGNS.map((option) => (
                <option key={option.id} value={option.id}>
                  Lurker {option.letter} · {option.name}
                </option>
              ))}
            </select>
          )}
          <select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)} title="Nivel gráfico">
            {QUALITY_LEVELS.map((q) => (
              <option key={q} value={q}>
                {QUALITY_NAMES[q]}
              </option>
            ))}
          </select>
        </div>
        {view === 'looks' && (
          <div className="lab-actions">
            {BUG_ACTIONS.map(([id, name]) => (
              <button key={id} onClick={() => act(id)}>
                {name}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="lab-stage" ref={host} />
      <footer className="lab-notes">
        <p>
          <b>Lurker</b> (base, escupidor y acorazado; llegan ocultos):
        </p>
        {LURKER_DESIGNS.map((option) => (
          <p key={option.id}>
            <b>
              {option.letter} · {option.name}
              {option.id === LURKER_DESIGN ? ' (en el juego)' : ''}.
            </b>{' '}
            {option.about}
          </p>
        ))}
        <p>
          <b>Skipper</b> (salta por encima de todo lo que no sea escudo):
        </p>
        {SKIPPER_DESIGNS.map((option) => (
          <p key={option.id}>
            <b>
              {option.letter} · {option.name}
              {option.id === SKIPPER_DESIGN ? ' (en el juego)' : ''}.
            </b>{' '}
            {option.about}
          </p>
        ))}
        <p className="lab-ask">
          LK-01: Carmine eligió el camaleón (B) y el saltamontes (A) el 22 nov 2026; las otras se quedan como referencia. El carril «Oculto» enseña la silueta que
          tiembla de LK-02. El juego usa los que digan `LURKER_DESIGN` y `SKIPPER_DESIGN` en `src/game/view/bugArt.ts`.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<BugLab />);
