import * as Phaser from 'phaser';
import { BOARD } from '../game/config/balance';
import type { CannonCount, ElementType, Shooter } from '../game/core/plants';
import { applyPostFx, fitCamera } from '../game/scenes/sceneKit';
import { createAmbience, type Ambience } from '../game/view/ambience';
import { Effects } from '../game/view/effects';
import { DEPTH, WORLD, entityDepth, perspective } from '../game/view/layout';
import { PLANT_LOOK, PlantView, plantPlacement } from '../game/view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../game/view/quality';
import { SHOOTER_DESIGNS } from '../game/view/shooters/catalog';
import { SHOOTER_CANNONS, type ShooterDesign } from '../game/view/shooters/design';
import { LEGACY_SHOOTER } from '../game/view/shooters/legacy';
import { SEED_SIZE, artInv, registerShooterTextures, registerTextures, seedTexture, shooterTexture } from '../game/view/textures';
import { engagedX, TitleCover, type CoverCast, type PlantSpot } from '../game/view/titleCover';
import { FLAIRS, LevelFlair, flairTier, registerFlairTextures, type FlairId } from './levelFlair';

/**
 * Escenas de la galeria de propuestas de la disparadora (T-016, fase 1): solo con `npm run dev`, en `/proposals/disparadoras.html`.
 * Usan las vistas del juego (`PlantView`, la batalla de la portada), asi que respiran, brotan, disparan, se fusionan y
 * suben de nivel como en el tablero. No las ve el jugador: sus textos van en espanol sin `src/i18n/`.
 */

export const LAB_SCENES = { showcase: 'lab-showcase', board: 'lab-board', silhouette: 'lab-silhouette', levels: 'lab-levels' } as const;
export type LabView = keyof typeof LAB_SCENES;

/** Nombre corto de cada forma en la galeria. */
export const DESIGN_NAMES: Record<string, string> = {
  legacy: 'Legacy',
  bulb: 'Brote ★',
  cactus: 'b) Cactus',
  pod: 'c) Vaina',
};

/** Ancho de casilla del carril del centro del tablero: la vitrina pinta a ese tamano. */
const BOARD_CELL = perspective.cellWidthAt({ x: BOARD.columns / 2, y: 2 + PLANT_LOOK.footY });

const LABEL_STYLE = { fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 6 };

/** Las texturas del juego, las de todas las formas y las de los adornos de nivel, a la resolucion del nivel grafico. */
function paintAll(scene: Phaser.Scene, quality: QualityProfile): void {
  registerTextures(scene, quality.renderScale);
  for (const design of SHOOTER_DESIGNS) registerShooterTextures(scene, design);
  registerFlairTextures(scene);
}

/** Lienzo y camara a la medida del contenedor, como en el juego (ADR-0007). */
function keepFitted(scene: Phaser.Scene, quality: QualityProfile): void {
  const fit = () => fitCamera(scene, quality.renderScale);
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
}

export interface LabSceneData {
  quality: QualityLevel;
}

// ---------------------------------------------------------------------------
// Vitrina

/** Como esta la planta en la vitrina: para ver que se lee marchita, oscurecida y medio transparente. */
export type ShowcaseLook = 'normal' | 'wilted' | 'dimmed' | 'lifted';

interface ShowcaseData extends LabSceneData {
  /** `grow`: todas empiezan con 1 canon y se fusionan hasta los suyos (para ver crecer la forma). */
  start?: 'sprout' | 'grow';
}

const SHOWCASE = {
  top: 74,
  rowHeight: 204,
  labelWidth: 176,
  spacing: 104,
  groupGap: 26,
  /** Cada cuanto dispara cada planta (con desfase entre ellas). */
  shotEveryMs: 1700,
  levels: [1, 2, 5, 10, 15, 20],
} as const;

const GROUPS: Array<{ title: string; element: ElementType | null; silhouette?: boolean }> = [
  { title: 'Normal', element: null },
  { title: 'Fuego', element: 'fire' },
  { title: 'Hielo', element: 'ice' },
  { title: 'Silueta', element: null, silhouette: true },
];

interface ShowcasePlant {
  view: PlantView;
  design: ShooterDesign;
  /** Canones de su columna, y los que tiene ahora (al crecer van subiendo hasta los de su columna). */
  cannons: CannonCount;
  current: CannonCount;
  element: ElementType | null;
  cellWidth: number;
}

/**
 * Vitrina: una fila por forma (la actual y las tres propuestas) con 1, 2 y 3 canones en normal, fuego y hielo, y su
 * silueta en negro. Todas a tamano de tablero, respirando y disparando.
 */
export class ShowcaseScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private fx!: Effects;
  private plants: ShowcasePlant[] = [];
  private firing = true;
  private look: ShowcaseLook = 'normal';
  private level = 0;
  private start: 'sprout' | 'grow' = 'sprout';

  constructor() {
    super(LAB_SCENES.showcase);
  }

  init(data: Partial<ShowcaseData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.start = data.start ?? 'sprout';
    this.plants = [];
    this.level = 0;
  }

  create(): void {
    paintAll(this, this.quality);
    keepFitted(this, this.quality);
    this.fx = new Effects(this, this.quality);
    this.paintBackdrop();

    SHOOTER_DESIGNS.forEach((design, row) => this.addRow(design, row));
    this.time.addEvent({ delay: 120, loop: true, callback: () => this.shootSome() });
    if (this.start === 'grow') this.grow();
  }

  /** Dispara o deja de disparar. */
  setFiring(firing: boolean): void {
    this.firing = firing;
  }

  /** Vuelve a sembrar todo, o lo siembra con 1 canon y lo fusiona hasta sus canones. */
  replay(start: 'sprout' | 'grow'): void {
    this.scene.restart({ quality: this.qualityLevel(), start });
  }

  /** Sube a todas al siguiente nivel de la lista (y del 20 vuelve al 1). */
  nextLevel(): number {
    this.level = (this.level + 1) % SHOWCASE.levels.length;
    const level = SHOWCASE.levels[this.level];
    for (const plant of this.plants) plant.view.levelUp(level);
    return level;
  }

  setLook(look: ShowcaseLook): void {
    if (look === this.look) return;
    const was = this.look;
    this.look = look;
    for (const { view } of this.plants) {
      if (was === 'wilted') view.bitten(1);
      if (was === 'dimmed') view.setDimmed(false);
      if (was === 'lifted') view.setLifted(false);
      if (look === 'wilted') view.bitten(0.15);
      if (look === 'dimmed') view.setDimmed(true);
      if (look === 'lifted') view.setLifted(true);
    }
  }

  private qualityLevel(): QualityLevel {
    return (Object.keys(QUALITY_PROFILES) as QualityLevel[]).find((key) => QUALITY_PROFILES[key] === this.quality) ?? 'high';
  }

  /** Fondo: cesped para las de color y crema para las siluetas, con una franja de tierra por fila. */
  private paintBackdrop(): void {
    const g = this.add.graphics().setDepth(DEPTH.land);
    g.fillStyle(0x1d2b1f).fillRect(WORLD.left, WORLD.top, WORLD.width, WORLD.height);
    const groupX = this.groupX();
    const width = SHOWCASE.spacing * 3 + SHOWCASE.groupGap * 0.8;
    SHOOTER_DESIGNS.forEach((_design, row) => {
      const top = SHOWCASE.top + row * SHOWCASE.rowHeight;
      GROUPS.forEach((group, i) => {
        const x = groupX[i] - SHOWCASE.spacing / 2 - SHOWCASE.groupGap * 0.4;
        g.fillStyle(group.silhouette ? 0xfff6df : 0x8fcf5a).fillRoundedRect(x, top + 6, width, SHOWCASE.rowHeight - 12, 18);
        if (!group.silhouette) g.fillStyle(0x7cc14b).fillRoundedRect(x, top + 6, width, (SHOWCASE.rowHeight - 12) * 0.45, { tl: 18, tr: 18, bl: 0, br: 0 });
        g.fillStyle(group.silhouette ? 0xe8dcc0 : 0x6b4a2b, group.silhouette ? 1 : 0.55).fillEllipse(x + width / 2, this.footY(row) + 4, width - 26, 18);
      });
    });
    GROUPS.forEach((group, i) => {
      this.add
        .text(groupX[i] + SHOWCASE.spacing, SHOWCASE.top - 20, group.title, { ...LABEL_STYLE, fontSize: '26px', resolution: this.quality.renderScale })
        .setOrigin(0.5)
        .setDepth(DEPTH.floatText);
    });
  }

  /** Centro de la primera planta de cada grupo. */
  private groupX(): number[] {
    const first = SHOWCASE.labelWidth + SHOWCASE.spacing / 2;
    return GROUPS.map((_group, i) => first + i * (SHOWCASE.spacing * 3 + SHOWCASE.groupGap));
  }

  private footY(row: number): number {
    return SHOWCASE.top + row * SHOWCASE.rowHeight + SHOWCASE.rowHeight - 22;
  }

  private addRow(design: ShooterDesign, row: number): void {
    const footY = this.footY(row);
    this.add
      .text(SHOWCASE.labelWidth - 18, footY - 80, DESIGN_NAMES[design.id] ?? design.id, { ...LABEL_STYLE, fontSize: '30px', resolution: this.quality.renderScale })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.floatText);
    const groupX = this.groupX();
    GROUPS.forEach((group, g) => {
      SHOOTER_CANNONS.forEach((cannons, i) => {
        const x = groupX[g] + i * SHOWCASE.spacing;
        if (group.silhouette) this.addSilhouette(design, cannons, x, footY, row * 12 + i);
        else this.addPlant(design, cannons, group.element, x, footY, row * 12 + g * 3 + i);
      });
    });
  }

  private addPlant(design: ShooterDesign, cannons: CannonCount, element: ElementType | null, x: number, footY: number, order: number): void {
    const cellWidth = BOARD_CELL;
    const placement = { screen: { x, y: footY }, cellWidth, scale: ((cellWidth * PLANT_LOOK.width) / design.size.width) * artInv() };
    const startCannons = this.start === 'grow' ? 1 : cannons;
    const shooter: Shooter = { cannons: startCannons, element, level: 1 };
    this.time.delayedCall(order * 28, () => {
      const view = new PlantView(this, this.fx, { lane: 2, col: 4 }, shooter, 1, true, design, placement);
      this.plants.push({ view, design, cannons, current: startCannons, element, cellWidth });
    });
  }

  private addSilhouette(design: ShooterDesign, cannons: CannonCount, x: number, footY: number, order: number): void {
    const scale = ((BOARD_CELL * PLANT_LOOK.width) / design.size.width) * artInv();
    const image = this.add
      .image(x, footY, shooterTexture(cannons, null, design))
      .setOrigin(design.size.footX / design.size.width, design.size.footY / design.size.height)
      .setScale(scale)
      .setTint(0x111111)
      .setTintMode(Phaser.TintModes.FILL)
      .setDepth(DEPTH.entities + footY)
      .setAlpha(0);
    this.tweens.add({ targets: image, alpha: 1, delay: order * 28, duration: 300 });
    this.tweens.add({
      targets: image,
      scaleX: scale * 1.03,
      scaleY: scale * 0.95,
      duration: Phaser.Math.Between(850, 1150),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Cada planta dispara por todos sus canones cada `shotEveryMs`, con desfase: retroceso, fogonazo y semillas. */
  private shootSome(): void {
    if (!this.firing) return;
    const now = this.time.now;
    this.plants.forEach((plant, i) => {
      const phase = (now + i * 397) % SHOWCASE.shotEveryMs;
      if (phase >= 120) return;
      for (let cannon = 0; cannon < plant.current; cannon++) {
        plant.view.recoil(cannon);
        this.flySeed(plant, cannon);
      }
    });
  }

  private flySeed(plant: ShowcasePlant, cannon: number): void {
    const muzzle = plant.view.muzzle(cannon);
    const scale = (plant.cellWidth / 160) * 1.2 * artInv();
    const seed = this.add
      .image(muzzle.x, muzzle.y, seedTexture(plant.element))
      .setOrigin(SEED_SIZE.cx / SEED_SIZE.width, 0.5)
      .setScale(scale * 0.3)
      .setDepth(plant.view.foot().y + DEPTH.entities + 0.5);
    this.tweens.add({ targets: seed, scale, duration: 120, ease: 'Back.Out' });
    // Vuelo corto: en la vitrina las plantas estan juntas y la semilla no debe llegar a la de al lado.
    this.tweens.add({
      targets: seed,
      x: muzzle.x + plant.cellWidth * 0.3,
      duration: 140,
      onComplete: () => this.tweens.add({ targets: seed, x: `+=${plant.cellWidth * 0.14}`, alpha: 0, duration: 120, onComplete: () => seed.destroy() }),
    });
  }

  /** Empiezan con 1 canon y se fusionan, una vez las de 2 y dos veces las de 3. */
  private grow(): void {
    for (const step of [2, 3] as const) {
      this.time.delayedCall(2000 + (step - 2) * 1400, () => {
        for (const plant of this.plants) {
          if (plant.cannons < step) continue;
          plant.current = step;
          plant.view.fuse(step, 1, SHOWCASE.levels[this.level]);
        }
      });
    }
  }

}

// ---------------------------------------------------------------------------
// Tablero

/** Que se ve en el tablero: una forma o todas mezcladas, un carril cada una. */
export type BoardCastId = 'mix' | string;

interface BoardData extends LabSceneData {
  cast: BoardCastId;
  /** Adorno de tramo de nivel que se prueba (vista "Niveles"), o ninguno. */
  flair: FlairId | 'none';
}

/** Enemigos delante de cada carril para que todas disparen (como en la portada, se quedan en su sitio). */
function enemiesFor(lanes: number): CoverCast['enemies'] {
  const kinds = ['worm', 'armored', 'spitter', 'worm', 'worm'] as const;
  return Array.from({ length: lanes }, (_v, lane) => {
    const kind = kinds[lane];
    return { kind, lane, x: kind === 'spitter' ? engagedX('spitter', 3) : 6.1 + (lane % 2) * 0.5, level: [2, 5, 3, 10, 1][lane], haste: lane === 4 ? 1.25 : 1 };
  });
}

/** Una forma en todo el cesped: normal, fuego y hielo con 1, 2 y 3 canones y medallitas de varios tramos. */
function singleCast(design: ShooterDesign): CoverCast {
  const plants: PlantSpot[] = [];
  const rows: Array<[ElementType | null, number[]]> = [
    [null, [1, 2, 5]],
    ['fire', [1, 4, 10]],
    ['ice', [3, 9, 15]],
  ];
  rows.forEach(([element, levels], lane) => {
    SHOOTER_CANNONS.forEach((cannons, col) => plants.push({ cell: { lane, col }, cannons, element, level: levels[col], design }));
  });
  plants.push({ cell: { lane: 3, col: 0 }, cannons: 3, element: null, level: 20, design });
  plants.push({ cell: { lane: 3, col: 2 }, cannons: 2, element: 'fire', level: 7, design });
  plants.push({ cell: { lane: 4, col: 1 }, cannons: 1, element: 'ice', level: 2, design });
  plants.push({ cell: { lane: 4, col: 2 }, cannons: 3, element: 'fire', level: 1, design });
  return { plants, mines: [{ cell: { lane: 4, col: 0 }, element: 'fire' }], enemies: enemiesFor(BOARD.lanes) };
}

/** Todas a la vez: un carril por forma (la actual arriba) y, en el de delante, la de 3 canones de cada una. */
function mixCast(): CoverCast {
  const plants: PlantSpot[] = [];
  SHOOTER_DESIGNS.forEach((design, lane) => {
    plants.push({ cell: { lane, col: 0 }, cannons: 1, element: null, level: 1, design });
    plants.push({ cell: { lane, col: 1 }, cannons: 2, element: 'fire', level: 5, design });
    plants.push({ cell: { lane, col: 2 }, cannons: 3, element: 'ice', level: 10, design });
  });
  SHOOTER_DESIGNS.forEach((design, col) => plants.push({ cell: { lane: 4, col }, cannons: 3, element: null, level: 2, design }));
  return { plants, mines: [], enemies: enemiesFor(BOARD.lanes) };
}

/**
 * Tablero: el jardin de verdad con la camara inclinada y la batalla de la portada (combate de verdad, nadie se mueve).
 * Con clic en una planta, dispara.
 */
export class BoardLabScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private castId: BoardCastId = 'mix';
  private flair: FlairId | 'none' = 'none';
  private ambience!: Ambience;
  private cover!: TitleCover;

  constructor() {
    super(LAB_SCENES.board);
  }

  init(data: Partial<BoardData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.castId = data.cast ?? 'mix';
    this.flair = data.flair ?? 'none';
  }

  create(): void {
    paintAll(this, this.quality);
    keepFitted(this, this.quality);
    this.ambience = createAmbience(this, this.quality);
    applyPostFx(this, this.quality);
    const fx = new Effects(this, this.quality);
    const design = SHOOTER_DESIGNS.find((d) => d.id === this.castId);
    const cast = design ? singleCast(design) : mixCast();
    this.cover = new TitleCover(this, fx, cast);
    const flair = this.flair;
    if (flair !== 'none') {
      // El adorno de cada planta de nivel 5 o mas, en sus pies, cuando ya ha brotado.
      cast.plants.forEach((spot, i) => {
        const { screen, cellWidth } = plantPlacement(spot.cell, spot.design);
        new LevelFlair(this, fx, flair, flairTier(spot.level), screen, cellWidth, entityDepth(screen.y), 700 + i * 60);
      });
    }
    if (this.castId === 'mix') {
      SHOOTER_DESIGNS.forEach((d, lane) => {
        const at = perspective.toScreen({ x: -0.15, y: lane + 0.55 });
        this.add
          .text(at.x, at.y, DESIGN_NAMES[d.id] ?? d.id, { ...LABEL_STYLE, fontSize: '22px', resolution: this.quality.renderScale })
          .setOrigin(1, 0.5)
          .setDepth(DEPTH.floatText);
      });
    }
    this.input.setDefaultCursor('default');
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.cover.press(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.cover.hover(pointer.worldX, pointer.worldY));
  }

  update(_time: number, delta: number): void {
    this.ambience.update(delta);
    this.cover.update(delta);
  }
}

// ---------------------------------------------------------------------------
// Prueba de silueta

interface SilhouetteData extends LabSceneData {
  names: boolean;
  order: number[];
}

/**
 * Prueba de silueta (riesgo de T-016): las cuatro formas en negro sobre blanco, grandes y sin nombre (A, B, C, D en el
 * orden que toque), para ensenarselas a alguien ajeno al proyecto y preguntarle a que le recuerdan.
 */
export class SilhouetteScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private names = false;
  private order: number[] = SHOOTER_DESIGNS.map((_d, i) => i);

  constructor() {
    super(LAB_SCENES.silhouette);
  }

  init(data: Partial<SilhouetteData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.names = data.names ?? false;
    this.order = data.order ?? SHOOTER_DESIGNS.map((_d, i) => i);
  }

  create(): void {
    paintAll(this, this.quality);
    keepFitted(this, this.quality);
    this.add.graphics().fillStyle(0xffffff).fillRect(WORLD.left, WORLD.top, WORLD.width, WORLD.height);
    const size = 1.5;
    const columnWidth = 1600 / this.order.length;
    this.order.forEach((index, slot) => {
      const design = SHOOTER_DESIGNS[index] ?? LEGACY_SHOOTER;
      const cx = columnWidth * (slot + 0.5);
      const label = this.names ? `${'ABCD'[slot]} · ${DESIGN_NAMES[design.id]}` : 'ABCD'[slot];
      this.add
        .text(cx, 70, label, { ...LABEL_STYLE, color: '#1d2b1f', stroke: '#ffffff', fontSize: '42px', resolution: this.quality.renderScale })
        .setOrigin(0.5);
      SHOOTER_CANNONS.forEach((cannons, i) => {
        const footY = 330 + i * 250 - (i === 2 ? 10 : 0);
        const scale = (size * BOARD_CELL * artInv()) / design.size.width;
        const image = this.add
          .image(cx - 10, footY, shooterTexture(cannons, null, design))
          .setOrigin(design.size.footX / design.size.width, design.size.footY / design.size.height)
          .setScale(scale)
          .setTint(0x000000)
          .setTintMode(Phaser.TintModes.FILL);
        this.tweens.add({ targets: image, scaleX: scale * 1.03, scaleY: scale * 0.95, duration: 1000 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Niveles: adornos de tramo

interface LevelsData extends LabSceneData {
  design: string;
  element: ElementType | null;
  cannons: CannonCount;
}

const LEVELS = {
  top: 74,
  rowHeight: 204,
  labelWidth: 236,
  /** Nivel 1 de referencia (sin adorno) y el primero de cada tramo. */
  levels: [1, 5, 10, 15, 20],
  titles: ['Nivel 1', '5 · plata', '10 · oro', '15 · rubí', '20 · cristal'],
} as const;

/**
 * Propuestas de adorno para los tramos de nivel (5, 10, 15 y 20): una fila por propuesta y una columna por tramo, con la
 * forma elegida a tamano de tablero y su medallita. Todo aparece con su salto al abrir (o con "Ver aparecer").
 */
export class LevelsScene extends Phaser.Scene {
  private quality: QualityProfile = QUALITY_PROFILES.high;
  private design: ShooterDesign = SHOOTER_DESIGNS[1];
  private element: ElementType | null = null;
  private cannons: CannonCount = 2;

  constructor() {
    super(LAB_SCENES.levels);
  }

  init(data: Partial<LevelsData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'high'];
    this.design = SHOOTER_DESIGNS.find((d) => d.id === data.design) ?? SHOOTER_DESIGNS[1];
    this.element = data.element ?? null;
    this.cannons = data.cannons ?? 2;
  }

  create(): void {
    paintAll(this, this.quality);
    keepFitted(this, this.quality);
    const fx = new Effects(this, this.quality);
    const spacing = (1600 - LEVELS.labelWidth - 30) / LEVELS.levels.length;
    const columnX = (i: number) => LEVELS.labelWidth + spacing * (i + 0.5);

    const g = this.add.graphics().setDepth(DEPTH.land);
    g.fillStyle(0x1d2b1f).fillRect(WORLD.left, WORLD.top, WORLD.width, WORLD.height);
    LEVELS.titles.forEach((title, i) => {
      this.add
        .text(columnX(i), LEVELS.top - 20, title, { ...LABEL_STYLE, fontSize: '26px', resolution: this.quality.renderScale })
        .setOrigin(0.5)
        .setDepth(DEPTH.floatText);
    });

    FLAIRS.forEach((flair, row) => {
      const top = LEVELS.top + row * LEVELS.rowHeight;
      // Algo por encima del borde de la tarjeta: lo que va en el suelo (aura, gemas) se ve entero.
      const footY = top + LEVELS.rowHeight - 48;
      g.fillStyle(0x8fcf5a).fillRoundedRect(LEVELS.labelWidth - 14, top + 6, 1600 - LEVELS.labelWidth, LEVELS.rowHeight - 12, 18);
      g.fillStyle(0x7cc14b).fillRoundedRect(LEVELS.labelWidth - 14, top + 6, 1600 - LEVELS.labelWidth, (LEVELS.rowHeight - 12) * 0.42, { tl: 18, tr: 18, bl: 0, br: 0 });
      this.add
        .text(LEVELS.labelWidth - 30, top + LEVELS.rowHeight / 2, flair.name, { ...LABEL_STYLE, fontSize: '28px', resolution: this.quality.renderScale })
        .setOrigin(1, 0.5)
        .setDepth(DEPTH.floatText);
      LEVELS.levels.forEach((level, col) => {
        const x = columnX(col);
        const order = row * LEVELS.levels.length + col;
        const cellWidth = BOARD_CELL;
        const placement = { screen: { x, y: footY }, cellWidth, scale: ((cellWidth * PLANT_LOOK.width) / this.design.size.width) * artInv() };
        const shooter: Shooter = { cannons: this.cannons, element: this.element, level };
        this.time.delayedCall(order * 40, () => {
          new PlantView(this, fx, { lane: 2, col: 4 }, shooter, 1, true, this.design, placement);
          new LevelFlair(this, fx, flair.id, flairTier(level), placement.screen, cellWidth, entityDepth(footY), 520);
        });
      });
    });
  }
}
