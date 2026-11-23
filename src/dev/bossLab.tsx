import * as Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ELK_HUB, ELK_HUBS } from '../game/view/elkClonerArt';
import { BRAIN_DESIGN, BRAIN_DESIGNS } from '../game/view/brainArt';
import { viewFor } from '../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import { BOSS_LAB_SCENES, BossLooksScene } from './bossLabScenes';
import './shooterLab.css';

/**
 * Propuestas de los jefes (T-026): `npm run dev` y abrir `/propuestas/jefes.html`. Pone a Creeper y a Elk Cloner lado a
 * lado, Elk Cloner con cada propuesta del aro del disquete (`ELK_HUBS`), y detras las tres propuestas de Brain (T-039,
 * BR-01, `BRAIN_DESIGNS`). Usa las vistas del juego, asi que se ve como en una partida. Lo que hace cada jefe en su combate
 * ("Movimientos") esta en el catalogo, `/catalogo/jefes.html` (T-040). No la ve el jugador (`npm run build` no la
 * incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

function BossLab() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('high');
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
    created.scene.add(BOSS_LAB_SCENES.looks, BossLooksScene, true, { quality, zoom });
    game.current = created;
    (window as unknown as { __bossLab?: Phaser.Game }).__bossLab = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: acercar reinicia la escena sin recrear el juego.
  }, [quality]);

  return (
    <div className="lab">
      <header className="lab-bar">
        <h1>
          Jefes <span>propuestas de aspecto, solo desarrollo · <a href="/catalogo/jefes.html">sus movimientos, en el catálogo</a></span>
        </h1>
        <div className="lab-tools">
          <label className="lab-check">
            <input
              type="checkbox"
              checked={zoom}
              onChange={(event) => {
                setZoom(event.target.checked);
                game.current?.scene.getScene(BOSS_LAB_SCENES.looks)?.scene.restart({ quality, zoom: event.target.checked });
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
      </header>
      <div className="lab-stage" ref={host} />
      <footer className="lab-notes">
        {BRAIN_DESIGNS.map((option) => (
          <p key={option.id}>
            <b>
              Brain {option.letter} · {option.name}
              {option.id === BRAIN_DESIGN ? ' (en el juego)' : ''}.
            </b>{' '}
            {option.about}
          </p>
        ))}
        <p className="lab-ask">
          BR-01 (T-039): las tres van de pie y sin disquete, para no parecerse a Creeper ni a Elk Cloner. Carmine eligió la cúpula (A, 23 nov 2026); las otras se
          quedan como referencia. Botan en su sitio y se ocultan a la vez cada poco (la silueta morada de los Lurker); lo que hace en su combate está en el
          catálogo. El juego usa la que diga `BRAIN_DESIGN` en `src/game/view/brainArt.ts`.
        </p>
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
