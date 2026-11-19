import * as Phaser from 'phaser';
import type { Cell } from '../core/board';
import type { CannonCount } from '../core/plants';
import type { ScreenPoint } from './perspective';
import { type Effects, mixColor } from './effects';
import { entityDepth, perspective } from './layout';
import { SHOOTER_BARRELS, SHOOTER_DOTS, SHOOTER_SIZE, TEX, artInv, shooterTexture } from './textures';

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
} as const;

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

/**
 * Disparadora en pantalla. No decide nada: la escena le cuenta lo que paso (disparo, mordisco, fusion, muerte)
 * y ella lo anima. El cuerpo respira dentro de un contenedor; las reacciones mueven el contenedor.
 */
export class PlantView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly base: ScreenPoint;
  private readonly cellWidth: number;
  private readonly scale: number;
  private cannons: CannonCount;
  private wiltTint = 0xffffff;
  private dimmed = false;
  private flashTimer?: Phaser.Time.TimerEvent;
  private liftTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    cell: Cell,
    cannons: CannonCount,
    hpRatio: number,
    sprout: boolean,
  ) {
    const { screen, cellWidth, scale } = plantPlacement(cell);
    this.base = screen;
    this.cellWidth = cellWidth;
    this.scale = scale;
    this.cannons = cannons;
    const depth = entityDepth(screen.y);

    this.shadow = scene.add
      .image(screen.x, screen.y, TEX.shadow)
      .setDisplaySize(cellWidth * 0.8, cellWidth * 0.26)
      .setAlpha(sprout ? 0 : 1)
      .setDepth(depth - 0.5);
    this.body = scene.add.image(0, 0, shooterTexture(cannons)).setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height);
    this.holder = scene.add.container(screen.x, screen.y, [this.body]).setDepth(depth);
    this.setWilt(hpRatio);

    if (!sprout) {
      this.body.setScale(scale);
      this.breathe();
      return;
    }
    // Brota de la tierra con un estiron, rebota y se queda respirando.
    scene.tweens.add({ targets: this.shadow, alpha: 1, duration: 300 });
    this.body.setScale(scale * 1.25, scale * 0.25);
    fx.dirt(screen.x, screen.y, 16);
    scene.tweens.add({
      targets: this.body,
      scaleX: scale,
      scaleY: scale,
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
    this.fx.ring(muzzle.x, muzzle.y, this.cellWidth * 0.3 * size, 0xd6ff96, depth, 180, 0.6);
    this.fx.glow(muzzle.x, muzzle.y, this.cellWidth * 0.4 * size, 0xc8ff8a, depth, 160);
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
  }

  /** Se esta arrastrando: sigue en su casilla a efectos de combate, pero medio transparente. Al soltar vuelve con un saltito. */
  setLifted(lifted: boolean): void {
    this.liftTween?.stop();
    this.liftTween = this.scene.tweens.add({ targets: this.body, alpha: lifted ? PLANT_LOOK.liftedAlpha : 1, duration: lifted ? 120 : 160 });
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
   * y rebota con brotes, chispas y un anillo. Va sobre el cuerpo y no sobre el contenedor,
   * para que un disparo o un mordisco a la vez no la corten.
   */
  fuse(cannons: CannonCount, hpRatio: number): void {
    this.cannons = cannons;
    this.flashTimer?.remove();
    this.liftTween?.stop();
    this.scene.tweens.killTweensOf(this.body);
    this.body.setTexture(shooterTexture(cannons)).setAlpha(1).setAngle(0).setScale(this.scale * 1.3, this.scale * 0.62);
    this.setWilt(hpRatio);
    this.flash(140);
    this.scene.tweens.add({
      targets: this.body,
      scaleX: this.scale,
      scaleY: this.scale,
      duration: 700,
      ease: 'Elastic.Out',
      easeParams: [1.2, 0.45],
      onComplete: () => this.breathe(),
    });

    const w = this.cellWidth;
    const depth = this.holder.depth + 0.7;
    const middle = { x: this.base.x, y: this.base.y - w * 0.5 };
    this.fx.ring(middle.x, middle.y, w * 1.25, 0xc8ff8a, depth, 420, 0.85);
    this.fx.glow(middle.x, middle.y, w * 1.4, 0xd6ff96, depth, 420);
    this.fx.sparkles(middle.x, middle.y, 16);
    this.fx.leaves(middle.x, this.base.y - w * 0.25, 8);
    // El punto nuevo del tallo destella.
    const dot = SHOOTER_DOTS[cannons - 1];
    const dotX = this.base.x + ((dot.x - SHOOTER_SIZE.footX) / SHOOTER_SIZE.width) * w;
    const dotY = this.base.y - ((SHOOTER_SIZE.footY - dot.y) / SHOOTER_SIZE.width) * w;
    this.fx.ring(dotX, dotY, w * 0.32, 0xffe36b, depth, 360, 0.95);
    this.fx.sparkles(dotX, dotY, 6);
  }

  /** Se fue a fusionarse con otra: sale de su casilla estirandose hacia arriba y deja un poco de tierra. */
  uproot(): void {
    this.flashTimer?.remove();
    this.scene.tweens.killTweensOf([this.holder, this.body, this.shadow]);
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
    this.flashTimer?.remove();
    this.scene.tweens.killTweensOf([this.holder, this.body, this.shadow]);
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

  private breathe(): void {
    const { scale } = this;
    this.scene.tweens.add({
      targets: this.body,
      scaleX: scale * 1.03,
      scaleY: scale * 0.95,
      duration: Phaser.Math.Between(850, 1150),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.scene.tweens.add({
      targets: this.body,
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

  /** Tinte de reposo: el marchitarse por la vida y, si toca, el oscurecido mientras se arrastra otra planta. */
  private restingTint(): number {
    return this.dimmed ? mixColor(this.wiltTint, PLANT_LOOK.dimTint, PLANT_LOOK.dimAmount) : this.wiltTint;
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
