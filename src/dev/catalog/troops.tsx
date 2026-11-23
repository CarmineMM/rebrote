import * as Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ENEMIES, ENEMY_LEVELS } from '../../game/config/balance';
import { enemyDamage, enemyMaxHp, leavesClone, type EnemyKind } from '../../game/core/combat';
import { viewFor } from '../../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../../game/view/quality';
import { setLanguage, text } from '../../i18n';
import { CatalogBar, EntityCard, Medal, enemyCard, num, sampleEnemy, usePhotoScene } from './kit';
import { allRosters, spanText, type RosterOutbreak, type RosterTroop } from './roster';
import { TROOP_ACTIONS, TROOP_STAGE, TroopStageScene, stageLevels, type TroopAction } from './troopStage';
import '../../styles.css';
import './catalog.css';

/**
 * Catalogo de tropas (T-040, ADR-0023): `npm run dev` y abrir `/catalog/tropas.html`. Cada brote con las tropas que saca
 * su guion (`roster.ts`): arriba, andando sobre el tablero con la vista del juego en tres de sus niveles; debajo, en lista,
 * su ficha del juego y una tabla con lo que tiene en cada nivel con que sale. Una tropa nueva sale sola en cuanto esta en
 * el guion de un brote. No la ve el jugador (`npm run build` no la incluye), asi que sus textos van en espanol sin
 * `src/i18n/` (salvo la ficha, que es la del juego).
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };

interface AttackStats {
  readonly attack: 'bite' | 'spit' | 'verse' | 'recite';
  readonly speed: number;
  readonly reward: number;
  readonly biteIntervalMs?: number;
  readonly spitIntervalMs?: number;
  readonly verseIntervalMs?: number;
}

/** Como ataca cada tropa, para la cabecera de la tabla, y cada cuanto. */
function attackOf(kind: EnemyKind): { label: string; intervalMs: number } {
  const stats = ENEMIES[kind] as unknown as AttackStats;
  if (stats.attack === 'spit') return { label: 'Escupitajo', intervalMs: stats.spitIntervalMs ?? 1000 };
  if (stats.attack === 'verse') return { label: 'Verso', intervalMs: stats.verseIntervalMs ?? 1000 };
  return { label: 'Mordisco', intervalMs: stats.biteIntervalMs ?? 1000 };
}

/** "+18,5 %": lo que sube la vida respecto al nivel anterior (compuesto, T-035). */
function growth(kind: EnemyKind, level: number): string {
  if (level <= 1) return '—';
  return `+${num((enemyMaxHp(kind, level) / enemyMaxHp(kind, level - 1) - 1) * 100, 1)} %`;
}

function TroopEntry({ troop, scene }: { troop: RosterTroop; scene: Phaser.Scene | null }) {
  const [level, setLevel] = useState(troop.levels[0] ?? 1);
  const [clone, setClone] = useState(false);
  const card = useMemo(() => enemyCard(scene, sampleEnemy(troop.kind, level, { clone })), [scene, troop.kind, level, clone]);
  const { label, intervalMs } = attackOf(troop.kind);
  const copies = leavesClone({ kind: troop.kind, clone: false });
  const stats = ENEMIES[troop.kind] as unknown as AttackStats;
  return (
    <article className="cat-entry">
      <EntityCard info={card} />
      <div className="cat-detail">
        <h3>
          Cuándo sale <small>{num(troop.count)} en todo el brote (una por carril de cada grupo)</small>
        </h3>
        <ul className="cat-when">
          {troop.appearances.map((a) => (
            <li key={`${a.rounds.join()}:${a.fixed}`} className={a.escort ? 'is-escort' : ''}>
              <b>
                {a.rounds.length === 1 ? 'Ronda' : 'Rondas'} {spanText(a.rounds)}
              </b>{' '}
              · {a.levels.length === 1 ? 'nivel' : 'niveles'} {spanText(a.levels)}
              {a.escort ? ' · escolta del jefe' : a.fixed ? ' · nivel fijo' : ''}
            </li>
          ))}
        </ul>
        <h3>
          Por nivel <small>toca una fila para ver su ficha · da {num(stats.reward)} de moneda al caer, sea cual sea su nivel</small>
        </h3>
        <table className="cat-levels">
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Vida</th>
              <th>Sube</th>
              <th>{label}</th>
              <th>Daño/s</th>
              {copies && <th>Copia (vida · {label.toLowerCase()})</th>}
            </tr>
          </thead>
          <tbody>
            {troop.levels.map((l) => {
              const damage = enemyDamage({ kind: troop.kind, level: l });
              return (
                <tr key={l} className={l === level ? 'is-on' : ''} onClick={() => setLevel(l)}>
                  <td>
                    <Medal level={l} />
                  </td>
                  <td>{num(enemyMaxHp(troop.kind, l))}</td>
                  <td className="cat-dim">{growth(troop.kind, l)}</td>
                  <td>{num(damage, 1)}</td>
                  <td>{num((damage * 1000) / intervalMs, 1)}</td>
                  {copies && (
                    <td>
                      {num(enemyMaxHp(troop.kind, l, true))} · {num(enemyDamage({ kind: troop.kind, level: l, clone: true }), 1)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {copies && (
          <label className="cat-check">
            <input type="checkbox" checked={clone} onChange={(event) => setClone(event.target.checked)} /> Ver la ficha de su copia
          </label>
        )}
      </div>
    </article>
  );
}

function OutbreakSection({ roster, scene }: { roster: RosterOutbreak; scene: Phaser.Scene | null }) {
  const names = text().info.enemy.names;
  return (
    <section className="cat-outbreak" id={`brote-${roster.number}`}>
      <h2>
        Brote {roster.number} · {roster.boss ? names[roster.boss] : 'en preparación'}
        <small>
          {roster.rounds} rondas
          {roster.boss && roster.bossRound !== null && (
            <>
              {' '}
              · el jefe sale en la {roster.bossRound} · <a href={`/catalog/jefes.html#${roster.boss}`}>ver su ficha</a>
            </>
          )}
        </small>
      </h2>
      {roster.troops.map((troop) => (
        <TroopEntry key={troop.kind} troop={troop} scene={scene} />
      ))}
    </section>
  );
}

function TroopCatalog() {
  const rosters = useMemo(() => allRosters(), []);
  const scene = usePhotoScene();
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [shown, setShown] = useState(rosters[0].id);
  const rowsOf = (id: string) => (rosters.find((r) => r.id === id) ?? rosters[0]).troops.map((t) => ({ kind: t.kind, levels: stageLevels(t.levels) }));

  // El escenario se crea con su nivel grafico; cambiarlo lo vuelve a crear, como en el juego.
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
    created.scene.add(TROOP_STAGE, TroopStageScene, true, { quality, rows: rowsOf(shown) });
    game.current = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo al cambiar la calidad: el brote cambia la escena sin recrear el juego.
  }, [quality]);

  const show = (id: RosterOutbreak['id']) => {
    setShown(id);
    game.current?.scene.getScene(TROOP_STAGE)?.scene.restart({ quality, rows: rowsOf(id) });
  };
  const act = (action: TroopAction) => (game.current?.scene.getScene(TROOP_STAGE) as TroopStageScene | undefined)?.act(action);
  const names = text().info.enemy.names;

  return (
    <div className="cat">
      <CatalogBar page="troops">
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
          Las tropas de cada brote, sacadas de su guion (<code>OUTBREAKS</code> en <code>balance.ts</code>), con su ficha del juego y lo que tienen en cada nivel
          con que salen. La vida y el daño ya llevan la fuerza de todos (T-010) y la curva de nivel (T-035): cada nivel sube un {num(ENEMY_LEVELS.perLevel * 100, 1)} % sobre el anterior,
          y los que tienen premio (5, 10…), un {num(ENEMY_LEVELS.perMilestone * 100, 1)} %.
        </p>
        <section className="cat-stage-box">
          <div className="cat-stage-bar">
            <nav className="cat-pills">
              {rosters.map((r) => (
                <button key={r.id} className={r.id === shown ? 'is-on' : ''} onClick={() => show(r.id)}>
                  Brote {r.number}
                  {r.boss ? ` · ${names[r.boss]}` : ''}
                </button>
              ))}
            </nav>
            <div className="cat-actions">
              {TROOP_ACTIONS.map(([id, name]) => (
                <button key={id} onClick={() => act(id)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="cat-stage" ref={host} />
        </section>
        <nav className="cat-index">
          {rosters.map((r) => (
            <a key={r.id} href={`#brote-${r.number}`}>
              Brote {r.number}: {r.troops.map((t) => names[t.kind]).join(', ')}
            </a>
          ))}
        </nav>
        {rosters.map((roster) => (
          <OutbreakSection key={roster.id} roster={roster} scene={scene} />
        ))}
      </main>
    </div>
  );
}

setLanguage('es');
createRoot(document.getElementById('root') as HTMLElement).render(<TroopCatalog />);
