import * as Phaser from 'phaser';
import { ENEMIES } from '../config/balance';
import type { Enemy } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { FLAME_SIZE, TEX, WORM_SIZE, artInv } from './textures';

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
  /** Quemado (T-004): llamas sobre la cabeza y el lomo (respecto a la cabeza y al segundo anillo), y tinte. */
  flames: [
    { x: 4, y: -30, scale: 1.45 },
    { x: 2, y: -20, scale: 1.1 },
  ],
  /** Se suma al color del cuerpo mientras arde (tinte aditivo): el morado tira a rojo encendido. */
  burnTint: 0x5a1e00,
  /** Mientras arde pone cara de "ay" y suelta brasas cada tanto: asi se ve que sigue perdiendo vida. */
  burnWinceMs: 700,
  /** Muerto quemado: queda tostado un instante antes de deshacerse. */
  charredTint: 0x8a6458,
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
  /** Salto al recibir una explosion. */
  private readonly hop: Pulse = { v: 0 };
  private flashTimer?: Phaser.Time.TimerEvent;
  private readonly flames: Phaser.GameObjects.Image[];
  private burning = false;
  private burnTimer?: Phaser.Time.TimerEvent;

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
    // Llamas del quemado: ocultas hasta que arde. Van por encima del cuerpo.
    this.flames = WORM_LOOK.flames.map(() =>
      scene.add
        .image(0, 0, TEX.flame)
        .setOrigin(0.5, FLAME_SIZE.footY / FLAME_SIZE.height)
        .setVisible(false),
    );
    // De la cola a la cabeza: cada anillo tapa al de atras y la cabeza va encima de todo.
    this.holder = scene.add.container(ground.x, ground.y, [...this.segments, this.head, ...this.flames]).setDepth(depth);

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
    const hop = Math.sin(this.hop.v * Math.PI) * 26 * this.scale;
    this.holder
      .setPosition(ground.x + this.kick.v * 10 * this.scale, ground.y + (1 - rise) * 20 * this.scale - hop)
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

    this.setBurning(enemy.burn !== null);
    if (this.burning) {
      const [onHead, onBack] = WORM_LOOK.flames;
      this.flames[0].setPosition(this.head.x + onHead.x, this.head.y + onHead.y);
      this.flames[1].setPosition(this.segments[1].x + onBack.x, this.segments[1].y + onBack.y);
    }
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

  /** Alcanzado por una explosion (mina, T-004): golpe fuerte, salto y retroceso. */
  blasted(): void {
    this.pulse(this.hurt, 420);
    this.pulse(this.kick, 320);
    this.pulse(this.hop, 380);
    this.flash();
  }

  /** Sin vida: destello, se infla un instante y se encoge soltando pixeles. Si ardia, queda tostado y humea. */
  die(): void {
    const charred = this.burning;
    this.stopReactions();
    const parts = [this.head, ...this.segments];
    parts.forEach((part) => part.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL));
    this.head.setTexture(TEX.wormHeadHurt);
    const x = this.holder.x;
    const y = this.holder.y - 45 * this.scale;
    const depth = this.holder.depth + 0.5;
    if (charred) {
      this.fx.smoke(x, y, 6);
      this.fx.embers(x, y, 8);
    }
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
        parts.forEach((part) => (charred ? part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(WORM_LOOK.charredTint) : part.clearTint()));
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

  /**
   * Empieza o deja de arder: llamas que titilan, un tinte anaranjado y, cada tanto, cara de "ay" con brasas.
   * Sigue al estado (`enemy.burn`), asi que vale tambien al continuar la partida.
   */
  private setBurning(burning: boolean): void {
    if (burning === this.burning) return;
    this.burning = burning;
    this.scene.tweens.killTweensOf(this.flames);
    if (burning) {
      this.flames.forEach((flame, i) => {
        const base = WORM_LOOK.flames[i].scale * artInv();
        flame.setVisible(true).setAlpha(0.95).setScale(base * 0.3);
        this.scene.tweens.add({ targets: flame, scaleX: base, scaleY: base, duration: 180, ease: 'Back.Out' });
        this.scene.tweens.add({
          targets: flame,
          scaleY: { from: base * 0.82, to: base * 1.18 },
          alpha: { from: 0.8, to: 1 },
          duration: Phaser.Math.Between(110, 160),
          yoyo: true,
          repeat: -1,
          delay: 180 + i * 60,
        });
      });
      this.fx.fire(this.holder.x, this.holder.y - 50 * this.scale, 5);
      this.burnTimer = this.scene.time.addEvent({
        delay: WORM_LOOK.burnWinceMs,
        loop: true,
        callback: () => {
          this.pulse(this.hurt, 200);
          this.fx.embers(this.holder.x - 20 * this.scale, this.holder.y - 70 * this.scale, 3);
        },
      });
    } else {
      this.burnTimer?.remove();
      this.burnTimer = undefined;
      this.scene.tweens.add({
        targets: this.flames,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 220,
        onComplete: () => this.flames.forEach((flame) => flame.setVisible(false)),
      });
      this.fx.smoke(this.holder.x, this.holder.y - 60 * this.scale, 3);
    }
    if (!this.flashTimer) this.applyRestingTint();
  }

  /** Tinte de reposo: anaranjado mientras arde. */
  private applyRestingTint(): void {
    for (const part of [this.head, ...this.segments]) {
      if (this.burning) part.setTintMode(Phaser.TintModes.ADD).setTint(WORM_LOOK.burnTint);
      else part.clearTint();
    }
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
      this.applyRestingTint();
    });
  }

  private stopReactions(): void {
    this.flashTimer?.remove();
    this.flashTimer = undefined;
    this.burnTimer?.remove();
    this.burnTimer = undefined;
    this.scene.tweens.killTweensOf([this.rise, this.lunge, this.hurt, this.kick, this.hop]);
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
