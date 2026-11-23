import * as Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnemyKind } from '../game/core/combat';
import { outbreakNumber, outbreaksBefore, type OutbreakId } from '../game/core/outbreaks';
import { troopHome, troopVariant } from '../game/core/variants';
import { viewFor } from '../game/view/layout';
import { portraitUrl } from '../game/view/portrait';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import { TROOP_TINTS, VARIANT_TINTS, type TroopTintId } from '../game/view/troopTint';
import { setLanguage, text } from '../i18n';
import { usePhotoScene } from './catalog/kit';
import { allRosters } from './catalog/roster';
import { TROOP_ACTIONS, TROOP_STAGE, TroopStageScene, type TroopAction, type TroopStageRow } from './catalog/troopStage';
import './shooterLab.css';

/**
 * Galeria de las variantes de color (T-041, MT-01 y MT-05): `npm run dev` y abrir `/proposals/variantes.html`. Las tropas que
 * vuelven en el brote 4 (Morris), cada una al lado de su original y de cada propuesta de tinte (`TROOP_TINTS`), con la vista
 * del juego y sus botones: andar, atacar, golpe, hielo, fuego, ocultar y caer. Arriba se elige de que brote vienen y su nivel
 * (el 5 y el 10 llevan aura de plata y de oro, MT-05). Debajo, las fotos de la ficha de las once, por propuesta. No la ve el
 * jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin `src/i18n/`.
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };
/** El brote que recluta: el que se prueba. */
const RECRUITER: OutbreakId = 'morris';
/** Niveles que se pueden elegir: sin aura, aura de plata (el 5) y de oro (el 10, el de la escolta de un jefe). */
const LEVELS = [1, 5, 10] as const;
const CHOSEN = VARIANT_TINTS[RECRUITER];

/** Las tropas que vuelven en el brote que recluta, agrupadas por el brote de donde vienen. */
function troopsByHome(): Array<{ home: OutbreakId; kinds: EnemyKind[] }> {
  const recruited = allRosters()
    .find((roster) => roster.id === RECRUITER)
    ?.troops.map((troop) => troop.kind)
    .filter((kind) => troopVariant(kind, RECRUITER) !== null) ?? [];
  return outbreaksBefore(RECRUITER).map((outbreak) => ({ home: outbreak.id, kinds: recruited.filter((kind) => troopHome(kind) === outbreak.id) }));
}

function stageRows(kinds: readonly EnemyKind[], level: number): TroopStageRow[] {
  return kinds.map((kind) => ({
    kind,
    cells: [{ level, variant: null }, ...TROOP_TINTS.map((tint) => ({ level, variant: RECRUITER, tint: tint.id as TroopTintId }))],
  }));
}

const TITLES = ['Original', ...TROOP_TINTS.map((tint) => `${tint.letter} · ${tint.name}`)];

function VariantLab() {
  const groups = useMemo(() => troopsByHome(), []);
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [home, setHome] = useState<OutbreakId>(groups[0].home);
  const [level, setLevel] = useState<number>(LEVELS[0]);
  const photos = usePhotoScene();
  const kindsOf = (id: OutbreakId) => groups.find((group) => group.home === id)?.kinds ?? [];

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
    created.scene.add(TROOP_STAGE, TroopStageScene, true, { quality, rows: stageRows(kindsOf(home), level), titles: TITLES });
    game.current = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: lo demas reinicia la escena sin recrear el juego.
  }, [quality]);

  const show = (nextHome: OutbreakId, nextLevel: number) => {
    setHome(nextHome);
    setLevel(nextLevel);
    game.current?.scene.getScene(TROOP_STAGE)?.scene.restart({ quality, rows: stageRows(kindsOf(nextHome), nextLevel), titles: TITLES });
  };
  const act = (action: TroopAction) => (game.current?.scene.getScene(TROOP_STAGE) as TroopStageScene | undefined)?.act(action);
  const names = text().info.enemy.names;
  const all = groups.flatMap((group) => group.kinds);
  const photo = (kind: EnemyKind, tint: TroopTintId | null) =>
    portraitUrl(photos as Phaser.Scene, { kind: 'enemy', enemy: kind, level, enraged: false, hasted: false, variant: tint ? RECRUITER : null, ...(tint ? { tint } : {}) });

  return (
    <div className="lab variant-lab">
      <header className="lab-bar">
        <h1>
          Variantes de color <span>tropas que vuelven en el brote {outbreakNumber(RECRUITER)}, solo desarrollo</span>
        </h1>
        <nav className="lab-tabs">
          {groups.map((group) => (
            <button key={group.home} className={group.home === home ? 'is-on' : ''} onClick={() => show(group.home, level)}>
              Del brote {outbreakNumber(group.home)}
            </button>
          ))}
        </nav>
        <nav className="lab-tabs">
          {LEVELS.map((l) => (
            <button key={l} className={l === level ? 'is-on' : ''} onClick={() => show(home, l)}>
              Nivel {l}
            </button>
          ))}
        </nav>
        <div className="lab-tools">
          <select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)} title="Nivel gráfico">
            {QUALITY_LEVELS.map((q) => (
              <option key={q} value={q}>
                {QUALITY_NAMES[q]}
              </option>
            ))}
          </select>
        </div>
        <div className="lab-actions">
          {TROOP_ACTIONS.map(([id, name]) => (
            <button key={id} onClick={() => act(id)}>
              {name}
            </button>
          ))}
        </div>
      </header>
      <div className="lab-stage" ref={host} />
      <footer className="lab-notes variant-notes">
        {TROOP_TINTS.map((tint) => (
          <p key={tint.id}>
            <b>
              {tint.letter} · {tint.name}
              {tint.id === CHOSEN ? ' (en el juego)' : ''}.
            </b>{' '}
            {tint.idea}
          </p>
        ))}
        <div className="variant-sheet">
          {[null, ...TROOP_TINTS.map((tint) => tint.id as TroopTintId)].map((tint) => (
            <div key={tint ?? 'original'} className="variant-row">
              <span>{tint ? TROOP_TINTS.find((t) => t.id === tint)?.letter : 'Original'}</span>
              {all.map((kind) => (
                photos ? <img key={kind} src={photo(kind, tint)} alt={names[kind]} title={names[kind]} width={72} height={72} /> : <span key={kind} className="variant-wait" />
              ))}
            </div>
          ))}
        </div>
        <p className="lab-ask">
          MT-01: un tinte por brote, igual para las once tropas. Se recomienda A (Sombra): cada tropa conserva su color y se reconoce, todas cambian, y el aura de
          nivel se lee mejor que en la original. Un tinte de un solo color (se probó un ámbar de terminal) deja casi igual a la tropa que ya era de ese color.
          MT-05: con «Nivel 5» y «Nivel 10» se ve el aura de plata y de oro; «Hielo», «Fuego» y «Ocultar» enseñan que los estados se siguen leyendo. El juego usa el
          que diga `VARIANT_TINTS` en `src/game/view/troopTint.ts`.
        </p>
      </footer>
    </div>
  );
}

setLanguage('es');
createRoot(document.getElementById('root')!).render(<VariantLab />);
