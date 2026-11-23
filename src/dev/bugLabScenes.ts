import * as Phaser from 'phaser';
import { BOARD, ENEMIES, HOP } from '../game/config/balance';
import { spawnEnemy, stepCombat, type Enemy, type EnemyKind } from '../game/core/combat';
import { createMatch, createWall, type MatchState, type Sown } from '../game/core/match';
import { createShooter } from '../game/core/plants';
import { applyPostFx, fitCamera } from '../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../game/view/ambience';
import { LURKER_DESIGNS, SKIPPER_DESIGNS, type LurkerDesign, type SkipperDesign } from '../game/view/bugArt';
import { BugView, GAME_BUGS } from '../game/view/bugView';
import { Effects } from '../game/view/effects';
import { DEPTH, perspective } from '../game/view/layout';
import { PlantView } from '../game/view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../game/view/quality';
import { registerBugTextures, registerTextures } from '../game/view/textures';
import { WallView } from '../game/view/wallView';

/**
 * Escenas de la galeria de las tropas del brote 3 (`/proposals/bichos.html`, T-038): solo con `npm run dev`. Usan la vista del juego
 * (`BugView`) con cada propuesta (LK-01) sobre el tablero de verdad. "Aspecto" pone las tres propuestas lado a lado, andando
 * y saltando sin moverse de su sitio; "Tablero" las suelta con las reglas de verdad (`stepCombat`): el Skipper salta las
 * plantas y lo para un muro, y el Lurker se descubre al acercarse a lo sembrado. No las ve el jugador: sus textos van en
 * espanol sin `src/i18n/`.
 */

export const BUG_LAB_SCENES = { looks: 'buglab-looks', board: 'buglab-board' } as const;
export type BugLabView = keyof typeof BUG_LAB_SCENES;

/** Lo que se les puede pedir en "Aspecto" a todos a la vez. */
export type BugAction = 'walk' | 'attack' | 'hit' | 'freeze' | 'burn' | 'veil' | 'die';

export const BUG_ACTIONS: ReadonlyArray<readonly [BugAction, string]> = [
  ['walk', 'Andar'],
  ['attack', 'Morder / escupir'],
  ['hit', 'Golpe'],
  ['freeze', 'Hielo'],
  ['burn', 'Fuego'],
  ['veil', 'Ocultar / descubrir'],
  ['die', 'Caer'],
];

const LABEL_STYLE = { fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 7 };

interface BugLabData {
  quality: QualityLevel;
  /** Propuesta de Lurker de los carriles de abajo de "Tablero". */
  lurker: LurkerDesign;
}

function prepare(scene: Phaser.Scene, quality: QualityProfile): { ambience: Ambience; fx: Effects } {
  registerTextures(scene, quality.renderScale);
  registerBugTextures(
    scene,
    LURKER_DESIGNS.map((d) => d.id),
    SKIPPER_DESIGNS.map((d) => d.id),
  );
  const fit = () => fitCamera(scene, quality.renderScale);
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
  const ambience = createAmbience(scene, quality);
  applyPostFx(scene, quality);
  return { ambience, fx: new Effects(scene, quality) };
}

function label(scene: Phaser.Scene, quality: QualityProfile, x: number, y: number, value: string, size: number, origin: [number, number], wrap?: number) {
  return scene.add
    .text(x, y, value, {
      ...LABEL_STYLE,
      fontSize: `${size}px`,
      resolution: quality.renderScale,
      align: 'center',
      ...(wrap ? { wordWrap: { width: wrap } } : {}),
    })
    .setOrigin(...origin)
    .setDepth(DEPTH.floatText);
}

/** Un enemigo del estado de combate, sin partida alrededor: solo para pintarlo. */
function makeEnemy(kind: EnemyKind, lane: number, x: number, level = 1): Enemy {
  const state = spawnEnemy(createMatch(), kind, lane, x, undefined, 1, level);
  return state.enemies[state.enemies.length - 1];
}

// ---------------------------------------------------------------------------
// Aspecto

/** Una columna por propuesta y un carril por tropa; el de abajo, el Skipper. */
const LOOKS = {
  columns: [1.5, 4.5, 7.5],
  /** Con niveles distintos, para ver la medallita en la nuca de cada propuesta y el aura de los tramos (T-030). */
  rows: [
    { kind: 'lurker', title: 'Lurker', level: 1 },
    { kind: 'lurkerSpitter', title: 'Escupidor · 6', level: 6 },
    { kind: 'lurkerArmored', title: 'Acorazado · 10', level: 10 },
    { kind: 'lurker', title: 'Oculto · 3', level: 3 },
    { kind: 'skipper', title: 'Skipper · 5', level: 5 },
  ],
  /** Carril que siempre va oculto: para ver la silueta (LK-02) al lado de la de colores. */
  hiddenLane: 3,
} as const;

interface Walker {
  enemy: Enemy;
  view: BugView;
  anchor: number;
  stride: number;
  /** Reloj propio del salto del Skipper en la galeria. */
  clock: number;
  /** Lo que le queda al ataque pedido, o null. */
  attackMs: number | null;
  /** Caido: vuelve a salir pasado este tiempo. */
  respawnMs: number | null;
  design: { lurker: LurkerDesign; skipper: SkipperDesign };
}

/**
 * Las tres propuestas de cada tropa lado a lado: cada columna es una propuesta y cada carril una tropa. Los Lurker andan sin
 * moverse de su sitio; el Skipper salta en su sitio con su descanso, su aviso y su vuelo de verdad.
 */
export class BugLooksScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private ambience?: Ambience;
  private fx?: Effects;
  private walkers: Walker[] = [];
  private walking = true;
  private veiled = false;

  constructor() {
    super(BUG_LAB_SCENES.looks);
  }

  init(data: Partial<BugLabData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.walkers = [];
    this.walking = true;
    this.veiled = false;
  }

  create(): void {
    const { ambience, fx } = prepare(this, this.quality);
    this.ambience = ambience;
    this.fx = fx;
    LURKER_DESIGNS.forEach((design, column) => {
      const top = perspective.toScreen({ x: LOOKS.columns[column], y: -0.42 });
      label(this, this.quality, top.x, top.y, `${design.letter} · ${design.name}`, 26, [0.5, 1]);
    });
    SKIPPER_DESIGNS.forEach((design, column) => {
      const at = perspective.toScreen({ x: LOOKS.columns[column], y: BOARD.lanes - 0.02 });
      label(this, this.quality, at.x, at.y, `${design.letter} · ${design.name}`, 22, [0.5, 0]);
    });
    LOOKS.rows.forEach((row, lane) => {
      const at = perspective.toScreen({ x: -0.12, y: lane + 0.55 });
      label(this, this.quality, at.x, at.y, row.title, 24, [1, 0.5]);
      LOOKS.columns.forEach((x, column) => {
        const design = { lurker: LURKER_DESIGNS[column].id, skipper: SKIPPER_DESIGNS[column].id };
        this.walkers.push(this.spawn(row.kind, lane, x, design, column * 260, row.level));
      });
    });
  }

  private spawn(kind: EnemyKind, lane: number, x: number, design: Walker['design'], delayMs: number, level = 1): Walker {
    const enemy = this.dress(makeEnemy(kind, lane, x, level), lane);
    const view = new BugView(this, this.fx as Effects, enemy, true, delayMs, design);
    return { enemy, view, anchor: x, stride: 0, clock: delayMs, attackMs: null, respawnMs: null, design };
  }

  /** Oculto o descubierto segun el carril y el boton. */
  private dress(enemy: Enemy, lane: number): Enemy {
    if (enemy.revealMs === null) return enemy;
    const hidden = lane === LOOKS.hiddenLane || this.veiled;
    return { ...enemy, revealMs: hidden ? 0 : 1 };
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    for (const walker of this.walkers) {
      if (walker.respawnMs !== null) {
        walker.respawnMs -= delta;
        if (walker.respawnMs <= 0) Object.assign(walker, this.spawn(walker.enemy.kind, walker.enemy.lane, walker.anchor, walker.design, 0, walker.enemy.level));
        continue;
      }
      walker.enemy = this.dress(this.tick(walker, delta), walker.enemy.lane);
      walker.view.sync(walker.enemy, walker.stride);
    }
  }

  /** Lo que pasa en un fotograma: anda, ataca, salta y se le pasan el hielo y el fuego. */
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
        else walker.view.chomp();
      }
    }
    enemy = { ...enemy, attackMs: walker.attackMs };
    if (enemy.hop) return this.hop(walker, enemy, delta);
    if (this.walking && walker.attackMs === null) walker.stride += (stats.speed * delta * (enemy.slow ? 1 - enemy.slow.amount : 1)) / 1000;
    return enemy;
  }

  /** El Skipper salta en su sitio: descansa (agachandose al final), vuela `HOP.length` casillas y vuelve a su sitio al caer. */
  private hop(walker: Walker, enemy: Enemy, delta: number): Enemy {
    const slowed = enemy.slow ? 1 - enemy.slow.amount : 1;
    if (!this.walking || walker.attackMs !== null) return { ...enemy, x: walker.anchor, hop: { stage: 'rest', ms: HOP.restMs, from: walker.anchor, to: walker.anchor } };
    const hop = enemy.hop as NonNullable<Enemy['hop']>;
    if (hop.stage === 'rest') {
      const ms = hop.ms - delta * slowed;
      walker.stride = 0;
      if (ms > 0) return { ...enemy, x: walker.anchor, hop: { ...hop, ms } };
      walker.view.hopped();
      return { ...enemy, x: walker.anchor, hop: { stage: 'air', ms: 0, from: walker.anchor, to: walker.anchor - HOP.length } };
    }
    const x = enemy.x - (HOP.length / HOP.airMs) * delta;
    if (x > hop.to) {
      walker.stride = walker.anchor - x;
      return { ...enemy, x };
    }
    walker.stride = 0;
    return { ...enemy, x: walker.anchor, hop: { stage: 'rest', ms: HOP.restMs, from: walker.anchor, to: walker.anchor } };
  }

  act(action: BugAction): void {
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
          walker.attackMs = stats.attack === 'spit' ? 650 : stats.attack === 'bite' ? stats.firstBiteMs : null;
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

// ---------------------------------------------------------------------------
// Tablero

/**
 * Lo que hay en el tablero: en los tres carriles de arriba, un Skipper de cada propuesta con tres disparadoras que salta y
 * un muro al fondo que lo para; en los dos de abajo, un Lurker (de la propuesta elegida) y un acorazado que vienen ocultos
 * hacia una disparadora y se descubren a `STEALTH.revealRadius` casillas. Las disparadoras no disparan: es para ver las
 * reglas, no el combate. Se repite cada `loopMs`.
 */
const BOARD_STAGE = {
  skipperLanes: [0, 1, 2],
  shooterCols: [3, 5, 7],
  wallCol: 1,
  lurkerLanes: [
    { lane: 3, kind: 'lurker' },
    { lane: 4, kind: 'lurkerArmored' },
  ],
  lurkerShooterCol: 1,
  skipperX: BOARD.columns + 0.75,
  lurkerX: 7.4,
  loopMs: 17_000,
} as const;

export class BugBoardScene extends Phaser.Scene {
  private level: QualityLevel = 'high';
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private lurker: LurkerDesign = GAME_BUGS.lurker;
  private ambience?: Ambience;
  private state: MatchState = createMatch();
  private views = new Map<number, BugView>();
  private walls = new Map<number, WallView>();
  private plants = new Map<string, PlantView>();
  private clock = 0;

  constructor() {
    super(BUG_LAB_SCENES.board);
  }

  init(data: Partial<BugLabData>): void {
    this.level = data.quality ?? 'high';
    this.quality = QUALITY_PROFILES[this.level];
    this.lurker = data.lurker ?? GAME_BUGS.lurker;
    this.views = new Map();
    this.walls = new Map();
    this.plants = new Map();
    this.clock = 0;
  }

  create(): void {
    const { ambience, fx } = prepare(this, this.quality);
    this.ambience = ambience;
    // Las disparadoras no disparan nunca: su recarga no se acaba.
    const shooter = (): Sown => ({ kind: 'shooter', shooter: createShooter(), hp: 300, reloadMs: Infinity, spent: 0 });
    const plants: Array<Array<Sown | null>> = Array.from({ length: BOARD.lanes }, () => Array.from({ length: BOARD.columns }, () => null));
    for (const lane of BOARD_STAGE.skipperLanes) {
      for (const col of BOARD_STAGE.shooterCols) plants[lane][col] = shooter();
      plants[lane][BOARD_STAGE.wallCol] = createWall();
    }
    for (const { lane } of BOARD_STAGE.lurkerLanes) plants[lane][BOARD_STAGE.lurkerShooterCol] = shooter();
    let state: MatchState = { ...createMatch(), plants };
    BOARD_STAGE.skipperLanes.forEach((lane) => (state = spawnEnemy(state, 'skipper', lane, BOARD_STAGE.skipperX)));
    for (const { lane, kind } of BOARD_STAGE.lurkerLanes) state = spawnEnemy(state, kind, lane, BOARD_STAGE.lurkerX);
    this.state = state;
    plants.forEach((row, lane) =>
      row.forEach((sown, col) => {
        if (sown?.kind === 'shooter') this.plants.set(`${lane}:${col}`, new PlantView(this, fx, { lane, col }, sown.shooter, 1, true));
        if (sown?.kind === 'wall') this.walls.set(lane, new WallView(this, fx, { lane, col }, sown, true));
      }),
    );
    for (const enemy of state.enemies) {
      const skipper = SKIPPER_DESIGNS[enemy.lane]?.id ?? GAME_BUGS.skipper;
      this.views.set(enemy.id, new BugView(this, fx, enemy, true, enemy.lane * 200, { lurker: this.lurker, skipper }));
    }
    BOARD_STAGE.skipperLanes.forEach((lane) => {
      const at = perspective.toScreen({ x: -0.12, y: lane + 0.55 });
      label(this, this.quality, at.x, at.y, `Skipper ${SKIPPER_DESIGNS[lane].letter}`, 22, [1, 0.5]);
    });
    for (const { lane, kind } of BOARD_STAGE.lurkerLanes) {
      const at = perspective.toScreen({ x: -0.12, y: lane + 0.55 });
      label(this, this.quality, at.x, at.y, kind === 'lurker' ? 'Lurker' : 'Acorazado', 22, [1, 0.5]);
    }
    const top = perspective.toScreen({ x: BOARD.columns / 2, y: -0.42 });
    label(this, this.quality, top.x, top.y - 34, 'Con las reglas de verdad: el Skipper salta las plantas y lo para el muro; el Lurker se descubre a 4 casillas', 20, [0.5, 1], 1300);
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    this.clock += delta;
    if (this.clock > BOARD_STAGE.loopMs) {
      this.scene.restart({ quality: this.level, lurker: this.lurker });
      return;
    }
    const step = stepCombat(this.state, Math.min(delta, 100));
    this.state = step.state;
    for (const event of step.events) {
      if (event.type === 'bite') {
        this.views.get(event.enemyId)?.chomp();
        this.walls.get(event.cell.lane)?.bitten();
        this.plants.get(`${event.cell.lane}:${event.cell.col}`)?.bitten(1);
      } else if (event.type === 'hopped') {
        this.views.get(event.enemyId)?.hopped();
      } else if (event.type === 'enemyEscaped') {
        this.views.get(event.enemyId)?.escape();
        this.views.delete(event.enemyId);
      }
    }
    for (const enemy of this.state.enemies) this.views.get(enemy.id)?.sync(enemy);
    this.state.plants.forEach((row, lane) => {
      const sown = row[BOARD_STAGE.wallCol];
      if (sown?.kind === 'wall') this.walls.get(lane)?.sync(sown);
    });
  }
}
