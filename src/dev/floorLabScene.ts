import * as Phaser from 'phaser';
import { BOARD, ECONOMY, ENEMIES, HOP, MINE, SHOOTER } from '../game/config/balance';
import type { Cell } from '../game/core/board';
import { spawnEnemy, type BulletEffect, type Enemy, type EnemyKind } from '../game/core/combat';
import { createMatch, createMine, createWall } from '../game/core/match';
import type { OutbreakId } from '../game/core/outbreaks';
import type { CannonCount, ElementType, MineElement } from '../game/core/plants';
import { applyPostFx, fitCamera } from '../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../game/view/ambience';
import { drawArea, drawCell } from '../game/view/boardMarks';
import { createEnemyView } from '../game/view/bossView';
import { BulletView } from '../game/view/bulletView';
import { Effects } from '../game/view/effects';
import { FLOOR_DESIGNS } from '../game/view/floors/catalog';
import type { FloorGrid } from '../game/view/floors/design';
import { DEPTH, VIEW, entityDepth, perspective } from '../game/view/layout';
import { MineView, mineAreaColor } from '../game/view/mineView';
import { PLANT_LOOK, PlantView, plantPlacement } from '../game/view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../game/view/quality';
import { SpitView } from '../game/view/spitView';
import { SHOOTER_SIZE, TEX, registerFloorLand, registerTextures, shooterTexture } from '../game/view/textures';
import { VerseView } from '../game/view/verseView';
import { WallView } from '../game/view/wallView';
import type { EnemyView } from '../game/view/wormView';

/**
 * Escena de la galeria de los suelos del tablero (T-050, fase 1): solo con `npm run dev`, en `/proposals/suelo.html`. El
 * jardin de verdad con el suelo que se elija y, encima, lo que mas depende de el, con las vistas del juego: las cuatro
 * variantes de la disparadora con 1 y 3 canones, una mina de fuego y una de hielo, un muro, un gusano, un acorazado, un
 * Lurker oculto, un Skipper saltando con su sombra, una tropa con el tinte del brote 4 (que escupe) y un Minstrel (que
 * recita). Sin reglas de combate: nadie se mueve de su sitio y los efectos salen con los botones. No la ve el jugador: sus
 * textos van en espanol sin `src/i18n/`.
 */

export const FLOOR_LAB = 'floor-lab';

/** Efectos que se lanzan con los botones: los que mas dependen del suelo (T-050). */
export type FloorEffect = 'fire' | 'ice' | 'spit' | 'verse' | 'coin' | 'text';

export const FLOOR_EFFECTS: ReadonlyArray<readonly [FloorEffect, string]> = [
  ['fire', 'Fuego (chamuscado)'],
  ['ice', 'Hielo (escarcha)'],
  ['spit', 'Escupitajo'],
  ['verse', 'Verso'],
  ['coin', 'Moneda'],
  ['text', 'Textos flotantes'],
];

/** Resaltes de casilla: ninguno, el de sembrar, o todos a la vez (sembrar, infundir, no se puede y seleccionada). */
export type FloorMarks = 'off' | 'sow' | 'all';

export interface FloorLabData {
  quality: QualityLevel;
  floor: string;
  grid: FloorGrid;
  marks: FloorMarks;
  shooting: boolean;
}

/** Los colores de los resaltes del tablero (`LOOK` de `BoardScene`): aqui se copian para pintarlos igual. */
const MARK_COLORS = { ok: 0xfff7d6, blocked: 0xff5a5f, infuse: 0xffa04d, picked: 0xffe36b } as const;
/** Moneda soltada y textos (copiados de `LOOK` de `BoardScene`). */
const COIN_LOOK = { size: 0.42, hover: 0.36, blinkFrom: 0.7 } as const;
const CLEARED_TEXT = { color: '#fff6c0', stroke: '#24561c', fontSize: 48 } as const;
const SEEDS_TEXT = { color: '#b9f27c', stroke: '#2f4a12', fontSize: 34 } as const;
const MINE_REGROW_MS = 3500;

/** Lo sembrado: un carril por variante (1 y 3 canones), las minas y el muro. */
const PLANTS: Array<{ cell: Cell; element: ElementType | null; cannons: CannonCount; level: number }> = [
  { cell: { lane: 0, col: 0 }, element: null, cannons: 1, level: 1 },
  { cell: { lane: 0, col: 1 }, element: null, cannons: 3, level: 5 },
  { cell: { lane: 1, col: 0 }, element: 'fire', cannons: 1, level: 2 },
  { cell: { lane: 1, col: 1 }, element: 'fire', cannons: 3, level: 10 },
  { cell: { lane: 2, col: 0 }, element: 'ice', cannons: 1, level: 3 },
  { cell: { lane: 2, col: 1 }, element: 'ice', cannons: 3, level: 15 },
  { cell: { lane: 3, col: 0 }, element: 'shield', cannons: 1, level: 1 },
  { cell: { lane: 3, col: 1 }, element: 'shield', cannons: 3, level: 20 },
];
const MINES: Array<{ cell: Cell; element: MineElement }> = [
  { cell: { lane: 1, col: 3 }, element: 'fire' },
  { cell: { lane: 2, col: 3 }, element: 'ice' },
];
const WALL: Cell = { lane: 3, col: 3 };
/** Los enemigos, cada uno en su sitio. El escupidor, a su distancia de la mina de hielo, para escupirle. */
const FOES: Array<{ kind: EnemyKind; lane: number; x: number; level: number; variant?: OutbreakId; role?: 'spit' | 'verse' }> = [
  { kind: 'worm', lane: 0, x: 6.2, level: 2 },
  { kind: 'minstrel', lane: 0, x: 8.15, level: 1, role: 'verse' },
  { kind: 'armored', lane: 1, x: 6.6, level: 5 },
  { kind: 'spitter', lane: 2, x: 3.5 + ENEMIES.spitter.range - 0.05, level: 4, variant: 'morris', role: 'spit' },
  { kind: 'skipper', lane: 3, x: 7.4, level: 5 },
  { kind: 'lurker', lane: 4, x: 6.6, level: 3 },
];
/** Casillas de los resaltes: sembrar en una libre, infundir y seleccionar disparadoras, y "no se puede" sobre la mina. */
const MARK_CELLS = { sow: { lane: 4, col: 2 }, infuse: { lane: 0, col: 0 }, picked: { lane: 0, col: 1 }, blocked: { lane: 2, col: 3 } } as const;

const cellKey = (cell: Cell) => `${cell.lane}:${cell.col}`;

interface Foe {
  enemy: Enemy;
  view: EnemyView;
  anchor: number;
  stride: number;
  /** Lo que le queda al ataque pedido (escupir o recitar), o null. */
  attackMs: number | null;
  role?: 'spit' | 'verse';
}

interface Shot {
  id: number;
  lane: number;
  x: number;
  view: BulletView;
  effect: BulletEffect | null;
}

interface Flight {
  lane: number;
  x: number;
  speed: number;
  /** Lo que hace en cada paso: devuelve false cuando acaba. */
  step: (flight: Flight) => boolean;
}

export class FloorLabScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private data$: FloorLabData = { quality: 'high', floor: 'legacy', grid: 'hinted', marks: 'off', shooting: true };
  private ambience?: Ambience;
  private fx!: Effects;
  private foes: Foe[] = [];
  private plants = new Map<string, PlantView>();
  private mines = new Map<string, MineView>();
  private shots: Shot[] = [];
  private flights: Flight[] = [];
  private seq = 0;
  private fireClock = 0;
  private marks?: Phaser.GameObjects.Graphics;
  private ghost?: Phaser.GameObjects.Image;

  constructor() {
    super(FLOOR_LAB);
  }

  init(data: Partial<FloorLabData>): void {
    this.data$ = { ...this.data$, ...data };
    this.quality = QUALITY_PROFILES[this.data$.quality];
    this.foes = [];
    this.plants = new Map();
    this.mines = new Map();
    this.shots = [];
    this.flights = [];
    this.fireClock = 0;
  }

  create(): void {
    registerTextures(this, this.quality.renderScale);
    const floor = FLOOR_DESIGNS.find((f) => f.id === this.data$.floor) ?? FLOOR_DESIGNS[0];
    // El de siempre no cambia con las columnas; el del juego, con las suyas, es la textura del juego (`TEX.land`).
    const land = registerFloorLand(this, floor, floor.id === 'legacy' ? 'hinted' : this.data$.grid);
    // Los terrenos de otros suelos ya no hacen falta: fuera, que pesan.
    for (const key of this.textures.getTextureKeys()) if (key.startsWith(`${TEX.land}~`) && key !== land) this.textures.remove(key);
    const fit = () => fitCamera(this, this.quality.renderScale);
    fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, fit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, fit));
    this.ambience = createAmbience(this, this.quality, { land });
    applyPostFx(this, this.quality);
    this.fx = new Effects(this, this.quality);

    PLANTS.forEach(({ cell, element, cannons, level }) => {
      this.plants.set(cellKey(cell), new PlantView(this, this.fx, cell, { element, cannons, level }, 1, true));
    });
    MINES.forEach(({ cell, element }) => this.mines.set(cellKey(cell), new MineView(this, this.fx, element, cell, createMine(element), true)));
    new WallView(this, this.fx, WALL, createWall(), true);
    FOES.forEach((spot, i) => {
      const state = spawnEnemy(createMatch(), spot.kind, spot.lane, spot.x, undefined, 1, spot.level, spot.variant ?? null);
      const enemy = state.enemies[state.enemies.length - 1];
      const view = createEnemyView(this, this.fx, enemy, true, 200 + i * 140);
      this.foes.push({ enemy, view, anchor: spot.x, stride: 0, attackMs: null, role: spot.role });
    });

    this.marks = this.add.graphics().setDepth(DEPTH.highlight);
    this.tweens.add({ targets: this.marks, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.ghost = this.add.image(0, 0, shooterTexture(1)).setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height).setAlpha(0.55).setVisible(false);
    this.setMarks(this.data$.marks);
  }

  /** Resaltes de casilla, como los pinta el tablero con una carta elegida o una planta seleccionada. */
  setMarks(marks: FloorMarks): void {
    this.data$.marks = marks;
    const g = this.marks;
    if (!g || !this.ghost) return;
    g.clear();
    this.ghost.setVisible(false);
    if (marks === 'off') return;
    drawCell(g, MARK_CELLS.sow, MARK_COLORS.ok, 0.25, 4);
    const { screen, scale } = plantPlacement(MARK_CELLS.sow);
    this.ghost.setScale(scale).setPosition(screen.x, screen.y).setDepth(entityDepth(screen.y)).setVisible(true);
    if (marks === 'sow') return;
    drawCell(g, MARK_CELLS.infuse, MARK_COLORS.infuse, 0.25, 4);
    drawCell(g, MARK_CELLS.picked, MARK_COLORS.picked, 0.22, 4);
    drawCell(g, MARK_CELLS.blocked, MARK_COLORS.blocked, 0.25, 4);
    // Y el alcance de una mina que se fuera a sembrar, al lado.
    drawArea(g, { x: 5.5, y: 4.5 }, MINE.blastRadius, mineAreaColor('fire'), 0.1, 2);
  }

  setShooting(on: boolean): void {
    this.data$.shooting = on;
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    for (const foe of this.foes) this.tickFoe(foe, delta);
    if (this.data$.shooting) {
      this.fireClock += delta;
      if (this.fireClock >= SHOOTER.fireIntervalMs) {
        this.fireClock -= SHOOTER.fireIntervalMs;
        this.volley();
      }
    }
    this.moveShots(delta);
    this.flights = this.flights.filter((flight) => {
      flight.x += (flight.speed * delta) / 1000;
      return flight.step(flight);
    });
  }

  // -------------------------------------------------------------------------
  // Enemigos en su sitio

  private tickFoe(foe: Foe, delta: number): void {
    let enemy = foe.enemy;
    if (enemy.slow) enemy = { ...enemy, slow: enemy.slow.ms > delta ? { ...enemy.slow, ms: enemy.slow.ms - delta } : null };
    if (enemy.burn) enemy = { ...enemy, burn: enemy.burn.ms > delta ? { ...enemy.burn, ms: enemy.burn.ms - delta } : null };
    if (foe.attackMs !== null) {
      foe.attackMs -= delta;
      if (foe.attackMs <= 0) {
        foe.attackMs = null;
        if (foe.role === 'verse') this.sing(foe);
      }
    }
    enemy = { ...enemy, attackMs: foe.attackMs };
    if (enemy.hop) enemy = this.hop(foe, enemy, delta);
    else if (foe.attackMs === null) foe.stride += (ENEMIES[enemy.kind].speed * delta * (enemy.slow ? 1 - enemy.slow.amount : 1)) / 1000;
    foe.enemy = enemy;
    foe.view.sync(enemy, foe.stride);
  }

  /** El Skipper salta en su sitio: descansa, vuela `HOP.length` casillas y vuelve a su sitio al caer. */
  private hop(foe: Foe, enemy: Enemy, delta: number): Enemy {
    const hop = enemy.hop as NonNullable<Enemy['hop']>;
    const slowed = enemy.slow ? 1 - enemy.slow.amount : 1;
    if (hop.stage === 'rest') {
      const ms = hop.ms - delta * slowed;
      foe.stride = 0;
      if (ms > 0) return { ...enemy, x: foe.anchor, hop: { ...hop, ms } };
      (foe.view as EnemyView & { hopped?: () => void }).hopped?.();
      return { ...enemy, x: foe.anchor, hop: { stage: 'air', ms: 0, from: foe.anchor, to: foe.anchor - HOP.length } };
    }
    const x = enemy.x - (HOP.length / HOP.airMs) * delta;
    if (x > hop.to) {
      foe.stride = foe.anchor - x;
      return { ...enemy, x };
    }
    foe.stride = 0;
    return { ...enemy, x: foe.anchor, hop: { stage: 'rest', ms: HOP.restMs, from: foe.anchor, to: foe.anchor } };
  }

  // -------------------------------------------------------------------------
  // Disparos: cada disparadora con un enemigo visible en su carril dispara, como en el juego (el oculto no es blanco).

  private volley(): void {
    PLANTS.forEach(({ cell, element, cannons }, i) => {
      if (!this.targetIn(cell.lane, cell.col + 0.5)) return;
      const view = this.plants.get(cellKey(cell));
      if (!view) return;
      this.time.delayedCall(i * 90, () => {
        for (let cannon = 0; cannon < cannons; cannon++) {
          view.recoil(cannon);
          const effect: BulletEffect | null =
            element === 'fire' ? { element: 'fire', burn: { dps: 8, ms: 2500 } } : element === 'ice' ? { element: 'ice', slow: { amount: 0.4, ms: 2500 } } : null;
          const bullet = { id: ++this.seq, lane: cell.lane, x: cell.col + 0.5, damage: 0, effect };
          this.shots.push({ id: bullet.id, lane: cell.lane, x: bullet.x, view: new BulletView(this, this.fx, bullet, true, view.muzzleOffset(cannon)), effect });
        }
      });
    });
  }

  private targetIn(lane: number, fromX: number): Foe | undefined {
    return this.foes
      .filter((foe) => foe.enemy.lane === lane && foe.enemy.x > fromX && !(foe.enemy.revealMs !== null && foe.enemy.revealMs <= 0))
      .sort((a, b) => a.enemy.x - b.enemy.x)[0];
  }

  private moveShots(delta: number): void {
    this.shots = this.shots.filter((shot) => {
      shot.x += (SHOOTER.bulletSpeed * delta) / 1000;
      const target = this.foes.find((foe) => foe.enemy.lane === shot.lane && Math.abs(foe.enemy.x - shot.x) < 0.25);
      if (target) {
        shot.view.impact();
        target.view.hit();
        if (shot.effect?.element === 'fire') target.enemy = { ...target.enemy, burn: { dps: 8, ms: 2500 } };
        if (shot.effect?.element === 'ice') target.enemy = { ...target.enemy, slow: { amount: 0.4, ms: 2500 } };
        return false;
      }
      if (shot.x > BOARD.columns + 0.4) {
        shot.view.vanish();
        return false;
      }
      shot.view.sync({ id: shot.id, lane: shot.lane, x: shot.x, damage: 0, effect: shot.effect });
      return true;
    });
  }

  // -------------------------------------------------------------------------
  // Botones

  launch(effect: FloorEffect): void {
    switch (effect) {
      case 'fire':
      case 'ice':
        this.blast(effect);
        break;
      case 'spit':
        this.spit();
        break;
      case 'verse': {
        const minstrel = this.foes.find((foe) => foe.role === 'verse');
        if (!minstrel || minstrel.attackMs !== null) return;
        minstrel.view.inhale();
        minstrel.attackMs = ENEMIES.minstrel.attack === 'verse' ? ENEMIES.minstrel.warnMs : 900;
        break;
      }
      case 'coin':
        this.dropCoin();
        break;
      case 'text':
        this.floatTexts();
        break;
    }
  }

  /** La mina de ese elemento explota (o estalla en escarcha) y vuelve a brotar al rato. */
  private blast(element: MineElement): void {
    const spot = MINES.find((mine) => mine.element === element);
    if (!spot) return;
    const key = cellKey(spot.cell);
    const view = this.mines.get(key);
    if (!view) return;
    this.mines.delete(key);
    view.explode();
    const center = { x: spot.cell.col + 0.5, y: spot.cell.lane + 0.5 };
    for (const foe of this.foes) {
      if (Math.hypot(foe.enemy.x - center.x, foe.enemy.lane + 0.5 - center.y) > MINE.blastRadius) continue;
      if (element === 'fire') foe.view.blasted();
      else foe.view.frosted();
    }
    this.cameras.main.shake(element === 'fire' ? 180 : 120, element === 'fire' ? 0.0035 : 0.002);
    this.time.delayedCall(MINE_REGROW_MS, () => this.mines.set(key, new MineView(this, this.fx, element, spot.cell, createMine(element), true)));
  }

  /** El escupidor teñido escupe a la mina de hielo de su carril (si no esta, el escupitajo sigue y cae en el camino). */
  private spit(): void {
    const foe = this.foes.find((f) => f.role === 'spit');
    if (!foe) return;
    foe.view.spat();
    const spit = { id: ++this.seq, lane: foe.enemy.lane, x: foe.enemy.x - 0.25, damage: 0 };
    const view = new SpitView(this, this.fx, spit, true);
    const target = MINES.find((mine) => mine.cell.lane === spit.lane);
    this.flights.push({
      lane: spit.lane,
      x: spit.x,
      speed: -(ENEMIES.spitter.attack === 'spit' ? ENEMIES.spitter.spitSpeed : 4),
      step: (flight) => {
        const mine = target ? this.mines.get(cellKey(target.cell)) : undefined;
        if (target && mine && flight.x <= target.cell.col + 0.8) {
          view.impact();
          mine.bitten();
          return false;
        }
        if (flight.x < -0.4) {
          view.vanish();
          return false;
        }
        view.sync({ ...spit, x: flight.x });
        return true;
      },
    });
  }

  /** El Minstrel suelta su verso, que cruza las disparadoras de su carril y se apaga en el camino. */
  private sing(foe: Foe): void {
    foe.view.sang();
    const verse = { id: ++this.seq, lane: foe.enemy.lane, x: foe.enemy.x - 0.2, damage: 0, by: foe.enemy.kind, poem: false };
    const view = new VerseView(this, this.fx, verse, true);
    const crossed = new Set<string>();
    this.flights.push({
      lane: verse.lane,
      x: verse.x,
      speed: -2.5,
      step: (flight) => {
        for (const { cell } of PLANTS) {
          const key = cellKey(cell);
          if (cell.lane !== verse.lane || crossed.has(key) || flight.x > cell.col + 0.6) continue;
          crossed.add(key);
          view.crossed();
          this.plants.get(key)?.bitten(1);
        }
        if (flight.x < -0.4) {
          view.vanish();
          return false;
        }
        view.sync({ ...verse, x: flight.x });
        return true;
      },
    });
  }

  /** Moneda soltada donde esta un enemigo, como la de `BoardScene` (`spawnDroppedCoin`): cae, flota, parpadea y se va. */
  private dropCoin(): void {
    const foe = this.foes[Math.floor(Math.random() * this.foes.length)];
    const at = { x: foe.enemy.x - 0.3, y: foe.enemy.lane + PLANT_LOOK.footY };
    const cellWidth = perspective.cellWidthAt(at);
    const ground = perspective.toScreen(at);
    const size = cellWidth * COIN_LOOK.size;
    const restY = ground.y - cellWidth * COIN_LOOK.hover;
    const landX = ground.x + Phaser.Math.FloatBetween(-0.25, 0.25) * cellWidth;
    const depth = DEPTH.droppedCoins + ground.y / VIEW.height;
    const shadow = this.add
      .image(landX, ground.y, TEX.shadow)
      .setDisplaySize(size * 1.2, size * 0.38)
      .setAlpha(0)
      .setDepth(entityDepth(ground.y) - 0.5);
    const glow = this.add
      .image(landX, restY, TEX.glow)
      .setDisplaySize(size * 2.4, size * 2.4)
      .setTint(0xffe27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setVisible(this.quality.glows)
      .setDepth(depth - 0.002);
    const coin = this.add.image(ground.x, restY, TEX.coin).setDisplaySize(size, size).setDepth(depth);
    const label = this.add
      .text(landX, restY - size * 0.95, '+15', this.fx.textStyle({ fontSize: Math.round(size * 0.5) }))
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 0.001);
    const parts = [shadow, glow, coin, label];
    const coinScale = coin.scaleX;
    this.tweens.add({ targets: coin, x: landX, duration: 700 });
    this.tweens.add({
      targets: coin,
      y: restY - cellWidth * 0.7,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () =>
        this.tweens.add({
          targets: coin,
          y: restY,
          duration: 440,
          ease: 'Bounce.Out',
          onComplete: () => {
            this.tweens.add({ targets: [shadow, label], alpha: 1, duration: 200 });
            this.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.7 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
            this.tweens.add({ targets: [coin, glow], y: restY - cellWidth * 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
            this.tweens.add({ targets: coin, scaleX: coinScale * 0.2, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          },
        }),
    });
    this.time.delayedCall(ECONOMY.dropLifetimeMs * COIN_LOOK.blinkFrom, () => this.tweens.add({ targets: [coin, label], alpha: 0.3, duration: 150, yoyo: true, repeat: -1 }));
    this.time.delayedCall(ECONOMY.dropLifetimeMs, () => {
      this.tweens.killTweensOf(parts);
      this.tweens.add({ targets: parts, alpha: 0, scaleY: 0, duration: 260, ease: 'Back.In', onComplete: () => parts.forEach((part) => part.destroy()) });
    });
  }

  /** Los textos flotantes del tablero: lo que da un enemigo y el de la ronda superada con sus semillas. */
  private floatTexts(): void {
    for (const foe of this.foes.slice(0, 3)) {
      const at = foe.view.ground();
      this.fx.floatText('+15', at.x, at.y - at.cellWidth * 0.9);
    }
    const center = perspective.toScreen({ x: BOARD.columns / 2, y: BOARD.lanes / 2 });
    this.fx.floatText('¡Ronda 5 superada!', center.x, center.y, CLEARED_TEXT);
    this.time.delayedCall(260, () => this.fx.floatText('+12 semillas', center.x, center.y + 58, SEEDS_TEXT));
  }
}
