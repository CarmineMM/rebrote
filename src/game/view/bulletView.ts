import * as Phaser from 'phaser';
import type { Bullet } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { PLANT_LOOK, barrelMuzzle, type Muzzle } from './plantView';
import { SEED_SIZE, TEX, artInv, seedTexture } from './textures';

const BULLET_LOOK = {
  /** Pixeles de diseno por casilla de la textura de la semilla (como la disparadora). */
  unitsPerCell: 160,
  /** Tamano respecto al diseno: un poco mas grande para que se lea bien a distancia. */
  size: 1.2,
} as const;

/**
 * Semilla en vuelo. Vuela a la altura del canon del que salio por su carril y lleva una sombrita en el suelo.
 * La logica la saca del centro de la planta; en pantalla nace en la boca del canon. Una semilla que se vuelve
 * a pintar al continuar la partida (cambio de calidad) no sabe de que canon salio y vuela a la altura del central.
 */
export class BulletView {
  private readonly seed: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly footY: number;
  private readonly cellWidth: number;
  /** Hasta que la bala no pasa la boca del canon, se pinta en la boca. */
  private readonly minX: number;
  /** Altura de vuelo sobre el suelo, en anchos de casilla: la de la boca del canon. */
  private readonly up: number;
  /** Semilla de fuego (T-004): otra textura y revienta en llamas. */
  private readonly fiery: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    bullet: Bullet,
    fresh: boolean,
    muzzle: Muzzle = barrelMuzzle(1),
  ) {
    this.footY = bullet.lane + PLANT_LOOK.footY;
    this.cellWidth = perspective.cellWidthAt({ x: bullet.x, y: this.footY });
    this.minX = fresh ? bullet.x + muzzle.x : -Infinity;
    this.up = muzzle.up;
    this.fiery = bullet.effect?.element === 'fire';
    const depth = entityDepth(perspective.toScreen({ x: bullet.x, y: this.footY }).y) + 0.5;
    const scale = (this.cellWidth / BULLET_LOOK.unitsPerCell) * BULLET_LOOK.size * artInv();

    this.shadow = scene.add
      .image(0, 0, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.16, this.cellWidth * 0.06)
      .setAlpha(0.7)
      .setDepth(depth - 0.1);
    this.seed = scene.add
      .image(0, 0, seedTexture(bullet.effect?.element ?? null))
      .setOrigin(SEED_SIZE.cx / SEED_SIZE.width, 0.5)
      .setScale(fresh ? scale * 0.3 : scale)
      .setDepth(depth);
    if (fresh) scene.tweens.add({ targets: this.seed, scale, duration: 120, ease: 'Back.Out' });
    this.sync(bullet);
  }

  sync(bullet: Bullet): void {
    const ground = perspective.toScreen({ x: Math.max(bullet.x, this.minX), y: this.footY });
    this.seed.setPosition(ground.x, ground.y - this.up * this.cellWidth);
    this.shadow.setPosition(ground.x, ground.y);
  }

  /** Impacto: la semilla revienta en jugo verde con un anillo; la de fuego, en brasas con un anillo naranja. */
  impact(): void {
    const { x, y } = this.seed;
    if (this.fiery) {
      // Solo brasas: una fusionada dispara tres semillas a la vez y las llamas taparian al gusano.
      this.fx.embers(x, y, 5);
    } else {
      this.fx.juice(x, y, 6);
    }
    // Por encima del gusano al que le da, pero por debajo de lo que esta en el carril de delante.
    // Pequeno y translucido: con varias plantas dando al mismo gusano no debe taparle la cara.
    this.fx.ring(x, y, this.cellWidth * 0.26, this.fiery ? 0xffa04d : 0xb9ec5c, this.seed.depth + 5, 170, 0.5);
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
