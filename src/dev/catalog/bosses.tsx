import * as Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BRAIN, CREEPER, ELK_CLONER, ENEMIES, MORRIS, OUTBREAKS } from '../../game/config/balance';
import { enemyMaxHp, isBoss, type BossKind } from '../../game/core/combat';
import { BRAIN_DESIGN } from '../../game/view/brainArt';
import { MORRIS_DESIGN } from '../../game/view/morrisArt';
import { ELK_HUB } from '../../game/view/elkClonerArt';
import { viewFor } from '../../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../../game/view/quality';
import { setLanguage, text } from '../../i18n';
import { BOSS_ACTIONS, BOSS_LAB_SCENES, BossMovesScene, type BossAction } from '../bossLabScenes';
import { CatalogBar, EntityCard, enemyCard, num, sampleEnemy, usePhotoScene } from './kit';
import { bossesInOrder } from './roster';
import '../../styles.css';
import './catalog.css';

/**
 * Catalogo de jefes (T-040, ADR-0023): `npm run dev` y abrir `/catalog/jefes.html`. Arriba, el jefe elegido sobre el
 * tablero con la vista del juego y un boton por cada cosa que hace (la escena de "Movimientos" que antes estaba en la
 * galeria de propuestas). Debajo, en lista, cada jefe con su ficha del juego (y la de su fase 2, si la tiene), los grupos
 * de su ronda (escolta y refuerzos) y sus numeros de `balance.ts`. Un jefe nuevo tiene que estar en `BOSS_NUMBERS` (si
 * falta, no compila). No la ve el jugador: sus textos van en espanol sin `src/i18n/` (salvo la ficha, que es la del juego).
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

/** Las reglas propias de cada jefe en `balance.ts`, ademas de lo comun de `ENEMIES`. Un jefe nuevo, aqui. */
const BOSS_NUMBERS: Record<BossKind, { readonly name: string; readonly values: object }> = {
  creeper: { name: 'CREEPER', values: CREEPER },
  elkCloner: { name: 'ELK_CLONER', values: ELK_CLONER },
  brain: { name: 'BRAIN', values: BRAIN },
  morris: { name: 'MORRIS', values: MORRIS },
};

/** Los que tienen fase 2 (cara roja, mas rapidos): se ensena su ficha en las dos. */
const ENRAGES: Record<BossKind, boolean> = { creeper: true, elkCloner: false, brain: true, morris: false };

/** Un valor de `balance.ts` en una linea: numeros con su separador, listas separadas por comas y objetos por partes. */
function flatten(values: object, prefix = ''): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(values)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'number') rows.push([name, num(value, 3)]);
    else if (Array.isArray(value)) rows.push([name, value.map((v) => (typeof v === 'number' ? num(v, 3) : String(v))).join(', ')]);
    else if (value && typeof value === 'object') rows.push(...flatten(value, name));
    else rows.push([name, String(value)]);
  }
  return rows;
}

/** "0:42": del ataque de la ronda, en minutos y segundos. */
function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function BossEntry({ boss, scene }: { boss: BossKind; scene: Phaser.Scene | null }) {
  const [enraged, setEnraged] = useState(false);
  const card = useMemo(() => enemyCard(scene, sampleEnemy(boss, 1, { enraged })), [scene, boss, enraged]);
  const names = text().info.enemy.names;
  const index = OUTBREAKS.findIndex((o) => o.boss === boss);
  const outbreak = index >= 0 ? OUTBREAKS[index] : null;
  const roundIndex = outbreak ? outbreak.rounds.findIndex((r) => r.groups.some((g) => g.kind === boss)) : -1;
  const round = outbreak && roundIndex >= 0 ? outbreak.rounds[roundIndex] : null;
  const bossAt = round?.groups.find((g) => g.kind === boss)?.atMs ?? 0;
  const numbers = BOSS_NUMBERS[boss];
  return (
    <article className="cat-entry" id={boss}>
      <div className="cat-detail">
        <EntityCard info={card} />
        {ENRAGES[boss] && (
          <label className="cat-check">
            <input type="checkbox" checked={enraged} onChange={(event) => setEnraged(event.target.checked)} /> Ver su fase 2
          </label>
        )}
      </div>
      <div className="cat-detail">
        <h3>
          Su combate{' '}
          <small>
            {outbreak && round ? `brote ${index + 1}, ronda ${roundIndex + 1} de ${outbreak.rounds.length}` : 'aún sin brote'} · vida en la partida{' '}
            {num(enemyMaxHp(boss))}
          </small>
        </h3>
        {round && (
          <ul className="cat-when">
            {round.groups.map((group, i) => (
              <li key={i} className={group.shout === 'escort' ? 'is-escort' : ''}>
                <b>{clock(group.atMs)}</b> · {names[group.kind]}
                {!isBoss(group.kind) && ` ×${group.lanes.length}`}
                {group.level !== undefined ? ` · nivel ${group.level}` : ''}
                {group.shout === 'escort' ? ' · escolta, con su grito' : ''}
                {!isBoss(group.kind) && group.atMs > bossAt ? ' · refuerzo mientras vive' : ''}
              </li>
            ))}
          </ul>
        )}
        <h3>
          Sus números <small>ENEMIES.{boss} y {numbers.name} en balance.ts, sin la fuerza de todos</small>
        </h3>
        <dl className="cat-facts">
          {[...flatten(ENEMIES[boss]), ...flatten(numbers.values)].map(([key, value]) => (
            <div key={key} style={{ display: 'contents' }}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function BossCatalog() {
  const bosses = useMemo(() => bossesInOrder(), []);
  const scene = usePhotoScene();
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [boss, setBoss] = useState<BossKind>(bosses[0]);
  const [zoom, setZoom] = useState(false);
  const names = text().info.enemy.names;
  // Siempre el aspecto del juego: las propuestas estan en `/proposals/jefes.html`.
  const data = (next: Partial<{ boss: BossKind; zoom: boolean }> = {}) => ({ quality, zoom, boss, hub: ELK_HUB, design: BRAIN_DESIGN, morrisDesign: MORRIS_DESIGN, ...next });

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
    created.scene.add(BOSS_LAB_SCENES.moves, BossMovesScene, true, data());
    game.current = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: lo demas reinicia la escena sin recrear el juego.
  }, [quality]);

  const restart = (next: Partial<{ boss: BossKind; zoom: boolean }>) => game.current?.scene.getScene(BOSS_LAB_SCENES.moves)?.scene.restart(data(next));
  const act = (action: BossAction) => (game.current?.scene.getScene(BOSS_LAB_SCENES.moves) as BossMovesScene | undefined)?.act(action);

  return (
    <div className="cat">
      <CatalogBar page="bosses">
        <label className="cat-check">
          <input
            type="checkbox"
            checked={zoom}
            onChange={(event) => {
              setZoom(event.target.checked);
              restart({ zoom: event.target.checked });
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
      </CatalogBar>
      <main className="cat-main">
        <p className="cat-intro">
          Los jefes en el orden de sus brotes, con el aspecto del juego (las propuestas de diseño están en <a href="/proposals/jefes.html">proposals/jefes</a>).
          Arriba, cada jefe con todo lo que hace en su combate; debajo, su ficha, los grupos de su ronda y sus números.
        </p>
        <section className="cat-stage-box">
          <div className="cat-stage-bar">
            <nav className="cat-pills">
              {bosses.map((id) => (
                <button
                  key={id}
                  className={id === boss ? 'is-on' : ''}
                  onClick={() => {
                    setBoss(id);
                    restart({ boss: id });
                  }}
                >
                  {names[id]}
                </button>
              ))}
            </nav>
            <div className="cat-actions">
              <button className="is-on" onClick={() => act('demo')}>
                ▶ Ver todo seguido
              </button>
              {BOSS_ACTIONS[boss].map(([id, label]) => (
                <button key={id} onClick={() => act(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="cat-stage" ref={host} />
        </section>
        {bosses.map((id) => (
          <section key={id} className="cat-outbreak">
            <h2>{names[id]}</h2>
            <BossEntry boss={id} scene={scene} />
          </section>
        ))}
      </main>
    </div>
  );
}

setLanguage('es');
createRoot(document.getElementById('root') as HTMLElement).render(<BossCatalog />);
