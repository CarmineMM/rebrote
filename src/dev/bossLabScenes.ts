import * as Phaser from 'phaser';
import { CREEPER, ELK_CLONER, ENEMIES, VERSE } from '../game/config/balance';
import { enemyMaxHp, spawnEnemy, type BossKind, type Enemy, type Verse } from '../game/core/combat';
import { createMatch, createWall } from '../game/core/match';
import { createShooter } from '../game/core/plants';
import { applyPostFx, fitCamera } from '../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../game/view/ambience';
import { createBossOmen, type BossOmen } from '../game/view/bossView';
import { CreeperView, OMEN_LEAP_MS } from '../game/view/creeperView';
import { ELK_HUB, ELK_HUBS, type ElkHub } from '../game/view/elkClonerArt';
import { ElkClonerView } from '../game/view/elkClonerView';
import { Effects } from '../game/view/effects';
import { DEPTH, SCENERY, perspective } from '../game/view/layout';
import { PlantView } from '../game/view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../game/view/quality';
import { elkHeadTexture, registerElkHubTextures, registerTextures } from '../game/view/textures';
import { VerseView } from '../game/view/verseView';
import { WallView } from '../game/view/wallView';
import { KIND_LOOK, WORM_LOOK, type KindLook } from '../game/view/wormView';
import { text } from '../i18n';

/**
 * Escenas de la galeria de jefes (`/jefes.html`): solo con `npm run dev`. Usan las vistas del juego (`CreeperView`,
 * `ElkClonerView`, sus versos y el jefe que se prepara) sobre el tablero de verdad, sin partida alrededor: lo que dura (el
 * aviso del poema, el salto de Creeper, la quemadura) se lleva aqui a mano, como lo llevaria el estado. No las ve el
 * jugador: sus textos van en espanol sin `src/i18n/` (salvo lo que dicen los jefes, que es lo del juego).
 */

export const BOSS_LAB_SCENES = { looks: 'blab-looks', moves: 'blab-moves' } as const;
export type BossLabView = keyof typeof BOSS_LAB_SCENES;

/** Lo que se le puede pedir a un jefe en "Movimientos". Cada jefe tiene los suyos (`BOSS_ACTIONS`). */
export type BossAction =
  | 'walk'
  | 'bite'
  | 'hit'
  | 'blast'
  | 'freeze'
  | 'burn'
  | 'verse'
  | 'poem'
  | 'jump'
  | 'rage'
  | 'talk'
  | 'omen'
  | 'die'
  | 'escape'
  | 'cheer'
  | 'demo';

const COMMON: ReadonlyArray<readonly [BossAction, string]> = [
  ['walk', 'Andar'],
  ['bite', 'Morder'],
  ['hit', 'Golpe'],
  ['blast', 'Explosión'],
  ['freeze', 'Hielo'],
  ['burn', 'Fuego'],
];
const ENDINGS: ReadonlyArray<readonly [BossAction, string]> = [
  ['omen', 'Prepararse'],
  ['die', 'Caer'],
  ['escape', 'Escaparse'],
  ['cheer', 'Celebrar'],
];

export const BOSS_ACTIONS: Record<BossKind, ReadonlyArray<readonly [BossAction, string]>> = {
  creeper: [...COMMON, ['jump', 'Saltar de carril'], ['rage', 'Fase 2'], ['talk', 'Hablar'], ...ENDINGS],
  elkCloner: [...COMMON, ['verse', 'Verso'], ['poem', 'Poema entero'], ...ENDINGS],
};

/** Lo que hace "Ver todo seguido": cada accion y cuanto se espera despues. */
const DEMO: Record<BossKind, ReadonlyArray<readonly [BossAction, number]>> = {
  creeper: [['bite', 1200], ['hit', 700], ['jump', 2600], ['rage', 2200], ['jump', 2200], ['freeze', 2400], ['burn', 2400], ['rage', 1500], ['talk', 2400], ['die', 2400], ['omen', 11000], ['cheer', 3000]],
  elkCloner: [['verse', 3000], ['bite', 1200], ['hit', 700], ['verse', 3200], ['poem', 7800], ['freeze', 2400], ['burn', 2400], ['blast', 1500], ['die', 2400], ['omen', 11000], ['escape', 2600]],
};

const LABEL_STYLE = { fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 7 };

interface BossLabData {
  quality: QualityLevel;
  /** Camara acercada a los jefes. */
  zoom: boolean;
}

/** Camara acercada: cuanto y a donde mira (en pantalla). */
interface Zoom {
  x: number;
  y: number;
  factor: number;
}

function prepare(scene: Phaser.Scene, quality: QualityProfile, zoomAt: Zoom | null): { ambience: Ambience; fx: Effects } {
  registerTextures(scene, quality.renderScale);
  registerElkHubTextures(scene);
  const fit = () => {
    fitCamera(scene, quality.renderScale);
    if (zoomAt) {
      const camera = scene.cameras.main;
      camera.setZoom(camera.zoom * zoomAt.factor).centerOn(zoomAt.x, zoomAt.y);
    }
  };
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
  const ambience = createAmbience(scene, quality);
  applyPostFx(scene, quality);
  return { ambience, fx: new Effects(scene, quality) };
}

/** Un enemigo del estado de combate, sin partida alrededor: solo para pintarlo. */
function makeBoss(kind: BossKind, lane: number, x: number): Enemy {
  const state = spawnEnemy(createMatch(), kind, lane, x);
  const boss = state.enemies[state.enemies.length - 1];
  // Elk Cloner sin reloj de versos: aqui recita cuando se le pide.
  return boss.recital ? { ...boss, recital: { ms: Infinity, sung: 0, poemMs: null } } : boss;
}

/** El aspecto de Elk Cloner con el aro `hub` del disquete. */
export function elkLook(hub: ElkHub): KindLook {
  const head = (mood: Parameters<typeof elkHeadTexture>[0]) => elkHeadTexture(mood, hub);
  return {
    ...KIND_LOOK.elkCloner,
    head: { idle: head('idle'), attack: head('bite'), hurt: head('hurt'), release: head('recite'), inhale: head('inhale'), poem: head('poem') },
  };
}

function bossView(scene: Phaser.Scene, fx: Effects, enemy: Enemy, hub: ElkHub, emerge: boolean, delayMs = 0): CreeperView | ElkClonerView {
  return enemy.kind === 'creeper' ? new CreeperView(scene, fx, enemy, emerge, delayMs) : new ElkClonerView(scene, fx, enemy, emerge, delayMs, elkLook(hub));
}

// ---------------------------------------------------------------------------
// Aspecto

/** Donde va cada uno en "Aspecto": Creeper y una Elk Cloner por cada aro, en el carril de delante. */
const LOOKS = { lane: 3, creeperX: 1.35, elkX: [3.45, 5.15, 6.85, 8.55] } as const;

/**
 * Los dos jefes en reposo, andando sin moverse de su sitio, en el carril de delante: Creeper y Elk Cloner con cada uno de
 * los aros del disquete (`ELK_HUBS`), el que usa el juego marcado.
 */
export class BossLooksScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private zoom = false;
  private ambience?: Ambience;
  private walkers: Array<{ enemy: Enemy; view: CreeperView | ElkClonerView; stride: number }> = [];

  constructor() {
    super(BOSS_LAB_SCENES.looks);
  }

  init(data: Partial<BossLabData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.zoom = data.zoom ?? false;
    this.walkers = [];
  }

  create(): void {
    const focus = perspective.toScreen({ x: 4.95, y: LOOKS.lane - 0.7 });
    const { ambience, fx } = prepare(this, this.quality, this.zoom ? { ...focus, factor: 1.45 } : null);
    this.ambience = ambience;
    const label = (x: number, title: string, chosen: boolean) => {
      const at = perspective.toScreen({ x, y: LOOKS.lane - 2.05 });
      this.add
        .text(at.x, at.y, chosen ? `★ ${title}\nen el juego` : title, {
          ...LABEL_STYLE,
          color: chosen ? '#ffe27a' : '#ffffff',
          fontSize: '20px',
          align: 'center',
          resolution: this.quality.renderScale,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.floatText);
    };
    const add = (enemy: Enemy, hub: ElkHub) => {
      const view = bossView(this, fx, enemy, hub, false);
      if (view instanceof ElkClonerView || view instanceof CreeperView) view.voiced = false;
      this.walkers.push({ enemy, view, stride: 0 });
    };
    add(makeBoss('creeper', LOOKS.lane, LOOKS.creeperX), ELK_HUB);
    label(LOOKS.creeperX, 'Creeper', false);
    ELK_HUBS.forEach((hub, i) => {
      add(makeBoss('elkCloner', LOOKS.lane, LOOKS.elkX[i]), hub.id);
      label(LOOKS.elkX[i], `${hub.letter} · ${hub.name}`, hub.id === ELK_HUB);
    });
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    for (const walker of this.walkers) {
      walker.stride += (ENEMIES[walker.enemy.kind].speed * delta) / 1000;
      walker.view.sync(walker.enemy, walker.stride);
    }
  }
}

// ---------------------------------------------------------------------------
// Movimientos

interface MovesData extends BossLabData {
  boss: BossKind;
  hub: ElkHub;
}

/** Carril y columna del jefe en "Movimientos", y lo sembrado delante para ver como le dan sus versos. */
const STAGE = { lane: 2, x: 6.6, shooters: [0, 1], wallCol: 3, wallLanes: [0, 2, 4] } as const;

/** Un verso en vuelo de la galeria: su estado y su vista. */
interface FlyingVerse {
  verse: Verse;
  view: VerseView;
}

/**
 * Un jefe en el tablero con algo sembrado delante (disparadoras en las dos primeras columnas y muros en tres carriles)
 * y botones para cada cosa que hace: andar, morder, recibir golpes, quemarse o congelarse, sus ataques (el salto de
 * Creeper, los versos y el poema entero de Elk Cloner), prepararse a la derecha, caer, escaparse y celebrar. Lo que dura
 * se lleva aqui como lo llevaria el estado, asi que se ve igual que en una partida.
 */
export class BossMovesScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private zoom = false;
  private kind: BossKind = 'elkCloner';
  private hub: ElkHub = ELK_HUB;
  private ambience?: Ambience;
  private fx?: Effects;
  private enemy: Enemy | null = null;
  private view: CreeperView | ElkClonerView | null = null;
  private omen: BossOmen | null = null;
  private walking = false;
  private stride = 0;
  private verses: FlyingVerse[] = [];
  private nextVerseId = 1000;
  private biteMs: number | null = null;
  private shooters = new Map<number, PlantView>();
  private walls = new Map<number, WallView>();
  private demo?: Phaser.Time.TimerEvent;

  constructor() {
    super(BOSS_LAB_SCENES.moves);
  }

  init(data: Partial<MovesData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.zoom = data.zoom ?? false;
    this.kind = data.boss ?? 'elkCloner';
    this.hub = data.hub ?? ELK_HUB;
    this.enemy = null;
    this.view = null;
    this.omen = null;
    this.verses = [];
    this.walking = false;
    this.biteMs = null;
    this.shooters = new Map();
    this.walls = new Map();
  }

  create(): void {
    // Acercada, mira al jefe y a donde se prepara, a la derecha.
    const focus = perspective.toScreen({ x: 7.6, y: STAGE.lane - 0.6 });
    const { ambience, fx } = prepare(this, this.quality, this.zoom ? { ...focus, factor: 1.35 } : null);
    this.ambience = ambience;
    this.fx = fx;
    for (let lane = 0; lane < 5; lane++) {
      for (const col of STAGE.shooters) {
        if (col === 0 || lane % 2 === 1) this.shooters.set(lane * 10 + col, new PlantView(this, fx, { lane, col }, createShooter(), 1, true));
      }
    }
    for (const lane of STAGE.wallLanes) this.walls.set(lane, new WallView(this, fx, { lane, col: STAGE.wallCol }, createWall(), true));
    this.spawnBoss(true);
  }

  /** Pide una accion (los botones de la galeria). */
  act(action: BossAction): void {
    if (action === 'demo') {
      this.runDemo();
      return;
    }
    if (action === 'omen') {
      this.prepareBoss();
      return;
    }
    const enemy = this.enemy;
    const view = this.view;
    if (!enemy || !view) return;
    switch (action) {
      case 'walk':
        this.walking = !this.walking;
        break;
      case 'bite':
        this.biteMs = ENEMIES[this.kind].firstBiteMs;
        break;
      case 'hit':
        view.hit();
        break;
      case 'blast':
        view.blasted();
        break;
      case 'freeze':
        this.enemy = { ...enemy, slow: { amount: 0.7, ms: 4000 } };
        view.frosted();
        break;
      case 'burn':
        this.enemy = { ...enemy, burn: { dps: 8, ms: 3000 } };
        break;
      case 'verse':
        if (enemy.recital && enemy.recital.poemMs === null) this.enemy = { ...enemy, recital: { ...enemy.recital, ms: ENEMIES.elkCloner.warnMs } };
        if (view instanceof ElkClonerView) view.inhale();
        break;
      case 'poem':
        if (enemy.recital && view instanceof ElkClonerView) {
          this.enemy = { ...enemy, recital: { ms: Infinity, sung: ELK_CLONER.poemEvery, poemMs: ELK_CLONER.poemWarnMs } };
          view.poemWarn();
        }
        break;
      case 'jump':
        if (view instanceof CreeperView && !enemy.jump) {
          const to = enemy.lane === STAGE.lane ? 0 : STAGE.lane;
          const warnMs = CREEPER.warnMs.calm;
          this.enemy = { ...enemy, jump: { stage: 'crouch', from: enemy.lane, to, ms: warnMs, stageMs: warnMs } };
          view.warn();
        }
        break;
      case 'rage': {
        const full = enemyMaxHp(enemy.kind);
        this.enemy = { ...enemy, hp: enemy.hp > full * CREEPER.enragedBelow ? full * 0.4 : full };
        break;
      }
      case 'talk':
        if (view instanceof CreeperView) view.taunt(text().cover.creeperLines[Math.floor(Math.random() * text().cover.creeperLines.length)]);
        break;
      case 'die':
        view.die();
        this.dropBoss();
        this.time.delayedCall(1800, () => this.spawnBoss(true));
        break;
      case 'escape':
        view.escape();
        this.dropBoss();
        this.time.delayedCall(1800, () => this.spawnBoss(true));
        break;
      case 'cheer':
        view.cheer();
        this.time.delayedCall(2600, () => {
          if (this.view !== view) return;
          view.die();
          this.dropBoss();
          this.spawnBoss(true);
        });
        break;
    }
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    this.stepVerses(delta);
    const enemy = this.enemy;
    if (!enemy || !this.view) return;
    let next: Enemy = enemy;
    if (this.walking && !enemy.jump && next.recital?.poemMs == null) this.stride += (ENEMIES[enemy.kind].speed * delta) / 1000;
    // Mordisco: se echa atras mientras carga (`attackMs`) y se lanza al acabar.
    if (this.biteMs !== null) {
      this.biteMs -= delta;
      next = { ...next, attackMs: Math.max(1, this.biteMs) };
      if (this.biteMs <= 0) {
        this.biteMs = null;
        next = { ...next, attackMs: null };
        this.view.chomp();
      }
    }
    if (next.slow) next = { ...next, slow: next.slow.ms > delta ? { ...next.slow, ms: next.slow.ms - delta } : null };
    if (next.burn) next = { ...next, burn: next.burn.ms > delta ? { ...next.burn, ms: next.burn.ms - delta } : null };
    next = this.stepRecital(next, delta);
    next = this.stepJump(next, delta);
    this.enemy = next;
    this.view.sync(next, this.stride);
  }

  /** Verso y poema de Elk Cloner, como en `recite` de `combat.ts`. */
  private stepRecital(enemy: Enemy, delta: number): Enemy {
    const recital = enemy.recital;
    const view = this.view;
    if (!recital || !(view instanceof ElkClonerView)) return enemy;
    if (recital.poemMs !== null) {
      const poemMs = recital.poemMs - delta;
      if (poemMs > 0) return { ...enemy, recital: { ...recital, poemMs } };
      view.recite();
      for (let lane = 0; lane < 5; lane++) this.launch({ id: this.nextVerseId++, lane, x: enemy.x, damage: 0, by: enemy.kind, poem: true });
      return { ...enemy, recital: { ms: Infinity, sung: 0, poemMs: null } };
    }
    if (!Number.isFinite(recital.ms)) return enemy;
    const ms = recital.ms - delta;
    if (ms > 0) return { ...enemy, recital: { ...recital, ms } };
    view.sang();
    this.launch({ id: this.nextVerseId++, lane: enemy.lane, x: enemy.x, damage: 0, by: enemy.kind, poem: false });
    return { ...enemy, recital: { ...recital, ms: Infinity } };
  }

  /** Salto de carril de Creeper, como en `stepJump` de `combat.ts`. */
  private stepJump(enemy: Enemy, delta: number): Enemy {
    const jump = enemy.jump;
    const view = this.view;
    if (!jump || !(view instanceof CreeperView)) return enemy;
    const ms = jump.ms - delta;
    if (ms > 0) return { ...enemy, jump: { ...jump, ms } };
    if (jump.stage === 'crouch') {
      view.takeoff();
      return { ...enemy, lane: jump.to, jump: { ...jump, stage: 'air', ms: CREEPER.airMs, stageMs: CREEPER.airMs } };
    }
    view.land();
    this.cameras.main.shake(200, 0.005);
    return { ...enemy, jump: null };
  }

  private launch(verse: Verse): void {
    if (!this.fx) return;
    this.verses.push({ verse, view: new VerseView(this, this.fx, verse, true) });
  }

  /** Los versos vuelan hacia la izquierda: destellan al pasar por una disparadora y se aplastan contra los muros. */
  private stepVerses(delta: number): void {
    for (const flying of [...this.verses]) {
      const from = flying.verse.x;
      const to = from - (VERSE.speed * delta) / 1000;
      const wallCenter = STAGE.wallCol + 0.5;
      const wall = this.walls.get(flying.verse.lane);
      if (wall && from >= wallCenter && to < wallCenter) {
        flying.view.blocked();
        wall.bitten();
        this.verses.splice(this.verses.indexOf(flying), 1);
        continue;
      }
      for (const col of STAGE.shooters) {
        const plant = this.shooters.get(flying.verse.lane * 10 + col);
        if (plant && from >= col + 0.5 && to < col + 0.5) {
          flying.view.crossed();
          plant.bitten(1);
        }
      }
      if (to < 0) {
        flying.view.vanish();
        this.verses.splice(this.verses.indexOf(flying), 1);
        continue;
      }
      flying.verse = { ...flying.verse, x: to };
      flying.view.sync(flying.verse);
    }
  }

  private spawnBoss(emerge: boolean, delayMs = 0): void {
    if (!this.fx) return;
    this.enemy = makeBoss(this.kind, STAGE.lane, STAGE.x);
    this.stride = 0;
    this.view = bossView(this, this.fx, this.enemy, this.hub, emerge, delayMs);
  }

  private dropBoss(): void {
    this.enemy = null;
    this.view = null;
    this.biteMs = null;
  }

  /**
   * Se prepara a la derecha (como en las rondas de antes de su combate): lo que lleva va de 0 a 1, manda un chispazo o una
   * nota a cada agujero, grita al mandar a su escolta y salta a su carril.
   */
  private prepareBoss(): void {
    if (this.omen || !this.fx) return;
    if (this.view) {
      this.view.die();
      this.dropBoss();
    }
    const omen = createBossOmen(this.kind, this, this.fx, 0, true);
    this.omen = omen;
    const progress = { v: 0 };
    this.tweens.add({ targets: progress, v: 1, duration: 7000, onUpdate: () => omen.setProgress(progress.v) });
    for (let i = 0; i < 4; i++) this.time.delayedCall(1500 + i * 1100, () => omen.zap(i % 5));
    const shout = this.kind === 'elkCloner' ? text().elkCloner.shouts.escort : text().creeper.shouts.escort;
    this.time.delayedCall(6200, () => omen.command(shout));
    this.time.delayedCall(9000, () => {
      omen.leapTo({ x: SCENERY.holeX, y: STAGE.lane + WORM_LOOK.footY });
      this.omen = null;
      if (!this.fx) return;
      this.enemy = makeBoss(this.kind, STAGE.lane, SCENERY.holeX);
      this.stride = 0;
      this.view = bossView(this, this.fx, this.enemy, this.hub, true, OMEN_LEAP_MS);
      // Sale andando hasta su sitio.
      const walk = { x: SCENERY.holeX };
      this.tweens.add({
        targets: walk,
        x: STAGE.x,
        delay: OMEN_LEAP_MS + 400,
        duration: 2400,
        onUpdate: () => {
          if (this.enemy) this.enemy = { ...this.enemy, x: walk.x };
        },
      });
    });
  }

  /** Todas sus acciones, una tras otra. */
  private runDemo(): void {
    this.demo?.remove();
    const steps = DEMO[this.kind];
    let i = 0;
    const next = () => {
      if (i >= steps.length) return;
      const [action, waitMs] = steps[i++];
      this.act(action);
      this.demo = this.time.delayedCall(waitMs, next);
    };
    next();
  }
}
