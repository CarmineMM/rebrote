import * as Phaser from 'phaser';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { BOARD, BRAIN, CREEPER } from '../../game/config/balance';
import { enemyMaxHp, isEnraged, jumpsCrossed, spawnEnemy, type Enemy, type EnemyKind } from '../../game/core/combat';
import { createMatch } from '../../game/core/match';
import type { OutbreakId } from '../../game/core/outbreaks';
import type { EntityInfo } from '../../game/EventBus';
import { CAST } from '../../game/view/characters/cast';
import { enemyInfo } from '../../game/view/entityInfo';
import { medalTier, showsMedal } from '../../game/view/levelMedal';
import { portraitUrl } from '../../game/view/portrait';
import { registerTextures } from '../../game/view/textures';
import { text } from '../../i18n';
import { Cameo, toneStyle } from '../../ui/story/Portrait';

/**
 * Piezas comunes de los catalogos de desarrollo (T-040, ADR-0023): `/catalog/tropas.html`, `/catalog/jefes.html` y
 * `/catalog/personajes.html`. Ensenan lo que hay en el juego tal como lo ve el jugador (su ficha, su foto y sus vistas),
 * con los numeros de las reglas de core. No los ve el jugador (`npm run build` no los incluye): sus textos propios van en
 * espanol sin `src/i18n/`; los del juego (la ficha) salen del idioma en curso.
 */

export type CatalogPage = 'troops' | 'bosses' | 'characters';

const PAGES: ReadonlyArray<readonly [CatalogPage, string, string]> = [
  ['troops', 'Tropas', '/catalog/tropas.html'],
  ['bosses', 'Jefes', '/catalog/jefes.html'],
  ['characters', 'Personajes', '/catalog/personajes.html'],
];

/** Barra de arriba: el nombre del catalogo y los enlaces a los otros dos. */
export function CatalogBar({ page, children }: { page: CatalogPage; children?: ReactNode }) {
  return (
    <header className="cat-bar">
      <h1>
        Catálogo <span>lo que hay en el juego, solo desarrollo</span>
      </h1>
      <nav className="cat-tabs">
        {PAGES.map(([id, name, href]) => (
          <a key={id} href={href} className={id === page ? 'is-on' : ''}>
            {name}
          </a>
        ))}
      </nav>
      {children && <div className="cat-tools">{children}</div>}
    </header>
  );
}

/** Escena invisible que solo pinta las texturas del juego, para componer las fotos de las fichas (`portrait.ts`). */
class PhotoScene extends Phaser.Scene {
  constructor(private readonly onReady: (scene: Phaser.Scene) => void) {
    super('catalog-photos');
  }

  create(): void {
    // Con la escala de Ultra: las fotos salen nitidas aunque se vean grandes.
    registerTextures(this, 2);
    this.onReady(this);
  }
}

/** La escena de las fotos cuando ya tiene sus texturas; null mientras se pintan. */
export function usePhotoScene(): Phaser.Scene | null {
  const [scene, setScene] = useState<Phaser.Scene | null>(null);
  useEffect(() => {
    const parent = document.createElement('div');
    parent.style.cssText = 'position:fixed;left:-10px;top:-10px;width:4px;height:4px;overflow:hidden;';
    document.body.appendChild(parent);
    const game = new Phaser.Game({ type: Phaser.AUTO, parent, width: 4, height: 4, audio: { noAudio: true }, banner: false });
    game.scene.add('catalog-photos', new PhotoScene(setScene), true);
    return () => {
      game.destroy(true);
      parent.remove();
    };
  }, []);
  return scene;
}

/** Fase del enemigo de muestra: la de un jefe en su fase 2 (Creeper y Brain), con la vida justo por debajo del umbral. */
export interface SampleOptions {
  readonly clone?: boolean;
  readonly enraged?: boolean;
  /** Variante de color (T-041): la tropa como sale en el brote que la recluta. */
  readonly variant?: OutbreakId | null;
}

/** Un enemigo de muestra recien salido por la derecha del carril del centro, como lo crea la partida (`spawnEnemy`). */
export function sampleEnemy(kind: EnemyKind, level: number, { clone = false, enraged = false, variant = null }: SampleOptions = {}): Enemy {
  const state = spawnEnemy(createMatch(), kind, Math.floor(BOARD.lanes / 2), BOARD.columns - 0.5, undefined, 1, level, variant);
  let enemy = state.enemies[state.enemies.length - 1];
  if (clone) enemy = { ...enemy, clone: true, hp: enemyMaxHp(kind, level, true) };
  if (enraged && (kind === 'creeper' || kind === 'brain')) {
    const below = kind === 'creeper' ? CREEPER.enragedBelow : BRAIN.enragedBelow;
    enemy = { ...enemy, hp: enemyMaxHp(kind, level) * below * 0.98 };
    enemy = { ...enemy, jumpsUsed: jumpsCrossed(enemy) };
  }
  return enemy;
}

/** La ficha del juego (T-010) de un enemigo de muestra, con su foto. */
export function enemyCard(scene: Phaser.Scene | null, enemy: Enemy): EntityInfo {
  const photo = scene
    ? portraitUrl(scene, { kind: 'enemy', enemy: enemy.kind, level: enemy.level, enraged: isEnraged(enemy), hasted: enemy.haste > 1, clone: enemy.clone, variant: enemy.variant })
    : '';
  return { ...enemyInfo(enemy), portrait: photo };
}

/** La ficha del juego tal cual (`InfoPanel`), pero quieta en la pagina: sin velo detras ni boton de cerrar. */
export function EntityCard({ info }: { info: EntityInfo }) {
  const { level, hp } = info;
  const life = hp.max > 0 ? hp.current / hp.max : 0;
  const t = text();
  return (
    <section className={`info-card tone-${info.tone} cat-card`}>
      <figure className="info-photo">{info.portrait ? <img src={info.portrait} alt={info.title} width={200} height={200} draggable={false} /> : <span className="cat-photo-wait" />}</figure>
      <div className="info-body">
        <header className="info-head">
          <h2 className="info-title">{info.title}</h2>
          <p className="info-subtitle">{info.subtitle}</p>
        </header>
        {level && (
          <p className="info-level">
            <Medal level={level.value} />
            <span>{t.info.level(level.value)}</span>
          </p>
        )}
        <div className="info-hp">
          <span className="info-hp-heart" aria-hidden="true" />
          <span className="info-hp-bar">
            <span className={`info-hp-fill${life <= 0.3 ? ' is-low' : ''}`} style={{ '--life': life } as CSSProperties} />
          </span>
          <span className="info-hp-value">
            {hp.current} / {hp.max}
          </span>
        </div>
        {info.tags.length > 0 && (
          <ul className="info-tags">
            {info.tags.map((tag) => (
              <li key={tag.text} className={`info-tag is-${tag.tone}`}>
                {tag.text}
              </li>
            ))}
          </ul>
        )}
        <dl className="info-stats">
          {info.stats.map((stat) => (
            <div key={stat.label} className="info-stat">
              <dt>{stat.label}</dt>
              <dd>
                {stat.value}
                {stat.note && <small>{stat.note}</small>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="info-about">{info.about}</p>
      </div>
      {info.lore && (
        <aside className="info-lore" style={toneStyle(CAST.boxer)}>
          <Cameo speaker="boxer" expression="normal" className="info-lore-cameo" />
          <p className="info-lore-text">
            <span className="info-lore-name">{t.story.names.boxer}</span>
            {info.lore}
          </p>
        </aside>
      )}
    </section>
  );
}

/** La medallita del nivel, con el color de su tramo, como en la ficha. */
export function Medal({ level }: { level: number }) {
  const tier = showsMedal(level) ? medalTier(level) : null;
  return (
    <span className={`medal ${tier === null ? 'medal-plain' : `medal-tier-${tier}`}`} aria-hidden="true">
      {level}
    </span>
  );
}

/** Numero redondeado con el separador de miles del espanol. */
export function num(value: number, digits = 0): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
