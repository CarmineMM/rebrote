import * as Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { panAt } from '../audio/voices';
import { BOARD, ENEMIES } from '../config/balance';
import type { BoardPoint } from '../core/board';
import type { Enemy } from '../core/combat';
import { BossBubble, type BubbleStyle } from './bossBubble';
import { OMEN_LEAP_MS, OMEN_SPOT } from './creeperView';
import type { Effects } from './effects';
import { DEPTH, SCENERY, entityDepth, perspective } from './layout';
import { MORRIS_DESIGN, MORRIS_RIGS, MORRIS_SIZE, MORRIS_TALLY, tallyCell, tallyOrder, type MorrisDesign, type MorrisMood, type MorrisRig, type Point } from './morrisArt';
import { FLAME_SIZE, FROST_SIZE, MORRIS_TEX, TEX, artInv } from './textures';
import type { EnemyView } from './wormView';
import { text } from '../../i18n';

/**
 * Morris, el Imparable (T-042), jefe del brote 4. Un gusano enorme (en la propuesta del juego, hecho de gusanos pequenos) que
 * avanza ondulando sin parar: muerde lo que toca sin dejar de avanzar (MR-06), suelta gusanos (MR-07) y pide perdon todo el
 * rato en su bocadillo de consola ambar, la de los equipos de 1988. Aqui va lo suyo: su propuesta de aspecto
 * (`morrisArt.ts`), el mordisco al paso, el gusanito que se le desprende y se mete en la tierra al soltar uno (el de verdad
 * sale por el agujero de su carril: lo pinta la escena), el apuro de la sobrecarga, y al caer, que se deshace en gusanitos.
 * Tambien `MorrisOmen`, Morris preparandose a la derecha en las rondas 7 y 8. No decide nada (ADR-0008): todo sale del
 * estado y de los eventos que le cuenta la escena.
 */
export const MORRIS_LOOK = {
  unitsPerCell: 160,
  /** Donde apoya dentro de su carril, como los gusanos. */
  footY: 0.64,
  /**
   * Tamano respecto a sus medidas de diseno: el jefe mas grande hasta ahora (unas dos casillas y media de largo), para que se
   * lea de un vistazo frente a Creeper y a sus propios gusanos. Las balas le dan en la cabeza (`ENEMIES.morris.halfLength`).
   */
  size: 1.25,
  /** Ondas del cuerpo por casilla recorrida: va despacio, asi que menos que un gusano (3,4). */
  wavesPerCell: 1.7,
  /** Lo que se mece la cabeza al andar (grados) y lo que sube y baja. */
  headSway: 4,
  headBob: 4,
  /** Al morder sin pararse, una de cada tantas veces lo dice en su bocadillo (`morris.chew`). */
  biteLineEvery: 5,
  /** Al soltar un gusano, una de cada tantas veces lo dice (`morris.brood`). */
  broodLineEvery: 3,
  /** Sobrecarga (T-042): un halo ambar que late detras, si hay brillos, y tiembla de nervios. */
  alarm: 0xffb347,
  alarmTremble: 1.6,
  /** Bocadillo de consola de los equipos de 1988: fondo casi negro, letra ambar de terminal y cursor. */
  bubble: {
    font: '"Courier New", ui-monospace, Menlo, monospace',
    fontSize: 18,
    fontStyle: 'bold',
    bg: 0x1e1206,
    bgAlpha: 0.96,
    edge: 0xffb347,
    text: '#ffd9a0',
    cursor: true,
    corner: 10,
  } satisfies BubbleStyle,
  /** Quemado y frenado: llamas y escarcha respecto a la cabeza y al segundo anillo. */
  flames: [
    { x: 10, y: -64, scale: 1.7 },
    { x: 0, y: -40, scale: 1.3 },
  ],
  frost: [
    { x: 46, y: -40, scale: 1.3, angle: 45 },
    { x: 10, y: -30, scale: 1.1, angle: 15 },
  ],
  /** Se suma al color mientras arde (aditivo) y se multiplica mientras va lento, como los gusanos. */
  burnTint: 0x5a1e00,
  chillTint: 0x9fd0ff,
  frozenTint: 0xd8f3ff,
  /** Gusanitos que salen al deshacerse. */
  dieWorms: 12,
} as const;

interface Pulse {
  v: number;
}

/** Las piezas de Morris en un contenedor, con su montaje: lo comparten la vista del tablero y la de cuando se prepara. */
class MorrisFigure {
  readonly holder: Phaser.GameObjects.Container;
  readonly head: Phaser.GameObjects.Image;
  readonly segments: Phaser.GameObjects.Image[];
  readonly rig: MorrisRig;
  private headKey: string;

  constructor(
    scene: Phaser.Scene,
    readonly design: MorrisDesign,
    x: number,
    y: number,
    extras: (front: Phaser.GameObjects.GameObject[], back: Phaser.GameObjects.GameObject[]) => void = () => {},
  ) {
    const inv = artInv();
    this.rig = MORRIS_RIGS[design];
    const { head } = MORRIS_SIZE;
    this.segments = this.rig.segments.map((s) => scene.add.image(s.x, s.y, MORRIS_TEX.segment(design, s.variant)).setScale(s.scale * inv));
    this.headKey = MORRIS_TEX.head(design, 'idle');
    this.head = scene.add
      .image(this.rig.head.x, this.rig.head.y, this.headKey)
      .setOrigin(head.cx / head.width, head.cy / head.height)
      .setScale(inv);
    const front: Phaser.GameObjects.GameObject[] = [];
    const back: Phaser.GameObjects.GameObject[] = [];
    extras(front, back);
    // De la cola a la cabeza: cada anillo tapa al de atras y la cabeza va encima de todo.
    this.holder = scene.add.container(x, y, [...back, ...this.segments, this.head, ...front]);
  }

  /**
   * Pone la figura en postura (pixeles de diseno, pies en 0, 0): `phase` es por donde va la onda del cuerpo, `walk` cuanto
   * ondula (0 a 1), `lean` lo que se echa hacia delante a morder y `lunge` el bocado.
   */
  pose(phase: number, walk: number, lean: number, lunge: number): void {
    const rig = this.rig;
    const last = this.segments.length - 1;
    this.segments.forEach((image, i) => {
      const seg = rig.segments[i];
      // La joroba va de la cola hacia la cabeza, como un gusano de verdad, y cada anillo se mece un poco.
      const hump = Math.max(0, Math.sin(phase + (last - i) * 0.9)) * walk;
      const neck = i === last ? lean * 6 - lunge * 8 : 0;
      image.setPosition(seg.x - hump * 3 + neck, seg.y - hump * rig.hump).setAngle(Math.sin(phase * 0.5 + i * 1.3) * 5 * walk);
    });
    const bob = Math.sin(phase * 2) * MORRIS_LOOK.headBob * walk;
    this.head
      .setPosition(rig.head.x + lean * 12 - lunge * 18, rig.head.y - lean * 8 + lunge * 10 + bob)
      .setAngle(lean * 10 - lunge * 12 + Math.sin(phase) * MORRIS_LOOK.headSway * walk);
  }

  setFace(mood: MorrisMood): void {
    const key = MORRIS_TEX.head(this.design, mood);
    if (key === this.headKey) return;
    this.headKey = key;
    this.head.setTexture(key);
  }

  /** Lo que se tine y destella: la cabeza y los anillos. */
  parts(): Phaser.GameObjects.Image[] {
    return [...this.segments, this.head];
  }

  /** Punto de pantalla de un punto de la figura (pixeles de diseno respecto a los pies). */
  point(p: Point): { x: number; y: number } {
    return { x: this.holder.x + p.x * this.holder.scaleX, y: this.holder.y + p.y * this.holder.scaleY };
  }

  /** Punto de pantalla de un punto respecto al anillo `index` (como esta ahora, con la joroba). */
  onSegment(index: number, p: Point): { x: number; y: number } {
    const seg = this.segments[Phaser.Math.Clamp(index, 0, this.segments.length - 1)];
    return this.point({ x: seg.x + p.x * (seg.scaleX / artInv()), y: seg.y + p.y * (seg.scaleY / artInv()) });
  }
}

/**
 * El gusanito que se le suelta a Morris (MR-07): salta del anillo `from` (pantalla) dando una voltereta y se mete en la
 * tierra a su lado, levantando polvo. Lo mismo hacen los que salen al deshacerse, hacia todos lados. El gusano de verdad sale
 * por el agujero de su carril: esto es solo lo que se ve en el. Con el reloj y los tweens de la escena (la pausa lo congela).
 */
function shedWormlet(scene: Phaser.Scene, fx: Effects, from: { x: number; y: number }, scale: number, depth: number, dx: number, delayMs = 0): void {
  const worm = scene.add
    .image(from.x, from.y, MORRIS_TEX.wormlet)
    .setScale(scale * artInv())
    .setDepth(depth)
    .setFlipX(dx > 0);
  const land = { x: from.x + dx, y: from.y + Math.abs(dx) * 0.15 + 46 * scale };
  const lift = 70 * scale;
  const path = { t: 0 };
  scene.tweens.add({
    targets: path,
    t: 1,
    delay: delayMs,
    duration: 520,
    ease: 'Sine.InOut',
    onUpdate: () => {
      const u = path.t;
      worm.setPosition(from.x + (land.x - from.x) * u, from.y + (land.y - from.y) * u - Math.sin(u * Math.PI) * lift).setAngle((dx > 0 ? 1 : -1) * u * 300);
    },
    onComplete: () => {
      fx.dirt(land.x, land.y, 5);
      // Se mete en la tierra: se aplasta y se hunde.
      scene.tweens.add({
        targets: worm,
        y: land.y + 10 * scale,
        scaleY: 0,
        alpha: 0,
        duration: 260,
        ease: 'Quad.In',
        onComplete: () => worm.destroy(),
      });
    },
  });
}

/**
 * Morris en el tablero (T-042). Sigue al enemigo del estado en `sync` (avanza ondulando sin parar; mordiendo, echa la cabeza
 * hacia delante), y anima lo que la escena le cuenta: el mordisco al paso, los golpes, soltar un gusano, la sobrecarga, la
 * derrota y la huida.
 */
export class MorrisView implements EnemyView {
  private readonly figure: MorrisFigure;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly flames: Phaser.GameObjects.Image[];
  private readonly frost: Phaser.GameObjects.Image[];
  private readonly alarmGlow: Phaser.GameObjects.Image | null = null;
  private readonly phaseOffset = Math.random() * Math.PI * 2;
  private phase = 0;
  private walk = 1;
  private footY: number;
  private cellWidth: number;
  private scale: number;
  private boardX: number;
  private readonly rise: Pulse = { v: 1 };
  private readonly lunge: Pulse = { v: 0 };
  private readonly hurt: Pulse = { v: 0 };
  private readonly kick: Pulse = { v: 0 };
  private readonly bump: Pulse = { v: 0 };
  private readonly shiver: Pulse = { v: 0 };
  private readonly shove: Pulse = { v: 0 };
  private readonly oops: Pulse = { v: 0 };
  private shoveDx = 0;
  private flashTimer?: Phaser.Time.TimerEvent;
  private burning = false;
  private chilled = false;
  private alarm = false;
  private bites = 0;
  private broods = 0;
  private bubble: BossBubble | null = null;
  private gone = false;
  /** Si sus frases suenan (en la galeria, no). */
  voiced = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
    emergeDelayMs = 0,
    /** Otra propuesta que la del juego: la galeria `/proposals/jefes.html` compara asi las tres (MR-08). */
    design: MorrisDesign = MORRIS_DESIGN,
  ) {
    this.footY = enemy.lane + MORRIS_LOOK.footY;
    this.boardX = enemy.x;
    const ground = perspective.toScreen({ x: enemy.x, y: this.footY });
    this.cellWidth = perspective.cellWidthAt({ x: enemy.x, y: this.footY });
    this.scale = (this.cellWidth / MORRIS_LOOK.unitsPerCell) * MORRIS_LOOK.size;
    const depth = entityDepth(ground.y);
    const inv = artInv();
    this.shadow = scene.add
      .image(ground.x, ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 2.1, this.cellWidth * 0.38)
      .setDepth(depth - 0.5);
    if (fx.quality.glows) {
      this.alarmGlow = scene.add.image(ground.x, ground.y, TEX.glow).setTint(MORRIS_LOOK.alarm).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false);
    }
    this.flames = MORRIS_LOOK.flames.map(() =>
      scene.add
        .image(0, 0, TEX.flame)
        .setOrigin(0.5, FLAME_SIZE.footY / FLAME_SIZE.height)
        .setVisible(false),
    );
    this.frost = MORRIS_LOOK.frost.map((f) =>
      scene.add
        .image(0, 0, TEX.frost)
        .setOrigin(0.5, FROST_SIZE.footY / FROST_SIZE.height)
        .setAngle(f.angle)
        .setScale(f.scale * inv)
        .setVisible(false),
    );
    this.figure = new MorrisFigure(scene, design, ground.x, ground.y, (front) => front.push(...this.frost, ...this.flames));
    this.figure.holder.setDepth(depth);

    if (emerge && emergeDelayMs > 0) {
      this.rise.v = 0;
      this.figure.holder.setVisible(false);
      scene.time.delayedCall(emergeDelayMs, () => {
        if (!this.figure.holder.active) return;
        this.figure.holder.setVisible(true);
        this.emerge({ x: this.shadow.x, y: this.shadow.y });
      });
    } else if (emerge) {
      this.emerge(ground);
    }
    if (emerge) scene.time.delayedCall(emergeDelayMs + 700, () => this.say(text().morris.entrance, 3400));
    this.sync(enemy);
  }

  /**
   * Coloca y pone en postura a Morris segun el estado, en cada fotograma. El cuerpo ondula segun lo que avanza; `stride` suma
   * lo que "anda" sin moverse de su sitio (la galeria). Nada lo para: ondula tambien mientras muerde.
   */
  sync(enemy: Enemy, stride = 0): void {
    const now = this.scene.time.now;
    const holder = this.figure.holder;
    this.boardX = enemy.x;
    const foot = { x: enemy.x + this.shoveDx * this.shove.v, y: this.footY };
    const ground = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.scale = (this.cellWidth / MORRIS_LOOK.unitsPerCell) * MORRIS_LOOK.size;
    holder.setDepth(entityDepth(ground.y));
    this.shadow.setDepth(entityDepth(ground.y) - 0.5);
    this.phase = this.phaseOffset - (enemy.x - stride) * MORRIS_LOOK.wavesPerCell * Math.PI * 2;

    const biting = enemy.attackMs !== null;
    const windup = biting ? Phaser.Math.Clamp(1 - (enemy.attackMs ?? 0) / ENEMIES.morris.firstBiteMs, 0, 1) : 0;
    const lean = windup * windup;
    const rise = this.rise.v;
    const hurt = this.hurt.v;
    const grow = this.scale * (0.3 + 0.7 * rise);
    const hop = Math.sin(this.bump.v * Math.PI) * 22 * this.scale;
    const shiver = Math.sin(this.shiver.v * Math.PI * 9) * 3.5 * this.shiver.v;
    const nerves = this.alarm ? Math.sin(now / 37) * MORRIS_LOOK.alarmTremble : 0;
    holder
      .setPosition(ground.x + (this.kick.v * 10 + shiver + nerves) * this.scale, ground.y + (1 - rise) * 24 * this.scale - hop)
      .setScale(grow * (1 + hurt * 0.08), grow * (1 - hurt * 0.08));
    this.shadow
      .setPosition(ground.x + 20 * this.scale, ground.y)
      .setDisplaySize(this.cellWidth * 2.1, this.cellWidth * 0.38)
      .setAlpha(Math.min(1, rise));
    this.figure.pose(this.phase, this.walk, lean, this.lunge.v);

    const mood: MorrisMood =
      hurt > 0.25 ? 'hurt' : this.lunge.v > 0.35 || windup > 0.4 ? 'bite' : this.oops.v > 0.2 ? 'oops' : this.bubble?.alive ? 'sorry' : 'idle';
    this.figure.setFace(mood);

    this.setBurning(enemy.burn !== null);
    this.setChilled(enemy.slow !== null);
    const head = this.figure.head;
    const back = this.figure.segments[this.figure.segments.length - 2];
    this.flames[0].setPosition(head.x + MORRIS_LOOK.flames[0].x, head.y + MORRIS_LOOK.flames[0].y);
    this.flames[1].setPosition(back.x + MORRIS_LOOK.flames[1].x, back.y + MORRIS_LOOK.flames[1].y);
    this.frost[0].setPosition(head.x + MORRIS_LOOK.frost[0].x, head.y + MORRIS_LOOK.frost[0].y);
    this.frost[1].setPosition(this.figure.segments[0].x + MORRIS_LOOK.frost[1].x, this.figure.segments[0].y + MORRIS_LOOK.frost[1].y);
    if (this.alarmGlow) {
      const beat = 0.5 + 0.5 * Math.sin(now / 120);
      const size = this.cellWidth * (2.6 + 0.3 * beat);
      this.alarmGlow
        .setVisible(this.alarm && !this.gone)
        .setPosition(holder.x + 20 * this.scale, holder.y - this.cellWidth * 0.55)
        .setDisplaySize(size, size * 0.8)
        .setAlpha(0.2 + 0.18 * beat)
        .setDepth(holder.depth - 0.4);
    }
    const top = this.figure.point(this.figure.rig.bubble);
    if (this.bubble?.alive) this.bubble.follow(top.x, top.y);
  }

  /** Muerde lo que toca sin pararse (MR-06): la cabeza se lanza y, de vez en cuando, se disculpa en su bocadillo. */
  chomp(): void {
    this.pulse(this.lunge, 320);
    const mouth = this.figure.point(this.figure.rig.mouth);
    this.fx.scrap(mouth.x, mouth.y, 2);
    if (this.bites++ % MORRIS_LOOK.biteLineEvery === 2) this.sayFrom(text().morris.chew, this.bites, 2000);
  }

  /** No escupe ni recita. */
  spat(): void {}

  inhale(): void {}

  sang(): void {}

  /**
   * Suelta un gusano por el carril `lane` (MR-07): pone cara de "¡uy!", se le desprende un gusanito de un anillo (de la
   * cola en las copias) que se mete en la tierra, y de vez en cuando lo dice.
   */
  brooded(lane: number): void {
    if (this.gone) return;
    this.pulse(this.oops, 520);
    const segments = this.figure.rig.segments.length;
    const index = this.figure.design === 'copies' ? 0 : this.broods % segments;
    const from = this.figure.onSegment(index, this.figure.rig.shedFrom);
    // Hacia arriba o hacia abajo segun el carril: hacia donde se le va.
    const dx = (lane < Math.round(this.footY - MORRIS_LOOK.footY) ? -1 : 1) * this.cellWidth * 0.35 + (index - segments / 2) * 4;
    shedWormlet(this.scene, this.fx, from, this.scale * 0.95, this.figure.holder.depth + 0.3, dx);
    if (this.fx.quality.extras) this.fx.bits(from.x, from.y, 3);
    if (this.broods++ % MORRIS_LOOK.broodLineEvery === 0) this.sayFrom(text().morris.brood, Math.floor(this.broods / MORRIS_LOOK.broodLineEvery), 1900);
  }

  /** La sobrecarga se enciende o se apaga (T-042): encendida, le entra el apuro (tiembla y le late un halo ambar) y lo dice. */
  overloaded(on: boolean): void {
    if (this.gone || on === this.alarm) return;
    this.alarm = on;
    if (!on) return;
    this.pulse(this.oops, 700);
    const { x, y } = this.figure.point({ x: 0, y: -90 });
    this.fx.ring(x, y, this.cellWidth * 2.2, MORRIS_LOOK.alarm, this.figure.holder.depth + 0.5, 420);
    this.say(text().morris.overload, 2200);
  }

  hit(): void {
    this.pulse(this.hurt, 240);
    this.pulse(this.kick, 200);
    this.flash();
  }

  blasted(): void {
    this.pulse(this.hurt, 420);
    this.pulse(this.kick, 320);
    this.pulse(this.bump, 380);
    this.flash();
  }

  frosted(): void {
    this.pulse(this.hurt, 320);
    this.pulse(this.shiver, 520);
    this.flash(MORRIS_LOOK.frozenTint, 160);
    const { x, y } = this.figure.point({ x: 0, y: -80 });
    this.fx.frost(x, y, 6);
  }

  shoved(fromX: number, toX: number): void {
    this.shoveDx = fromX - toX;
    this.scene.tweens.killTweensOf(this.shove);
    this.shove.v = 1;
    this.scene.tweens.add({ targets: this.shove, v: 0, duration: 300, ease: 'Cubic.Out' });
    this.frosted();
  }

  /** Derrotado: destella en blanco y se deshace en gusanitos que saltan hacia todos lados y se meten en la tierra. */
  die(): void {
    this.stop();
    const holder = this.figure.holder;
    const parts = this.figure.parts();
    parts.forEach((part) => part.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL));
    this.figure.setFace('hurt');
    const { x, y } = this.figure.point({ x: 20, y: -80 });
    const depth = holder.depth + 0.5;
    const count = Math.max(4, Math.round(this.fx.count(MORRIS_LOOK.dieWorms)));
    for (let i = 0; i < count; i++) {
      const from = this.figure.onSegment(i % this.figure.segments.length, { x: (i % 3) * 14 - 14, y: -30 });
      const dx = ((i % 2 === 0 ? -1 : 1) * (0.3 + (i / count) * 0.9) * this.cellWidth) / 1;
      shedWormlet(this.scene, this.fx, from, this.scale * (0.8 + (i % 3) * 0.12), depth, dx, i * 40);
    }
    this.fx.bits(x, y, 30);
    this.fx.sparkles(x, y, 14);
    this.fx.ring(x, y, this.cellWidth * 2.6, MORRIS_LOOK.alarm, depth, 560);
    this.fx.ring(x, y, this.cellWidth * 1.7, 0x39ff88, depth, 440);
    this.fx.glow(x, y, this.cellWidth * 3, 0xc9a6ff, depth, 640);
    this.scene.tweens.add({
      targets: holder,
      scaleX: holder.scaleX * 1.15,
      scaleY: holder.scaleY * 1.15,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => {
        parts.forEach((part) => part.clearTint());
        this.scene.tweens.add({ targets: holder, scaleX: 0, scaleY: 0, alpha: 0, duration: 340, ease: 'Back.In', onComplete: () => holder.destroy() });
      },
    });
    this.fadeShadow(460);
  }

  /** Cruzo el borde izquierdo: se disculpa en su bocadillo y se va ondulando fuera del jardin. */
  escape(): void {
    this.say(text().morris.escape, 2600);
    this.stop(false);
    const holder = this.figure.holder;
    const dx = -this.cellWidth * 1.6;
    this.scene.tweens.add({ targets: holder, x: holder.x + dx, alpha: 0, duration: 900, ease: 'Quad.In', onComplete: () => holder.destroy() });
    this.scene.tweens.add({ targets: this.shadow, x: this.shadow.x + dx, duration: 900 });
    this.fadeShadow(900);
  }

  /** Derrota del jugador (si sigue en pantalla): bota en su sitio, entre apurado y contento, y lo dice. */
  cheer(): void {
    this.stop(false);
    this.say(text().morris.cheer, 2600);
    this.figure.setFace('sorry');
    this.scene.tweens.add({ targets: this.figure.holder, y: this.figure.holder.y - this.cellWidth * 0.16, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.Out' });
  }

  ground(): { x: number; y: number; cellWidth: number } {
    return { x: this.shadow.x, y: this.shadow.y, cellWidth: this.cellWidth };
  }

  depth(): number {
    return this.figure.holder.depth;
  }

  contains(x: number, y: number): boolean {
    const { holder } = this.figure;
    if (this.gone || !holder.active || !holder.visible || holder.scaleX === 0 || holder.scaleY === 0) return false;
    const lx = (x - holder.x) / holder.scaleX;
    const ly = (y - holder.y) / holder.scaleY;
    const box = this.figure.rig.hitBox;
    return lx >= box.left && lx <= box.right && ly >= box.top && ly <= box.bottom;
  }

  /** Dice una frase cualquiera en su bocadillo (la galeria y el catalogo). */
  taunt(line: string): void {
    this.say(line, 2400);
  }

  /** Dice una de `lines` (la `index`, dando la vuelta). */
  private sayFrom(lines: readonly string[], index: number, lifeMs: number): void {
    if (lines.length) this.say(lines[index % lines.length], lifeMs);
  }

  /** Dice una frase en su bocadillo de consola, con su voz (T-014). */
  private say(line: string, lifeMs: number): void {
    if (this.gone) return;
    if (this.voiced) sfx.play('morrisTalk', panAt(this.boardX, BOARD.columns));
    this.bubble?.close();
    this.bubble = new BossBubble(this.scene, this.fx, line, MORRIS_LOOK.bubble, lifeMs);
    const top = this.figure.point(this.figure.rig.bubble);
    this.bubble.follow(top.x, top.y);
  }

  private setBurning(burning: boolean): void {
    if (burning === this.burning) return;
    this.burning = burning;
    this.scene.tweens.killTweensOf(this.flames);
    if (burning) {
      this.flames.forEach((flame, i) => {
        const base = MORRIS_LOOK.flames[i].scale * artInv();
        flame.setVisible(true).setAlpha(0.95).setScale(base * 0.3);
        this.scene.tweens.add({ targets: flame, scaleX: base, scaleY: base, duration: 180, ease: 'Back.Out' });
        this.scene.tweens.add({ targets: flame, scaleY: { from: base * 0.82, to: base * 1.18 }, duration: 140, yoyo: true, repeat: -1, delay: 180 + i * 60 });
      });
    } else {
      this.scene.tweens.add({ targets: this.flames, scaleX: 0, scaleY: 0, alpha: 0, duration: 220, onComplete: () => this.flames.forEach((f) => f.setVisible(false)) });
    }
    if (!this.flashTimer) this.applyRestingTint();
  }

  private setChilled(chilled: boolean): void {
    if (chilled === this.chilled) return;
    this.chilled = chilled;
    this.scene.tweens.killTweensOf(this.frost);
    if (chilled) {
      this.frost.forEach((crystal, i) => {
        const base = MORRIS_LOOK.frost[i].scale * artInv();
        crystal.setVisible(true).setAlpha(1).setScale(base * 0.2);
        this.scene.tweens.add({ targets: crystal, scaleX: base, scaleY: base, duration: 260, delay: i * 70, ease: 'Back.Out' });
      });
    } else {
      this.scene.tweens.add({ targets: this.frost, scaleX: 0, scaleY: 0, alpha: 0, duration: 260, onComplete: () => this.frost.forEach((c) => c.setVisible(false)) });
    }
    if (!this.flashTimer) this.applyRestingTint();
  }

  /** Tinte de reposo: azul frio si va lento (gana al quemado), anaranjado si arde. */
  private applyRestingTint(): void {
    for (const part of this.figure.parts()) {
      if (this.chilled) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(MORRIS_LOOK.chillTint);
      else if (this.burning) part.setTintMode(Phaser.TintModes.ADD).setTint(MORRIS_LOOK.burnTint);
      else part.clearTint();
    }
  }

  private flash(color = 0xffffff, durationMs = 70): void {
    this.flashTimer?.remove();
    this.figure.parts().forEach((part) => part.setTint(color).setTintMode(Phaser.TintModes.FILL));
    this.flashTimer = this.scene.time.delayedCall(durationMs, () => {
      this.flashTimer = undefined;
      this.applyRestingTint();
    });
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private emerge(ground: { x: number; y: number }): void {
    this.rise.v = 0;
    this.scene.tweens.add({ targets: this.rise, v: 1, duration: 680, ease: 'Back.Out' });
    this.fx.dirt(ground.x, ground.y, 16);
    this.fx.bits(ground.x, ground.y - this.cellWidth * 0.2, 14);
    this.fx.glow(ground.x, ground.y, this.cellWidth * 2, 0xc9a6ff, this.figure.holder.depth - 0.4, 480);
  }

  /** Deja de reaccionar y de verse el halo. `quiet` cierra el bocadillo (al caer); al escaparse o al ganar, lo deja hablar. */
  private stop(quiet = true): void {
    this.gone = true;
    this.walk = 0;
    this.flashTimer?.remove();
    this.scene.tweens.killTweensOf([this.rise, this.lunge, this.hurt, this.kick, this.bump, this.shiver, this.oops]);
    if (quiet) this.bubble?.close();
    const glow = this.alarmGlow;
    if (glow) this.scene.tweens.add({ targets: glow, alpha: 0, duration: 200, onComplete: () => glow.destroy() });
  }

  private fadeShadow(durationMs: number): void {
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: durationMs, onComplete: () => this.shadow.destroy() });
  }
}

/**
 * Morris preparandose (T-042): en las rondas 7 y 8, y en la preparacion de la 9, espera a la derecha sobre el suelo corrupto
 * con una tablilla en la que cuenta las maquinas de la red, como el de verdad (`bossLoadProgress`): en cada una que cuenta se
 * le cuela una copia suya, cada vez mas. Ondula en su sitio y, cada poco, se copia sin querer: se le escapa un gusanito y
 * pone cara de "¡uy!". A cada tropa acelerada le manda un gusanito al agujero de su carril. Al empezar el combate salta al
 * agujero del suyo. Mismo papel que `CreeperOmen`, `ElkClonerOmen` y `BrainOmen`.
 */
export class MorrisOmen {
  private readonly figure: MorrisFigure;
  private readonly tally: Phaser.GameObjects.Container;
  private readonly marks: Phaser.GameObjects.Image[];
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image | null = null;
  private readonly scale: number;
  private readonly ground: { x: number; y: number };
  private readonly cellWidth: number;
  /** Donde va la tablilla respecto a sus pies (pixeles de diseno) y su escala: delante de la cabeza, en el suelo. */
  private readonly tallyAt = { x: -240, y: -6, scale: 1 } as const;
  private progress = 0;
  private counted = -1;
  private readonly hop: Pulse = { v: 0 };
  private readonly oops: Pulse = { v: 0 };
  private copyTimer?: Phaser.Time.TimerEvent;
  private copies = 0;
  private bubble: BossBubble | null = null;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    progress: number,
    appear: boolean,
    design: MorrisDesign = MORRIS_DESIGN,
  ) {
    this.progress = progress;
    this.ground = perspective.toScreen(OMEN_SPOT);
    this.cellWidth = perspective.cellWidthAt(OMEN_SPOT);
    this.scale = (this.cellWidth / MORRIS_LOOK.unitsPerCell) * MORRIS_LOOK.size * 0.9;
    const depth = entityDepth(this.ground.y);
    const inv = artInv();
    this.shadow = scene.add
      .image(this.ground.x, this.ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 1.9, this.cellWidth * 0.34)
      .setDepth(depth - 0.6);
    if (fx.quality.glows) {
      this.aura = scene.add
        .image(this.ground.x, this.ground.y - this.cellWidth * 0.6, TEX.glow)
        .setDisplaySize(this.cellWidth * 3, this.cellWidth * 2.2)
        .setTint(0xc9a6ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12)
        .setDepth(depth - 0.4);
      scene.tweens.add({ targets: this.aura, alpha: 0.28, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const total = MORRIS_TALLY.cols * MORRIS_TALLY.rows;
    const board = scene.add.image(0, 0, MORRIS_TEX.tally).setOrigin(0, 0).setScale(inv);
    this.marks = tallyOrder()
      .slice(0, total)
      .map((index) => {
        const at = tallyCell(index);
        return scene.add.image(at.x, at.y, MORRIS_TEX.tallyMark).setOrigin(0, 0).setScale(inv).setVisible(false);
      });
    this.tally = scene.add
      .container(this.tallyAt.x - (MORRIS_TALLY.width * this.tallyAt.scale) / 2, this.tallyAt.y - MORRIS_TALLY.height * this.tallyAt.scale, [board, ...this.marks])
      .setScale(this.tallyAt.scale)
      .setAngle(-6);
    this.figure = new MorrisFigure(scene, design, this.ground.x, this.ground.y, (front) => front.push(this.tally));
    this.figure.holder.setDepth(depth).setScale(this.scale);
    this.applyMarks(true);

    // Cada poco se copia sin querer: se le escapa un gusanito y pone cara de susto.
    this.copyTimer = scene.time.addEvent({ delay: fx.ambientDelay(2800), loop: true, callback: () => this.slip() });
    if (appear) {
      this.figure.holder.setScale(this.scale * 0.2).setAlpha(0);
      scene.tweens.add({ targets: this.figure.holder, scaleX: this.scale, scaleY: this.scale, alpha: 1, duration: 560, ease: 'Back.Out' });
      fx.dirt(this.ground.x, this.ground.y, 14);
      fx.bits(this.ground.x, this.ground.y - this.cellWidth * 0.5, 14);
      fx.glow(this.ground.x, this.ground.y - this.cellWidth * 0.6, this.cellWidth * 2.2, 0xc9a6ff, depth + 1, 600);
      scene.time.delayedCall(640, () => this.say(text().morris.preparing, 3800));
    }
  }

  /** Lo que lleva contado (0 a 1): las maquinas con su copia lo alcanzan poco a poco. Mientras, ondula en su sitio. */
  setProgress(progress: number): void {
    if (this.done) return;
    this.progress += (progress - this.progress) * 0.06;
    this.applyMarks(false);
    const now = this.scene.time.now;
    this.figure.pose(now / 380, 0.7, 0, 0);
    this.figure.setFace(this.oops.v > 0.2 ? 'oops' : this.bubble?.alive ? 'sorry' : 'idle');
    this.figure.holder.setY(this.ground.y - this.hop.v * this.cellWidth * 0.3);
    if (this.bubble?.alive) {
      const top = this.figure.point(this.figure.rig.bubble);
      this.bubble.follow(top.x, top.y);
    }
  }

  /** Acelera a una tropa que sale (rondas 7 y 8): se le suelta un gusanito que vuela hasta el agujero de su carril. */
  zap(lane: number): void {
    if (this.done) return;
    this.pulse(this.oops, 420);
    const from = this.figure.onSegment(1, MORRIS_RIGS[this.figure.design].shedFrom);
    const hole = { x: SCENERY.holeX, y: lane + 0.6 };
    const to = perspective.toScreen(hole);
    const width = perspective.cellWidthAt(hole);
    const lift = Math.max(60, Math.abs(to.y - from.y) * 0.5 + 40);
    const worm = this.scene.add
      .image(from.x, from.y, MORRIS_TEX.wormlet)
      .setScale(this.scale * 0.9 * artInv())
      .setDepth(DEPTH.pollen - 2);
    const path = { t: 0 };
    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration: 460,
      ease: 'Quad.In',
      onUpdate: () => {
        const u = path.t;
        worm.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * lift).setAngle(-u * 360);
      },
      onComplete: () => {
        worm.destroy();
        this.fx.glow(to.x, to.y, width * 1.1, 0xc9a6ff, DEPTH.highlight + 1, 360);
        this.fx.dirt(to.x, to.y, 4);
      },
    });
  }

  /** Manda a su escolta: bota de golpe y lo dice (pidiendo perdon, claro). */
  command(line: string): void {
    if (this.done) return;
    this.say(line, 2800);
    this.pulse(this.hop, 380);
    this.fx.bits(this.ground.x, this.ground.y - this.cellWidth * 1, 8);
  }

  /** Empieza el combate: salta en curva hasta los pies de `foot` (el agujero de su carril) y desaparece al caer. */
  leapTo(foot: BoardPoint): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    const holder = this.figure.holder;
    const from = { x: holder.x, y: this.ground.y };
    const to = perspective.toScreen(foot);
    const toScale = (perspective.cellWidthAt(foot) / MORRIS_LOOK.unitsPerCell) * MORRIS_LOOK.size;
    const path = { t: 0 };
    this.fx.dirt(from.x, from.y, 12);
    this.figure.setFace('oops');
    this.scene.tweens.add({ targets: this.tally, alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration: OMEN_LEAP_MS,
      ease: 'Sine.InOut',
      onUpdate: () => {
        const u = path.t;
        const k = this.scale + (toScale - this.scale) * u;
        holder
          .setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * this.cellWidth * 1.2)
          .setScale(k)
          .setDepth(entityDepth(from.y + (to.y - from.y) * u));
        this.shadow.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u).setAlpha(1 - Math.sin(u * Math.PI) * 0.6);
      },
      onComplete: () => {
        this.fx.dirt(to.x, to.y, 16);
        holder.destroy();
        this.shadow.destroy();
      },
    });
    this.fadeAura();
  }

  /** Deja de verse sin combate (la partida acabo o se reinicio): se encoge y se desvanece. */
  vanish(): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    const holder = this.figure.holder;
    this.fx.bits(holder.x, holder.y - this.cellWidth * 0.6, 10);
    this.scene.tweens.add({ targets: holder, scaleX: 0, scaleY: 0, alpha: 0, duration: 300, ease: 'Back.In', onComplete: () => holder.destroy() });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 300, onComplete: () => this.shadow.destroy() });
    this.fadeAura();
  }

  private say(line: string, lifeMs: number): void {
    if (this.done) return;
    sfx.play('morrisTalk', panAt(OMEN_SPOT.x, BOARD.columns));
    this.bubble?.close();
    this.bubble = new BossBubble(this.scene, this.fx, line, MORRIS_LOOK.bubble, lifeMs);
    const top = this.figure.point(this.figure.rig.bubble);
    this.bubble.follow(top.x, top.y);
  }

  /** Cuenta las maquinas hasta lo que lleva; al contar una nueva, salta. `force` las repasa todas. */
  private applyMarks(force: boolean): void {
    const shown = Math.round(Phaser.Math.Clamp(this.progress, 0, 1) * this.marks.length);
    if (!force && shown === this.counted) return;
    const before = this.counted;
    this.counted = shown;
    this.marks.forEach((mark, i) => {
      const on = i < shown;
      if (on && !mark.visible && !force && i >= before) {
        mark.setVisible(true).setScale(artInv() * 1.6);
        this.scene.tweens.add({ targets: mark, scale: artInv(), duration: 220, ease: 'Back.Out' });
      } else {
        mark.setVisible(on);
      }
    });
  }

  /** Se copia sin querer: se le escapa un gusanito de un anillo, que se mete en la tierra, y pone cara de susto. */
  private slip(): void {
    if (this.done || !this.figure.holder.active) return;
    this.pulse(this.oops, 600);
    const segments = this.figure.rig.segments.length;
    const index = this.figure.design === 'copies' ? 0 : this.copies++ % segments;
    const from = this.figure.onSegment(index, this.figure.rig.shedFrom);
    shedWormlet(this.scene, this.fx, from, this.scale * 0.9, this.figure.holder.depth + 0.3, (this.copies % 2 === 0 ? 1 : -1) * this.cellWidth * 0.3);
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private stopIdle(): void {
    this.copyTimer?.remove();
    this.copyTimer = undefined;
  }

  private fadeAura(): void {
    const aura = this.aura;
    if (!aura) return;
    this.scene.tweens.killTweensOf(aura);
    this.scene.tweens.add({ targets: aura, alpha: 0, duration: 300, onComplete: () => aura.destroy() });
  }
}
