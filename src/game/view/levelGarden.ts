import * as Phaser from 'phaser';
import type { Effects } from './effects';
import { GARDEN, gardenSpots } from './gardenArt';
import type { ScreenPoint } from './perspective';
import { TEX, artInv, levelGardenTexture } from './textures';

/** Ritmo del jardincito. Medidas de aspecto, en milisegundos. */
const GARDEN_LOOK = {
  /** Lo que tarda en brotar cada trozo, y el desfase entre uno y otro. */
  popMs: 460,
  staggerMs: 90,
  /** Lo que tarda en irse (otro tramo, la planta muere o se va a fusionarse). */
  shrinkMs: 200,
  /** Vaiven: angulo maximo (grados) y duracion de cada ida. */
  swayAngle: 3,
  swayMs: [1600, 2300],
  /** Destellos de las flores de cristal (tramo 4), solo con `extras`. */
  twinkleMs: 700,
} as const;

/**
 * Jardincito de los niveles con premio (5, 10, 15 y 20) a los pies de una disparadora (`gardenArt.ts`). Lo lleva
 * `PlantView`: lo pone, lo cambia al subir de nivel o al fusionarse y lo quita al irse. Los trozos de detras van por
 * debajo de la planta y los de delante por encima; se mecen con fases distintas y, en el tramo 4, sueltan destellos.
 * No va en el contenedor de la planta: se queda en el suelo aunque ella retroceda, se encoja o respire.
 */
export class LevelGarden {
  private pieces: Phaser.GameObjects.Image[] = [];
  private twinkle?: Phaser.Time.TimerEvent;
  private tier = 0;
  private tint = 0xffffff;
  private alpha = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    private readonly foot: ScreenPoint,
    private readonly cellWidth: number,
    private readonly depth: number,
  ) {}

  /**
   * Pone el jardincito del tramo `tier` (0: ninguno). Si cambia, el de antes se encoge y el nuevo brota con un salto y
   * unas hojas (`animate`), tras `delayMs`; sin animar, aparece ya crecido (partida continuada, cambio de calidad).
   */
  set(tier: number, animate: boolean, delayMs = 0): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.clear(animate);
    const w = this.cellWidth;
    gardenSpots(tier).forEach((spot, i) => {
      const x = this.foot.x + spot.dx * w;
      const y = this.foot.y + spot.dy * w;
      const scale = (w / 160) * spot.scale * artInv();
      const piece = this.scene.add
        .image(x, y, levelGardenTexture(tier, spot.part))
        .setOrigin(0.5, GARDEN.footY / GARDEN.height)
        .setDepth(spot.front ? this.depth + 0.3 : this.depth - 0.6)
        .setTint(this.tint)
        .setAlpha(this.alpha)
        .setScale(spot.flip ? -scale : scale, scale);
      this.pieces.push(piece);
      if (animate) {
        const delay = delayMs + i * GARDEN_LOOK.staggerMs;
        piece.setScale(0);
        this.scene.tweens.add({ targets: piece, scaleX: spot.flip ? -scale : scale, scaleY: scale, delay, duration: GARDEN_LOOK.popMs, ease: 'Back.Out', easeParams: [2.4] });
        this.scene.time.delayedCall(delay, () => this.fx.leaves(x, y - w * 0.08, 3));
      }
      const [min, max] = GARDEN_LOOK.swayMs;
      this.scene.tweens.add({
        targets: piece,
        angle: { from: -GARDEN_LOOK.swayAngle, to: GARDEN_LOOK.swayAngle },
        duration: Phaser.Math.Between(min, max),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: Math.random() * 600,
      });
    });
    if (tier >= 4 && this.fx.quality.extras) {
      this.twinkle = this.scene.time.addEvent({
        delay: GARDEN_LOOK.twinkleMs,
        startAt: Math.random() * GARDEN_LOOK.twinkleMs,
        loop: true,
        callback: () => this.sparkle(),
      });
    }
  }

  /** Tinte de reposo: el de la planta oscurecida mientras se arrastra otra (los trozos no se marchitan). */
  setTint(tint: number): void {
    this.tint = tint;
    for (const piece of this.pieces) piece.setTint(tint);
  }

  /** Medio transparente mientras se arrastra su planta, como ella. */
  setAlpha(alpha: number, durationMs = 140): void {
    this.alpha = alpha;
    this.scene.tweens.add({ targets: this.pieces, alpha, duration: durationMs });
  }

  /** La planta se va: el jardincito se encoge y desaparece. */
  remove(): void {
    this.tier = 0;
    this.clear(true);
  }

  private clear(animate: boolean): void {
    this.twinkle?.remove();
    this.twinkle = undefined;
    const old = this.pieces;
    this.pieces = [];
    if (old.length === 0) return;
    this.scene.tweens.killTweensOf(old);
    if (!animate) {
      old.forEach((piece) => piece.destroy());
      return;
    }
    this.scene.tweens.add({ targets: old, scaleX: 0, scaleY: 0, duration: GARDEN_LOOK.shrinkMs, ease: 'Back.In', onComplete: () => old.forEach((piece) => piece.destroy()) });
  }

  /** Destello sobre las flores de cristal. */
  private sparkle(): void {
    const w = this.cellWidth;
    const x = this.foot.x + Phaser.Math.FloatBetween(-0.6, 0.6) * w;
    const y = this.foot.y - Phaser.Math.FloatBetween(0.15, 0.45) * w;
    const sparkle = this.scene.add
      .image(x, y, TEX.sparkle)
      .setDepth(this.depth + 0.5)
      .setScale(0)
      .setAlpha(this.alpha)
      .setAngle(Phaser.Math.Between(0, 45));
    this.scene.tweens.add({
      targets: sparkle,
      scale: (w / 160) * 0.7 * artInv(),
      angle: '+=60',
      duration: 220,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => sparkle.destroy(),
    });
  }
}
