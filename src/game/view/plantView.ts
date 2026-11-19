import * as Phaser from 'phaser';
import type { Cell } from '../core/board';
import type { CannonCount, ElementType, Shooter } from '../core/plants';
import type { ScreenPoint } from './perspective';
import { type Effects, mixColor } from './effects';
import { entityDepth, perspective } from './layout';
import { MEDAL_TIERS, medalCenter, medalTier, showsMedal } from './levelMedal';
import { shooterHead } from './shooterShape';
import {
  SHOOTER_BARRELS,
  SHOOTER_DOTS,
  SHOOTER_SIZE,
  TEX,
  artInv,
  medalTexture,
  shooterTexture,
  shooterVariant,
  type ShooterVariant,
} from './textures';

/** Como se coloca y se ve la disparadora. Son medidas de aspecto, en anchos de casilla. */
export const PLANT_LOOK = {
  /** Donde apoya dentro de su casilla: un poco por delante del centro. */
  footY: 0.62,
  /** Ancho de la textura. */
  width: 1.0,
  /** Color al que tiende la planta cuando le queda poca vida. */
  wiltTint: 0xc9b25a,
  /** Cuanto se nota el marchitarse con la vida a cero (0 a 1). */
  wiltMax: 0.75,
  /** Mientras se arrastra otra planta (T-006), las que no sirven de destino se oscurecen hacia este color. */
  dimTint: 0x56604f,
  dimAmount: 0.55,
  /** La planta que se esta arrastrando se queda en su casilla (sigue en combate), medio transparente. */
  liftedAlpha: 0.35,
  /** La de fuego suelta una brasa cada tanto y la de hielo un copo (ms en Alto; mas espaciados en Bajo). */
  emberEveryMs: 900,
  flakeEveryMs: 1100,
  /** Al subir de nivel (T-003): destellos dorados. Al cambiar de color la medallita, un anillo mas de su color. */
  levelUpColor: 0xffe36b,
} as const;

/** Colores de los efectos de cada variante: fogonazo del canon y destellos al fusionarse o infundirse. */
const VARIANT_FX: Record<ShooterVariant, { muzzle: number; muzzleGlow: number; burst: number; burstGlow: number }> = {
  normal: { muzzle: 0xd6ff96, muzzleGlow: 0xc8ff8a, burst: 0xc8ff8a, burstGlow: 0xd6ff96 },
  fire: { muzzle: 0xffc46b, muzzleGlow: 0xff9a3d, burst: 0xffa04d, burstGlow: 0xffd27a },
  ice: { muzzle: 0xc8f0ff, muzzleGlow: 0x8fd8ff, burst: 0x8fd8ff, burstGlow: 0xd8f6ff },
};

/** Texto que salta al infundir cada elemento. */
const INFUSED_TEXT: Record<ElementType, { text: string; color: string; stroke: string }> = {
  fire: { text: '¡Fuego!', color: '#ffe3a0', stroke: '#8a2410' },
  ice: { text: '¡Hielo!', color: '#e6f7ff', stroke: '#1f5a8a' },
};

/** Boca de un canon respecto a los pies, en anchos de casilla: hacia delante (`x`) y hacia arriba (`up`). */
export interface Muzzle {
  x: number;
  up: number;
}

/** Boca del canon `cannon` (0 es el de arriba) de una disparadora con `cannons` canones. De ahi salen sus semillas. */
export function barrelMuzzle(cannons: CannonCount, cannon = 0): Muzzle {
  const barrels = SHOOTER_BARRELS[cannons];
  const barrel = barrels[Math.min(cannon, barrels.length - 1)];
  return {
    x: (barrel.mouthX + 2 - SHOOTER_SIZE.footX) / SHOOTER_SIZE.width,
    up: (SHOOTER_SIZE.footY - barrel.y) / SHOOTER_SIZE.width,
  };
}

/** Donde y a que escala se pinta la disparadora de una casilla. */
export function plantPlacement(cell: Cell) {
  const foot = { x: cell.col + 0.5, y: cell.lane + PLANT_LOOK.footY };
  const cellWidth = perspective.cellWidthAt(foot);
  return {
    screen: perspective.toScreen(foot),
    cellWidth,
    scale: ((cellWidth * PLANT_LOOK.width) / SHOOTER_SIZE.width) * artInv(),
  };
}

/** Color del tramo de la medallita en 0xRRGGBB, para los destellos de subir de nivel. */
const medalColor = (level: number): number => Number.parseInt(MEDAL_TIERS[medalTier(level)].mid.slice(1), 16);

/**
 * Disparadora en pantalla. No decide nada: la escena le cuenta lo que paso (disparo, mordisco, fusion, nivel, muerte)
 * y ella lo anima. Tres capas: las reacciones mueven el contenedor (`holder`); dentro, la figura (`figure`) respira,
 * brota y rebota al cambiar de aspecto, y lleva el cuerpo y la medallita de nivel, que asi no se despega de la cabeza.
 */
export class PlantView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly figure: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly base: ScreenPoint;
  private readonly cellWidth: number;
  private readonly scale: number;
  private cannons: CannonCount;
  private element: ElementType | null;
  private level: number;
  /** Medallita de nivel (T-003), en la nuca. No la llevan las de nivel 1. */
  private medal?: Phaser.GameObjects.Image;
  private wiltTint = 0xffffff;
  /** Brasas (fuego) o copos (hielo) que suelta en reposo la planta infundida. */
  private aura?: Phaser.Time.TimerEvent;
  private dimmed = false;
  private lifted = false;
  private flashTimer?: Phaser.Time.TimerEvent;
  private liftTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    cell: Cell,
    shooter: Shooter,
    hpRatio: number,
    sprout: boolean,
  ) {
    const { screen, cellWidth, scale } = plantPlacement(cell);
    this.base = screen;
    this.cellWidth = cellWidth;
    this.scale = scale;
    this.cannons = shooter.cannons;
    this.element = shooter.element;
    this.level = shooter.level;
    const depth = entityDepth(screen.y);

    this.shadow = scene.add
      .image(screen.x, screen.y, TEX.shadow)
      .setDisplaySize(cellWidth * 0.8, cellWidth * 0.26)
      .setAlpha(sprout ? 0 : 1)
      .setDepth(depth - 0.5);
    this.body = scene.add
      .image(0, 0, shooterTexture(this.cannons, this.element))
      .setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height)
      .setScale(scale);
    this.figure = scene.add.container(0, 0, [this.body]);
    this.holder = scene.add.container(screen.x, screen.y, [this.figure]).setDepth(depth);
    this.setWilt(hpRatio);
    this.syncMedal();
    this.startAura();

    if (!sprout) {
      this.breathe();
      return;
    }
    // Brota de la tierra con un estiron, rebota y se queda respirando.
    scene.tweens.add({ targets: this.shadow, alpha: 1, duration: 300 });
    this.figure.setScale(1.25, 0.25);
    fx.dirt(screen.x, screen.y, 16);
    scene.tweens.add({
      targets: this.figure,
      scaleX: 1,
      scaleY: 1,
      duration: 520,
      ease: 'Elastic.Out',
      easeParams: [1.1, 0.5],
      onComplete: () => this.breathe(),
    });
  }

  /** Pies de la planta en pantalla. */
  foot(): ScreenPoint {
    return { ...this.base };
  }

  /** Boca del canon `cannon` en pantalla: de ahi salen las balas. */
  muzzle(cannon = 0): ScreenPoint {
    const m = barrelMuzzle(this.cannons, cannon);
    return { x: this.base.x + m.x * this.cellWidth, y: this.base.y - m.up * this.cellWidth };
  }

  /** Boca del canon `cannon` respecto a los pies, en anchos de casilla (para la semilla). */
  muzzleOffset(cannon = 0): Muzzle {
    return barrelMuzzle(this.cannons, cannon);
  }

  /** ¿Cae el punto de pantalla sobre la planta? Una caja algo holgada alrededor de cabeza, tallo y canones. */
  contains(x: number, y: number): boolean {
    const w = this.cellWidth;
    return x >= this.base.x - 0.42 * w && x <= this.base.x + 0.5 * w && y >= this.base.y - 0.98 * w && y <= this.base.y + 0.06 * w;
  }

  /** Al disparar el canon `cannon`: el cuerpo retrocede y se aplasta un instante, y esa boca suelta un fogonazo. */
  recoil(cannon = 0): void {
    this.resetPose();
    this.holder.setPosition(this.base.x - this.cellWidth * 0.05, this.base.y).setScale(0.9, 1.07);
    this.scene.tweens.add({
      targets: this.holder,
      x: this.base.x,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.Out',
    });
    const muzzle = this.muzzle(cannon);
    const depth = this.holder.depth + 0.6;
    // Con varios canones, fogonazos algo mas pequenos: salen a la vez y no deben tapar la cara.
    const size = this.cannons === 1 ? 1 : 0.75;
    const colors = VARIANT_FX[shooterVariant(this.element)];
    this.fx.ring(muzzle.x, muzzle.y, this.cellWidth * 0.3 * size, colors.muzzle, depth, 180, 0.6);
    this.fx.glow(muzzle.x, muzzle.y, this.cellWidth * 0.4 * size, colors.muzzleGlow, depth, 160);
  }

  /** Al recibir un mordisco: se encoge hacia atras, destella y pierde unas hojas. Se marchita segun la vida que le queda. */
  bitten(hpRatio: number): void {
    this.setWilt(hpRatio);
    this.resetPose();
    this.holder.setAngle(-9).setScale(1.06, 0.9);
    this.scene.tweens.add({ targets: this.holder, angle: 0, scaleX: 1, scaleY: 1, duration: 420, ease: 'Elastic.Out', easeParams: [1, 0.45] });
    this.flash();
    this.fx.leaves(this.base.x + this.cellWidth * 0.25, this.base.y - this.cellWidth * 0.35, 5);
  }

  /** Mientras se arrastra otra planta: se oscurece si no puede fusionarse con ella. */
  setDimmed(dimmed: boolean): void {
    if (this.dimmed === dimmed) return;
    this.dimmed = dimmed;
    if (!this.flashTimer) this.body.setTint(this.restingTint());
    this.medal?.setTint(this.medalTint());
  }

  /** Se esta arrastrando: sigue en su casilla a efectos de combate, pero medio transparente. Al soltar vuelve con un saltito. */
  setLifted(lifted: boolean): void {
    this.lifted = lifted;
    this.liftTween?.stop();
    this.liftTween = this.scene.tweens.add({ targets: this.figure, alpha: lifted ? PLANT_LOOK.liftedAlpha : 1, duration: lifted ? 120 : 160 });
    if (lifted) return;
    this.resetPose();
    this.holder.setScale(1.12, 0.86);
    this.scene.tweens.add({ targets: this.holder, scaleX: 1, scaleY: 1, duration: 380, ease: 'Elastic.Out', easeParams: [1, 0.5] });
    this.fx.dirt(this.base.x, this.base.y, 5);
  }

  /** Al empezar a arrastrar otra planta con la que puede fusionarse: un saltito de "aqui". */
  beckon(): void {
    this.resetPose();
    this.scene.tweens.add({
      targets: this.holder,
      y: this.base.y - this.cellWidth * 0.08,
      scaleX: 0.95,
      scaleY: 1.06,
      duration: 140,
      ease: 'Quad.Out',
      yoyo: true,
    });
  }

  /**
   * Recibe a la planta arrastrada (T-006): se aplasta, destella, cambia a su textura de `cannons` canones
   * y rebota con brotes, chispas y un anillo. Va sobre la figura y no sobre el contenedor,
   * para que un disparo o un mordisco a la vez no la corten. Queda con el nivel `level` (el mas bajo de las dos).
   */
  fuse(cannons: CannonCount, hpRatio: number, level: number): void {
    this.cannons = cannons;
    this.level = level;
    this.morph(hpRatio);
    // La cabeza crece con los canones: la medallita se recoloca (y cambia si el nivel bajo).
    this.syncMedal();

    const w = this.cellWidth;
    const depth = this.holder.depth + 0.7;
    const middle = { x: this.base.x, y: this.base.y - w * 0.5 };
    const colors = VARIANT_FX[shooterVariant(this.element)];
    this.fx.ring(middle.x, middle.y, w * 1.25, colors.burst, depth, 420, 0.85);
    this.fx.glow(middle.x, middle.y, w * 1.4, colors.burstGlow, depth, 420);
    this.fx.sparkles(middle.x, middle.y, 16);
    this.fx.leaves(middle.x, this.base.y - w * 0.25, 8);
    // El punto nuevo del tallo destella.
    const dot = SHOOTER_DOTS[cannons - 1];
    const dotX = this.base.x + ((dot.x - SHOOTER_SIZE.footX) / SHOOTER_SIZE.width) * w;
    const dotY = this.base.y - ((SHOOTER_SIZE.footY - dot.y) / SHOOTER_SIZE.width) * w;
    this.fx.ring(dotX, dotY, w * 0.32, 0xffe36b, depth, 360, 0.95);
    this.fx.sparkles(dotX, dotY, 6);
  }

  /**
   * Infundida con un elemento (T-004): las llamas (fuego) o la escarcha (hielo) suben por la planta, que se aplasta,
   * destella, cambia a la textura de su variante y rebota. Como al fusionarse, va sobre la figura.
   */
  infuse(element: ElementType): void {
    this.element = element;
    this.morph();
    const w = this.cellWidth;
    const depth = this.holder.depth + 0.7;
    const middle = { x: this.base.x, y: this.base.y - w * 0.5 };
    const colors = VARIANT_FX[shooterVariant(element)];
    if (element === 'fire') {
      this.fx.fire(this.base.x, this.base.y - w * 0.1, 14);
      this.fx.fire(middle.x, middle.y, 8);
      this.fx.embers(middle.x, middle.y, 12);
    } else {
      this.fx.frost(this.base.x, this.base.y - w * 0.1, 12);
      this.fx.frost(middle.x, middle.y, 8);
      this.fx.mist(this.base.x, this.base.y - w * 0.2, 6);
      this.fx.sparkles(middle.x, middle.y, 8);
    }
    this.fx.ring(middle.x, middle.y, w * 1.3, colors.burst, depth, 460, 0.9);
    this.fx.glow(middle.x, middle.y, w * 1.5, colors.burstGlow, depth, 460);
    const label = INFUSED_TEXT[element];
    this.fx.floatText(label.text, this.base.x, this.base.y - w * 1.05, label);
    this.startAura();
  }

  /**
   * Sube al nivel `level` (T-003): da un estiron, la medallita sale de golpe con el numero nuevo y la planta
   * suelta destellos dorados con un anillo en el suelo. Si la medallita cambia de color (cada 5 niveles), un anillo
   * mas grande de su color. Como al fusionarse, va sobre la figura.
   */
  levelUp(level: number): void {
    const newTier = !showsMedal(this.level) || medalTier(level) !== medalTier(this.level);
    this.level = level;
    this.syncMedal();

    // Estiron hacia arriba y rebote.
    this.scene.tweens.killTweensOf(this.figure);
    this.figure.setAlpha(this.lifted ? PLANT_LOOK.liftedAlpha : 1).setAngle(0).setScale(0.86, 1.18);
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: 1,
      scaleY: 1,
      duration: 560,
      ease: 'Elastic.Out',
      easeParams: [1.1, 0.5],
      onComplete: () => this.breathe(),
    });
    this.flash(110);

    const w = this.cellWidth;
    const depth = this.holder.depth + 0.7;
    const middle = { x: this.base.x, y: this.base.y - w * 0.5 };
    const color = medalColor(level);
    this.fx.groundRing(this.base.x, this.base.y, w * 1.1, w * 0.36, PLANT_LOOK.levelUpColor, this.holder.depth - 0.4, 520, 0.9);
    this.fx.sparkles(middle.x, middle.y, 12);
    this.fx.glow(middle.x, middle.y, w * 1.2, PLANT_LOOK.levelUpColor, depth, 380);

    if (this.medal) {
      const medal = this.medalPoint();
      // Dos subidas seguidas: la segunda corta el salto de la primera.
      this.scene.tweens.killTweensOf(this.medal);
      this.medal.setScale(0).setAngle(-40);
      this.scene.tweens.add({ targets: this.medal, scale: this.scale, angle: 0, duration: 520, ease: 'Back.Out', easeParams: [3] });
      this.fx.ring(medal.x, medal.y, w * (newTier ? 0.75 : 0.42), color, depth, newTier ? 520 : 360, 0.95);
      this.fx.sparkles(medal.x, medal.y, newTier ? 12 : 6);
      if (newTier) this.fx.glow(medal.x, medal.y, w * 0.7, color, depth, 460);
    }
    // Sin texto flotante: subiria por detras del panel de nivel, que ya muestra el nivel nuevo con un salto.
  }

  /** Se fue a fusionarse con otra: sale de su casilla estirandose hacia arriba y deja un poco de tierra. */
  uproot(): void {
    this.aura?.remove();
    this.flashTimer?.remove();
    this.scene.tweens.killTweensOf(this.parts());
    this.fx.dirt(this.base.x, this.base.y, 10);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 0.3,
      scaleY: 1.4,
      y: this.base.y - this.cellWidth * 0.4,
      alpha: 0,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => this.holder.destroy(),
    });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 220, onComplete: () => this.shadow.destroy() });
  }

  /** Destruida: se aplasta contra el suelo soltando hojas y tierra. */
  die(): void {
    this.aura?.remove();
    this.flashTimer?.remove();
    this.scene.tweens.killTweensOf(this.parts());
    this.body.setTintMode(Phaser.TintModes.MULTIPLY).setTint(this.wiltTint);
    this.fx.leaves(this.base.x, this.base.y - this.cellWidth * 0.4, 12);
    this.fx.dirt(this.base.x, this.base.y, 10);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.35,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 300, onComplete: () => this.shadow.destroy() });
  }

  /**
   * Cambio de aspecto con rebote (fusionarse, infundirse): se aplasta, destella, toma la textura de sus canones
   * y su elemento, y rebota hasta su tamano. Sin `hpRatio`, el marchitarse se queda como estaba.
   */
  private morph(hpRatio?: number): void {
    this.flashTimer?.remove();
    this.liftTween?.stop();
    this.scene.tweens.killTweensOf(this.figure);
    this.body.setTexture(shooterTexture(this.cannons, this.element));
    this.lifted = false;
    this.figure.setAlpha(1).setAngle(0).setScale(1.3, 0.62);
    if (hpRatio !== undefined) this.setWilt(hpRatio);
    this.flash(140);
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: 1,
      scaleY: 1,
      duration: 700,
      ease: 'Elastic.Out',
      easeParams: [1.2, 0.45],
      onComplete: () => this.breathe(),
    });
  }

  /**
   * La de fuego suelta brasas de la cabeza de vez en cuando y la de hielo, copos que caen: asi se ve su elemento
   * aunque no dispare.
   */
  private startAura(): void {
    if (!this.element || this.aura) return;
    const fire = this.element === 'fire';
    const delay = this.fx.ambientDelay(fire ? PLANT_LOOK.emberEveryMs : PLANT_LOOK.flakeEveryMs);
    this.aura = this.scene.time.addEvent({
      delay,
      startAt: Math.random() * delay,
      loop: true,
      callback: () => {
        const w = this.cellWidth;
        const x = this.base.x + Phaser.Math.FloatBetween(-0.2, 0.15) * w;
        const y = this.base.y - w * Phaser.Math.FloatBetween(0.75, 0.95);
        if (fire) this.fx.ember(x, y);
        else this.fx.flake(x, y);
      },
    });
  }

  private breathe(): void {
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: 1.03,
      scaleY: 0.95,
      duration: Phaser.Math.Between(850, 1150),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.scene.tweens.add({
      targets: this.figure,
      angle: { from: -1.5, to: 1.5 },
      duration: Phaser.Math.Between(2200, 3000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Corta la reaccion anterior y vuelve a la postura de reposo antes de empezar otra. */
  private resetPose(): void {
    this.scene.tweens.killTweensOf(this.holder);
    this.holder.setPosition(this.base.x, this.base.y).setScale(1).setAngle(0);
  }

  /** Todo lo que se anima de la planta, para cortarlo de golpe al irse. */
  private parts(): Phaser.GameObjects.GameObject[] {
    return [this.holder, this.figure, this.body, this.shadow, ...(this.medal ? [this.medal] : [])];
  }

  /** Tinte de reposo: el marchitarse por la vida y, si toca, el oscurecido mientras se arrastra otra planta. */
  private restingTint(): number {
    return this.dimmed ? mixColor(this.wiltTint, PLANT_LOOK.dimTint, PLANT_LOOK.dimAmount) : this.wiltTint;
  }

  /** La medallita no se marchita (el numero se tiene que leer), pero se oscurece con la planta. */
  private medalTint(): number {
    return this.dimmed ? mixColor(0xffffff, PLANT_LOOK.dimTint, PLANT_LOOK.dimAmount) : 0xffffff;
  }

  /** Centro de la medallita respecto a los pies, en pantalla y sin la escala de la figura. */
  private medalOffset(): { x: number; y: number } {
    const center = medalCenter(shooterHead(this.cannons));
    const w = this.cellWidth / SHOOTER_SIZE.width;
    return { x: (center.x - SHOOTER_SIZE.footX) * w, y: (center.y - SHOOTER_SIZE.footY) * w };
  }

  /** Centro de la medallita en pantalla (para los destellos). */
  private medalPoint(): ScreenPoint {
    const offset = this.medalOffset();
    return { x: this.base.x + offset.x, y: this.base.y + offset.y };
  }

  /** Pone, cambia o quita la medallita segun el nivel, en la nuca de la cabeza de sus canones. */
  private syncMedal(): void {
    if (!showsMedal(this.level)) {
      if (this.medal) this.scene.tweens.killTweensOf(this.medal);
      this.medal?.destroy();
      this.medal = undefined;
      return;
    }
    const offset = this.medalOffset();
    if (!this.medal) {
      this.medal = this.scene.add.image(0, 0, medalTexture(this.level)).setScale(this.scale);
      this.figure.add(this.medal);
    }
    this.medal.setTexture(medalTexture(this.level)).setPosition(offset.x, offset.y).setTint(this.medalTint());
  }

  private setWilt(hpRatio: number): void {
    this.wiltTint = mixColor(0xffffff, PLANT_LOOK.wiltTint, (1 - hpRatio) * PLANT_LOOK.wiltMax);
    if (!this.flashTimer) this.body.setTint(this.restingTint());
  }

  private flash(durationMs = 70): void {
    this.flashTimer?.remove();
    this.body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.flashTimer = this.scene.time.delayedCall(durationMs, () => {
      this.flashTimer = undefined;
      this.body.setTintMode(Phaser.TintModes.MULTIPLY).setTint(this.restingTint());
    });
  }
}
