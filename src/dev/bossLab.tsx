import * as Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BossKind } from '../game/core/combat';
import { ELK_HUB, ELK_HUBS, type ElkHub } from '../game/view/elkClonerArt';
import { viewFor } from '../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import { BOSS_ACTIONS, BOSS_LAB_SCENES, BossLooksScene, BossMovesScene, type BossAction, type BossLabView } from './bossLabScenes';
import './shooterLab.css';

/**
 * Galeria de los jefes (T-026): `npm run dev` y abrir `/jefes.html`. "Aspecto" pone a Creeper y a Elk Cloner lado a lado,
 * Elk Cloner con cada propuesta del aro del disquete (`ELK_HUBS`); "Movimientos", un jefe con un boton por cada cosa que
 * hace, o todas seguidas. Usa las vistas del juego, asi que se ve como en una partida. No la ve el jugador (`npm run build`
 * no la incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

const TABS: ReadonlyArray<readonly [BossLabView, string]> = [
  ['looks', 'Aspecto'],
  ['moves', 'Movimientos'],
];

const BOSSES: ReadonlyArray<readonly [BossKind, string]> = [
  ['elkCloner', 'Elk Cloner'],
  ['creeper', 'Creeper'],
];

function BossLab() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [view, setView] = useState<BossLabView>('looks');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [boss, setBoss] = useState<BossKind>('elkCloner');
  const [hub, setHub] = useState<ElkHub>(ELK_HUB);
  const [zoom, setZoom] = useState(false);

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
    created.scene.add(BOSS_LAB_SCENES.looks, BossLooksScene, view === 'looks', { quality, zoom });
    created.scene.add(BOSS_LAB_SCENES.moves, BossMovesScene, view === 'moves', { quality, zoom, boss, hub });
    game.current = created;
    (window as unknown as { __bossLab?: Phaser.Game }).__bossLab = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: lo demas cambia de escena sin recrear el juego.
  }, [quality]);

  const start = (next: BossLabView, data: { boss?: BossKind; hub?: ElkHub; zoom?: boolean } = {}) => {
    const g = game.current;
    if (!g) return;
    for (const key of Object.values(BOSS_LAB_SCENES)) if (g.scene.isActive(key)) g.scene.stop(key);
    g.scene.start(BOSS_LAB_SCENES[next], { quality, zoom, boss, hub, ...data });
  };

  const act = (action: BossAction) => {
    const scene = game.current?.scene.getScene(BOSS_LAB_SCENES.moves) as BossMovesScene | undefined;
    scene?.act(action);
  };

  return (
    <div className="lab">
      <header className="lab-bar">
        <h1>
          Jefes <span>aspecto y movimientos, solo desarrollo</span>
        </h1>
        <nav className="lab-tabs">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={view === id ? 'is-on' : ''}
              onClick={() => {
                setView(id);
                start(id);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="lab-tools">
          {view === 'moves' && (
            <>
              <select
                value={boss}
                onChange={(event) => {
                  const next = event.target.value as BossKind;
                  setBoss(next);
                  start('moves', { boss: next });
                }}
              >
                {BOSSES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              {boss === 'elkCloner' && (
                <select
                  value={hub}
                  title="Aro del disquete"
                  onChange={(event) => {
                    const next = event.target.value as ElkHub;
                    setHub(next);
                    start('moves', { hub: next });
                  }}
                >
                  {ELK_HUBS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.letter} · {option.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
          <label className="lab-check">
            <input
              type="checkbox"
              checked={zoom}
              onChange={(event) => {
                setZoom(event.target.checked);
                start(view, { zoom: event.target.checked });
              }}
            />
            Acercar
          </label>
          <select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)} title="Nivel gráfico">
            {QUALITY_LEVELS.map((q) => (
              <option key={q} value={q}>
                {QUALITY_NAMES[q]}
              </option>
            ))}
          </select>
        </div>
        {view === 'moves' && (
          <div className="lab-actions">
            <button className="is-on" onClick={() => act('demo')}>
              ▶ Ver todo seguido
            </button>
            {BOSS_ACTIONS[boss].map(([id, label]) => (
              <button key={id} onClick={() => act(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="lab-stage" ref={host} />
      <footer className="lab-notes">
        {ELK_HUBS.map((option) => (
          <p key={option.id}>
            <b>
              {option.letter} · {option.name}
              {option.id === ELK_HUB ? ' (en el juego)' : ''}.
            </b>{' '}
            {option.about}
          </p>
        ))}
        <p className="lab-ask">
          El aro del centro del disquete de Elk Cloner parecía un tercer ojo. Carmine eligió el mate (C, 22 nov 2026); el juego usa el que diga `ELK_HUB` en
          `src/game/view/elkClonerArt.ts`.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<BossLab />);
