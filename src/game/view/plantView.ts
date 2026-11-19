import * as Phaser from 'phaser';
import type { Cell } from '../core/board';
import type { ScreenPoint } from './perspective';
import { type Effects, mixColor } from './effects';
import { entityDepth, perspective } from './layout';
import { SHOOTER_SIZE, TEX, artInv } from './textures';

/** Como se coloca y se ve la disparadora. Son medidas de aspecto, en anchos de casilla. */
export const PLANT_LOOK = {
  /** Donde apoya dentro de su casilla: un poco por delante del centro. */
  footY: 0.62,
  /** Ancho de la textura. */
  width: 1.0,
  /** Boca del canon respecto a los pies: hacia delante y hacia arriba. Las balas vuelan a esa altura. */
  muzzle: { x: 0.45, up: 0.59 },
  /** Color al que tiende la planta cuando le queda poca vida. */
  wiltTint: 0xc9b25a,
  /** Cuanto se nota el marchitarse con la vida a cero (0 a 1). */
  wiltMax: 0.75,
} as const;

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
 * Disparadora en pantalla. No decide nada: la escena le cuenta lo que paso (disparo, mordisco, muerte)
 * y ella lo anima. El cuerpo respira dentro de un contenedor; las reacciones mueven el contenedor.
 */
export class PlantView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly base: ScreenPoint;
  private readonly cellWidth: number;
  private wiltTint = 0xffffff;
  private flashTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    cell: Cell,
    hpRatio: number,
    sprout: boolean,
  ) {
    const { screen, cellWidth, scale } = plantPlacement(cell);
    this.base = screen;
    this.cellWidth = cellWidth;
    const depth = entityDepth(screen.y);

    this.shadow = scene.add
      .image(screen.x, screen.y, TEX.shadow)
      .setDisplaySize(cellWidth * 0.8, cellWidth * 0.26)
      .setAlpha(sprout ? 0 : 1)
      .setDepth(depth - 0.5);
    this.body = scene.add.image(0, 0, TEX.shooter).setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height);
    this.holder = scene.add.container(screen.x, screen.y, [this.body]).setDepth(depth);
    this.setWilt(hpRatio);

    if (!sprout) {
      this.body.setScale(scale);
      this.breathe(scale);
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
      onComplete: () => this.breathe(scale),
    });
  }

  /** Boca del canon en pantalla: de ahi salen las balas. */
  muzzle(): ScreenPoint {
    return {
      x: this.base.x + PLANT_LOOK.muzzle.x * this.cellWidth,
      y: this.base.y - PLANT_LOOK.muzzle.up * this.cellWidth,
    };
  }

  /** Al disparar: el cuerpo retrocede y se aplasta un instante, y la boca del canon suelta un fogonazo. */
  recoil(): void {
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
    const muzzle = this.muzzle();
    const depth = this.holder.depth + 0.6;
    this.fx.ring(muzzle.x, muzzle.y, this.cellWidth * 0.3, 0xd6ff96, depth, 180, 0.6);
    this.fx.glow(muzzle.x, muzzle.y, this.cellWidth * 0.4, 0xc8ff8a, depth, 160);
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

  private breathe(scale: number): void {
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

  private setWilt(hpRatio: number): void {
    this.wiltTint = mixColor(0xffffff, PLANT_LOOK.wiltTint, (1 - hpRatio) * PLANT_LOOK.wiltMax);
    if (!this.flashTimer) this.body.setTint(this.wiltTint);
  }

  private flash(): void {
    this.flashTimer?.remove();
    this.body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.flashTimer = this.scene.time.delayedCall(70, () => {
      this.flashTimer = undefined;
      this.body.setTintMode(Phaser.TintModes.MULTIPLY).setTint(this.wiltTint);
    });
  }
}
