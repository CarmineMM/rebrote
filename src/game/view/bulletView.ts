import * as Phaser from 'phaser';
import type { Bullet } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { PLANT_LOOK } from './plantView';
import { SEED_SIZE, TEX, artInv } from './textures';

const BULLET_LOOK = {
  /** Pixeles de diseno por casilla de la textura de la semilla (como la disparadora). */
  unitsPerCell: 160,
  /** Tamano respecto al diseno: un poco mas grande para que se lea bien a distancia. */
  size: 1.2,
} as const;

/**
 * Semilla en vuelo. Vuela a la altura del canon por su carril y lleva una sombrita en el suelo.
 * La logica la saca del centro de la planta; en pantalla nace en la boca del canon.
 */
export class BulletView {
  private readonly seed: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly footY: number;
  private readonly cellWidth: number;
  /** Hasta que la bala no pasa la boca del canon, se pinta en la boca. */
  private readonly minX: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    bullet: Bullet,
    fresh: boolean,
  ) {
    this.footY = bullet.lane + PLANT_LOOK.footY;
    this.cellWidth = perspective.cellWidthAt({ x: bullet.x, y: this.footY });
    this.minX = fresh ? bullet.x + PLANT_LOOK.muzzle.x : -Infinity;
    const depth = entityDepth(perspective.toScreen({ x: bullet.x, y: this.footY }).y) + 0.5;
    const scale = (this.cellWidth / BULLET_LOOK.unitsPerCell) * BULLET_LOOK.size * artInv();

    this.shadow = scene.add
      .image(0, 0, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.16, this.cellWidth * 0.06)
      .setAlpha(0.7)
      .setDepth(depth - 0.1);
    this.seed = scene.add
      .image(0, 0, TEX.seed)
      .setOrigin(SEED_SIZE.cx / SEED_SIZE.width, 0.5)
      .setScale(fresh ? scale * 0.3 : scale)
      .setDepth(depth);
    if (fresh) scene.tweens.add({ targets: this.seed, scale, duration: 120, ease: 'Back.Out' });
    this.sync(bullet);
  }

  sync(bullet: Bullet): void {
    const ground = perspective.toScreen({ x: Math.max(bullet.x, this.minX), y: this.footY });
    this.seed.setPosition(ground.x, ground.y - PLANT_LOOK.muzzle.up * this.cellWidth);
    this.shadow.setPosition(ground.x, ground.y);
  }

  /** Impacto: la semilla revienta en jugo verde con un anillo. */
  impact(): void {
    const { x, y } = this.seed;
    this.fx.juice(x, y, 6);
    // Por encima del gusano al que le da, pero por debajo de lo que esta en el carril de delante.
    // Pequeno, lima y translucido: con varias plantas dando al mismo gusano no debe taparle la cara.
    this.fx.ring(x, y, this.cellWidth * 0.26, 0xb9ec5c, this.seed.depth + 5, 170, 0.5);
    this.scene.tweens.killTweensOf(this.seed);
    this.shadow.destroy();
    this.scene.tweens.add({
      targets: this.seed,
      scaleX: this.seed.scaleX * 0.5,
      scaleY: this.seed.scaleY * 1.7,
      alpha: 0,
      duration: 110,
      onComplete: () => this.seed.destroy(),
    });
  }

  /** Sale del tablero sin dar a nadie: se apaga mientras sigue un poco. */
  vanish(): void {
    this.scene.tweens.killTweensOf(this.seed);
    const parts = [this.seed, this.shadow];
    this.scene.tweens.add({
      targets: parts,
      x: `+=${this.cellWidth * 0.2}`,
      alpha: 0,
      duration: 180,
      onComplete: () => parts.forEach((part) => part.destroy()),
    });
  }
}
