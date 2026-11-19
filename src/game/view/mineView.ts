import * as Phaser from 'phaser';
import { MINE } from '../config/balance';
import type { Cell } from '../core/board';
import type { Mine } from '../core/match';
import { areaSize, drawArea } from './boardMarks';
import { mixColor, type Effects } from './effects';
import { DEPTH, entityDepth, perspective } from './layout';
import type { ScreenPoint } from './perspective';
import { PLANT_LOOK } from './plantView';
import { MINE_SIZE, TEX, artInv, mineTexture } from './textures';

/** Aspecto de la mina (T-004). Medidas en anchos de casilla salvo que se diga otra cosa. */
const MINE_LOOK = {
  /** Ancho de la textura en pantalla. */
  width: 0.7,
  /** Alcance de la explosion pintado en el suelo durante la cuenta atras. */
  areaColor: 0xff7a3d,
  /**
   * Se pone al rojo a golpes cada vez mas rapidos al acercarse el final (periodo en ms, al empezar y al final).
   * El color se suma al de la textura (tinte aditivo), asi conserva la cara; crece hasta `blinkHot`.
   */
  blinkFromMs: 460,
  blinkToMs: 90,
  blinkWarm: 0x5a2a08,
  blinkHot: 0xa8641c,
  /** Chispas de la mecha en cuenta atras (ms entre una y otra en Alto). */
  sparkEveryMs: 110,
  countdownText: { color: '#ffe066', stroke: '#8a2410' },
} as const;

/** Escala de la textura de la mina en una casilla de ancho `cellWidth` (tambien para la mina fantasma). */
export function mineScale(cellWidth: number): number {
  return ((cellWidth * MINE_LOOK.width) / MINE_SIZE.width) * artInv();
}

/** Valor animable suelto, como en el gusano: cada reaccion tiene el suyo. */
interface Pulse {
  v: number;
}

/**
 * Mina en pantalla (elemento sembrado solo). Sigue a la mina del estado en `sync` (cuenta atras, parpadeo,
 * hinchazon) y anima lo que la escena le cuenta: se arma, la muerden, explota o la destruyen. No decide nada.
 */
export class MineView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly area: Phaser.GameObjects.Graphics;
  private readonly count: Phaser.GameObjects.Text;
  private readonly base: ScreenPoint;
  /** Centro de la casilla en el tablero: desde ahi se miden los radios. */
  private readonly center: { x: number; y: number };
  private readonly cellWidth: number;
  private readonly scale: number;
  private readonly jump: Pulse = { v: 0 };
  private readonly squash: Pulse = { v: 0 };
  private armed = false;
  private shown = 0;
  private flashTimer?: Phaser.Time.TimerEvent;
  private sparks?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    private readonly element: Mine['element'],
    cell: Cell,
    mine: Mine,
    sprout: boolean,
  ) {
    const foot = { x: cell.col + 0.5, y: cell.lane + PLANT_LOOK.footY };
    this.center = { x: cell.col + 0.5, y: cell.lane + 0.5 };
    this.base = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.scale = mineScale(this.cellWidth);
    const depth = entityDepth(this.base.y);

    this.area = scene.add.graphics().setDepth(DEPTH.highlight - 1).setVisible(false);
    this.shadow = scene.add
      .image(this.base.x, this.base.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.62, this.cellWidth * 0.2)
      .setDepth(depth - 0.5);
    this.body = scene.add.image(0, 0, mineTexture(element, false)).setOrigin(0.5, MINE_SIZE.footY / MINE_SIZE.height).setScale(this.scale);
    this.holder = scene.add.container(this.base.x, this.base.y, [this.body]).setDepth(depth);
    this.count = scene.add
      .text(this.base.x, this.base.y - this.cellWidth * 0.95, '', fx.textStyle({ fontSize: Math.round(this.cellWidth * 0.3), ...MINE_LOOK.countdownText }))
      .setOrigin(0.5)
      .setDepth(DEPTH.floatText - 5)
      .setVisible(false);

    // Reposo: respira despacio, dormida.
    scene.tweens.add({
      targets: this.body,
      scaleX: this.scale * 1.04,
      scaleY: this.scale * 0.95,
      duration: Phaser.Math.Between(1100, 1400),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    if (sprout) {
      // Se entierra con un saltito y un punado de tierra.
      this.holder.setScale(1.3, 0.2);
      scene.tweens.add({ targets: this.holder, scaleX: 1, scaleY: 1, duration: 460, ease: 'Elastic.Out', easeParams: [1.1, 0.5] });
      fx.dirt(this.base.x, this.base.y, 12);
      fx.embers(this.base.x, this.base.y - this.cellWidth * 0.3, 4);
    }
    if (mine.fuseMs !== null) this.arm(false);
    this.sync(mine);
  }

  /** Sigue a la mina del estado: cuenta atras visible, parpadeo cada vez mas rapido y algo de hinchazon. */
  sync(mine: Mine): void {
    if (mine.fuseMs !== null && !this.armed) this.arm(false);
    const left = mine.fuseMs ?? MINE.countdownMs;
    // 0 al empezar el conteo, 1 al explotar.
    const t = this.armed ? Phaser.Math.Clamp(1 - left / MINE.countdownMs, 0, 1) : 0;
    const shake = this.armed ? Math.sin(left * 0.09) * this.cellWidth * 0.012 * (0.4 + t) : 0;
    const jump = Math.sin(this.jump.v * Math.PI) * this.cellWidth * 0.18;
    const squash = this.squash.v;
    const swell = 1 + 0.14 * t;
    this.holder
      .setPosition(this.base.x + shake, this.base.y - jump)
      .setScale(swell * (1 + squash * 0.12), swell * (1 - squash * 0.18));

    if (!this.armed) return;
    const seconds = Math.max(1, Math.ceil(left / 1000));
    if (seconds !== this.shown) {
      this.shown = seconds;
      this.count.setText(String(seconds)).setScale(1.6);
      this.scene.tweens.add({ targets: this.count, scale: 1, duration: 260, ease: 'Back.Out' });
    }
    if (!this.flashTimer) {
      const period = Phaser.Math.Linear(MINE_LOOK.blinkFromMs, MINE_LOOK.blinkToMs, t);
      const on = left % period < period * 0.4;
      if (on) this.body.setTintMode(Phaser.TintModes.ADD).setTint(mixColor(MINE_LOOK.blinkWarm, MINE_LOOK.blinkHot, t));
      else this.body.clearTint();
    }
  }

  /**
   * Un enemigo entro en su radio: abre los ojos de susto, da un salto, aparece la cuenta atras y el alcance
   * de la explosion en el suelo, y la mecha empieza a chisporrotear. `fanfare` a false al continuar la partida.
   */
  arm(fanfare = true): void {
    if (this.armed) return;
    this.armed = true;
    this.body.setTexture(mineTexture(this.element, true));
    drawArea(this.area, this.center, MINE.blastRadius, MINE_LOOK.areaColor, 0.12, 3);
    this.area.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.area, alpha: { from: 0.55, to: 1 }, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.count.setVisible(true);
    const delay = this.fx.ambientDelay(MINE_LOOK.sparkEveryMs);
    this.sparks = this.scene.time.addEvent({ delay, loop: true, callback: () => this.fx.ember(...this.tip()) });
    if (!fanfare) return;
    this.pulse(this.jump, 300);
    this.fx.sparkles(...this.tip(), 8);
    this.fx.floatText('!', this.base.x + this.cellWidth * 0.3, this.base.y - this.cellWidth * 0.7, MINE_LOOK.countdownText);
  }

  /** Mordisco de un gusano: se aplasta, destella y suelta algo de tierra. */
  bitten(): void {
    this.pulse(this.squash, 320);
    this.flash();
    this.fx.dirt(this.base.x, this.base.y, 4);
  }

  /**
   * Explota: destello, llamas, brasas y humo, una onda en el suelo del tamano de su alcance y una mancha
   * de chamuscado que se apaga poco a poco. La mina desaparece.
   */
  explode(): void {
    this.stop();
    const w = this.cellWidth;
    const at = perspective.toScreen(this.center);
    const area = areaSize(this.center, MINE.blastRadius);
    const depth = this.holder.depth + 1;
    const middle = { x: this.base.x, y: this.base.y - w * 0.3 };

    const scorch = this.scene.add
      .image(at.x, at.y, TEX.shadow)
      .setTint(0x3a1608)
      .setDisplaySize(area.width * 0.55, area.height * 0.55)
      .setAlpha(0.9)
      .setDepth(DEPTH.groundFx);
    this.scene.tweens.add({ targets: scorch, alpha: 0, delay: 900, duration: 1800, onComplete: () => scorch.destroy() });
    this.fx.groundRing(at.x, at.y, area.width, area.height, 0xffa04d, DEPTH.highlight + 1, 420, 0.95);
    this.fx.ring(middle.x, middle.y, w * 1.6, 0xfff1a8, depth, 300, 0.9);
    this.fx.glow(middle.x, middle.y, w * 3, 0xff8a3d, depth, 420);
    this.fx.fire(middle.x, middle.y, 26);
    this.fx.fire(at.x, at.y, 10);
    this.fx.embers(middle.x, middle.y, 16);
    this.fx.smoke(middle.x, middle.y - w * 0.2, 10);
    this.fx.dirt(this.base.x, this.base.y, 14);

    // Revienta como una bola de fuego.
    this.body.setTintMode(Phaser.TintModes.FILL).setTint(0xffa040);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.7,
      scaleY: 1.5,
      alpha: 0,
      duration: 140,
      ease: 'Quad.Out',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeOut(160);
  }

  /** Destruida antes de terminar el conteo: la mecha se apaga con un hilo de humo y se hunde en la tierra. No explota. */
  die(): void {
    this.stop();
    this.body.clearTint().setTexture(mineTexture(this.element, false));
    this.fx.smoke(...this.tip(), 4);
    this.fx.dirt(this.base.x, this.base.y, 10);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.3,
      scaleY: 0,
      alpha: 0,
      duration: 320,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeOut(320);
  }

  /** Punta de la mecha en pantalla. */
  private tip(): [number, number] {
    const k = (this.cellWidth * MINE_LOOK.width) / MINE_SIZE.width;
    return [
      this.holder.x + (MINE_SIZE.tipX - MINE_SIZE.footX) * k * this.holder.scaleX,
      this.holder.y - (MINE_SIZE.footY - MINE_SIZE.tipY) * k * this.holder.scaleY,
    ];
  }

  private stop(): void {
    this.flashTimer?.remove();
    this.flashTimer = undefined;
    this.sparks?.remove();
    this.scene.tweens.killTweensOf([this.holder, this.body, this.area, this.count, this.jump, this.squash]);
  }

  /** Se apagan la sombra, el alcance y la cuenta atras. */
  private fadeOut(durationMs: number): void {
    const parts = [this.shadow, this.area, this.count];
    this.scene.tweens.add({ targets: parts, alpha: 0, duration: durationMs, onComplete: () => parts.forEach((part) => part.destroy()) });
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private flash(): void {
    this.flashTimer?.remove();
    this.body.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff);
    this.flashTimer = this.scene.time.delayedCall(70, () => {
      this.flashTimer = undefined;
      this.body.clearTint();
    });
  }
}
