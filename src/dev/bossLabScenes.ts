import * as Phaser from 'phaser';
import { BRAIN, CREEPER, ELK_CLONER, ENEMIES, VERSE } from '../game/config/balance';
import { enemyMaxHp, hopGait, spawnEnemy, type BossKind, type Enemy, type Verse } from '../game/core/combat';
import { createMatch, createWall } from '../game/core/match';
import { createShooter } from '../game/core/plants';
import { applyPostFx, fitCamera } from '../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../game/view/ambience';
import { BossOmen } from '../game/view/bossView';
import { createBossOmen } from '../game/view/bossView';
import { BRAIN_DESIGN, BRAIN_DESIGNS, type BrainDesign } from '../game/view/brainArt';
import { BrainOmen, BrainView } from '../game/view/brainView';
import { MORRIS_DESIGN, MORRIS_DESIGNS, type MorrisDesign } from '../game/view/morrisArt';
import { MorrisOmen, MorrisView } from '../game/view/morrisView';
import { CreeperView, OMEN_LEAP_MS } from '../game/view/creeperView';
import { ELK_HUB, ELK_HUBS, type ElkHub } from '../game/view/elkClonerArt';
import { ElkClonerView } from '../game/view/elkClonerView';
import { Effects } from '../game/view/effects';
import { DEPTH, SCENERY, perspective } from '../game/view/layout';
import { PlantView } from '../game/view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../game/view/quality';
import { elkHeadTexture, registerBrainTextures, registerElkHubTextures, registerMorrisTextures, registerTextures } from '../game/view/textures';
import { VerseView } from '../game/view/verseView';
import { WallView } from '../game/view/wallView';
import { KIND_LOOK, WORM_LOOK, type KindLook } from '../game/view/wormView';
import { text } from '../i18n';

/**
 * Escenas de los jefes: "Aspecto" es la de las propuestas (`/proposals/jefes.html`) y "Movimientos", la del catalogo
 * (`/catalog/jefes.html`, T-040). Solo con `npm run dev`. Usan las vistas del juego (`CreeperView`,
 * `ElkClonerView`, `BrainView`, `MorrisView`, sus versos y el jefe que se prepara) sobre el tablero de verdad, sin partida alrededor: lo que
 * dura (el aviso del poema, el salto de Creeper, los saltos de Brain, la quemadura) se lleva aqui a mano, como lo llevaria el
 * estado. No las ve el jugador: sus textos van en espanol sin `src/i18n/` (salvo lo que dicen los jefes, que es lo del juego).
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
  | 'hop'
  | 'hide'
  | 'rage'
  | 'talk'
  | 'brood'
  | 'overload'
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
  // Brain (T-039): "Andar" es botar sin parar en su sitio; "Saltar", un salto; "Ocultarse", alternar oculto y descubierto.
  brain: [...COMMON, ['hop', 'Saltar'], ['hide', 'Ocultarse / descubrirse'], ['rage', 'Fase 2'], ['talk', 'Hablar'], ...ENDINGS],
  // Morris (T-042): "Morder" es el mordisco al paso, sin pararse (MR-06); "Soltar gusano" (MR-07) y la sobrecarga, encender y apagar.
  morris: [...COMMON, ['brood', 'Soltar gusano'], ['overload', 'Sobrecarga'], ['talk', 'Hablar'], ...ENDINGS],
};

/** Lo que hace "Ver todo seguido": cada accion y cuanto se espera despues. */
const DEMO: Record<BossKind, ReadonlyArray<readonly [BossAction, number]>> = {
  creeper: [['bite', 1200], ['hit', 700], ['jump', 2600], ['rage', 2200], ['jump', 2200], ['freeze', 2400], ['burn', 2400], ['rage', 1500], ['talk', 2400], ['die', 2400], ['omen', 11000], ['cheer', 3000]],
  elkCloner: [['verse', 3000], ['bite', 1200], ['hit', 700], ['verse', 3200], ['poem', 7800], ['freeze', 2400], ['burn', 2400], ['blast', 1500], ['die', 2400], ['omen', 11000], ['escape', 2600]],
  brain: [['hop', 4200], ['hide', 1800], ['hop', 4200], ['hide', 1600], ['bite', 1400], ['hit', 700], ['talk', 2600], ['rage', 2600], ['hop', 3600], ['freeze', 2400], ['burn', 2400], ['die', 2400], ['omen', 11000], ['cheer', 3000]],
  morris: [['walk', 1600], ['brood', 1400], ['bite', 1400], ['brood', 1200], ['hit', 700], ['overload', 2600], ['brood', 900], ['brood', 1400], ['overload', 1200], ['freeze', 2400], ['burn', 2400], ['talk', 2600], ['walk', 400], ['die', 2400], ['omen', 11000], ['escape', 2600]],
};

const LABEL_STYLE = { fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 7 };

interface BossLabData {
  quality: QualityLevel;
  /** Camara acercada a los jefes. */
  zoom: boolean;
}

/** Lo que ensena "Aspecto": las propuestas de Morris (T-042, MR-08) o las de los jefes de antes. */
export type BossLookShow = 'morris' | 'earlier';

/** Camara acercada: cuanto y a donde mira (en pantalla). */
interface Zoom {
  x: number;
  y: number;
  factor: number;
}

function prepare(scene: Phaser.Scene, quality: QualityProfile, zoomAt: Zoom | null): { ambience: Ambience; fx: Effects } {
  registerTextures(scene, quality.renderScale);
  registerElkHubTextures(scene);
  registerBrainTextures(scene, BRAIN_DESIGNS.map((d) => d.id));
  registerMorrisTextures(scene, MORRIS_DESIGNS.map((d) => d.id));
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

type LabBossView = CreeperView | ElkClonerView | BrainView | MorrisView;

function bossView(
  scene: Phaser.Scene,
  fx: Effects,
  enemy: Enemy,
  hub: ElkHub,
  design: BrainDesign,
  emerge: boolean,
  delayMs = 0,
  morris: MorrisDesign = MORRIS_DESIGN,
): LabBossView {
  if (enemy.kind === 'brain') return new BrainView(scene, fx, enemy, emerge, delayMs, design);
  if (enemy.kind === 'morris') return new MorrisView(scene, fx, enemy, emerge, delayMs, morris);
  return enemy.kind === 'creeper' ? new CreeperView(scene, fx, enemy, emerge, delayMs) : new ElkClonerView(scene, fx, enemy, emerge, delayMs, elkLook(hub));
}

/**
 * Salto en su sitio de Brain (T-039), como en `stepHop` de `combat.ts` pero sin avanzar: descansa (y se agacha al final),
 * vuela `hopGait` casillas y vuelve a su sitio al caer, asi que se pinta en `x + stride` sin moverse. `again`: si sigue
 * botando al caer o se queda quieto. Devuelve el enemigo y lo que hay que sumarle al pintarlo.
 */
function hopInPlace(enemy: Enemy, anchor: number, delta: number, again: boolean, onTakeoff: () => void): { enemy: Enemy; stride: number } {
  const hop = enemy.hop;
  if (!hop) return { enemy, stride: 0 };
  const gait = hopGait(enemy);
  if (hop.stage === 'rest') {
    if (!Number.isFinite(hop.ms)) return { enemy: { ...enemy, x: anchor }, stride: 0 };
    const ms = hop.ms - delta * (enemy.slow ? 1 - enemy.slow.amount : 1);
    if (ms > 0) return { enemy: { ...enemy, x: anchor, hop: { ...hop, ms } }, stride: 0 };
    onTakeoff();
    return { enemy: { ...enemy, x: anchor, hop: { stage: 'air', ms: 0, from: anchor, to: anchor - gait.length } }, stride: 0 };
  }
  const x = enemy.x - (gait.length / gait.airMs) * delta;
  if (x > hop.to) return { enemy: { ...enemy, x }, stride: anchor - x };
  return { enemy: { ...enemy, x: anchor, hop: { stage: 'rest', ms: again ? gait.restMs : Infinity, from: anchor, to: anchor } }, stride: 0 };
}

// ---------------------------------------------------------------------------
// Aspecto

/**
 * Donde va cada uno en "Aspecto": las propuestas de Brain (T-039, BR-01) en el carril de delante, botando en su sitio y
 * ocultandose cada poco, con su rotulo a los pies; Creeper y una Elk Cloner por cada aro, en el de atras.
 */
const LOOKS = { lane: 1, creeperX: 1.35, elkX: [3.45, 5.15, 6.85, 8.55], brainLane: 3, brainX: [2.1, 4.9, 7.7], veilEveryMs: 2600 } as const;

/**
 * Donde va cada uno con las propuestas de Morris (T-042, MR-08): una por carril (0, 2 y 4), andando sin moverse de su sitio y
 * soltando un gusano cada poco, con su rotulo a la izquierda; y Creeper en el carril 3, para ver que no se confunden.
 */
const MORRIS_LOOKS = { lanes: [0, 2, 4], x: 6.1, labelX: 4.55, creeperLane: 3, creeperX: 1.6, broodEveryMs: 2600 } as const;

/**
 * Los dos jefes en reposo, andando sin moverse de su sitio, en el carril de delante: Creeper y Elk Cloner con cada uno de
 * los aros del disquete (`ELK_HUBS`), el que usa el juego marcado.
 */
export class BossLooksScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private zoom = false;
  private show: BossLookShow = 'morris';
  private ambience?: Ambience;
  private walkers: Array<{ enemy: Enemy; view: LabBossView; stride: number; anchor: number }> = [];
  private veilMs = 0;
  private broodMs = 0;

  constructor() {
    super(BOSS_LAB_SCENES.looks);
  }

  init(data: Partial<BossLabData & { show: BossLookShow }>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.zoom = data.zoom ?? false;
    this.show = data.show ?? 'morris';
    this.walkers = [];
    this.veilMs = 0;
    this.broodMs = 0;
  }

  create(): void {
    if (this.show === 'morris') {
      this.createMorris();
      return;
    }
    const focus = perspective.toScreen({ x: 4.95, y: LOOKS.brainLane - 0.6 });
    const { ambience, fx } = prepare(this, this.quality, this.zoom ? { ...focus, factor: 1.45 } : null);
    this.ambience = ambience;
    /** Rotulo encima (los del carril de atras) o, `below`, a los pies (los de Brain, delante). */
    const label = (x: number, title: string, chosen: boolean, below = false) => {
      const at = perspective.toScreen({ x, y: below ? LOOKS.brainLane + 0.95 : LOOKS.lane - 2.05 });
      this.add
        .text(at.x, at.y, chosen ? `★ ${title}\nen el juego` : title, {
          ...LABEL_STYLE,
          color: chosen ? '#ffe27a' : '#ffffff',
          fontSize: '20px',
          align: 'center',
          resolution: this.quality.renderScale,
        })
        .setOrigin(0.5, below ? 0 : 1)
        .setDepth(DEPTH.floatText);
    };
    const add = (enemy: Enemy, hub: ElkHub, design: BrainDesign = BRAIN_DESIGN) => {
      const view = bossView(this, fx, enemy, hub, design, false);
      view.voiced = false;
      this.walkers.push({ enemy, view, stride: 0, anchor: enemy.x });
    };
    add(makeBoss('creeper', LOOKS.lane, LOOKS.creeperX), ELK_HUB);
    label(LOOKS.creeperX, 'Creeper', false);
    ELK_HUBS.forEach((hub, i) => {
      add(makeBoss('elkCloner', LOOKS.lane, LOOKS.elkX[i]), hub.id);
      label(LOOKS.elkX[i], `${hub.letter} · ${hub.name}`, hub.id === ELK_HUB);
    });
    BRAIN_DESIGNS.forEach((proposal, i) => {
      const brain = makeBoss('brain', LOOKS.brainLane, LOOKS.brainX[i]);
      // Cada una bota a su ritmo, y empiezan descubiertas.
      add({ ...brain, revealMs: Infinity, hop: brain.hop && { ...brain.hop, ms: 700 + i * 900 } }, ELK_HUB, proposal.id);
      label(LOOKS.brainX[i], `Brain ${proposal.letter} · ${proposal.short}`, proposal.id === BRAIN_DESIGN, true);
    });
  }

  /** Las tres propuestas de Morris (MR-08), una por carril, y Creeper al lado para comparar. */
  private createMorris(): void {
    const focus = perspective.toScreen({ x: MORRIS_LOOKS.x, y: 2.2 });
    const { ambience, fx } = prepare(this, this.quality, this.zoom ? { ...focus, factor: 1.3 } : null);
    this.ambience = ambience;
    const label = (x: number, lane: number, title: string, chosen: boolean) => {
      const at = perspective.toScreen({ x, y: lane + 0.25 });
      this.add
        .text(at.x, at.y, chosen ? `★ ${title}\nen el juego` : title, {
          ...LABEL_STYLE,
          color: chosen ? '#ffe27a' : '#ffffff',
          fontSize: '20px',
          align: 'right',
          resolution: this.quality.renderScale,
        })
        .setOrigin(1, 0.5)
        .setDepth(DEPTH.floatText);
    };
    MORRIS_DESIGNS.forEach((proposal, i) => {
      const lane = MORRIS_LOOKS.lanes[i];
      const enemy = makeBoss('morris', lane, MORRIS_LOOKS.x);
      const view = bossView(this, fx, enemy, ELK_HUB, BRAIN_DESIGN, false, 0, proposal.id);
      view.voiced = false;
      this.walkers.push({ enemy, view, stride: 0, anchor: enemy.x });
      label(MORRIS_LOOKS.labelX, lane, `Morris ${proposal.letter} · ${proposal.short}`, proposal.id === MORRIS_DESIGN);
    });
    const creeper = makeBoss('creeper', MORRIS_LOOKS.creeperLane, MORRIS_LOOKS.creeperX);
    const view = bossView(this, fx, creeper, ELK_HUB, BRAIN_DESIGN, false);
    view.voiced = false;
    this.walkers.push({ enemy: creeper, view, stride: 0, anchor: creeper.x });
    const at = perspective.toScreen({ x: MORRIS_LOOKS.creeperX, y: MORRIS_LOOKS.creeperLane + 0.95 });
    this.add
      .text(at.x, at.y, 'Creeper, para comparar', { ...LABEL_STYLE, fontSize: '18px', resolution: this.quality.renderScale })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.floatText);
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    // Las de Morris sueltan un gusano cada poco, por turnos.
    this.broodMs += delta;
    if (this.broodMs >= MORRIS_LOOKS.broodEveryMs) {
      this.broodMs -= MORRIS_LOOKS.broodEveryMs;
      const morrises = this.walkers.filter((w) => w.view instanceof MorrisView);
      morrises.forEach((walker, i) =>
        this.time.delayedCall(i * 500, () => walker.view instanceof MorrisView && walker.view.brooded((walker.enemy.lane + 1 + i) % 5)),
      );
    }
    // Las de Brain se ocultan y se descubren a la vez cada poco, para comparar las siluetas.
    this.veilMs += delta;
    const veiled = Math.floor(this.veilMs / LOOKS.veilEveryMs) % 2 === 1;
    for (const walker of this.walkers) {
      if (walker.enemy.kind === 'brain') {
        const view = walker.view;
        const step = hopInPlace(walker.enemy, walker.anchor, delta, true, () => view instanceof BrainView && view.hopped());
        walker.enemy = { ...step.enemy, revealMs: veiled ? 0 : Infinity };
        walker.view.sync(walker.enemy, step.stride);
        continue;
      }
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
  /** Propuesta de Brain (T-039, BR-01). */
  design: BrainDesign;
  /** Propuesta de Morris (T-042, MR-08). */
  morrisDesign: MorrisDesign;
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
  private design: BrainDesign = BRAIN_DESIGN;
  private morrisDesign: MorrisDesign = MORRIS_DESIGN;
  /** Morris: si la sobrecarga esta encendida ("Sobrecarga"). */
  private overload = false;
  private ambience?: Ambience;
  private fx?: Effects;
  private enemy: Enemy | null = null;
  private view: LabBossView | null = null;
  /** Brain: si bota sin parar ("Andar"). */
  private bouncing = false;
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
    this.design = data.design ?? BRAIN_DESIGN;
    this.morrisDesign = data.morrisDesign ?? MORRIS_DESIGN;
    this.overload = false;
    this.bouncing = false;
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
        if (enemy.kind === 'brain') {
          this.bouncing = !this.bouncing;
          if (this.bouncing && enemy.hop?.stage === 'rest') this.enemy = { ...enemy, hop: { ...enemy.hop, ms: hopGait(enemy).crouchMs } };
        } else {
          this.walking = !this.walking;
        }
        break;
      case 'hop':
        // Un salto: se agacha (el aviso) y salta en su sitio.
        if (enemy.hop?.stage === 'rest') this.enemy = { ...enemy, hop: { ...enemy.hop, ms: hopGait(enemy).crouchMs } };
        break;
      case 'hide':
        this.enemy = { ...enemy, revealMs: enemy.revealMs === 0 ? Infinity : 0 };
        if (view instanceof BrainView) {
          if (enemy.revealMs === 0) view.revealed('blast');
          else view.concealed();
        }
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
        const below = enemy.kind === 'brain' ? BRAIN.enragedBelow : CREEPER.enragedBelow;
        this.enemy = { ...enemy, hp: enemy.hp > full * below ? full * 0.4 : full };
        break;
      }
      case 'brood':
        // Suelta un gusano (MR-07): se le desprende uno; en la partida, el de verdad sale por el agujero de otro carril.
        if (view instanceof MorrisView) view.brooded(Math.floor(Math.random() * 5));
        break;
      case 'overload':
        if (view instanceof MorrisView) {
          this.overload = !this.overload;
          view.overloaded(this.overload);
        }
        break;
      case 'talk':
        if (view instanceof MorrisView) {
          const lines = [text().morris.entrance, ...text().morris.brood, ...text().morris.chew, text().morris.overload, text().morris.escape];
          view.taunt(lines[Math.floor(Math.random() * lines.length)]);
        }
        if (view instanceof CreeperView) view.taunt(text().cover.creeperLines[Math.floor(Math.random() * text().cover.creeperLines.length)]);
        if (view instanceof BrainView) {
          const lines = [text().brain.entrance, ...text().brain.concealed, ...text().brain.bite, text().brain.escape];
          view.taunt(lines[Math.floor(Math.random() * lines.length)]);
        }
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
    let stride = this.stride;
    if (next.kind === 'brain') {
      const view = this.view;
      const step = hopInPlace(next, STAGE.x, delta, this.bouncing, () => view instanceof BrainView && view.hopped());
      next = step.enemy;
      stride = step.stride;
    }
    this.enemy = next;
    this.view.sync(next, stride);
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
    this.enemy = this.labBoss(STAGE.x);
    this.stride = 0;
    this.overload = false;
    this.view = bossView(this, this.fx, this.enemy, this.hub, this.design, emerge, delayMs, this.morrisDesign);
  }

  /** El jefe de la galeria en `x`: Brain, descubierto y quieto hasta que se le pida saltar. */
  private labBoss(x: number): Enemy {
    const boss = makeBoss(this.kind, STAGE.lane, x);
    if (boss.kind !== 'brain' || !boss.hop) return boss;
    return { ...boss, revealMs: Infinity, hop: { ...boss.hop, ms: this.bouncing ? boss.hop.ms : Infinity } };
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
    const omen =
      this.kind === 'brain'
        ? new BrainOmen(this, this.fx, 0, true, this.design)
        : this.kind === 'morris'
          ? new MorrisOmen(this, this.fx, 0, true, this.morrisDesign)
          : createBossOmen(this.kind, this, this.fx, 0, true);
    this.omen = omen;
    const progress = { v: 0 };
    this.tweens.add({ targets: progress, v: 1, duration: 7000, onUpdate: () => omen.setProgress(progress.v) });
    for (let i = 0; i < 4; i++) this.time.delayedCall(1500 + i * 1100, () => omen.zap(i % 5));
    const shout =
      this.kind === 'morris'
        ? text().morris.shouts.escort
        : this.kind === 'brain'
          ? text().brain.shouts.escort
          : this.kind === 'elkCloner'
            ? text().elkCloner.shouts.escort
            : text().creeper.shouts.escort;
    this.time.delayedCall(6200, () => omen.command(shout));
    this.time.delayedCall(9000, () => {
      omen.leapTo({ x: SCENERY.holeX, y: STAGE.lane + WORM_LOOK.footY });
      this.omen = null;
      if (!this.fx) return;
      // Brain no anda: sale del suelo en su sitio al caer el salto.
      if (this.kind === 'brain') {
        this.time.delayedCall(OMEN_LEAP_MS, () => this.spawnBoss(true));
        return;
      }
      this.enemy = this.labBoss(SCENERY.holeX);
      this.stride = 0;
      this.view = bossView(this, this.fx, this.enemy, this.hub, this.design, true, OMEN_LEAP_MS, this.morrisDesign);
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
