import * as Phaser from 'phaser';
import type { Verse } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { TEX, VERSE_SIZE } from './textures';

const VERSE_LOOK = {
  /** Donde apoya en su carril, como el juglar que lo recita. */
  footY: 0.64,
  /** Alto de la onda en anchos de casilla: pasa por encima de las plantas de su carril. */
  height: 0.95,
  /** Su centro, sobre el suelo, en anchos de casilla. */
  up: 0.42,
  /** Boca del juglar respecto a su centro, en casillas: la onda sale de ahi en pantalla aunque la logica la saque del centro. */
  mouth: -0.42,
  /** Lo que respira la onda en vuelo (de alto), y lo rapido. */
  breath: 0.07,
  breathMs: 260,
  /** Cada cuanto suelta una nota detras, en Alto (`ambientDelay`). */
  trailMs: 240,
  /** Magenta del verso: anillos y destellos. */
  tint: 0xff5fd2,
} as const;

/**
 * Verso del juglar en vuelo (T-025): una onda de sonido magenta que sale de su boca, crece con un rebote y recorre el carril
 * hacia la izquierda por encima de las plantas, respirando y dejando notas detras. Al pasar por una planta o una mina
 * destella; contra un escudo se aplasta y se deshace en notas; al salir del tablero se apaga. Sigue al estado en `sync`; no
 * decide nada. Uno que se vuelve a pintar al continuar la partida no sabe de donde salio y aparece ya entero.
 */
export class VerseView {
  private readonly wave: Phaser.GameObjects.Image;
  private readonly footY: number;
  private readonly cellWidth: number;
  /** Alto de la onda en pantalla. */
  private readonly size: number;
  /** Hasta que la onda no pasa la boca, se pinta en la boca. */
  private readonly maxX: number;
  private readonly trail: Phaser.Time.TimerEvent;
  private readonly pulse = { v: 0 };
  /** Al nacer en la boca del juglar crece hasta su tamano (de 0 a 1). */
  private readonly grow = { v: 1 };
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    verse: Verse,
    fresh: boolean,
  ) {
    this.footY = verse.lane + VERSE_LOOK.footY;
    this.cellWidth = perspective.cellWidthAt({ x: verse.x, y: this.footY });
    this.size = this.cellWidth * VERSE_LOOK.height;
    this.maxX = fresh ? verse.x + VERSE_LOOK.mouth : Infinity;
    const depth = entityDepth(perspective.toScreen({ x: verse.x, y: this.footY }).y) + 0.6;
    this.wave = scene.add
      .image(0, 0, TEX.verse)
      .setOrigin(VERSE_SIZE.frontX / VERSE_SIZE.width, 0.5)
      .setDepth(depth)
      .setDisplaySize((this.size * VERSE_SIZE.width) / VERSE_SIZE.height, this.size);
    if (fresh) {
      this.grow.v = 0;
      this.wave.setAlpha(0.6);
      scene.tweens.add({ targets: this.grow, v: 1, duration: 240, ease: 'Back.Out' });
      scene.tweens.add({ targets: this.wave, alpha: 1, duration: 200 });
    }
    this.trail = scene.time.addEvent({
      delay: fx.ambientDelay(VERSE_LOOK.trailMs),
      loop: true,
      callback: () => this.fx.note(this.wave.x + this.size * 0.3, this.wave.y + (Math.random() - 0.5) * this.size * 0.5),
    });
    this.sync(verse);
  }

  sync(verse: Verse): void {
    const x = Math.min(verse.x, this.maxX);
    const ground = perspective.toScreen({ x, y: this.footY });
    const breath = 1 + Math.sin(this.phase + this.scene.time.now / VERSE_LOOK.breathMs) * VERSE_LOOK.breath;
    const grow = 0.25 + 0.75 * this.grow.v;
    this.wave
      .setPosition(ground.x, ground.y - this.cellWidth * VERSE_LOOK.up)
      .setDisplaySize(((this.size * VERSE_SIZE.width) / VERSE_SIZE.height) * grow * (1 + this.pulse.v * 0.25), this.size * grow * breath * (1 + this.pulse.v * 0.12));
  }

  /** Pasa por una planta o una mina y le quita vida: destella un instante y suelta un par de notas. */
  crossed(): void {
    this.scene.tweens.killTweensOf(this.pulse);
    this.pulse.v = 1;
    this.scene.tweens.add({ targets: this.pulse, v: 0, duration: 220, ease: 'Quad.Out' });
    this.fx.notes(this.wave.x, this.wave.y, 2);
  }

  /** La para un escudo (F-05): se aplasta contra el y se deshace en notas, con un anillo magenta. */
  blocked(): void {
    this.trail.remove();
    this.scene.tweens.killTweensOf([this.pulse, this.grow]);
    const { x, y } = this.wave;
    this.fx.notes(x, y, 6);
    this.fx.ring(x, y, this.cellWidth * 0.6, VERSE_LOOK.tint, this.wave.depth + 1, 260, 0.75);
    this.scene.tweens.killTweensOf(this.wave);
    this.scene.tweens.add({
      targets: this.wave,
      scaleX: this.wave.scaleX * 0.2,
      scaleY: this.wave.scaleY * 1.15,
      alpha: 0,
      duration: 180,
      ease: 'Quad.Out',
      onComplete: () => this.wave.destroy(),
    });
  }

  /** Sale del tablero sin que la pare nada: sigue un poco por el camino y se apaga. */
  vanish(): void {
    this.trail.remove();
    this.scene.tweens.killTweensOf(this.wave);
    this.scene.tweens.add({
      targets: this.wave,
      x: this.wave.x - this.cellWidth * 0.3,
      alpha: 0,
      duration: 260,
      onComplete: () => this.wave.destroy(),
    });
  }
}
