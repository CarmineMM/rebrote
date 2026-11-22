import * as Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { panAt } from '../audio/voices';
import { BOARD } from '../config/balance';
import type { BoardPoint } from '../core/board';
import { isEnraged, type Enemy } from '../core/combat';
import type { MatchState } from '../core/match';
import { outbreakScript } from '../core/outbreaks';
import { isBossRound, roundScript } from '../core/rounds';
import { drawArea } from './boardMarks';
import type { Effects } from './effects';
import { DEPTH, SCENERY, entityDepth, perspective } from './layout';
import { CREEPER_SCREEN, TEX, WORM_SIZE, artInv } from './textures';
import { CREEPER_SIZE, WORM_LOOK, WormView, type EnemyView } from './wormView';
import { text } from '../../i18n';

/**
 * Creeper (T-008), jefe del brote 1. Su cuerpo es un `WormView` grande con cabeza de monitor; aqui va lo suyo: el
 * aviso del salto (diana en el carril de destino y la curva que hara), sus frases en un bocadillo de terminal, la luz
 * de la antena, el enfado de la fase 2, el aterrizaje y la derrota. Tambien `CreeperOmen`: Creeper preparandose a la
 * derecha en las rondas 8 y 9 (y en la preparacion de la 10), que acelera a los gusanos. No decide nada (ADR-0008).
 */
const CREEPER_LOOK = {
  /** Diana del carril de destino: roja como la luz de su antena; en la fase 2, mas encendida. */
  warnColor: 0xff5a5f,
  angryColor: 0xff2e63,
  markerRadius: 0.42,
  /** Puntos de la curva que hara al saltar. */
  arcDots: 9,
  /** Bocadillo de terminal: fondo de pantalla, borde y letras de fosforo (rojo en la fase 2). */
  bubble: {
    calm: { bg: 0x0b2417, edge: 0x39ff88, text: '#c8ffe0' },
    angry: { bg: 0x2a0a12, edge: 0xff5a7a, text: '#ffd6df' },
  },
  // Sus frases (entrada, enfado, saltos, huida, risa y preparacion) estan en `creeper` de `src/i18n/` (T-011).
  /** Luz de la antena: parpadea (mas deprisa enfadado). */
  ledBlinkMs: { calm: 620, angry: 260 },
} as const;

/** Donde se prepara Creeper: sobre el suelo corrupto, detras de los agujeros de los carriles 1 y 2. */
export const OMEN_SPOT: BoardPoint = { x: BOARD.columns + 1.5, y: 2.15 };
/** Lo que tarda en saltar desde donde se preparaba hasta el agujero de su carril al empezar el combate. */
export const OMEN_LEAP_MS = 520;

/**
 * Lo que lleva cargado Creeper mientras se prepara (0 a 1), para su barra: avanza con las rondas en que se prepara y
 * con el ataque de cada una, y se llena en la ronda del combate. Es solo aspecto.
 */
export function bossLoadProgress(state: MatchState): number {
  const { round, outbreak } = state;
  if (isBossRound(outbreak, round.index)) return 1;
  const preparing = outbreakScript(outbreak)
    .rounds.map((script, i) => (script.bossPreparing ? i : -1))
    .filter((i) => i >= 0);
  const k = preparing.indexOf(round.index);
  if (k < 0) return 0;
  const { groups } = roundScript(outbreak, round.index);
  const lastAt = groups[groups.length - 1]?.atMs ?? 1;
  const within = round.phase === 'attack' ? Math.min(1, round.elapsedMs / lastAt) : 0;
  return Math.min(0.96, (k + within) / preparing.length);
}

type BubbleTone = keyof typeof CREEPER_LOOK.bubble;

/**
 * Bocadillo de terminal con lo que dice Creeper: sale con un salto, sigue a su cabeza y se va solo. El pico apunta a
 * la cabeza; el cuerpo va a la derecha y, si ahi no cabe en la pantalla, a la izquierda.
 */
class SpeechBubble {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly cursor: Phaser.GameObjects.Rectangle;
  private readonly palette: (typeof CREEPER_LOOK.bubble)[BubbleTone];
  private readonly width: number;
  private readonly height: number;
  private flipped: boolean | null = null;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    fx: Effects,
    text: string,
    tone: BubbleTone,
    lifeMs: number,
  ) {
    this.palette = CREEPER_LOOK.bubble[tone];
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: 'ui-monospace, "Cascadia Mono", "Courier New", monospace',
        fontSize: '19px',
        fontStyle: '900',
        color: this.palette.text,
        resolution: fx.quality.renderScale,
      })
      .setOrigin(0, 1);
    this.width = this.label.width + BUBBLE.padX * 2 + BUBBLE.cursor;
    this.height = this.label.height + BUBBLE.padY * 2;
    this.bg = scene.add.graphics();
    // Cursor de terminal que parpadea al final de la frase.
    this.cursor = scene.add.rectangle(0, 0, 9, 3, this.palette.edge).setOrigin(0, 1);
    scene.tweens.add({ targets: this.cursor, alpha: 0, duration: 260, yoyo: true, repeat: -1, ease: 'Stepped' });
    this.holder = scene.add.container(0, 0, [this.bg, this.label, this.cursor]).setDepth(DEPTH.floatText - 3).setScale(0.3).setAlpha(0);
    scene.tweens.add({ targets: this.holder, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    scene.time.delayedCall(lifeMs, () => this.close());
  }

  get alive(): boolean {
    return !this.closed;
  }

  /** Pone el pico en `x, y` (sobre la cabeza). */
  follow(x: number, y: number): void {
    if (!this.holder.active) return;
    const view = this.scene.cameras.main.worldView;
    const flip = x + this.width - BUBBLE.tail > view.right - BUBBLE.margin;
    if (flip !== this.flipped) this.layout(flip);
    this.holder.setPosition(x, y);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.tweens.add({
      targets: this.holder,
      scale: 0.4,
      alpha: 0,
      duration: 200,
      ease: 'Back.In',
      onComplete: () => this.holder.destroy(),
    });
  }

  /** Dibuja el bocadillo con el cuerpo a la derecha del pico, o a la izquierda si `flip`. */
  private layout(flip: boolean): void {
    this.flipped = flip;
    const { padX, padY, tail, lift } = BUBBLE;
    const w = this.width;
    const h = this.height;
    const left = flip ? tail - w : -tail;
    const bottom = -lift;
    const dir = flip ? -1 : 1;
    this.label.setPosition(left + padX, bottom - padY);
    this.cursor.setPosition(left + padX + this.label.width + 4, bottom - padY - 3);
    this.bg.clear();
    this.bg.fillStyle(this.palette.bg, 0.94).lineStyle(3, this.palette.edge, 1);
    this.bg.fillRoundedRect(left, bottom - h, w, h, 9).strokeRoundedRect(left, bottom - h, w, h, 9);
    this.bg.fillTriangle(-2 * dir, bottom - 1, 14 * dir, bottom - 1, 0, 0);
    this.bg.lineBetween(-2 * dir, bottom, 0, 0).lineBetween(0, 0, 14 * dir, bottom);
  }
}

/** Medidas del bocadillo: margen del texto, sitio del cursor, cuanto se aparta el cuerpo del pico y del borde. */
const BUBBLE = { padX: 12, padY: 8, cursor: 14, tail: 18, lift: 14, margin: 12 } as const;

/**
 * Creeper en pantalla. Sigue al estado en `sync` (posicion, salto, fase) y anima lo que la escena le cuenta: aviso,
 * despegue, aterrizaje, golpes, derrota o huida.
 */
export class CreeperView implements EnemyView {
  private readonly worm: WormView;
  /** Diana en el suelo del carril de destino (y del sitio donde caera mientras vuela). */
  private readonly groundMark: Phaser.GameObjects.Graphics;
  /** Curva de puntos del salto: va por encima de las plantas. */
  private readonly arcMark: Phaser.GameObjects.Graphics;
  private alert: Phaser.GameObjects.Text | null = null;
  private bubble: SpeechBubble | null = null;
  private readonly led: Phaser.GameObjects.Image | null = null;
  private enraged: boolean;
  private jumps = 0;
  private gone = false;
  /** Columna en la que esta (en casillas): de ahi suena su voz (T-014). */
  private boardX: number;
  /**
   * Si sus frases suenan (T-014). En la portada del menu no: alli solo suena lo que el jugador pulsa (S-04), y la frase
   * que suelta al hacerle clic se pide con `taunt(..., true)`.
   */
  voiced = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
    emergeDelayMs = 0,
  ) {
    this.worm = new WormView(scene, fx, enemy, emerge, emergeDelayMs);
    this.groundMark = scene.add.graphics().setDepth(DEPTH.highlight + 1);
    this.arcMark = scene.add.graphics().setDepth(DEPTH.pollen - 1);
    this.enraged = isEnraged(enemy);
    this.boardX = enemy.x;
    if (fx.quality.glows) {
      this.led = scene.add.image(0, 0, TEX.glow).setTint(CREEPER_LOOK.warnColor).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
      this.blinkLed();
    }
    if (emerge) scene.time.delayedCall(emergeDelayMs + 450, () => !this.gone && this.say(text().creeper.entrance, 3400));
    this.sync(enemy);
  }

  sync(enemy: Enemy, stride = 0): void {
    this.worm.sync(enemy, stride);
    this.boardX = enemy.x;
    const angry = isEnraged(enemy);
    if (angry && !this.enraged) this.enrage();
    this.enraged = angry;
    this.drawMarks(enemy);
    const top = this.worm.headPoint(10, -58);
    if (this.bubble?.alive) this.bubble.follow(top.x, top.y);
    if (this.led) {
      const { head } = WORM_SIZE;
      const tip = this.worm.headPoint(CREEPER_SCREEN.antenna.x - head.cx, CREEPER_SCREEN.antenna.y - head.cy);
      const size = this.worm.ground().cellWidth * 0.32;
      this.led.setPosition(tip.x, tip.y).setDisplaySize(size, size).setDepth(this.worm.depth() + 0.3);
    }
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

  sang(): void {
    this.worm.sang();
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

  /** Cruza un umbral de vida (J-01): se agacha (lo hace `sync`), salta tierra y sale un "!" sobre la diana de destino. */
  warn(): void {
    const feet = this.worm.ground();
    this.fx.dirt(feet.x, feet.y, 6);
    this.alert?.destroy();
    this.alert = this.scene.add
      .text(0, 0, '!', this.fx.textStyle({ color: '#ffe3e6', stroke: '#8a0f22', fontSize: 46 }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.floatText - 4)
      .setScale(0.2);
    this.scene.tweens.add({ targets: this.alert, scale: 1, duration: 240, ease: 'Back.Out' });
    // Una de cada dos veces suelta una frase.
    if (this.jumps++ % 2 === 1) {
      const lines = text().creeper.jump;
      this.say(lines[Math.floor(this.jumps / 2) % lines.length], 1100);
    }
  }

  /** Despega: tierra y pixeles donde estaba (alli quedan sus copias, que pinta la escena). */
  takeoff(): void {
    const feet = this.worm.ground();
    this.fx.dirt(feet.x, feet.y, 10);
    this.fx.bits(feet.x, feet.y - feet.cellWidth * 0.2, 10);
    this.fx.groundRing(feet.x, feet.y, feet.cellWidth * 1.4, feet.cellWidth * 0.42, 0x39ff88, DEPTH.highlight + 2, 360);
  }

  /** Aterriza (J-05): se aplasta, onda en el suelo, tierra y el "!" se va. El golpe a la planta lo anima la escena. */
  land(): void {
    this.worm.landed();
    const feet = this.worm.ground();
    const color = this.enraged ? CREEPER_LOOK.angryColor : CREEPER_LOOK.warnColor;
    this.fx.groundRing(feet.x, feet.y, feet.cellWidth * 2.2, feet.cellWidth * 0.7, color, DEPTH.highlight + 2, 420);
    this.fx.dirt(feet.x, feet.y, 16);
    this.fx.bits(feet.x, feet.y - feet.cellWidth * 0.1, 8);
    this.dropAlert();
  }

  /** Derrotado: el cuerpo se deshace como el de un gusano, con una explosion de pixeles mucho mayor. */
  die(): void {
    const feet = this.worm.ground();
    const y = feet.y - feet.cellWidth * 0.6;
    const depth = this.worm.depth() + 0.5;
    this.worm.die();
    this.fx.bits(feet.x, y, 40);
    this.fx.sparkles(feet.x, y, 18);
    this.fx.ring(feet.x, y, feet.cellWidth * 2.4, 0x39ff88, depth, 520);
    this.fx.ring(feet.x, y, feet.cellWidth * 1.6, 0xb48cff, depth, 420);
    this.fx.glow(feet.x, y, feet.cellWidth * 3, 0x39ff88, depth, 600);
    this.leave();
  }

  /** Cruzo el borde izquierdo: se mete bajo tierra riendose. */
  escape(): void {
    this.say(text().creeper.escape, 2400);
    this.worm.escape();
    this.leave(false);
  }

  /** Derrota del jugador (si sigue en pantalla): salta de contento y se rie. */
  cheer(): void {
    this.worm.cheer();
    this.say(text().creeper.cheer, 2400);
  }

  /**
   * Suelta una frase en su bocadillo de terminal (en la portada del menu, T-011, cuando le hacen clic o cada tanto). Con
   * `voiced` suena aunque sus frases vayan calladas (el clic de la portada).
   */
  taunt(line: string, lifeMs = 2600, voiced = this.voiced): void {
    if (!this.gone) this.say(line, lifeMs, voiced);
  }

  /** Dice una frase en su bocadillo de terminal, con su pitido de terminal (T-014). */
  private say(text: string, lifeMs: number, voiced = this.voiced): void {
    if (voiced) sfx.play('creeperTalk', panAt(this.boardX, BOARD.columns));
    this.bubble?.close();
    this.bubble = new SpeechBubble(this.scene, this.fx, text, this.enraged ? 'angry' : 'calm', lifeMs);
    const top = this.worm.headPoint(10, -58);
    this.bubble.follow(top.x, top.y);
  }

  /** Entra en la fase 2: echa humo, la pantalla se pone roja (cara de `angryHead`), lo dice y la luz va mas deprisa. */
  private enrage(): void {
    this.enraged = true;
    const head = this.worm.headPoint(0, -10);
    const { cellWidth } = this.worm.ground();
    this.fx.smoke(head.x, head.y, 8);
    this.fx.ring(head.x, head.y, cellWidth * 1.8, CREEPER_LOOK.angryColor, this.worm.depth() + 0.5, 420);
    this.scene.cameras.main.shake(200, 0.004);
    if (this.voiced) sfx.play('creeperRage', panAt(this.boardX, BOARD.columns));
    // El rugido ya lleva su voz: la frase va sin pitido para no pisarlo.
    this.say(text().creeper.angry, 2200, false);
    this.blinkLed();
  }

  private blinkLed(): void {
    if (!this.led) return;
    this.scene.tweens.killTweensOf(this.led);
    this.led.setAlpha(0.9);
    this.scene.tweens.add({
      targets: this.led,
      alpha: 0.15,
      duration: this.enraged ? CREEPER_LOOK.ledBlinkMs.angry : CREEPER_LOOK.ledBlinkMs.calm,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
    });
  }

  /**
   * Aviso del salto, del estado (J-01): mientras se agacha, diana que late en el carril de destino, curva de puntos
   * que avanzan hacia ella y "!" encima; mientras vuela, la diana se cierra donde va a caer.
   */
  private drawMarks(enemy: Enemy): void {
    this.groundMark.clear();
    this.arcMark.clear();
    const { jump } = enemy;
    if (!jump || this.gone) return;
    const color = this.enraged ? CREEPER_LOOK.angryColor : CREEPER_LOOK.warnColor;
    const t = Phaser.Math.Clamp(1 - jump.ms / jump.stageMs, 0, 1);
    const center = { x: enemy.x, y: jump.to + 0.5 };
    const r = CREEPER_LOOK.markerRadius;
    const now = this.scene.time.now;
    if (jump.stage === 'air') {
      drawArea(this.groundMark, center, r * (1 - t * 0.55), color, 0.3 + 0.25 * t, 4);
      return;
    }
    const beat = 0.5 + 0.5 * Math.sin(now / 80);
    drawArea(this.groundMark, center, r * (0.88 + 0.12 * beat), color, 0.14 + 0.22 * t, 4);
    drawArea(this.groundMark, center, r * 0.42, color, 0.32 + 0.2 * beat, 3);

    const foot = WORM_LOOK.footY;
    const from = perspective.toScreen({ x: enemy.x, y: jump.from + foot });
    const to = perspective.toScreen({ x: enemy.x, y: jump.to + foot });
    const cellWidth = perspective.cellWidthAt({ x: enemy.x, y: jump.to + foot });
    const height = cellWidth * (WORM_LOOK.jump.liftCells + WORM_LOOK.jump.liftPerLane * Math.abs(jump.to - jump.from)) * 1.1;
    const dots = CREEPER_LOOK.arcDots;
    const march = (now / 420) % 1;
    for (let i = 0; i < dots; i++) {
      const u = (i + march) / dots;
      const x = from.x + (to.x - from.x) * u;
      const y = from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * height - cellWidth * 0.45;
      this.arcMark.fillStyle(0x2b2034, 0.55 * t + 0.25).fillCircle(x, y, 6.5);
      this.arcMark.fillStyle(color, 0.5 + 0.5 * t).fillCircle(x, y, 4.5);
    }
    if (this.alert) {
      // De pie sobre la diana y dando saltitos: si se pusiera mas alto, con el carril de destino justo delante
      // quedaria encima del cuerpo del Creeper.
      const ground = perspective.toScreen(center);
      this.alert.setPosition(ground.x, ground.y + cellWidth * 0.06 - Math.abs(Math.sin(now / 140)) * 9);
    }
  }

  private dropAlert(): void {
    const alert = this.alert;
    this.alert = null;
    if (!alert) return;
    this.scene.tweens.add({ targets: alert, scale: 0, alpha: 0, duration: 180, onComplete: () => alert.destroy() });
  }

  /** Se va de la pantalla: limpia sus marcas, su "!" y su luz; el bocadillo acaba solo (o se cierra si `quiet`). */
  private leave(quiet = true): void {
    this.gone = true;
    this.groundMark.destroy();
    this.arcMark.destroy();
    this.dropAlert();
    if (quiet) this.bubble?.close();
    if (this.led) {
      const led = this.led;
      this.scene.tweens.killTweensOf(led);
      this.scene.tweens.add({ targets: led, alpha: 0, duration: 200, onComplete: () => led.destroy() });
    }
  }
}

/**
 * Creeper preparandose (T-008): en las rondas 8 y 9, y en la preparacion de la 10, espera enroscado sobre el suelo
 * corrupto, a la derecha. Respira, suelta pixeles y en su pantalla se llena una barra de "CARGANDO". Cada gusano
 * acelerado que sale recibe un chispazo suyo. Al empezar el combate salta al agujero de su carril.
 */
export class CreeperOmen {
  /** Posicion y tamano (entrada, salto); dentro, `body` respira. */
  private readonly holder: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image | null = null;
  private readonly scale: number;
  private readonly ground: { x: number; y: number };
  private readonly cellWidth: number;
  private progress = 0;
  private ambient?: Phaser.Time.TimerEvent;
  private bubble: SpeechBubble | null = null;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    progress: number,
    appear: boolean,
  ) {
    this.progress = progress;
    this.ground = perspective.toScreen(OMEN_SPOT);
    this.cellWidth = perspective.cellWidthAt(OMEN_SPOT);
    this.scale = (this.cellWidth / WORM_LOOK.unitsPerCell) * CREEPER_SIZE;
    const depth = entityDepth(this.ground.y);

    this.shadow = scene.add
      .image(this.ground.x, this.ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.95 * CREEPER_SIZE, this.cellWidth * 0.24 * CREEPER_SIZE)
      .setDepth(depth - 0.6);
    if (fx.quality.glows) {
      this.aura = scene.add
        .image(this.ground.x, this.ground.y - this.cellWidth * 0.5, TEX.glow)
        .setDisplaySize(this.cellWidth * 2.6, this.cellWidth * 2.6)
        .setTint(0x39ff88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.18)
        .setDepth(depth - 0.4);
      scene.tweens.add({ targets: this.aura, alpha: 0.42, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    // Enroscado: la cola se recoge hacia la cabeza.
    const segments = WORM_LOOK.segments.map((s, i) =>
      scene.add.image(s.x * 0.8, s.y + (i === 0 ? 6 : 0), TEX.creeperSegment).setScale(s.scale * artInv()),
    );
    const { head } = WORM_SIZE;
    this.head = scene.add
      .image(0, 0, TEX.creeperHeadLoading)
      .setOrigin(head.cx / head.width, head.cy / head.height)
      .setScale(artInv());
    const bar = CREEPER_SCREEN.bar;
    this.fill = scene.add.rectangle(bar.x - head.cx, bar.y - head.cy, bar.width, bar.height, 0x39ff88).setOrigin(0, 0);
    this.face = scene.add.container(WORM_LOOK.head.x + 6, WORM_LOOK.head.y + 4, [this.head, this.fill]);
    this.body = scene.add.container(0, 0, [...segments, this.face]);
    this.holder = scene.add.container(this.ground.x, this.ground.y, [this.body]).setDepth(depth).setScale(this.scale);

    // Respira y la cabeza cabecea, concentrado.
    scene.tweens.add({ targets: this.body, scaleY: 1.035, scaleX: 0.985, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: this.face, y: this.face.y - 5, angle: -4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.ambient = scene.time.addEvent({
      delay: fx.ambientDelay(650),
      loop: true,
      callback: () => {
        const top = this.facePoint(0, -40);
        this.fx.bits(top.x, top.y, 1);
      },
    });
    this.applyFill();

    if (appear) {
      this.holder.setScale(this.scale * 0.2).setAlpha(0);
      scene.tweens.add({ targets: this.holder, scaleX: this.scale, scaleY: this.scale, alpha: 1, duration: 520, ease: 'Back.Out' });
      fx.dirt(this.ground.x, this.ground.y, 12);
      fx.bits(this.ground.x, this.ground.y - this.cellWidth * 0.3, 14);
      fx.glow(this.ground.x, this.ground.y - this.cellWidth * 0.3, this.cellWidth * 2, 0x39ff88, depth + 1, 600);
      scene.time.delayedCall(600, () => this.say(text().creeper.preparing, 3400));
    }
  }

  /** Lo que lleva cargado (0 a 1): la barra lo alcanza poco a poco. */
  setProgress(progress: number): void {
    if (this.done) return;
    this.progress += (progress - this.progress) * 0.06;
    this.applyFill();
    if (this.bubble?.alive) {
      const top = this.facePoint(10, -58);
      this.bubble.follow(top.x, top.y);
    }
  }

  /** Acelera a un gusano que sale (rondas 8 y 9): un chispazo de pixeles vuela de su cabeza al agujero del carril. */
  zap(lane: number): void {
    if (this.done) return;
    const from = this.facePoint(-20, -30);
    const hole = { x: SCENERY.holeX, y: lane + 0.6 };
    const to = perspective.toScreen(hole);
    const width = perspective.cellWidthAt(hole);
    const lift = Math.max(60, Math.abs(to.y - from.y) * 0.5 + 40);
    this.head.setTint(0xeafff3).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => this.head.active && this.head.clearTint());
    for (let i = 0; i < 5; i++) {
      const spark = this.scene.add
        .image(from.x, from.y, TEX.pixel)
        .setTint(i % 2 ? 0x39ff88 : 0xb48cff)
        .setScale(2.4 * artInv())
        .setDepth(DEPTH.pollen - 2);
      if (this.fx.quality.glows) spark.setBlendMode(Phaser.BlendModes.ADD);
      const path = { t: 0 };
      this.scene.tweens.add({
        targets: path,
        t: 1,
        delay: i * 45,
        duration: 340,
        ease: 'Quad.In',
        onUpdate: () => {
          const u = path.t;
          spark.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * lift);
        },
        onComplete: () => {
          spark.destroy();
          if (i === 4) {
            this.fx.glow(to.x, to.y, width * 1.1, 0x39ff88, DEPTH.highlight + 1, 360);
            this.fx.bits(to.x, to.y - width * 0.15, 4);
          }
        },
      });
    }
  }

  /**
   * Manda a su escolta (T-009): se yergue de golpe, suelta pixeles y grita `text`. Los acorazados salen acelerados, asi
   * que cada uno recibe ademas su chispazo (`zap`) como cualquier enemigo acelerado.
   */
  command(text: string): void {
    if (this.done) return;
    this.say(text, 2600);
    this.scene.tweens.add({ targets: this.holder, scaleY: this.scale * 1.14, scaleX: this.scale * 0.92, duration: 140, yoyo: true, ease: 'Quad.Out' });
    this.fx.bits(this.ground.x, this.ground.y - this.cellWidth * 0.6, 10);
  }

  /** Empieza el combate: salta en curva hasta los pies de `foot` (el agujero de su carril) y desaparece al caer. */
  leapTo(foot: BoardPoint): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    const from = { x: this.holder.x, y: this.holder.y };
    const to = perspective.toScreen(foot);
    const toScale = (perspective.cellWidthAt(foot) / WORM_LOOK.unitsPerCell) * CREEPER_SIZE;
    const path = { t: 0 };
    this.fx.dirt(from.x, from.y, 10);
    this.head.setTexture(TEX.creeperHeadBite);
    this.fill.setVisible(false);
    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration: OMEN_LEAP_MS,
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

  /** Deja de verse sin combate (la partida acabo o se reinicio): se encoge y suelta pixeles. */
  vanish(): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    this.fx.bits(this.holder.x, this.holder.y - this.cellWidth * 0.4, 10);
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

  private say(text: string, lifeMs: number): void {
    if (this.done) return;
    sfx.play('creeperTalk', panAt(OMEN_SPOT.x, BOARD.columns));
    this.bubble?.close();
    this.bubble = new SpeechBubble(this.scene, this.fx, text, 'calm', lifeMs);
    const top = this.facePoint(10, -58);
    this.bubble.follow(top.x, top.y);
  }

  private applyFill(): void {
    this.fill.setScale(Phaser.Math.Clamp(this.progress, 0, 1), 1);
  }

  /** Punto de la cara en pantalla, en pixeles de la textura de la cabeza respecto a su centro. */
  private facePoint(dx: number, dy: number): { x: number; y: number } {
    return {
      x: this.holder.x + (this.face.x + dx) * this.holder.scaleX,
      y: this.holder.y + (this.face.y + dy) * this.holder.scaleY,
    };
  }

  private stopIdle(): void {
    this.ambient?.remove();
    this.ambient = undefined;
    this.scene.tweens.killTweensOf([this.body, this.face]);
  }

  private fadeAura(): void {
    const aura = this.aura;
    if (!aura) return;
    this.scene.tweens.killTweensOf(aura);
    this.scene.tweens.add({ targets: aura, alpha: 0, duration: 300, onComplete: () => aura.destroy() });
  }
}
