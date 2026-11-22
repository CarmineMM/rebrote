import * as Phaser from 'phaser';
import { BOARD, MINE } from '../config/balance';
import type { Cell } from '../core/board';
import type { Mine } from '../core/match';
import type { MineElement } from '../core/plants';
import { areaSize, drawArea } from './boardMarks';
import { mixColor, type Effects } from './effects';
import { DEPTH, entityDepth, perspective } from './layout';
import type { ScreenPoint } from './perspective';
import { PLANT_LOOK } from './plantView';
import { FROST_SIZE, MINE_SIZE, TEX, artInv, mineTexture } from './textures';

/** Aspecto de la mina (T-004). Medidas en anchos de casilla salvo que se diga otra cosa. */
const MINE_LOOK = {
  /** Ancho de la textura en pantalla. */
  width: 0.7,
  /** Parpadeo cada vez mas rapido al acercarse el final (periodo en ms, al empezar y al final). */
  blinkFromMs: 460,
  blinkToMs: 90,
  /** Cristales que brotan del suelo al estallar la mina de hielo: tamano en anchos de casilla y cuanto duran. */
  iceCrystalSize: 0.42,
  iceCrystalHoldMs: 650,
} as const;

/**
 * Lo que cambia con el elemento: color del alcance pintado en el suelo, parpadeo de la cuenta atras (el color se suma
 * al de la textura, tinte aditivo, asi conserva la cara; crece de `blinkWarm` a `blinkHot`), ms entre particulas de la
 * punta de la mecha en Alto y colores de la cuenta atras.
 */
const ELEMENT_LOOK: Record<
  MineElement,
  { areaColor: number; blinkWarm: number; blinkHot: number; tipEveryMs: number; countdownText: { color: string; stroke: string } }
> = {
  // Fuego (T-004): se pone al rojo y la mecha echa chispas.
  fire: { areaColor: 0xff7a3d, blinkWarm: 0x5a2a08, blinkHot: 0xa8641c, tipEveryMs: 110, countdownText: { color: '#ffe066', stroke: '#8a2410' } },
  // Hielo (T-005): brilla en azul helado y el copo de la punta suelta copitos.
  ice: { areaColor: 0x5cb8f0, blinkWarm: 0x0a2a48, blinkHot: 0x3a78b0, tipEveryMs: 200, countdownText: { color: '#e6f7ff', stroke: '#1f5a8a' } },
};

/** Color del alcance de la mina de `element` pintado en el suelo (tambien al ir a sembrarla). */
export function mineAreaColor(element: MineElement): number {
  return ELEMENT_LOOK[element].areaColor;
}

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
  /** Se lleva en la mano para infundir una disparadora (T-009): se ve medio transparente en su casilla. */
  private lifted = false;
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
      .text(
        this.base.x,
        this.base.y - this.cellWidth * 0.95,
        '',
        fx.textStyle({ fontSize: Math.round(this.cellWidth * 0.3), ...ELEMENT_LOOK[element].countdownText }),
      )
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
      if (element === 'fire') fx.embers(this.base.x, this.base.y - this.cellWidth * 0.3, 4);
      else fx.frost(this.base.x, this.base.y - this.cellWidth * 0.3, 4);
    }
    if (mine.fuseMs !== null) this.arm(false);
    this.sync(mine);
  }

  /** Pies de la mina en pantalla. */
  foot(): ScreenPoint {
    return { ...this.base };
  }

  /** ¿Cae el punto de pantalla sobre la mina? (para agarrarla y arrastrarla, T-009). */
  contains(x: number, y: number): boolean {
    return this.holder.active && this.body.getBounds().contains(x, y);
  }

  /** Mientras se arrastra (T-009) se queda en su casilla medio transparente, como la planta que se arrastra. */
  setLifted(lifted: boolean): void {
    if (lifted === this.lifted || !this.holder.active) return;
    this.lifted = lifted;
    this.scene.tweens.add({ targets: this.holder, alpha: lifted ? PLANT_LOOK.liftedAlpha : 1, duration: lifted ? 120 : 160 });
    if (!lifted) this.pulse(this.jump, 280);
  }

  /**
   * Se gasta al infundir una disparadora (T-009): la que se llevaba en la mano ya se metio en la planta; la de la
   * casilla se hunde en la tierra con unas chispas (o copos), sin explotar.
   */
  consume(): void {
    this.stop();
    this.fx.dirt(this.base.x, this.base.y, 8);
    if (this.element === 'fire') this.fx.embers(this.base.x, this.base.y - this.cellWidth * 0.2, 3);
    else this.fx.frost(this.base.x, this.base.y - this.cellWidth * 0.2, 3);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.2,
      scaleY: 0,
      alpha: 0,
      duration: 260,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeOut(260);
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
      const look = ELEMENT_LOOK[this.element];
      if (on) this.body.setTintMode(Phaser.TintModes.ADD).setTint(mixColor(look.blinkWarm, look.blinkHot, t));
      else this.body.clearTint();
    }
  }

  /**
   * Un enemigo entro en su radio: abre los ojos de susto, da un salto, aparece la cuenta atras y el alcance
   * de la explosion en el suelo, y la punta de la mecha empieza a soltar chispas (fuego) o copitos (hielo).
   * `fanfare` a false al continuar la partida.
   */
  arm(fanfare = true): void {
    if (this.armed) return;
    this.armed = true;
    const look = ELEMENT_LOOK[this.element];
    this.body.setTexture(mineTexture(this.element, true));
    drawArea(this.area, this.center, MINE.blastRadius, look.areaColor, 0.12, 3);
    this.area.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.area, alpha: { from: 0.55, to: 1 }, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.count.setVisible(true);
    const delay = this.fx.ambientDelay(look.tipEveryMs);
    const emit = this.element === 'fire' ? () => this.fx.ember(...this.tip()) : () => this.fx.flake(...this.tip());
    this.sparks = this.scene.time.addEvent({ delay, loop: true, callback: emit });
    if (!fanfare) return;
    this.pulse(this.jump, 300);
    this.fx.sparkles(...this.tip(), 8);
    this.fx.floatText('!', this.base.x + this.cellWidth * 0.3, this.base.y - this.cellWidth * 0.7, look.countdownText);
  }

  /** Mordisco de un gusano: se aplasta, destella y suelta algo de tierra. */
  bitten(): void {
    this.pulse(this.squash, 320);
    this.flash();
    this.fx.dirt(this.base.x, this.base.y, 4);
  }

  /**
   * Explota y desaparece. La de fuego: destello, llamas, brasas y humo, una onda en el suelo del tamano de su alcance
   * y una mancha de chamuscado que se apaga poco a poco. La de hielo, ver `burstIce`.
   */
  explode(): void {
    this.stop();
    if (this.element === 'ice') {
      this.burstIce();
      return;
    }
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

  /**
   * Estalla la de hielo: destello helado, copos, esquirlas y vaho, una onda azul en el suelo del tamano de su alcance,
   * cristales que brotan del suelo y se deshacen, y una capa de escarcha que se derrite poco a poco.
   */
  private burstIce(): void {
    const w = this.cellWidth;
    const at = perspective.toScreen(this.center);
    const area = areaSize(this.center, MINE.blastRadius);
    const depth = this.holder.depth + 1;
    const middle = { x: this.base.x, y: this.base.y - w * 0.3 };

    const rime = this.scene.add
      .image(at.x, at.y, TEX.glow)
      .setTint(0xbfe8ff)
      .setDisplaySize(area.width * 0.85, area.height * 0.85)
      .setAlpha(0)
      .setDepth(DEPTH.groundFx);
    this.scene.tweens.add({ targets: rime, alpha: 0.8, duration: 160 });
    this.scene.tweens.add({ targets: rime, alpha: 0, delay: 1300, duration: 2200, onComplete: () => rime.destroy() });
    this.iceCrystals();
    this.fx.groundRing(at.x, at.y, area.width, area.height, 0x8fd8ff, DEPTH.highlight + 1, 460, 0.95);
    this.fx.ring(middle.x, middle.y, w * 1.6, 0xffffff, depth, 320, 0.9);
    this.fx.glow(middle.x, middle.y, w * 3, 0x9fdcff, depth, 460);
    this.fx.frost(middle.x, middle.y, 22);
    this.fx.frost(at.x, at.y, 8);
    this.fx.shards(middle.x, middle.y, 14);
    this.fx.mist(middle.x, middle.y - w * 0.1, 10);
    this.fx.dirt(this.base.x, this.base.y, 8);

    // Revienta como una bola de nieve.
    this.body.setTintMode(Phaser.TintModes.FILL).setTint(0xeaf8ff);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.6,
      scaleY: 1.45,
      alpha: 0,
      duration: 160,
      ease: 'Quad.Out',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeOut(160);
  }

  /** Cristales de hielo que brotan del suelo en el alcance de la explosion, aguantan un momento y se deshacen. */
  private iceCrystals(): void {
    const n = this.fx.count(7);
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const r = MINE.blastRadius * Phaser.Math.FloatBetween(0.35, 0.8);
      const point = {
        x: Phaser.Math.Clamp(this.center.x + Math.cos(angle) * r, 0.1, BOARD.columns - 0.1),
        y: Phaser.Math.Clamp(this.center.y + Math.sin(angle) * r, 0.15, BOARD.lanes - 0.05),
      };
      const at = perspective.toScreen(point);
      const scale = ((perspective.cellWidthAt(point) * MINE_LOOK.iceCrystalSize) / FROST_SIZE.width) * artInv() * Phaser.Math.FloatBetween(0.8, 1.2);
      const crystal = this.scene.add
        .image(at.x, at.y, TEX.frost)
        .setOrigin(0.5, FROST_SIZE.footY / FROST_SIZE.height)
        .setAngle(Phaser.Math.Between(-25, 25))
        .setScale(scale * 0.1, 0)
        .setDepth(entityDepth(at.y));
      this.scene.tweens.add({ targets: crystal, scaleX: scale, scaleY: scale, delay: i * 25, duration: 240, ease: 'Back.Out' });
      this.scene.tweens.add({
        targets: crystal,
        scaleY: 0,
        alpha: 0,
        delay: MINE_LOOK.iceCrystalHoldMs + i * 25,
        duration: 320,
        ease: 'Quad.In',
        onStart: () => this.fx.shards(at.x, at.y - scale * 20, 2),
        onComplete: () => crystal.destroy(),
      });
    }
  }

  /**
   * Destruida antes de terminar el conteo: no explota. La mecha se apaga con un hilo de humo (fuego) o el copo
   * se deshace en vaho (hielo), y se hunde en la tierra.
   */
  die(): void {
    this.stop();
    this.body.clearTint().setTexture(mineTexture(this.element, false));
    if (this.element === 'fire') this.fx.smoke(...this.tip(), 4);
    else this.fx.mist(...this.tip(), 4);
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
