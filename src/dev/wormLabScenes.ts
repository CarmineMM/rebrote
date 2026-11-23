import * as Phaser from 'phaser';
import { BOARD, ENEMIES, ENEMY_LEVELS } from '../game/config/balance';
import { spawnEnemy, type Enemy, type EnemyKind } from '../game/core/combat';
import { createMatch } from '../game/core/match';
import { applyPostFx, fitCamera } from '../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../game/view/ambience';
import { Effects } from '../game/view/effects';
import { DEPTH, perspective } from '../game/view/layout';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../game/view/quality';
import { registerTextures } from '../game/view/textures';
import { WormView } from '../game/view/wormView';
import { WORM_FLAIRS, WormFlair, registerWormFlairTextures, wormFlairTier, type WormFlairId } from './wormFlair';

/**
 * Escenas de la galeria de adornos de nivel de los gusanos (`/propuestas/gusanos.html`): solo con `npm run dev`. Usan la vista del
 * juego (`WormView`) sobre el tablero de verdad, asi que andan, ondulan y llevan su medallita como en una partida. No las
 * ve el jugador: sus textos van en espanol sin `src/i18n/`.
 */

export const WORM_LAB_SCENES = { levels: 'wlab-levels', board: 'wlab-board' } as const;
export type WormLabView = keyof typeof WORM_LAB_SCENES;

/** Tropa de la vista "Niveles": una de las tres o las tres mezcladas (una por carril). */
export type TroopChoice = EnemyKind | 'mix';
/** Niveles de la vista "Tablero": los del final del brote 1 (3 a 10) o del 1 al 20. */
export type LevelRange = 'outbreak1' | 'all';

const TROOPS: readonly EnemyKind[] = ['worm', 'armored', 'spitter'];

const LABEL_STYLE = { fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 7 };

interface WormLabData {
  quality: QualityLevel;
}

function prepare(scene: Phaser.Scene, quality: QualityProfile): { ambience: Ambience; fx: Effects } {
  registerTextures(scene, quality.renderScale);
  registerWormFlairTextures(scene);
  const fit = () => fitCamera(scene, quality.renderScale);
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
  const ambience = createAmbience(scene, quality);
  applyPostFx(scene, quality);
  return { ambience, fx: new Effects(scene, quality) };
}

/** Un enemigo del estado de combate, sin partida alrededor: solo para pintarlo. */
function makeEnemy(kind: EnemyKind, lane: number, x: number, level: number): Enemy {
  const state = spawnEnemy(createMatch(), kind, lane, x, undefined, 1, level);
  return state.enemies[state.enemies.length - 1];
}

interface Walker {
  enemy: Enemy;
  view: WormView;
  flair: WormFlair;
  stride: number;
}

// ---------------------------------------------------------------------------
// Niveles

interface LevelsData extends WormLabData {
  troop: TroopChoice;
}

/** Un carril por tramo (de atras adelante: 1, 5, 10, 15 y 20) y una columna por propuesta (cuatro). */
const LEVELS = {
  levels: [1, 5, 10, 15, 20],
  titles: ['Nivel 1', '5 · plata', '10 · oro', '15 · rubí', '20 · cristal'],
  /** Una columna por propuesta, repartidas por las nueve del tablero. */
  columns: [1.2, 3.4, 5.6, 7.8],
} as const;

/**
 * Las propuestas lado a lado en el tablero de verdad: cada carril es un tramo y cada columna una propuesta. Los
 * gusanos andan sin moverse de su sitio, como en la portada, para ver la huella, la orbita y el banderin en marcha.
 */
export class WormLevelsScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private troop: TroopChoice = 'worm';
  private ambience?: Ambience;
  private walkers: Walker[] = [];

  constructor() {
    super(WORM_LAB_SCENES.levels);
  }

  init(data: Partial<LevelsData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.troop = data.troop ?? 'worm';
    this.walkers = [];
  }

  create(): void {
    const { ambience, fx } = prepare(this, this.quality);
    this.ambience = ambience;
    const text = (x: number, y: number, label: string, size: number, origin: [number, number], wrap?: number) =>
      this.add
        .text(x, y, label, {
          ...LABEL_STYLE,
          fontSize: `${size}px`,
          resolution: this.quality.renderScale,
          align: 'center',
          ...(wrap ? { wordWrap: { width: wrap } } : {}),
        })
        .setOrigin(...origin)
        .setDepth(DEPTH.floatText);

    WORM_FLAIRS.forEach((flair, column) => {
      const top = perspective.toScreen({ x: LEVELS.columns[column], y: -0.42 });
      // En dos lineas si no cabe: las cuatro columnas estan juntas.
      text(top.x, top.y, `${flair.letter} · ${flair.name}`, 24, [0.5, 1], 180);
    });
    LEVELS.levels.forEach((level, lane) => {
      const at = perspective.toScreen({ x: -0.12, y: lane + 0.55 });
      text(at.x, at.y, LEVELS.titles[lane], 24, [1, 0.5]);
      WORM_FLAIRS.forEach((flair, column) => {
        const kind = this.troop === 'mix' ? TROOPS[(lane + column) % TROOPS.length] : this.troop;
        const enemy = makeEnemy(kind, lane, LEVELS.columns[column], level);
        const delay = (lane * 3 + column) * 60;
        const view = new WormView(this, fx, enemy, true, delay);
        const flairView = new WormFlair(this, fx, flair.id, wormFlairTier(level), view, ENEMIES[kind].speed, delay);
        this.walkers.push({ enemy, view, flair: flairView, stride: 0 });
      });
    });
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    for (const walker of this.walkers) {
      walker.stride += (ENEMIES[walker.enemy.kind].speed * delta) / 1000;
      walker.view.sync(walker.enemy, walker.stride);
      walker.flair.update(delta);
    }
  }
}

// ---------------------------------------------------------------------------
// Tablero

interface BoardData extends WormLabData {
  flair: WormFlairId;
  range: LevelRange;
}

/** Gusanos por carril que cruzan el tablero a la vez. */
const PER_LANE = 3;

/** Nivel al azar con los pesos de una tabla (`ENEMY_LEVELS.tables`). */
function weighted(table: Readonly<Record<number, number>>, random: () => number): number {
  const entries = Object.entries(table).map(([level, weight]) => [Number(level), weight] as const);
  let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [level, weight] of entries) {
    roll -= weight;
    if (roll < 0) return level;
  }
  return entries[entries.length - 1][0];
}

/**
 * Una propuesta en una partida de mentira: gusanos, acorazados y escupidores de varios niveles cruzando los cinco
 * carriles de verdad, a su velocidad, y vuelta a empezar por la derecha. Para juzgar el adorno a su tamano real, con
 * muchos a la vez, en los carriles del fondo y en pantallas pequenas.
 */
export class WormBoardScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private flairId: WormFlairId = 'trail';
  private range: LevelRange = 'outbreak1';
  private ambience?: Ambience;
  private fx?: Effects;
  private walkers: Walker[] = [];
  private random: () => number = Math.random;

  constructor() {
    super(WORM_LAB_SCENES.board);
  }

  init(data: Partial<BoardData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.flairId = data.flair ?? 'trail';
    this.range = data.range ?? 'outbreak1';
    this.walkers = [];
    // Siempre el mismo reparto para poder comparar las propuestas.
    let seed = 20261121;
    this.random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  create(): void {
    const { ambience, fx } = prepare(this, this.quality);
    this.ambience = ambience;
    this.fx = fx;
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      for (let i = 0; i < PER_LANE; i++) {
        const x = 0.6 + i * (BOARD.columns / PER_LANE) + this.random() * 1.2 + lane * 0.35;
        this.spawn(lane, x, (lane * PER_LANE + i) * 50);
      }
    }
  }

  private nextLevel(): number {
    if (this.range === 'all') return 1 + Math.floor(this.random() * 20);
    return weighted(ENEMY_LEVELS.tables.late, this.random);
  }

  private spawn(lane: number, x: number, delayMs: number): void {
    if (!this.fx) return;
    const kind = TROOPS[Math.floor(this.random() * TROOPS.length)];
    const level = this.nextLevel();
    const enemy = makeEnemy(kind, lane, x, level);
    const view = new WormView(this, this.fx, enemy, true, delayMs);
    const flair = new WormFlair(this, this.fx, this.flairId, wormFlairTier(level), view, 0, delayMs);
    this.walkers.push({ enemy, view, flair, stride: 0 });
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    for (const walker of this.walkers) {
      const { enemy } = walker;
      walker.enemy = { ...enemy, x: enemy.x - (ENEMIES[enemy.kind].speed * delta) / 1000 };
      walker.view.sync(walker.enemy);
      walker.flair.update(delta);
    }
    // El que sale por la izquierda vuelve a entrar por la derecha como otro (otra tropa y otro nivel).
    const gone = this.walkers.filter((walker) => walker.enemy.x < -1.4);
    for (const walker of gone) {
      walker.view.die();
      walker.flair.destroy();
      this.walkers.splice(this.walkers.indexOf(walker), 1);
      this.spawn(walker.enemy.lane, BOARD.columns + 0.9 + this.random() * 0.8, 0);
    }
  }
}
