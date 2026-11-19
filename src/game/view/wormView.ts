import * as Phaser from 'phaser';
import { ENEMIES } from '../config/balance';
import type { Enemy } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { TEX, WORM_SIZE, artInv } from './textures';

/**
 * Aspecto del gusano. Las medidas locales son pixeles de diseno con 160 por casilla, como la disparadora.
 * La cabeza va levantada a la altura del canon, para que las semillas le den en la cara.
 */
const WORM_LOOK = {
  unitsPerCell: 160,
  /** Donde apoya dentro de su carril: un pelo por delante de las plantas, para tapar a la que muerde. */
  footY: 0.64,
  /** Anillos de la cola a la cabeza. */
  segments: [
    { x: 62, y: -15, scale: 0.6 },
    { x: 41, y: -20, scale: 0.75 },
    { x: 16, y: -25, scale: 0.88 },
    { x: -12, y: -34, scale: 1 },
  ],
  head: { x: -38, y: -72 },
  /** Ondas del cuerpo por casilla recorrida: el gusano "pisa" al avanzar y se queda quieto al morder. */
  wavesPerCell: 3.4,
  humpHeight: 7,
} as const;

/** Valor animable suelto: cada reaccion tiene el suyo y se puede cortar sin tocar las demas. */
interface Pulse {
  v: number;
}

/**
 * Gusano en pantalla. Sigue al enemigo del estado (posicion y si muerde) en `sync`, y anima lo que
 * la escena le cuenta: mordisco, golpe, muerte o huida. No decide nada (ADR-0008).
 */
export class WormView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly segments: Phaser.GameObjects.Image[];
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly footY: number;
  private readonly cellWidth: number;
  private readonly scale: number;
  /** Cada gusano ondula con su propio desfase para que no vayan al unisono. */
  private readonly phaseOffset = Math.random() * Math.PI * 2;
  private phase = 0;
  /** 1 mientras avanza, 0 mientras muerde; se suaviza para que el cuerpo no salte al pararse. */
  private walk = 1;
  private headKey: string = TEX.wormHead;
  private readonly rise: Pulse = { v: 1 };
  private readonly lunge: Pulse = { v: 0 };
  private readonly hurt: Pulse = { v: 0 };
  private readonly kick: Pulse = { v: 0 };
  private flashTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
  ) {
    this.footY = enemy.lane + WORM_LOOK.footY;
    const ground = perspective.toScreen({ x: enemy.x, y: this.footY });
    this.cellWidth = perspective.cellWidthAt({ x: enemy.x, y: this.footY });
    this.scale = this.cellWidth / WORM_LOOK.unitsPerCell;
    const depth = entityDepth(ground.y);

    this.shadow = scene.add
      .image(ground.x, ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.95, this.cellWidth * 0.24)
      .setDepth(depth - 0.5);
    this.segments = WORM_LOOK.segments.map((s) => scene.add.image(s.x, s.y, TEX.wormSegment).setScale(s.scale * artInv()));
    const { head } = WORM_SIZE;
    this.head = scene.add
      .image(WORM_LOOK.head.x, WORM_LOOK.head.y, TEX.wormHead)
      .setOrigin(head.cx / head.width, head.cy / head.height)
      .setScale(artInv());
    // De la cola a la cabeza: cada anillo tapa al de atras y la cabeza va encima de todo.
    this.holder = scene.add.container(ground.x, ground.y, [...this.segments, this.head]).setDepth(depth);

    if (emerge) this.emerge(ground);
    this.sync(enemy);
  }

  /** Coloca y pone en postura al gusano segun el estado. Se llama en cada fotograma mientras vive. */
  sync(enemy: Enemy): void {
    const stats = ENEMIES[enemy.kind];
    const ground = perspective.toScreen({ x: enemy.x, y: this.footY });
    const walking = enemy.biteMs === null;
    this.walk += ((walking ? 1 : 0) - this.walk) * 0.25;
    if (walking) this.phase = this.phaseOffset - enemy.x * WORM_LOOK.wavesPerCell * Math.PI * 2;
    // Se echa atras mientras espera el mordisco y se lanza al morder (ver chomp).
    const windup = walking ? 0 : Phaser.Math.Clamp(1 - (enemy.biteMs ?? 0) / stats.firstBiteMs, 0, 1);
    const lean = windup * windup;
    const rise = this.rise.v;
    const hurt = this.hurt.v;
    const lunge = this.lunge.v;

    const grow = this.scale * (0.3 + 0.7 * rise);
    this.holder
      .setPosition(ground.x + this.kick.v * 10 * this.scale, ground.y + (1 - rise) * 20 * this.scale)
      .setScale(grow * (1 + hurt * 0.1), grow * (1 - hurt * 0.1));
    this.shadow.setPosition(ground.x, ground.y).setAlpha(Math.min(1, rise));

    const last = this.segments.length - 1;
    this.segments.forEach((image, i) => {
      const seg = WORM_LOOK.segments[i];
      // La joroba va de la cola hacia la cabeza, como una oruga de verdad.
      const hump = Math.max(0, Math.sin(this.phase + (last - i) * 0.9)) * this.walk;
      const neck = i === last ? lean * 4 - lunge * 6 : 0;
      image.setPosition(seg.x - hump * 2.5 + neck, seg.y - hump * WORM_LOOK.humpHeight);
    });
    const bob = Math.sin(this.phase * 2) * 2.5 * this.walk;
    this.head
      .setPosition(WORM_LOOK.head.x + lean * 10 - lunge * 16, WORM_LOOK.head.y - lean * 7 + lunge * 9 + bob)
      .setAngle(lean * 10 - lunge * 12 + Math.sin(this.phase) * 4 * this.walk);
    this.setHead(hurt > 0.25 ? TEX.wormHeadHurt : lunge > 0.45 ? TEX.wormHead : windup > 0.35 ? TEX.wormHeadBite : TEX.wormHead);
  }

  /** Mordisco: la cabeza se lanza hacia delante y cierra la boca. */
  chomp(): void {
    this.pulse(this.lunge, 300);
  }

  /** Golpe recibido: destello blanco, retroceso y cara de "ay". */
  hit(): void {
    this.pulse(this.hurt, 260);
    this.pulse(this.kick, 200);
    this.flash();
  }

  /** Sin vida: destello, se infla un instante y se encoge soltando pixeles. */
  die(): void {
    this.stopReactions();
    const parts = [this.head, ...this.segments];
    parts.forEach((part) => part.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL));
    this.head.setTexture(TEX.wormHeadHurt);
    const x = this.holder.x;
    const y = this.holder.y - 45 * this.scale;
    const depth = this.holder.depth + 0.5;
    this.fx.bits(x, y, 16);
    this.fx.ring(x, y, this.cellWidth * 0.9, 0xd6b8ff, depth, 300);
    this.fx.glow(x, y, this.cellWidth, 0x39ff88, depth, 320);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: this.holder.scaleX * 1.2,
      scaleY: this.holder.scaleY * 1.2,
      duration: 90,
      ease: 'Quad.Out',
      onComplete: () => {
        parts.forEach((part) => part.clearTint());
        this.scene.tweens.add({
          targets: this.holder,
          scaleX: 0,
          scaleY: 0,
          angle: -25,
          alpha: 0,
          duration: 260,
          ease: 'Back.In',
          onComplete: () => this.holder.destroy(),
        });
      },
    });
    this.fadeShadow(350);
  }

  /** Cruzo el borde izquierdo: sigue un poco por el camino y se mete bajo tierra. */
  escape(): void {
    this.stopReactions();
    const dx = -this.cellWidth * 0.7;
    this.fx.dirt(this.holder.x, this.holder.y, 8);
    this.scene.tweens.add({
      targets: this.holder,
      x: this.holder.x + dx,
      y: this.holder.y + this.cellWidth * 0.08,
      scaleY: this.holder.scaleY * 0.15,
      alpha: 0,
      duration: 650,
      ease: 'Quad.In',
      onComplete: () => {
        this.fx.dirt(this.holder.x, this.holder.y, 10);
        this.holder.destroy();
      },
    });
    this.scene.tweens.add({ targets: this.shadow, x: this.shadow.x + dx, duration: 650 });
    this.fadeShadow(650);
  }

  /** Derrota: los gusanos que quedan saltan de contentos. */
  cheer(): void {
    this.stopReactions();
    this.setHead(TEX.wormHead);
    this.scene.tweens.add({
      targets: this.holder,
      y: this.holder.y - this.cellWidth * 0.12,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.Out',
      delay: Math.random() * 300,
    });
  }

  /** Sale del agujero de su carril: brota de golpe con tierra y bits de la corrupcion. */
  private emerge(ground: { x: number; y: number }): void {
    this.rise.v = 0;
    this.scene.tweens.add({ targets: this.rise, v: 1, duration: 560, ease: 'Back.Out' });
    this.fx.dirt(ground.x, ground.y, 10);
    this.fx.bits(ground.x, ground.y - this.cellWidth * 0.1, 8);
    this.fx.glow(ground.x, ground.y, this.cellWidth * 1.1, 0x39ff88, this.holder.depth - 0.4, 420);
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private flash(): void {
    const parts = [this.head, ...this.segments];
    this.flashTimer?.remove();
    parts.forEach((part) => part.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL));
    this.flashTimer = this.scene.time.delayedCall(70, () => {
      this.flashTimer = undefined;
      parts.forEach((part) => part.clearTint());
    });
  }

  private stopReactions(): void {
    this.flashTimer?.remove();
    this.flashTimer = undefined;
    this.scene.tweens.killTweensOf([this.rise, this.lunge, this.hurt, this.kick]);
  }

  private fadeShadow(durationMs: number): void {
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: durationMs, onComplete: () => this.shadow.destroy() });
  }

  private setHead(key: string): void {
    if (key === this.headKey) return;
    this.headKey = key;
    this.head.setTexture(key);
  }
}
