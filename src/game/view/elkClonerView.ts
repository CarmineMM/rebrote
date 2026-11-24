import * as Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { panAt } from '../audio/voices';
import { BOARD, ELK_CLONER } from '../config/balance';
import type { BoardPoint } from '../core/board';
import { poemWarning, type Enemy } from '../core/combat';
import { BossBubble, type BubbleStyle } from './bossBubble';
import { OMEN_LEAP_MS, OMEN_SPOT } from './creeperView';
import type { Effects } from './effects';
import { DEPTH, SCENERY, entityDepth, perspective } from './layout';
import { FEET_SIZE, HAT_SIZE, QUILL_SIZE, RUFF_SIZE, SCROLL_SIZE, TEX, WORM_SIZE, artInv } from './textures';
import { ELK_POSE, KIND_LOOK, WORM_LOOK, WormView, type EnemyView, type KindLook } from './wormView';
import { text } from '../../i18n';

/**
 * Elk Cloner, el Poeta (T-026), jefe del brote 2. Su cuerpo es un `WormView` de pie (`ELK_POSE`), con su disquete por
 * cabeza, su gorguera y su cornamenta; aqui va lo suyo: lo que dice en su bocadillo de pergamino (rimando), el aviso del
 * poema entero (L-03: un pentagrama dorado en cada uno de los cinco carriles, que se llena hasta que lo suelta, y la
 * cuenta atras sobre el), el poema al soltarlo, la derrota y la huida. Tambien `ElkClonerOmen`: Elk Cloner preparandose a
 * la derecha en las rondas 6 y 7 (y en la preparacion de la 8), escribiendo su poema en un pergamino. No decide nada
 * (ADR-0008): todo lo que dura sale del estado.
 */
const ELK_LOOK = {
  gold: 0xffd36a,
  goldDeep: 0xe0a21c,
  wine: 0xb8335f,
  magenta: 0xff5fd2,
  /** Bocadillo de pergamino, con letra de libro. */
  bubble: {
    font: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
    fontSize: 19,
    fontStyle: 'bold italic',
    bg: 0xfff3d6,
    bgAlpha: 0.97,
    edge: 0x8e1e4c,
    text: '#3b1a2a',
    cursor: false,
    corner: 12,
  } satisfies BubbleStyle,
  /** Una de cada tantas veces que suelta un verso, dice uno de sus versos en el bocadillo. */
  lineEvery: 3,
  /** Pentagrama del aviso: separacion de sus dos lineas (en casillas de carril), cada cuanto va una nota y lo que tarda en avanzar una. */
  staff: { gap: 0.09, noteEvery: 1.15, marchMs: 700 },
  /** Cuenta atras del poema: delante de su cara (el bocadillo va encima), en pixeles de la textura de la cabeza respecto a su centro. */
  countdown: { dx: -82, dy: -6 },
} as const;

/** Pico del bocadillo: sobre la cornamenta, en pixeles de la textura de la cabeza respecto a su centro. */
const BUBBLE_AT = { dx: 6, dy: -96 } as const;

export class ElkClonerView implements EnemyView {
  private readonly worm: WormView;
  /** Pentagramas del aviso del poema, en el suelo de los cinco carriles. */
  private readonly staff: Phaser.GameObjects.Graphics;
  private readonly aura: Phaser.GameObjects.Image | null = null;
  private countdown: Phaser.GameObjects.Text | null = null;
  private bubble: BossBubble | null = null;
  private gone = false;
  private sung = 0;
  private poems = 0;
  /** Columna en la que esta: de ahi suena su voz (T-014). */
  private boardX: number;
  /** Si sus frases suenan (en la portada del menu no, T-014). */
  voiced = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
    emergeDelayMs = 0,
    /** Otro aspecto (la galeria `/proposals/jefes.html`, para comparar los aros del disquete). */
    look?: KindLook,
  ) {
    this.worm = new WormView(scene, fx, enemy, emerge, emergeDelayMs, look);
    this.staff = scene.add.graphics().setDepth(DEPTH.highlight + 1);
    this.boardX = enemy.x;
    if (fx.quality.glows) {
      this.aura = scene.add.image(0, 0, TEX.glow).setTint(ELK_LOOK.gold).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false);
    }
    if (emerge) scene.time.delayedCall(emergeDelayMs + 450, () => !this.gone && this.say(text().elkCloner.entrance, 3600));
    this.sync(enemy);
  }

  sync(enemy: Enemy, stride = 0): void {
    this.worm.sync(enemy, stride);
    this.boardX = enemy.x;
    this.drawPoemWarning(enemy);
    const top = this.worm.headPoint(BUBBLE_AT.dx, BUBBLE_AT.dy);
    if (this.bubble?.alive) this.bubble.follow(top.x, top.y);
  }

  chomp(): void {
    this.worm.chomp();
  }

  ground(): { x: number; y: number; cellWidth: number } {
    return this.worm.ground();
  }

  contains(x: number, y: number): boolean {
    return !this.gone && this.worm.contains(x, y);
  }

  spat(): void {
    this.worm.spat();
  }

  inhale(): void {
    this.worm.inhale();
  }

  /** Suelta un verso por su carril: como el Minstrel, y una de cada tantas veces lo dice en su bocadillo. */
  sang(): void {
    this.worm.sang();
    if (this.sung++ % ELK_LOOK.lineEvery === 1) {
      const lines = text().elkCloner.verses;
      this.say(lines[Math.floor(this.sung / ELK_LOOK.lineEvery) % lines.length], 1800);
    }
  }

  hit(): void {
    this.worm.hit();
  }

  blasted(): void {
    this.worm.blasted();
  }

  frosted(): void {
    this.worm.frosted();
  }

  shoved(fromX: number, toX: number): void {
    this.worm.shoved(fromX, toX);
  }

  /**
   * Empieza a anunciar el poema entero (L-03): lo dice en su bocadillo mientras dura el aviso, con notas doradas y un
   * anillo. Se hincha, echa la cabeza atras y le brillan los ojos (lo hace `sync`, del estado), y los pentagramas se llenan.
   * El bocadillo dura `durationMs` reales: lo que dura el aviso a la velocidad del juego (T-048).
   */
  poemWarn(durationMs: number = ELK_CLONER.poemWarnMs): void {
    const lines = text().elkCloner.poem;
    this.say(lines[this.poems++ % lines.length], durationMs);
    const head = this.worm.headPoint(0, -10);
    const { cellWidth } = this.worm.ground();
    this.fx.notes(head.x, head.y, 6);
    this.fx.ring(head.x, head.y, cellWidth * 1.6, ELK_LOOK.gold, this.worm.depth() + 0.5, 420);
  }

  /** Suelta el poema entero: se lanza con la cara de recitar y le sale una lluvia de notas y dos anillos dorados. */
  recite(): void {
    this.worm.sang();
    this.bubble?.close();
    const head = this.worm.headPoint(-20, 18);
    const { cellWidth } = this.worm.ground();
    const depth = this.worm.depth() + 0.5;
    this.fx.notes(head.x, head.y, 14);
    this.fx.sparkles(head.x, head.y, 10);
    this.fx.ring(head.x, head.y, cellWidth * 2.4, ELK_LOOK.gold, depth, 480);
    this.fx.ring(head.x, head.y, cellWidth * 1.5, ELK_LOOK.magenta, depth, 380, 0.7);
    this.fx.glow(head.x, head.y, cellWidth * 2.6, ELK_LOOK.gold, depth, 520);
  }

  /** Derrotado: el cuerpo se deshace como el de un gusano (la cornamenta sale volando), con notas y pixeles por todas partes. */
  die(): void {
    const feet = this.worm.ground();
    const y = feet.y - feet.cellWidth * 1.1;
    const depth = this.worm.depth() + 0.5;
    this.worm.die();
    this.fx.bits(feet.x, y, 36);
    this.fx.notes(feet.x, y, 18);
    this.fx.sparkles(feet.x, y, 16);
    this.fx.ring(feet.x, y, feet.cellWidth * 2.6, ELK_LOOK.gold, depth, 560);
    this.fx.ring(feet.x, y, feet.cellWidth * 1.7, ELK_LOOK.wine, depth, 440);
    this.fx.glow(feet.x, y, feet.cellWidth * 3, ELK_LOOK.gold, depth, 640);
    this.leave();
  }

  /** Cruzo el borde izquierdo: se mete bajo tierra recitando su final. */
  escape(): void {
    this.say(text().elkCloner.escape, 2600);
    this.worm.escape();
    this.leave(false);
  }

  /** Derrota del jugador (si sigue en pantalla): salta de contento y se despide con una reverencia de poeta. */
  cheer(): void {
    this.worm.cheer();
    this.say(text().elkCloner.cheer, 2600);
  }

  /** Dice una frase en su bocadillo de pergamino, con su voz (T-014). */
  private say(line: string, lifeMs: number): void {
    if (this.gone) return;
    if (this.voiced) sfx.play('elkClonerTalk', panAt(this.boardX, BOARD.columns));
    this.bubble?.close();
    this.bubble = new BossBubble(this.scene, this.fx, line, ELK_LOOK.bubble, lifeMs);
    const top = this.worm.headPoint(BUBBLE_AT.dx, BUBBLE_AT.dy);
    this.bubble.follow(top.x, top.y);
  }

  /**
   * Aviso del poema entero, del estado (L-03): en cada carril, un pentagrama dorado desde el hasta el borde, que se va
   * encendiendo de el hacia la izquierda segun pasa el aviso, con notas que avanzan; un halo dorado detras de el y la
   * cuenta atras sobre su cabeza.
   */
  private drawPoemWarning(enemy: Enemy): void {
    this.staff.clear();
    const warning = this.gone ? null : poemWarning(enemy);
    if (warning === null) {
      this.dropCountdown();
      this.aura?.setVisible(false);
      return;
    }
    const t = 1 - warning;
    const now = this.scene.time.now;
    const beat = 0.5 + 0.5 * Math.sin(now / 110);
    const { staff } = ELK_LOOK;
    const from = Math.max(0, enemy.x - 0.35);
    const lit = from * (1 - t);
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      const foot = lane + WORM_LOOK.footY;
      for (const dy of [-staff.gap, staff.gap]) {
        const a = perspective.toScreen({ x: from, y: foot + dy });
        const b = perspective.toScreen({ x: 0, y: foot + dy });
        const mid = perspective.toScreen({ x: lit, y: foot + dy });
        this.staff.lineStyle(4, 0x6a3a00, 0.18 + 0.1 * beat).lineBetween(a.x, a.y, b.x, b.y);
        this.staff.lineStyle(2.5, ELK_LOOK.goldDeep, 0.3 + 0.15 * beat).lineBetween(a.x, a.y, b.x, b.y);
        this.staff.lineStyle(4, ELK_LOOK.gold, 0.55 + 0.4 * t * beat).lineBetween(a.x, a.y, mid.x, mid.y);
      }
      // Notas que avanzan por el pentagrama hacia las plantas.
      const march = (now / staff.marchMs) % 1;
      for (let k = 0; ; k++) {
        const x = from - (k + march) * staff.noteEvery;
        if (x < 0) break;
        const at = perspective.toScreen({ x, y: foot });
        const r = perspective.cellWidthAt({ x, y: foot }) * 0.045;
        const on = x >= lit;
        this.staff.fillStyle(0x2a1400, on ? 0.55 : 0.25).fillEllipse(at.x, at.y, r * 2.6, r * 2);
        this.staff.fillStyle(on ? ELK_LOOK.gold : ELK_LOOK.goldDeep, on ? 0.95 : 0.45).fillEllipse(at.x, at.y, r * 2, r * 1.5);
      }
    }
    const seconds = Math.max(1, Math.ceil((warning * ELK_CLONER.poemWarnMs) / 1000));
    const top = this.worm.headPoint(ELK_LOOK.countdown.dx, ELK_LOOK.countdown.dy);
    if (!this.countdown) {
      this.countdown = this.scene.add
        .text(top.x, top.y, '', this.fx.textStyle({ color: '#fff3b0', stroke: '#6a3a00', fontSize: 40 }))
        .setOrigin(0.5)
        .setDepth(DEPTH.floatText - 4);
    }
    if (this.countdown.text !== String(seconds)) {
      this.countdown.setText(String(seconds)).setScale(1.5);
      this.scene.tweens.add({ targets: this.countdown, scale: 1, duration: 260, ease: 'Back.Out' });
    }
    this.countdown.setPosition(top.x, top.y);
    if (this.aura) {
      const feet = this.worm.ground();
      const size = feet.cellWidth * (2.4 + 0.5 * beat);
      this.aura
        .setVisible(true)
        .setPosition(feet.x, feet.y - feet.cellWidth * 1.1)
        .setDisplaySize(size, size * 1.3)
        .setAlpha(0.18 + 0.32 * t)
        .setDepth(this.worm.depth() - 0.4);
    }
  }

  private dropCountdown(): void {
    const label = this.countdown;
    this.countdown = null;
    if (!label) return;
    this.scene.tweens.add({ targets: label, scale: 0, alpha: 0, duration: 180, onComplete: () => label.destroy() });
  }

  /** Se va de la pantalla: limpia el pentagrama, la cuenta atras y el halo; el bocadillo acaba solo (o se cierra si `quiet`). */
  private leave(quiet = true): void {
    this.gone = true;
    this.staff.destroy();
    this.dropCountdown();
    if (quiet) this.bubble?.close();
    const aura = this.aura;
    if (aura) this.scene.tweens.add({ targets: aura, alpha: 0, duration: 200, onComplete: () => aura.destroy() });
  }
}

/** Renglones del pergamino: trozos de "palabras" de cada renglon, en fracciones de su ancho. Fijos, para que no bailen. */
const SCROLL_WORDS: ReadonlyArray<readonly number[]> = [
  [0.22, 0.14, 0.3, 0.18],
  [0.16, 0.26, 0.12, 0.28],
  [0.3, 0.12, 0.2, 0.22],
  [0.18, 0.2, 0.28, 0.12],
  [0.26, 0.16, 0.22],
];

/**
 * Elk Cloner preparandose (T-026): en las rondas 6 y 7, y en la preparacion de la 8, espera de pie sobre el suelo
 * corrupto, a la derecha, escribiendo su poema en un pergamino: los renglones se llenan de tinta con lo que lleva
 * (`bossLoadProgress`) y la pluma va por donde escribe. Respira y suelta notas. A cada tropa acelerada que sale le manda
 * una nota. Al empezar el combate salta al agujero de su carril. Mismo papel que `CreeperOmen`.
 */
export class ElkClonerOmen {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly ink: Phaser.GameObjects.Graphics;
  private readonly quill: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image | null = null;
  private readonly scale: number;
  private readonly size: number;
  private readonly ground: { x: number; y: number };
  private readonly cellWidth: number;
  /** Donde va el pergamino dentro del cuerpo, y su escala. */
  private readonly scroll = { x: -78, y: -112, scale: 0.72 } as const;
  private progress = 0;
  private drawn = -1;
  private ambient?: Phaser.Time.TimerEvent;
  private bubble: BossBubble | null = null;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    progress: number,
    appear: boolean,
  ) {
    this.progress = progress;
    this.size = KIND_LOOK.elkCloner.size;
    this.ground = perspective.toScreen(OMEN_SPOT);
    this.cellWidth = perspective.cellWidthAt(OMEN_SPOT);
    this.scale = (this.cellWidth / WORM_LOOK.unitsPerCell) * this.size;
    const depth = entityDepth(this.ground.y);

    this.shadow = scene.add
      .image(this.ground.x, this.ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.8 * this.size, this.cellWidth * 0.22 * this.size)
      .setDepth(depth - 0.6);
    if (fx.quality.glows) {
      this.aura = scene.add
        .image(this.ground.x, this.ground.y - this.cellWidth * 1.1, TEX.glow)
        .setDisplaySize(this.cellWidth * 2.6, this.cellWidth * 3.2)
        .setTint(ELK_LOOK.gold)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.14)
        .setDepth(depth - 0.4);
      scene.tweens.add({ targets: this.aura, alpha: 0.34, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const { head } = WORM_SIZE;
    const feet = scene.add.image(ELK_POSE.segments[0].x - 6, ELK_POSE.segments[0].y + 24, TEX.elkFeet).setOrigin(FEET_SIZE.cx / FEET_SIZE.width, FEET_SIZE.cy / FEET_SIZE.height).setScale(artInv());
    const beads = ELK_POSE.segments.map((s) => scene.add.image(s.x, s.y, TEX.elkSegment).setScale(s.scale * artInv()));
    const top = ELK_POSE.segments[3];
    const ruff = scene.add.image(top.x - 4, top.y - 8, TEX.elkRuff).setOrigin(RUFF_SIZE.cx / RUFF_SIZE.width, RUFF_SIZE.cy / RUFF_SIZE.height).setScale(0.92 * artInv());
    // Escribe con los ojos cerrados de gusto y la cabeza algo inclinada hacia el pergamino.
    this.head = scene.add
      .image(ELK_POSE.head.x, ELK_POSE.head.y, TEX.elkHeadInhale)
      .setOrigin(head.cx / head.width, head.cy / head.height)
      .setScale(artInv())
      .setAngle(-6);
    const antlers = scene.add
      .image(ELK_POSE.head.x, ELK_POSE.head.y, TEX.elkAntlers)
      .setOrigin(HAT_SIZE.cx / HAT_SIZE.width, HAT_SIZE.cy / HAT_SIZE.height)
      .setScale(artInv())
      .setAngle(-6);
    const paper = scene.add.image(this.scroll.x, this.scroll.y, TEX.elkScroll).setScale(this.scroll.scale * artInv());
    this.ink = scene.add.graphics();
    this.quill = scene.add.image(0, 0, TEX.elkQuill).setOrigin(QUILL_SIZE.nibX / QUILL_SIZE.width, QUILL_SIZE.nibY / QUILL_SIZE.height).setScale(0.8 * artInv());
    this.body = scene.add.container(0, 0, [feet, ...beads, ruff, this.head, antlers, paper, this.ink, this.quill]);
    this.holder = scene.add.container(this.ground.x, this.ground.y, [this.body]).setDepth(depth).setScale(this.scale);

    scene.tweens.add({ targets: this.body, scaleY: 1.03, scaleX: 0.985, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.ambient = scene.time.addEvent({
      delay: fx.ambientDelay(700),
      loop: true,
      callback: () => {
        const at = this.point(this.scroll.x, this.scroll.y - 40);
        this.fx.note(at.x, at.y);
      },
    });
    this.applyInk(true);

    if (appear) {
      this.holder.setScale(this.scale * 0.2).setAlpha(0);
      scene.tweens.add({ targets: this.holder, scaleX: this.scale, scaleY: this.scale, alpha: 1, duration: 520, ease: 'Back.Out' });
      fx.dirt(this.ground.x, this.ground.y, 12);
      fx.notes(this.ground.x, this.ground.y - this.cellWidth * 0.6, 10);
      fx.glow(this.ground.x, this.ground.y - this.cellWidth * 0.8, this.cellWidth * 2, ELK_LOOK.gold, depth + 1, 600);
      scene.time.delayedCall(600, () => this.say(text().elkCloner.preparing, 3600));
    }
  }

  /** Lo que lleva escrito (0 a 1): la tinta lo alcanza poco a poco. */
  setProgress(progress: number): void {
    if (this.done) return;
    this.progress += (progress - this.progress) * 0.06;
    this.applyInk(false);
    if (this.bubble?.alive) {
      const top = this.point(ELK_POSE.head.x + BUBBLE_AT.dx, ELK_POSE.head.y + BUBBLE_AT.dy);
      this.bubble.follow(top.x, top.y);
    }
  }

  /** Acelera a una tropa que sale (rondas 6 y 7): una nota dorada vuela de su pergamino al agujero del carril. */
  zap(lane: number): void {
    if (this.done) return;
    const from = this.point(this.scroll.x, this.scroll.y - 30);
    const hole = { x: SCENERY.holeX, y: lane + 0.6 };
    const to = perspective.toScreen(hole);
    const width = perspective.cellWidthAt(hole);
    const lift = Math.max(60, Math.abs(to.y - from.y) * 0.5 + 40);
    for (let i = 0; i < 3; i++) {
      const note = this.scene.add
        .image(from.x, from.y, TEX.note)
        .setScale(0.9 * artInv())
        .setDepth(DEPTH.pollen - 2);
      const path = { t: 0 };
      this.scene.tweens.add({
        targets: path,
        t: 1,
        delay: i * 70,
        duration: 420,
        ease: 'Quad.In',
        onUpdate: () => {
          const u = path.t;
          note.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * lift).setAngle(u * 360);
        },
        onComplete: () => {
          note.destroy();
          if (i === 2) {
            this.fx.glow(to.x, to.y, width * 1.1, ELK_LOOK.gold, DEPTH.highlight + 1, 360);
            this.fx.notes(to.x, to.y - width * 0.15, 3);
          }
        },
      });
    }
  }

  /** Manda a su escolta: se yergue de golpe, suelta notas y lo dice rimando. */
  command(line: string): void {
    if (this.done) return;
    this.say(line, 2800);
    this.scene.tweens.add({ targets: this.holder, scaleY: this.scale * 1.12, scaleX: this.scale * 0.94, duration: 150, yoyo: true, ease: 'Quad.Out' });
    this.fx.notes(this.ground.x, this.ground.y - this.cellWidth * 1.2, 8);
  }

  /** Empieza el combate: enrolla el pergamino, salta en curva hasta los pies de `foot` (el agujero de su carril) y desaparece al caer. */
  leapTo(foot: BoardPoint, durationMs = OMEN_LEAP_MS): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    const from = { x: this.holder.x, y: this.holder.y };
    const to = perspective.toScreen(foot);
    const toScale = (perspective.cellWidthAt(foot) / WORM_LOOK.unitsPerCell) * this.size;
    const path = { t: 0 };
    this.fx.dirt(from.x, from.y, 10);
    this.head.setTexture(TEX.elkHeadRecite);
    this.scene.tweens.add({ targets: [this.ink, this.quill], alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration: durationMs,
      ease: 'Sine.InOut',
      onUpdate: () => {
        const u = path.t;
        const k = this.scale + (toScale - this.scale) * u;
        this.holder
          .setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * this.cellWidth * 1.3)
          .setScale(k * (1 - Math.sin(u * Math.PI) * 0.1), k * (1 + Math.sin(u * Math.PI) * 0.12))
          .setDepth(entityDepth(from.y + (to.y - from.y) * u));
        this.shadow.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u).setAlpha(1 - Math.sin(u * Math.PI) * 0.6);
      },
      onComplete: () => {
        this.fx.dirt(to.x, to.y, 14);
        this.holder.destroy();
        this.shadow.destroy();
      },
    });
    this.fadeAura();
  }

  /** Deja de verse sin combate (la partida acabo o se reinicio): se encoge y suelta notas. */
  vanish(): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    this.fx.notes(this.holder.x, this.holder.y - this.cellWidth * 0.8, 8);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 300, onComplete: () => this.shadow.destroy() });
    this.fadeAura();
  }

  private say(line: string, lifeMs: number): void {
    if (this.done) return;
    sfx.play('elkClonerTalk', panAt(OMEN_SPOT.x, BOARD.columns));
    this.bubble?.close();
    this.bubble = new BossBubble(this.scene, this.fx, line, ELK_LOOK.bubble, lifeMs);
    const top = this.point(ELK_POSE.head.x + BUBBLE_AT.dx, ELK_POSE.head.y + BUBBLE_AT.dy);
    this.bubble.follow(top.x, top.y);
  }

  /**
   * Pinta la tinta del pergamino hasta lo que lleva: los renglones se llenan de "palabras" de izquierda a derecha, y la
   * pluma se pone donde acaba la tinta, moviendose como si escribiera. `force` vuelve a pintarla aunque no haya cambiado.
   */
  private applyInk(force: boolean): void {
    const { left, right, lines, width, height } = SCROLL_SIZE;
    const k = this.scroll.scale;
    const ox = this.scroll.x - (width / 2) * k;
    const oy = this.scroll.y - (height / 2) * k;
    const total = SCROLL_WORDS.reduce((sum, words) => sum + words.length, 0);
    const written = Math.round(Phaser.Math.Clamp(this.progress, 0, 1) * total);
    let tip = { x: ox + left * k, y: oy + lines[0] * k };
    if (force || written !== this.drawn) {
      this.drawn = written;
      this.ink.clear();
      let count = 0;
      SCROLL_WORDS.forEach((words, row) => {
        let x = left + 3;
        const y = lines[row];
        for (const word of words) {
          const w = word * (right - left - 10);
          if (count < written) {
            this.ink.fillStyle(0x4a1028, 0.85).fillRoundedRect(ox + x * k, oy + (y - 2) * k, w * k, 3.2 * k, 1.4 * k);
          }
          count++;
          x += w + 5;
        }
      });
    }
    let count = 0;
    SCROLL_WORDS.forEach((words, row) => {
      let x = left + 3;
      for (const word of words) {
        const w = word * (right - left - 10);
        count++;
        x += w + 5;
        if (count === Math.max(1, this.drawn)) tip = { x: ox + (x - 5) * k, y: oy + lines[row] * k };
      }
    });
    const wiggle = Math.sin(this.scene.time.now / 90) * 2.2;
    this.quill.setPosition(tip.x + wiggle, tip.y - Math.abs(wiggle) * 0.6);
  }

  /** Punto del cuerpo en pantalla, en sus pixeles de diseno. */
  private point(dx: number, dy: number): { x: number; y: number } {
    return { x: this.holder.x + dx * this.holder.scaleX, y: this.holder.y + dy * this.holder.scaleY };
  }

  private stopIdle(): void {
    this.ambient?.remove();
    this.ambient = undefined;
    this.scene.tweens.killTweensOf([this.body]);
  }

  private fadeAura(): void {
    const aura = this.aura;
    if (!aura) return;
    this.scene.tweens.killTweensOf(aura);
    this.scene.tweens.add({ targets: aura, alpha: 0, duration: 300, onComplete: () => aura.destroy() });
  }
}
