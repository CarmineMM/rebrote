import * as Phaser from 'phaser';
import { ICE_WALL } from '../config/balance';
import type { Cell } from '../core/board';
import type { IceBlock } from '../core/match';
import type { Effects } from './effects';
import { DEPTH, entityDepth, perspective } from './layout';
import type { ScreenPoint } from './perspective';
import { PLANT_LOOK } from './plantView';
import { iceWear, type IceWear } from './powerArt';
import { ICE_BLOCK_SIZE, TEX, artInv, iceBlockTexture } from './textures';

/** Aspecto del muro de hielo del poder (T-021). Medidas en anchos de casilla salvo que se diga otra cosa. */
export const ICE_LOOK = {
  /** Ancho de la textura en pantalla: casi la casilla entera, para que tres seguidos se lean como un muro. */
  width: 1.02,
  /** Al brotar, cada bloque sale un poco despues que el de arriba. */
  staggerMs: 90,
  /** Los ultimos ms antes de derretirse: gotea, encoge un poco y parpadea (lo que va a desaparecer avisa antes). */
  meltWarnMs: 3000,
  /** Lo que encoge al derretirse del todo, de alto. */
  meltShrink: 0.22,
  /** Cada cuanto gotea mientras se derrite (ms, en Alto). */
  dripEveryMs: 420,
  /** Hacia que color tira con poca vida (multiplicado): mas azul y apagado. */
  wearTint: 0x9fc4e0,
  wearMax: 0.4,
} as const;

/** Escala de la textura del bloque en una casilla de ancho `cellWidth` (tambien para el muro fantasma del apuntado). */
export function iceBlockScale(cellWidth: number): number {
  return ((cellWidth * ICE_LOOK.width) / ICE_BLOCK_SIZE.width) * artInv();
}

interface Pulse {
  v: number;
}

/**
 * Bloque del muro de hielo en pantalla (T-021). Sigue al del estado en `sync`: su desgaste con la vida (muescas y grietas)
 * y, al acabarse su tiempo, gotea, encoge y parpadea. Anima lo que la escena le cuenta: brota, lo muerden o le disparan,
 * se rompe o se derrite. No decide nada.
 */
export class IceBlockView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly figure: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly base: ScreenPoint;
  private readonly cellWidth: number;
  private readonly squash: Pulse = { v: 0 };
  private wear: IceWear;
  private flashTimer?: Phaser.Time.TimerEvent;
  private drips?: Phaser.Time.TimerEvent;
  private glints?: Phaser.Time.TimerEvent;
  private restTint = 0xffffff;
  private melting = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    cell: Cell,
    block: IceBlock,
    rise: boolean,
    delayMs = 0,
  ) {
    const foot = { x: cell.col + 0.5, y: cell.lane + PLANT_LOOK.footY };
    this.base = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.wear = iceWear(block.hp / ICE_WALL.hp);
    const depth = entityDepth(this.base.y);

    this.shadow = scene.add
      .image(this.base.x, this.base.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.95, this.cellWidth * 0.3)
      .setTint(0x2a5a8a)
      .setAlpha(rise ? 0 : 0.8)
      .setDepth(depth - 0.5);
    this.body = scene.add
      .image(0, 0, iceBlockTexture(this.wear))
      .setOrigin(ICE_BLOCK_SIZE.footX / ICE_BLOCK_SIZE.width, ICE_BLOCK_SIZE.footY / ICE_BLOCK_SIZE.height)
      .setScale(iceBlockScale(this.cellWidth));
    this.figure = scene.add.container(0, 0, [this.body]);
    this.holder = scene.add.container(this.base.x, this.base.y, [this.figure]).setDepth(depth);
    this.sync(block);

    if (!rise) {
      this.breathe();
      return;
    }
    // Brota del suelo de golpe: cristales, copos y una onda helada; se estira y rebota.
    this.figure.setScale(0.6, 0);
    const w = this.cellWidth;
    scene.time.delayedCall(delayMs, () => {
      if (!this.holder.active) return;
      scene.tweens.add({ targets: this.shadow, alpha: 0.8, duration: 220 });
      fx.frost(this.base.x, this.base.y - w * 0.2, 8);
      fx.shards(this.base.x, this.base.y - w * 0.1, 6);
      fx.mist(this.base.x, this.base.y - w * 0.15, 4);
      fx.groundRing(this.base.x, this.base.y, w * 1.15, w * 0.36, 0x8fd8ff, depth - 0.4, 420, 0.9);
      scene.tweens.add({
        targets: this.figure,
        scaleX: 1,
        scaleY: 1,
        duration: 520,
        ease: 'Back.Out',
        easeParams: [2.2],
        onComplete: () => this.breathe(),
      });
    });
  }

  foot(): ScreenPoint {
    return { ...this.base };
  }

  /** ¿Cae el punto de pantalla sobre el bloque? (para la ficha). */
  contains(x: number, y: number): boolean {
    return this.holder.active && this.body.getBounds().contains(x, y);
  }

  /** Sigue al bloque del estado: su desgaste (cambia de textura soltando esquirlas) y, al final, se derrite. */
  sync(block: IceBlock): void {
    if (!this.holder.active) return;
    const wear = iceWear(block.hp / ICE_WALL.hp);
    if (wear !== this.wear) {
      const worse = wear > this.wear;
      this.wear = wear;
      this.body.setTexture(iceBlockTexture(wear));
      if (worse) this.crack();
    }
    this.melting = Phaser.Math.Clamp(1 - block.ms / ICE_LOOK.meltWarnMs, 0, 1);
    if (this.melting > 0 && !this.drips) {
      this.drips = this.scene.time.addEvent({ delay: this.fx.ambientDelay(ICE_LOOK.dripEveryMs), loop: true, callback: () => this.drip() });
    }
    this.setTintFor(block);
    const squash = this.squash.v;
    const shrink = 1 - ICE_LOOK.meltShrink * this.melting;
    this.holder.setScale(1 + squash * 0.06 + this.melting * 0.05, (1 - squash * 0.1) * shrink);
    // Parpadea al final, cada vez mas deprisa, como la moneda que se va a perder.
    const blink = this.melting > 0.5 ? Math.sin(block.ms * 0.012 * (1 + this.melting)) > 0.3 : false;
    this.figure.setAlpha(blink ? 0.55 : 1);
  }

  /** Un mordisco, un escupitajo o un verso: destella, se aplasta un poco y suelta esquirlas. */
  bitten(): void {
    if (!this.holder.active) return;
    this.pulse(this.squash, 280);
    this.flash();
    this.fx.shards(this.base.x + this.cellWidth * 0.3, this.base.y - this.cellWidth * 0.5, 4);
  }

  /** Roto: se parte en esquirlas, copos y vaho, con un temblor corto. */
  die(): void {
    if (!this.holder.active) return;
    this.stop();
    const w = this.cellWidth;
    this.fx.shards(this.base.x, this.base.y - w * 0.45, 18);
    this.fx.frost(this.base.x, this.base.y - w * 0.5, 8);
    this.fx.mist(this.base.x, this.base.y - w * 0.3, 6);
    this.scene.cameras.main.shake(110, 0.0022);
    this.body.setTintMode(Phaser.TintModes.FILL).setTint(0xeaf8ff);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.3,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeShadow(300);
  }

  /** Se acabo su tiempo: se hunde en un charquito que se seca, con vaho y unas gotas. */
  melt(): void {
    if (!this.holder.active) return;
    this.stop();
    const w = this.cellWidth;
    const puddle = this.scene.add
      .image(this.base.x, this.base.y, TEX.glow)
      .setTint(0x8fd8ff)
      .setDisplaySize(w * 1.1, w * 0.32)
      .setAlpha(0)
      .setDepth(DEPTH.groundFx);
    this.scene.tweens.add({ targets: puddle, alpha: 0.75, duration: 300 });
    this.scene.tweens.add({ targets: puddle, alpha: 0, scaleX: puddle.scaleX * 0.6, delay: 900, duration: 1400, onComplete: () => puddle.destroy() });
    this.fx.mist(this.base.x, this.base.y - w * 0.35, 8);
    this.fx.frost(this.base.x, this.base.y - w * 0.4, 4);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.15,
      scaleY: 0,
      alpha: 0.2,
      duration: 620,
      ease: 'Quad.In',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeShadow(620);
  }

  /** Respira un pelo y cambia el brillo de arriba abajo, como el hielo al sol. */
  private breathe(): void {
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: 1.012,
      scaleY: 0.985,
      duration: Phaser.Math.Between(1500, 1900),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    if (!this.fx.quality.extras) return;
    // Un destello que recorre el bloque cada poco.
    this.glints = this.scene.time.addEvent({
      delay: Phaser.Math.Between(2200, 3400),
      loop: true,
      callback: () => {
        if (!this.holder.active) return;
        this.fx.sparkles(this.base.x + Phaser.Math.FloatBetween(-0.3, 0.3) * this.cellWidth, this.base.y - this.cellWidth * Phaser.Math.FloatBetween(0.4, 0.9), 1);
      },
    });
  }

  /** Al pasar a un desgaste peor: salta un trozo con esquirlas y se encoge un instante. */
  private crack(): void {
    const w = this.cellWidth;
    this.fx.shards(this.base.x + w * 0.25, this.base.y - w * 0.7, 10);
    this.fx.frost(this.base.x, this.base.y - w * 0.6, 3);
    this.pulse(this.squash, 380);
  }

  /** Una gota que cae del bloque que se derrite. */
  private drip(): void {
    if (!this.holder.active || this.melting <= 0) return;
    const w = this.cellWidth;
    this.fx.flake(this.base.x + Phaser.Math.FloatBetween(-0.35, 0.35) * w, this.base.y - w * Phaser.Math.FloatBetween(0.1, 0.5));
  }

  /** Tira a azul apagado con la vida (multiplicado): el dibujo se sigue leyendo. Un destello en curso manda. */
  private setTintFor(block: IceBlock): void {
    const lost = 1 - Phaser.Math.Clamp(block.hp / ICE_WALL.hp, 0, 1);
    const k = lost * ICE_LOOK.wearMax;
    const mix = (shift: number) => {
      const from = (0xffffff >> shift) & 0xff;
      const to = (ICE_LOOK.wearTint >> shift) & 0xff;
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
    this.drips?.remove();
    this.glints?.remove();
    this.scene.tweens.killTweensOf([this.holder, this.figure, this.body, this.squash]);
  }

  private fadeShadow(durationMs: number): void {
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: durationMs, onComplete: () => this.shadow.destroy() });
  }
}
