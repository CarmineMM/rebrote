import * as Phaser from 'phaser';
import { ENEMIES } from '../config/balance';
import type { Spit } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { SPIT_SIZE, TEX, artInv } from './textures';

const SPIT_LOOK = {
  /** Pixeles de diseno por casilla de la textura (como la disparadora y el gusano). */
  unitsPerCell: 160,
  size: 1.15,
  /** Donde apoya en su carril, como el gusano que lo escupe. */
  footY: 0.64,
  /**
   * Boca del escupidor respecto a su centro, en casillas: el escupitajo sale de ahi en pantalla aunque la logica lo
   * saque del centro. `up` es la altura de vuelo sobre el suelo.
   */
  mouth: { x: -0.42, up: 0.31 },
  /** Cuanto sube en su vuelo bombeado, en anchos de casilla, a lo largo del alcance del escupidor. */
  arc: 0.14,
  /** Anillo del impacto: verde moco. */
  ring: 0x39ff88,
} as const;

/**
 * Escupitajo del escupidor en vuelo (T-007): una gota de moco que sale bombeada de su boca y vuela a la izquierda
 * por su carril, girando un poco, con una sombrita en el suelo. Sigue al estado en `sync`; no decide nada.
 * Uno que se vuelve a pintar al continuar la partida (cambio de calidad) no sabe de donde salio y vuela recto.
 */
export class SpitView {
  private readonly blob: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly footY: number;
  private readonly cellWidth: number;
  /** Hasta que el escupitajo no pasa la boca, se pinta en la boca. */
  private readonly maxX: number;
  /** Donde nacio (en la boca), para bombear el vuelo; null si se repinta sin saberlo. */
  private readonly fromX: number | null;
  private readonly wobble = Math.random() * Math.PI * 2;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    spit: Spit,
    fresh: boolean,
  ) {
    this.footY = spit.lane + SPIT_LOOK.footY;
    this.cellWidth = perspective.cellWidthAt({ x: spit.x, y: this.footY });
    this.maxX = fresh ? spit.x + SPIT_LOOK.mouth.x : Infinity;
    this.fromX = fresh ? this.maxX : null;
    const depth = entityDepth(perspective.toScreen({ x: spit.x, y: this.footY }).y) + 0.5;
    const scale = (this.cellWidth / SPIT_LOOK.unitsPerCell) * SPIT_LOOK.size * artInv();

    this.shadow = scene.add
      .image(0, 0, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.2, this.cellWidth * 0.07)
      .setAlpha(0.7)
      .setDepth(depth - 0.1);
    this.blob = scene.add
      .image(0, 0, TEX.spit)
      .setOrigin(SPIT_SIZE.cx / SPIT_SIZE.width, 0.5)
      .setScale(fresh ? scale * 0.3 : scale)
      .setDepth(depth);
    if (fresh) scene.tweens.add({ targets: this.blob, scale, duration: 140, ease: 'Back.Out' });
    this.sync(spit);
  }

  sync(spit: Spit): void {
    const x = Math.min(spit.x, this.maxX);
    const ground = perspective.toScreen({ x, y: this.footY });
    const travel = this.fromX === null ? 1 : Phaser.Math.Clamp((this.fromX - x) / ENEMIES.spitter.range, 0, 1);
    const up = SPIT_LOOK.mouth.up + Math.sin(travel * Math.PI) * SPIT_LOOK.arc;
    this.blob
      .setPosition(ground.x, ground.y - up * this.cellWidth)
      .setAngle(Math.sin(this.wobble + x * 9) * 12);
    this.shadow.setPosition(ground.x, ground.y);
  }

  /** Da a una planta o una mina: revienta en moco verde con un anillo. */
  impact(): void {
    const { x, y } = this.blob;
    this.fx.goo(x, y, 8);
    this.fx.ring(x, y, this.cellWidth * 0.34, SPIT_LOOK.ring, this.blob.depth + 5, 200, 0.6);
    this.scene.tweens.killTweensOf(this.blob);
    this.shadow.destroy();
    this.scene.tweens.add({
      targets: this.blob,
      scaleX: this.blob.scaleX * 1.6,
      scaleY: this.blob.scaleY * 0.4,
      alpha: 0,
      duration: 140,
      onComplete: () => this.blob.destroy(),
    });
  }

  /** Sale del tablero sin dar a nada: cae al camino y se desvanece. */
  vanish(): void {
    this.scene.tweens.killTweensOf(this.blob);
    const parts = [this.blob, this.shadow];
    this.scene.tweens.add({
      targets: parts,
      x: `-=${this.cellWidth * 0.2}`,
      alpha: 0,
      duration: 200,
      onComplete: () => parts.forEach((part) => part.destroy()),
    });
  }
}
