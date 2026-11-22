import * as Phaser from 'phaser';
import { DEPTH } from './layout';
import type { Effects } from './effects';

/**
 * Bocadillo de un jefe con lo que dice: sale con un salto, sigue a su cabeza y se va solo. El pico apunta a la cabeza; el
 * cuerpo va a la derecha y, si ahi no cabe en la pantalla, a la izquierda. Cada jefe tiene su estilo (`BubbleStyle`): el
 * de Creeper (T-008) es una terminal de fosforo con su cursor; el de Elk Cloner (T-026), un pergamino con letra de libro.
 */
export interface BubbleStyle {
  readonly font: string;
  readonly fontSize: number;
  readonly fontStyle: string;
  readonly bg: number;
  readonly bgAlpha: number;
  readonly edge: number;
  readonly text: string;
  /** Cursor de terminal que parpadea al final de la frase (Creeper). */
  readonly cursor: boolean;
  /** Radio de las esquinas. */
  readonly corner: number;
}

/** Medidas del bocadillo: margen del texto, sitio del cursor, cuanto se aparta el cuerpo del pico y del borde. */
const BUBBLE = { padX: 12, padY: 8, cursor: 14, tail: 18, lift: 14, margin: 12 } as const;

export class BossBubble {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly cursor: Phaser.GameObjects.Rectangle | null = null;
  private readonly width: number;
  private readonly height: number;
  private flipped: boolean | null = null;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    fx: Effects,
    text: string,
    private readonly style: BubbleStyle,
    lifeMs: number,
  ) {
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: style.font,
        fontSize: `${style.fontSize}px`,
        fontStyle: style.fontStyle,
        color: style.text,
        resolution: fx.quality.renderScale,
      })
      .setOrigin(0, 1);
    this.width = this.label.width + BUBBLE.padX * 2 + (style.cursor ? BUBBLE.cursor : 0);
    this.height = this.label.height + BUBBLE.padY * 2;
    this.bg = scene.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [this.bg, this.label];
    if (style.cursor) {
      this.cursor = scene.add.rectangle(0, 0, 9, 3, style.edge).setOrigin(0, 1);
      scene.tweens.add({ targets: this.cursor, alpha: 0, duration: 260, yoyo: true, repeat: -1, ease: 'Stepped' });
      parts.push(this.cursor);
    }
    this.holder = scene.add.container(0, 0, parts).setDepth(DEPTH.floatText - 3).setScale(0.3).setAlpha(0);
    scene.tweens.add({ targets: this.holder, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    scene.time.delayedCall(lifeMs, () => this.close());
  }

  get alive(): boolean {
    return !this.closed;
  }

  /** Pone el pico en `x, y` (sobre la cabeza). */
  follow(x: number, y: number): void {
    if (!this.holder.active) return;
    const view = this.scene.cameras.main.worldView;
    const flip = x + this.width - BUBBLE.tail > view.right - BUBBLE.margin;
    if (flip !== this.flipped) this.layout(flip);
    this.holder.setPosition(x, y);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.tweens.add({
      targets: this.holder,
      scale: 0.4,
      alpha: 0,
      duration: 200,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
  }

  /** Dibuja el bocadillo con el cuerpo a la derecha del pico, o a la izquierda si `flip`. */
  private layout(flip: boolean): void {
    this.flipped = flip;
    const { padX, padY, tail, lift } = BUBBLE;
    const w = this.width;
    const h = this.height;
    const left = flip ? tail - w : -tail;
    const bottom = -lift;
    const dir = flip ? -1 : 1;
    this.label.setPosition(left + padX, bottom - padY);
    this.cursor?.setPosition(left + padX + this.label.width + 4, bottom - padY - 3);
    this.bg.clear();
    this.bg.fillStyle(this.style.bg, this.style.bgAlpha).lineStyle(3, this.style.edge, 1);
    this.bg.fillRoundedRect(left, bottom - h, w, h, this.style.corner).strokeRoundedRect(left, bottom - h, w, h, this.style.corner);
    this.bg.fillTriangle(-2 * dir, bottom - 1, 14 * dir, bottom - 1, 0, 0);
    this.bg.lineBetween(-2 * dir, bottom, 0, 0).lineBetween(0, 0, 14 * dir, bottom);
  }
}
