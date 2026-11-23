import * as Phaser from 'phaser';
import { SHIELD } from '../config/balance';
import type { Cell } from '../core/board';
import type { Wall } from '../core/match';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import type { ScreenPoint } from './perspective';
import { PLANT_LOOK } from './plantView';
import { TEX, WALL_SIZE, artInv, wallTexture, type WallWear } from './textures';
import { wallWear } from './wallArt';

/** Aspecto del muro (T-024). Medidas en anchos de casilla salvo que se diga otra cosa. */
export const WALL_LOOK = {
  /** Ancho de la textura en pantalla: algo mas ancho que la disparadora, es un muro. */
  width: 1.05,
  /** Color al que tiende con poca vida (multiplicado), como la planta que se marchita. */
  wearTint: 0xb89a7a,
  wearMax: 0.45,
} as const;

/** Escala de la textura del muro en una casilla de ancho `cellWidth` (tambien para el muro fantasma de la carta). */
export function wallScale(cellWidth: number): number {
  return ((cellWidth * WALL_LOOK.width) / WALL_SIZE.width) * artInv();
}

interface Pulse {
  v: number;
}

/**
 * Muro en pantalla (T-024): el escudo sembrado solo. Sigue al muro del estado en `sync` (su desgaste se ve con la vida:
 * pierde placas de corteza en dos tandas) y anima lo que la escena le cuenta: lo muerden, le escupen, lo arrastran para
 * infundir una disparadora o se rompe. No decide nada.
 */
export class WallView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly figure: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly base: ScreenPoint;
  private readonly cellWidth: number;
  private readonly scale: number;
  private readonly squash: Pulse = { v: 0 };
  private wear: WallWear;
  private lifted = false;
  private flashTimer?: Phaser.Time.TimerEvent;
  private restTint = 0xffffff;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    cell: Cell,
    wall: Wall,
    sprout: boolean,
  ) {
    const foot = { x: cell.col + 0.5, y: cell.lane + PLANT_LOOK.footY };
    this.base = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.scale = wallScale(this.cellWidth);
    this.wear = wallWear(wall.hp / SHIELD.wallHp);
    const depth = entityDepth(this.base.y);

    this.shadow = scene.add
      .image(this.base.x, this.base.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.9, this.cellWidth * 0.28)
      .setAlpha(sprout ? 0 : 1)
      .setDepth(depth - 0.5);
    this.body = scene.add
      .image(0, 0, wallTexture(this.wear))
      .setOrigin(WALL_SIZE.footX / WALL_SIZE.width, WALL_SIZE.footY / WALL_SIZE.height)
      .setScale(this.scale);
    this.figure = scene.add.container(0, 0, [this.body]);
    this.holder = scene.add.container(this.base.x, this.base.y, [this.figure]).setDepth(depth);
    this.setTintFor(wall);

    if (!sprout) {
      this.breathe();
      return;
    }
    // Sale de la tierra de golpe, pesado: se aplasta, rebota y suelta tierra y unas astillas.
    scene.tweens.add({ targets: this.shadow, alpha: 1, duration: 260 });
    this.figure.setScale(1.3, 0.2);
    fx.dirt(this.base.x, this.base.y, 18);
    fx.bark(this.base.x, this.base.y - this.cellWidth * 0.3, 5);
    fx.groundRing(this.base.x, this.base.y, this.cellWidth * 1.1, this.cellWidth * 0.34, 0xf0c27a, depth - 0.4, 420, 0.85);
    scene.tweens.add({
      targets: this.figure,
      scaleX: 1,
      scaleY: 1,
      duration: 560,
      ease: 'Elastic.Out',
      easeParams: [1.2, 0.45],
      onComplete: () => this.breathe(),
    });
  }

  /** Pies del muro en pantalla. */
  foot(): ScreenPoint {
    return { ...this.base };
  }

  /** ¿Cae el punto de pantalla sobre el muro? (para agarrarlo y arrastrarlo, y para la ficha). */
  contains(x: number, y: number): boolean {
    return this.holder.active && this.body.getBounds().contains(x, y);
  }

  /** Sigue al muro del estado: su desgaste (que cambia de textura soltando placas) y lo que tira a gastado. */
  sync(wall: Wall): void {
    if (!this.holder.active) return;
    const wear = wallWear(wall.hp / SHIELD.wallHp);
    if (wear !== this.wear) {
      const worse = wear > this.wear;
      this.wear = wear;
      this.body.setTexture(wallTexture(wear));
      // Al perder una tanda de placas, salen volando con astillas y el muro se encoge un instante.
      if (worse) this.shed();
    }
    this.setTintFor(wall);
    const squash = this.squash.v;
    this.holder.setScale(1 + squash * 0.08, 1 - squash * 0.12);
  }

  /** Un mordisco o un escupitajo: se aplasta un poco, destella y suelta astillas. Aguanta: apenas se mueve. */
  bitten(): void {
    this.pulse(this.squash, 300);
    this.flash();
    this.fx.bark(this.base.x + this.cellWidth * 0.32, this.base.y - this.cellWidth * 0.45, 3);
  }

  /** Mientras se arrastra para infundir una disparadora: sigue en su casilla, medio transparente. */
  setLifted(lifted: boolean): void {
    if (lifted === this.lifted || !this.holder.active) return;
    this.lifted = lifted;
    this.scene.tweens.add({ targets: this.figure, alpha: lifted ? PLANT_LOOK.liftedAlpha : 1, duration: lifted ? 120 : 160 });
    if (!lifted) this.pulse(this.squash, 320);
  }

  /** Se gasta al infundir una disparadora: el de la mano ya se metio en la planta; el de la casilla se hunde en la tierra. */
  consume(): void {
    this.stop();
    this.fx.dirt(this.base.x, this.base.y, 10);
    this.fx.bark(this.base.x, this.base.y - this.cellWidth * 0.25, 4);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.2,
      scaleY: 0,
      alpha: 0,
      duration: 280,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeShadow(280);
  }

  /** Seleccionado para arrancarlo (T-046): un saltito corto, como la disparadora; pesa mas, asi que apenas se levanta. */
  beckon(): void {
    if (!this.holder.active) return;
    this.scene.tweens.add({ targets: this.figure, y: -this.cellWidth * 0.05, duration: 120, ease: 'Quad.Out', yoyo: true });
  }

  /**
   * Arrancado (T-046): se resiste un momento (tiembla agarrado a la tierra), sale de un tiron entre terrones y astillas y se
   * va hacia arriba desvaneciendose. Es mas pesado que la disparadora: sube menos y no gira tanto.
   */
  pullOut(): void {
    this.stop();
    const w = this.cellWidth;
    const { x, y } = this.base;
    this.scene.tweens.chain({
      targets: this.holder,
      tweens: [
        { x: x + w * 0.03, duration: 45, yoyo: true, ease: 'Sine.InOut' },
        {
          scaleX: 0.9,
          scaleY: 1.18,
          y: y - w * 0.35,
          duration: 180,
          ease: 'Back.Out',
          onStart: () => {
            this.fx.clods(x, y, 14);
            this.fx.dirt(x, y, 14);
            this.fx.bark(x, y - w * 0.3, 5);
            this.fx.groundRing(x, y, w * 1.15, w * 0.38, 0x7a5332, this.holder.depth - 0.4, 560, 0.85);
          },
        },
        { y: y - w * 0.75, angle: 12, scaleX: 0.75, scaleY: 0.9, alpha: 0, duration: 300, ease: 'Quad.In' },
      ],
      onComplete: () => this.holder.destroy(),
    });
    this.fadeShadow(360);
  }

  /** Roto a mordiscos o a escupitajos: se parte en astillas y hojas y se hunde. */
  die(): void {
    this.stop();
    const w = this.cellWidth;
    this.fx.bark(this.base.x, this.base.y - w * 0.45, 16);
    this.fx.leaves(this.base.x, this.base.y - w * 0.6, 6);
    this.fx.dirt(this.base.x, this.base.y, 14);
    this.scene.cameras.main.shake(120, 0.0025);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.35,
      scaleY: 0,
      alpha: 0,
      duration: 340,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeShadow(340);
  }

  /** Respira muy poco y casi no se mece: es firme. */
  private breathe(): void {
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: 1.015,
      scaleY: 0.975,
      duration: Phaser.Math.Between(1300, 1700),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Placas que salen volando al pasar a un desgaste peor. */
  private shed(): void {
    const w = this.cellWidth;
    this.fx.bark(this.base.x, this.base.y - w * 0.55, 10);
    this.fx.bark(this.base.x + w * 0.2, this.base.y - w * 0.3, 6);
    this.pulse(this.squash, 420);
  }

  /** Tira a gastado con la vida, multiplicado: el dibujo se sigue leyendo. Un destello en curso manda. */
  private setTintFor(wall: Wall): void {
    const lost = 1 - Phaser.Math.Clamp(wall.hp / SHIELD.wallHp, 0, 1);
    const k = lost * WALL_LOOK.wearMax;
    const mix = (shift: number) => {
      const from = (0xffffff >> shift) & 0xff;
      const to = (WALL_LOOK.wearTint >> shift) & 0xff;
      return Math.round(from + (to - from) * k) << shift;
    };
    this.restTint = mix(16) | mix(8) | mix(0);
    if (!this.flashTimer) this.body.setTintMode(Phaser.TintModes.MULTIPLY).setTint(this.restTint);
  }

  private flash(): void {
    this.flashTimer?.remove();
    this.body.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff);
    this.flashTimer = this.scene.time.delayedCall(70, () => {
      this.flashTimer = undefined;
      this.body.setTintMode(Phaser.TintModes.MULTIPLY).setTint(this.restTint);
    });
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private stop(): void {
    this.flashTimer?.remove();
    this.flashTimer = undefined;
    this.scene.tweens.killTweensOf([this.holder, this.figure, this.body, this.squash]);
  }

  private fadeShadow(durationMs: number): void {
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: durationMs, onComplete: () => this.shadow.destroy() });
  }
}
