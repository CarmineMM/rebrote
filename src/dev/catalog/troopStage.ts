import * as Phaser from 'phaser';
import { BOARD, ENEMIES, HOP } from '../../game/config/balance';
import { spawnEnemy, type Enemy, type EnemyKind } from '../../game/core/combat';
import { createMatch } from '../../game/core/match';
import { applyPostFx, fitCamera } from '../../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../../game/view/ambience';
import { createEnemyView } from '../../game/view/bossView';
import { Effects } from '../../game/view/effects';
import { DEPTH, perspective } from '../../game/view/layout';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../../game/view/quality';
import { registerTextures } from '../../game/view/textures';
import type { EnemyView } from '../../game/view/wormView';
import { text } from '../../i18n';

/**
 * Escenario del catalogo de tropas (`/catalog/tropas.html`, T-040): las tropas de un brote, una por carril, con la vista del
 * juego (`createEnemyView`, la misma que usa el tablero) en tres de sus niveles, para ver la medallita y el aura de cada
 * tramo. Andan sin moverse de su sitio (el Skipper salta en el suyo) y hacen lo que se les pida. Sin reglas de combate: lo
 * que dura (el hielo, el fuego, el ataque) se lleva aqui a mano. No la ve el jugador: sus textos van en espanol.
 */

export const TROOP_STAGE = 'catalog-troops';

export type TroopAction = 'walk' | 'attack' | 'hit' | 'freeze' | 'burn' | 'veil' | 'die';

export const TROOP_ACTIONS: ReadonlyArray<readonly [TroopAction, string]> = [
  ['walk', 'Andar / parar'],
  ['attack', 'Atacar'],
  ['hit', 'Golpe'],
  ['freeze', 'Hielo'],
  ['burn', 'Fuego'],
  ['veil', 'Ocultar / descubrir'],
  ['die', 'Caer'],
];

export interface TroopStageRow {
  readonly kind: EnemyKind;
  /** Hasta tres niveles, uno por columna. */
  readonly levels: readonly number[];
}

export interface TroopStageData {
  readonly quality: QualityLevel;
  readonly rows: readonly TroopStageRow[];
}

const COLUMNS = [2.2, 5, 7.8] as const;
const LABEL_STYLE = { fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 7 };

interface Walker {
  enemy: Enemy;
  view: EnemyView;
  anchor: number;
  stride: number;
  attackMs: number | null;
  respawnMs: number | null;
}

/** Los tres niveles que se ensenan de una tropa: el primero, el 5 (el aura, T-030) y el ultimo con que sale. */
export function stageLevels(levels: readonly number[]): number[] {
  if (levels.length === 0) return [1];
  const first = levels[0];
  const last = levels[levels.length - 1];
  const middle = levels.includes(5) ? 5 : levels[Math.floor(levels.length / 2)];
  return [...new Set([first, middle, last])];
}

export class TroopStageScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private rows: readonly TroopStageRow[] = [];
  private ambience?: Ambience;
  private fx?: Effects;
  private walkers: Walker[] = [];
  private walking = true;
  private veiled = true;

  constructor() {
    super(TROOP_STAGE);
  }

  init(data: Partial<TroopStageData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.rows = data.rows ?? [];
    this.walkers = [];
    this.walking = true;
    this.veiled = true;
  }

  create(): void {
    registerTextures(this, this.quality.renderScale);
    const fit = () => fitCamera(this, this.quality.renderScale);
    fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, fit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, fit));
    this.ambience = createAmbience(this, this.quality);
    applyPostFx(this, this.quality);
    this.fx = new Effects(this, this.quality);
    const names = text().info.enemy.names;
    const rows = this.rows.slice(0, BOARD.lanes);
    // Un titulo por columna, arriba: el nivel si todas lo comparten; si no, primero o ultimo (la medallita dice cual).
    COLUMNS.forEach((x, column) => {
      const levels = new Set(rows.map((row) => row.levels[column]).filter((level) => level !== undefined));
      if (levels.size === 0) return;
      const title = levels.size === 1 ? `Nivel ${[...levels][0]}` : column === 0 ? 'Su primer nivel' : 'Su último nivel';
      const top = perspective.toScreen({ x, y: -0.42 });
      this.label(top.x, top.y, title, 26, [0.5, 1]);
    });
    rows.forEach((row, lane) => {
      const at = perspective.toScreen({ x: -0.12, y: lane + 0.55 });
      this.label(at.x, at.y, names[row.kind], 24, [1, 0.5]);
      row.levels.slice(0, COLUMNS.length).forEach((level, column) => {
        this.walkers.push(this.spawn(row.kind, lane, COLUMNS[column], level, (lane * COLUMNS.length + column) * 120));
      });
    });
  }

  private label(x: number, y: number, value: string, size: number, origin: [number, number]) {
    return this.add
      .text(x, y, value, { ...LABEL_STYLE, fontSize: `${size}px`, resolution: this.quality.renderScale })
      .setOrigin(...origin)
      .setDepth(DEPTH.floatText);
  }

  private spawn(kind: EnemyKind, lane: number, x: number, level: number, delayMs: number): Walker {
    const state = spawnEnemy(createMatch(), kind, lane, x, undefined, 1, level);
    const enemy = this.dress(state.enemies[state.enemies.length - 1]);
    const view = createEnemyView(this, this.fx as Effects, enemy, true, delayMs);
    return { enemy, view, anchor: x, stride: 0, attackMs: null, respawnMs: null };
  }

  /** Los que llegan ocultos (Lurker), ocultos o descubiertos segun el boton. */
  private dress(enemy: Enemy): Enemy {
    if (enemy.revealMs === null) return enemy;
    return { ...enemy, revealMs: this.veiled ? 0 : 1 };
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    for (const walker of this.walkers) {
      if (walker.respawnMs !== null) {
        walker.respawnMs -= delta;
        if (walker.respawnMs <= 0) Object.assign(walker, this.spawn(walker.enemy.kind, walker.enemy.lane, walker.anchor, walker.enemy.level, 0));
        continue;
      }
      walker.enemy = this.dress(this.tick(walker, delta));
      walker.view.sync(walker.enemy, walker.stride);
    }
  }

  private tick(walker: Walker, delta: number): Enemy {
    let enemy = walker.enemy;
    const stats = ENEMIES[enemy.kind];
    if (enemy.slow) enemy = { ...enemy, slow: enemy.slow.ms > delta ? { ...enemy.slow, ms: enemy.slow.ms - delta } : null };
    if (enemy.burn) enemy = { ...enemy, burn: enemy.burn.ms > delta ? { ...enemy.burn, ms: enemy.burn.ms - delta } : null };
    if (walker.attackMs !== null) {
      walker.attackMs -= delta;
      if (walker.attackMs <= 0) {
        walker.attackMs = null;
        if (stats.attack === 'spit') walker.view.spat();
        else if (stats.attack === 'verse') walker.view.sang();
        else walker.view.chomp();
      }
    }
    enemy = { ...enemy, attackMs: walker.attackMs };
    if (enemy.hop) return this.hop(walker, enemy, delta);
    if (this.walking && walker.attackMs === null) walker.stride += (stats.speed * delta * (enemy.slow ? 1 - enemy.slow.amount : 1)) / 1000;
    return enemy;
  }

  /** El Skipper salta en su sitio: descansa, vuela `HOP.length` casillas y vuelve a su sitio al caer. */
  private hop(walker: Walker, enemy: Enemy, delta: number): Enemy {
    const slowed = enemy.slow ? 1 - enemy.slow.amount : 1;
    const rest = { ...enemy, x: walker.anchor, hop: { stage: 'rest' as const, ms: HOP.restMs, from: walker.anchor, to: walker.anchor } };
    if (!this.walking || walker.attackMs !== null) return rest;
    const hop = enemy.hop as NonNullable<Enemy['hop']>;
    if (hop.stage === 'rest') {
      const ms = hop.ms - delta * slowed;
      walker.stride = 0;
      if (ms > 0) return { ...enemy, x: walker.anchor, hop: { ...hop, ms } };
      const view = walker.view as EnemyView & { hopped?: () => void };
      view.hopped?.();
      return { ...enemy, x: walker.anchor, hop: { stage: 'air', ms: 0, from: walker.anchor, to: walker.anchor - HOP.length } };
    }
    const x = enemy.x - (HOP.length / HOP.airMs) * delta;
    if (x > hop.to) {
      walker.stride = walker.anchor - x;
      return { ...enemy, x };
    }
    walker.stride = 0;
    return rest;
  }

  act(action: TroopAction): void {
    if (action === 'walk') {
      this.walking = !this.walking;
      return;
    }
    if (action === 'veil') {
      this.veiled = !this.veiled;
      return;
    }
    for (const walker of this.walkers) {
      if (walker.respawnMs !== null) continue;
      const { enemy, view } = walker;
      const stats = ENEMIES[enemy.kind];
      switch (action) {
        case 'attack':
          if (stats.attack === 'verse') view.inhale();
          walker.attackMs = stats.attack === 'bite' ? stats.firstBiteMs : stats.attack === 'verse' ? stats.warnMs : 650;
          break;
        case 'hit':
          view.hit();
          break;
        case 'freeze':
          walker.enemy = { ...enemy, slow: { amount: 0.7, ms: 4000 } };
          view.frosted();
          break;
        case 'burn':
          walker.enemy = { ...enemy, burn: { dps: 8, ms: 3000 } };
          break;
        case 'die':
          view.die();
          walker.respawnMs = 1400;
          break;
      }
    }
  }
}
