import * as Phaser from 'phaser';
import { GRENADE } from '../config/balance';
import type { BoardPoint } from '../core/board';
import type { Grenade } from '../core/combat';
import { areaSize, drawArea } from './boardMarks';
import { mixColor, type Effects } from './effects';
import { DEPTH, entityDepth, perspective } from './layout';
import { GRENADE_SIZE, TEX, artInv } from './textures';

/** Aspecto de la granada del poder (T-021). Medidas en anchos de casilla salvo que se diga otra cosa. */
export const GRENADE_LOOK = {
  /** Ancho de la textura en pantalla: el de la mina de fuego (O-04). */
  width: 0.7,
  /** Donde cae dentro de su casilla: un poco por delante de lo sembrado, para que se vea junto a una planta. */
  footY: 0.76,
  /** Desde donde la lanzan: el camino a la izquierda del cesped, detras de las plantas (en casillas). */
  fromX: -1.3,
  /** Altura a la que sale de la mano y altura de la curva por cada casilla de vuelo (con un minimo y un maximo). */
  releaseHeight: 0.85,
  arcPerCell: 0.24,
  arcMin: 1.3,
  arcMax: 2.7,
  /** Vueltas que da en el aire. */
  spinTurns: 2.25,
  /** Alcance pintado en el suelo: rojo granada, mas fuerte que el de la mina. */
  areaColor: 0xff4a5a,
  countdownText: { color: '#fff0c8', stroke: '#6a0b1c' },
  /** Parpadeo de la cuenta atras, cada vez mas rapido (periodo en ms, al caer y al final), y su brillo (tinte aditivo). */
  blinkFromMs: 420,
  blinkToMs: 80,
  blinkWarm: 0x4a1006,
  blinkHot: 0xb0401c,
  /** Chispas de la mecha encendida (ms entre una y otra en Alto). */
  sparkEveryMs: 90,
} as const;

/** Escala de la textura de la granada en una casilla de ancho `cellWidth` (tambien para la granada fantasma del apuntado). */
export function grenadeScale(cellWidth: number): number {
  return ((cellWidth * GRENADE_LOOK.width) / GRENADE_SIZE.width) * artInv();
}

/** Donde cae la granada de una casilla, en el tablero. */
export function grenadeFoot(cell: Grenade['cell']): BoardPoint {
  return { x: cell.col + 0.5, y: cell.lane + GRENADE_LOOK.footY };
}

interface Pulse {
  v: number;
}

/**
 * Granada del poder en pantalla (T-021). Sigue a la del estado en `sync`: en vuelo, la curva desde detras de las plantas
 * (sale del progreso del vuelo, asi la pausa la congela y una partida continuada la pinta donde iba); en el suelo, la
 * mecha encendida, la cuenta atras, el parpadeo y su alcance. Anima lo que la escena le cuenta: cae y explota.
 */
export class GrenadeView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly area: Phaser.GameObjects.Graphics;
  private readonly count: Phaser.GameObjects.Text;
  private readonly from: BoardPoint;
  private readonly to: BoardPoint;
  /** Centro de la casilla: desde ahi se mide el alcance. */
  private readonly center: BoardPoint;
  private readonly squash: Pulse = { v: 0 };
  private lit = false;
  private shown = 0;
  private sparks?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    grenade: Grenade,
    thrown: boolean,
  ) {
    this.to = grenadeFoot(grenade.cell);
    this.from = { x: GRENADE_LOOK.fromX, y: this.to.y };
    this.center = { x: grenade.cell.col + 0.5, y: grenade.cell.lane + 0.5 };
    const ground = perspective.toScreen(this.to);
    const cellWidth = perspective.cellWidthAt(this.to);

    this.area = scene.add.graphics().setDepth(DEPTH.highlight - 1).setVisible(false);
    this.shadow = scene.add.image(ground.x, ground.y, TEX.shadow).setDisplaySize(cellWidth * 0.6, cellWidth * 0.2).setAlpha(0.8);
    this.body = scene.add.image(0, 0, TEX.grenade.idle).setOrigin(0.5, GRENADE_SIZE.footY / GRENADE_SIZE.height);
    this.holder = scene.add.container(ground.x, ground.y, [this.body]);
    this.count = scene.add
      .text(ground.x, ground.y - cellWidth * 0.98, '', fx.textStyle({ fontSize: Math.round(cellWidth * 0.3), ...GRENADE_LOOK.countdownText }))
      .setOrigin(0.5)
      .setDepth(DEPTH.floatText - 5)
      .setVisible(false);

    if (thrown) {
      // Sale de la mano, detras de las plantas, con un soplo y unas hojas.
      const start = perspective.toScreen(this.from);
      const startWidth = perspective.cellWidthAt(this.from);
      fx.leaves(start.x, start.y - startWidth * GRENADE_LOOK.releaseHeight, 4);
      fx.sparkles(start.x, start.y - startWidth * GRENADE_LOOK.releaseHeight, 5);
    }
    if (grenade.flightMs <= 0) this.light(false);
    this.sync(grenade);
  }

  /** Sigue a la granada del estado: en vuelo, su curva; en el suelo, la cuenta atras. */
  sync(grenade: Grenade): void {
    if (!this.holder.active) return;
    if (grenade.flightMs > 0) {
      this.fly(1 - grenade.flightMs / GRENADE.flightMs);
      return;
    }
    if (!this.lit) this.light(false);
    this.countDown(grenade.fuseMs);
  }

  /** Cae en su casilla: bota, levanta tierra, se enciende la mecha y aparece su alcance. */
  land(): void {
    if (!this.holder.active) return;
    const ground = perspective.toScreen(this.to);
    const w = perspective.cellWidthAt(this.to);
    this.fx.dirt(ground.x, ground.y, 10);
    this.fx.groundRing(ground.x, ground.y, w * 0.9, w * 0.28, 0xffd6a0, entityDepth(ground.y) - 0.4, 320, 0.8);
    this.pulse(this.squash, 360);
    this.light(true);
  }

  /**
   * Explota: destello, bola de fuego, llamas, brasas, granos de granada que saltan en abanico, humo, una onda en el suelo
   * del tamano de su alcance (mayor que el de la mina) y un chamuscado que se apaga poco a poco. El temblor lo pone la escena.
   */
  explode(): void {
    this.stop();
    const ground = perspective.toScreen(this.to);
    const w = perspective.cellWidthAt(this.to);
    const at = perspective.toScreen(this.center);
    const area = areaSize(this.center, GRENADE.blastRadius);
    const depth = entityDepth(ground.y) + 1;
    const middle = { x: ground.x, y: ground.y - w * 0.32 };

    const scorch = this.scene.add
      .image(at.x, at.y, TEX.shadow)
      .setTint(0x3a0c10)
      .setDisplaySize(area.width * 0.5, area.height * 0.5)
      .setAlpha(0.9)
      .setDepth(DEPTH.groundFx);
    this.scene.tweens.add({ targets: scorch, alpha: 0, delay: 1000, duration: 1900, onComplete: () => scorch.destroy() });
    this.fx.groundRing(at.x, at.y, area.width, area.height, 0xff6a4a, DEPTH.highlight + 1, 460, 0.95);
    this.fx.ring(middle.x, middle.y, w * 1.9, 0xfff1a8, depth, 320, 0.95);
    this.fx.glow(middle.x, middle.y, w * 3.6, 0xff6a3d, depth, 460);
    this.fx.fire(middle.x, middle.y, 30);
    this.fx.fire(at.x, at.y, 12);
    this.fx.arils(middle.x, middle.y, 22);
    this.fx.embers(middle.x, middle.y, 18);
    this.fx.smoke(middle.x, middle.y - w * 0.2, 12);
    this.fx.dirt(ground.x, ground.y, 16);
    this.body.setTintMode(Phaser.TintModes.FILL).setTint(0xffb060);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 1.9,
      scaleY: 1.7,
      alpha: 0,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => this.holder.destroy(),
    });
    this.fadeParts(170);
  }

  /** La partida acabo con ella en vuelo o contando: se apaga la mecha con un hilo de humo y desaparece sin explotar. */
  vanish(): void {
    if (!this.holder.active) return;
    this.stop();
    this.fx.smoke(this.holder.x, this.holder.y - perspective.cellWidthAt(this.to) * 0.6, 4);
    this.scene.tweens.add({ targets: this.holder, alpha: 0, scaleY: 0.2, duration: 260, ease: 'Back.In', onComplete: () => this.holder.destroy() });
    this.fadeParts(260);
  }

  /** En vuelo, con `t` de 0 (sale de la mano) a 1 (cae): curva sobre las plantas, girando, y su sombra en el suelo. */
  private fly(t: number): void {
    const k = Phaser.Math.Clamp(t, 0, 1);
    const ground: BoardPoint = { x: Phaser.Math.Linear(this.from.x, this.to.x, k), y: this.to.y };
    const screen = perspective.toScreen(ground);
    const w = perspective.cellWidthAt(ground);
    const arc = Phaser.Math.Clamp((this.to.x - this.from.x) * GRENADE_LOOK.arcPerCell, GRENADE_LOOK.arcMin, GRENADE_LOOK.arcMax);
    const height = (GRENADE_LOOK.releaseHeight * (1 - k) + 4 * arc * k * (1 - k)) * w;
    this.holder
      .setPosition(screen.x, screen.y - height)
      .setScale(1)
      .setAngle(GRENADE_LOOK.spinTurns * 360 * k)
      .setDepth(DEPTH.pollen - 2);
    this.body.setScale(grenadeScale(w));
    // La sombra se encoge y se aclara cuanto mas alta va.
    const lift = Phaser.Math.Clamp(height / (w * GRENADE_LOOK.arcMax), 0, 1);
    this.shadow
      .setPosition(screen.x, screen.y)
      .setDisplaySize(w * 0.6 * (1 - 0.5 * lift), w * 0.2 * (1 - 0.5 * lift))
      .setAlpha(0.75 - 0.4 * lift)
      .setDepth(entityDepth(screen.y) - 0.5);
  }

  /** Ya en el suelo: mecha encendida, cara de "alla va", alcance en el suelo y chispas. `fanfare` a false al continuar. */
  private light(fanfare: boolean): void {
    if (this.lit) return;
    this.lit = true;
    const ground = perspective.toScreen(this.to);
    const w = perspective.cellWidthAt(this.to);
    this.body.setTexture(TEX.grenade.lit).setScale(grenadeScale(w));
    this.holder.setPosition(ground.x, ground.y).setAngle(0).setDepth(entityDepth(ground.y));
    this.shadow.setPosition(ground.x, ground.y).setDisplaySize(w * 0.6, w * 0.2).setAlpha(0.8).setDepth(entityDepth(ground.y) - 0.5);
    drawArea(this.area, this.center, GRENADE.blastRadius, GRENADE_LOOK.areaColor, 0.12, 3);
    this.area.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.area, alpha: { from: 0.55, to: 1 }, duration: 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.count.setVisible(true);
    this.sparks = this.scene.time.addEvent({ delay: this.fx.ambientDelay(GRENADE_LOOK.sparkEveryMs), loop: true, callback: () => this.fx.ember(...this.tip()) });
    if (!fanfare) return;
    this.fx.sparkles(...this.tip(), 8);
    this.fx.floatText('!', ground.x + w * 0.32, ground.y - w * 0.72, GRENADE_LOOK.countdownText);
  }

  /** Cuenta atras visible, parpadeo cada vez mas rapido, temblor e hinchazon hasta explotar. */
  private countDown(fuseMs: number): void {
    const ground = perspective.toScreen(this.to);
    const w = perspective.cellWidthAt(this.to);
    const t = Phaser.Math.Clamp(1 - fuseMs / GRENADE.fuseMs, 0, 1);
    const shake = Math.sin(fuseMs * 0.1) * w * 0.014 * (0.4 + t);
    const squash = this.squash.v;
    const swell = 1 + 0.16 * t;
    this.holder.setPosition(ground.x + shake, ground.y).setScale(swell * (1 + squash * 0.16), swell * (1 - squash * 0.24));
    const seconds = Math.max(1, Math.ceil(fuseMs / 1000));
    if (seconds !== this.shown) {
      this.shown = seconds;
      this.count.setText(String(seconds)).setScale(1.6);
      this.scene.tweens.add({ targets: this.count, scale: 1, duration: 260, ease: 'Back.Out' });
    }
    const period = Phaser.Math.Linear(GRENADE_LOOK.blinkFromMs, GRENADE_LOOK.blinkToMs, t);
    if (fuseMs % period < period * 0.4) this.body.setTintMode(Phaser.TintModes.ADD).setTint(mixColor(GRENADE_LOOK.blinkWarm, GRENADE_LOOK.blinkHot, t));
    else this.body.clearTint();
  }

  /** Punta de la mecha en pantalla. */
  private tip(): [number, number] {
    const k = (perspective.cellWidthAt(this.to) * GRENADE_LOOK.width) / GRENADE_SIZE.width;
    return [
      this.holder.x + (GRENADE_SIZE.tipX - GRENADE_SIZE.footX) * k * this.holder.scaleX,
      this.holder.y - (GRENADE_SIZE.footY - GRENADE_SIZE.tipY) * k * this.holder.scaleY,
    ];
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private stop(): void {
    this.sparks?.remove();
    this.scene.tweens.killTweensOf([this.holder, this.body, this.area, this.count, this.squash]);
  }

  /** Se apagan la sombra, el alcance y la cuenta atras. */
  private fadeParts(durationMs: number): void {
    const parts = [this.shadow, this.area, this.count];
    this.scene.tweens.add({ targets: parts, alpha: 0, duration: durationMs, onComplete: () => parts.forEach((part) => part.destroy()) });
  }
}
