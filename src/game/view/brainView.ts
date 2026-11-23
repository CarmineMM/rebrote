import * as Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { panAt } from '../audio/voices';
import { BOARD, ENEMIES } from '../config/balance';
import type { BoardPoint } from '../core/board';
import { hopGait, isEnraged, isHidden, type Enemy, type RevealCause } from '../core/combat';
import { BRAIN_DESIGN, BRAIN_RIGS, BRAIN_SIZE, SECTOR_MAP, brainLimbSize, sectorCell, sectorOrder, type BrainDesign, type BrainMood, type BrainRig, type Point } from './brainArt';
import { BossBubble, type BubbleStyle } from './bossBubble';
import { BUG_LOOK } from './bugView';
import { HIDDEN_LOOK } from './bugArt';
import { OMEN_LEAP_MS, OMEN_SPOT } from './creeperView';
import type { Effects } from './effects';
import { DEPTH, SCENERY, entityDepth, perspective } from './layout';
import { BRAIN_TEX, BUG_TEX, FLAME_SIZE, FROST_SIZE, TEX, artInv } from './textures';
import type { EnemyView } from './wormView';
import { text } from '../../i18n';

/**
 * Brain, el Cerebro (T-039), jefe del brote 3. Avanza oculto y a saltos como el Skipper, y se pinta como los bichos de su brote
 * (`BugView`): oculto, una silueta morada que tiembla con los ojos en verde neon; al descubrirse destella y recupera sus
 * colores. Aqui va lo suyo: su propuesta de aspecto (`brainArt.ts`), el aviso antes de cada salto (se agacha y aprieta los
 * muelles), el vuelo en curva y el aterrizaje, el mordisco al escudo que lo para, la fase 2 (un halo rojo que late y la cara
 * enfadada) y lo que dice en su bocadillo: burlas con el telefono que el Brain de verdad dejo en su codigo. Tambien
 * `BrainOmen`, Brain preparandose a la derecha en las rondas 6 y 7. No decide nada (ADR-0008): todo sale del estado.
 */
export const BRAIN_LOOK = {
  unitsPerCell: 160,
  /** Donde apoya dentro de su carril, como los bichos. */
  footY: 0.64,
  /** Tamano respecto a sus medidas de diseno: mas alto que un acorazado y que el Skipper, como un jefe. */
  size: 1.05,
  /** En el aire: lo que sube en el punto mas alto (en anchos de casilla) y lo que se inclina al despegar. */
  lift: 0.75,
  tilt: 10,
  /** Agachado: cuanto baja el cuerpo (pixeles de diseno) y cuanto se aplasta. */
  crouchDrop: 22,
  crouchSquash: 0.12,
  /** Lo que tiembla quieto, en reposo. */
  wobble: 1.2,
  /** Halo rojo de la fase 2 (BR-06), si hay brillos. */
  rage: 0xff3f6a,
  /** Al morder el escudo que lo para, una de cada tantas veces lo dice en su bocadillo. */
  biteLineEvery: 4,
  /** Bocadillo de contestador automatico: lila claro, letra redonda, la tinta del contorno del cerebro. */
  bubble: {
    font: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
    fontSize: 18,
    fontStyle: 'bold',
    bg: 0xf6eeff,
    bgAlpha: 0.97,
    edge: 0x6e1a44,
    text: '#2b1030',
    cursor: false,
    corner: 16,
  } satisfies BubbleStyle,
  /** Quemado y frenado: llamas y escarcha respecto al ancla del cuerpo. */
  flames: [
    { x: -20, y: -150, scale: 1.5 },
    { x: 40, y: -120, scale: 1.2 },
  ],
  frost: [
    { x: -40, y: -110, scale: 1.2, angle: 40 },
    { x: 50, y: -70, scale: 1, angle: 15 },
  ],
} as const;

interface Pulse {
  v: number;
}

interface Limb {
  readonly image: Phaser.GameObjects.Image;
  readonly mount: BrainRig['legs'][number];
}

/** Patas del lado de atras: mas oscuras, para que se lea el volumen. */
const FAR_TINT = 0x8f8aa0;

/** Las piezas de Brain en un contenedor, con su montaje: lo comparten la vista del tablero y la de cuando se prepara. */
class BrainFigure {
  readonly holder: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly face: Phaser.GameObjects.Image;
  readonly glass: Phaser.GameObjects.Image | null;
  readonly limbs: Limb[];
  readonly eyes: Phaser.GameObjects.Image[];
  readonly antenna: Phaser.GameObjects.Image | null;
  readonly rig: BrainRig;
  private faceKey: string;

  constructor(
    scene: Phaser.Scene,
    readonly design: BrainDesign,
    x: number,
    y: number,
    extras: (front: Phaser.GameObjects.GameObject[]) => void = () => {},
  ) {
    const inv = artInv();
    this.rig = BRAIN_RIGS[design];
    const { body, face } = BRAIN_SIZE;
    const limb = brainLimbSize(design);
    this.limbs = this.rig.legs.map((mount) => ({
      mount,
      image: scene.add
        .image(0, 0, BRAIN_TEX.limb(design))
        .setOrigin(limb.hipX / limb.width, limb.hipY / limb.height)
        .setScale(inv),
    }));
    for (const l of this.limbs) if (l.mount.far) l.image.setTint(FAR_TINT);
    this.body = scene.add.image(0, 0, BRAIN_TEX.body(design)).setOrigin(body.cx / body.width, body.cy / body.height).setScale(inv);
    this.faceKey = BRAIN_TEX.face(design, 'idle');
    this.face = scene.add.image(0, 0, this.faceKey).setOrigin(face.cx / face.width, face.cy / face.height).setScale(inv);
    this.glass = design === 'dome' ? scene.add.image(0, 0, BRAIN_TEX.glass(design)).setOrigin(body.cx / body.width, body.cy / body.height).setScale(inv) : null;
    this.eyes = this.rig.eyes.map((e) =>
      scene.add
        .image(0, 0, BUG_TEX.eyeGlow)
        .setScale(((e.r * 2.4) / 32) * inv)
        .setVisible(false),
    );
    this.antenna = this.rig.antenna
      ? scene.add
          .image(0, 0, BUG_TEX.eyeGlow)
          .setScale(0.9 * inv)
          .setBlendMode(Phaser.BlendModes.ADD)
      : null;
    const far = this.limbs.filter((l) => l.mount.far).map((l) => l.image);
    const near = this.limbs.filter((l) => !l.mount.far).map((l) => l.image);
    const front: Phaser.GameObjects.GameObject[] = [];
    extras(front);
    this.holder = scene.add.container(x, y, [
      ...far,
      this.body,
      this.face,
      ...(this.glass ? [this.glass] : []),
      ...near,
      ...this.eyes,
      ...(this.antenna ? [this.antenna] : []),
      ...front,
    ]);
  }

  /**
   * Pone la figura en postura (pixeles de diseno, pies en 0, 0): `crouch` (0 a 1) la agacha apretando las patas, `lift`
   * (0 a 1) la sube en el aire con las patas colgando, `lean` la echa hacia delante (morder) y `angle` la inclina.
   */
  pose(now: number, crouch: number, lift: number, stretch: number, lean: number, angle: number, phase: number): void {
    const rig = this.rig;
    const drop = crouch * BRAIN_LOOK.crouchDrop;
    const wobble = Math.sin(now / 260 + phase) * BRAIN_LOOK.wobble * (1 - lift);
    const bx = rig.body.x - lean * 14;
    const by = rig.body.y + drop - wobble - stretch * 10;
    this.body.setPosition(bx, by).setAngle(angle);
    const onBody = (p: Point): Point => {
      const a = Phaser.Math.DegToRad(angle);
      return { x: bx + p.x * Math.cos(a) - p.y * Math.sin(a), y: by + p.x * Math.sin(a) + p.y * Math.cos(a) };
    };
    const face = onBody(rig.face);
    this.face.setPosition(face.x, face.y).setAngle(angle);
    this.glass?.setPosition(bx, by).setAngle(angle);
    for (const l of this.limbs) {
      const hip = onBody(l.mount);
      // Agachado, las patas se aprietan; en el aire cuelgan algo hacia atras y se mecen; al despegar, se estiran.
      const swing = lift > 0 ? 8 * lift + Math.sin(now / 90 + l.mount.phase * 6) * 5 * lift : 0;
      const squeeze = 1 - crouch * rig.squeeze + stretch * rig.stretch;
      l.image
        .setPosition(hip.x, hip.y)
        .setAngle(l.mount.angle * (1 - lift * 0.4) + swing + angle * 0.5)
        .setScale(artInv(), artInv() * squeeze);
    }
    this.eyes.forEach((glow, i) => {
      const e = onBody(rig.eyes[i]);
      glow.setPosition(e.x, e.y).setAlpha(0.75 + 0.25 * Math.sin(now / 160 + i));
    });
    if (this.antenna && rig.antenna) {
      const a = onBody(rig.antenna);
      // La luz de la antena parpadea: dos destellos y una pausa.
      const beat = (now / 1400) % 1;
      const on = beat < 0.08 || (beat > 0.16 && beat < 0.24);
      this.antenna.setPosition(a.x, a.y).setAlpha(on ? 1 : 0.25);
    }
  }

  setFace(mood: BrainMood): void {
    const key = BRAIN_TEX.face(this.design, mood);
    if (key === this.faceKey) return;
    this.faceKey = key;
    this.face.setTexture(key);
  }

  /** Lo que se tine y destella: cuerpo, cara, cupula y patas (no los ojos de oculto ni la luz de la antena). */
  parts(): Phaser.GameObjects.Image[] {
    return [this.body, this.face, ...(this.glass ? [this.glass] : []), ...this.limbs.map((l) => l.image)];
  }

  isFar(part: Phaser.GameObjects.Image): boolean {
    return this.limbs.some((l) => l.mount.far && l.image === part);
  }

  /** Punto del cuerpo (respecto a su ancla, en pixeles de diseno) en pantalla. */
  point(p: Point): { x: number; y: number } {
    const k = this.holder.scaleX;
    const ky = this.holder.scaleY;
    return { x: this.holder.x + (this.body.x + p.x) * k, y: this.holder.y + (this.body.y + p.y) * ky };
  }
}

/**
 * Brain en el tablero (T-039). Sigue al enemigo del estado en `sync`: el salto (`Enemy.hop`, con su paso de `hopGait`), lo
 * oculto (`isHidden`) y la fase 2 (`isEnraged`). Anima lo que la escena le cuenta: el mordisco, los golpes, descubrirse y
 * ocultarse, la derrota y la huida.
 */
export class BrainView implements EnemyView {
  private readonly figure: BrainFigure;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly flames: Phaser.GameObjects.Image[];
  private readonly frost: Phaser.GameObjects.Image[];
  private readonly rageGlow: Phaser.GameObjects.Image | null = null;
  private readonly phase = Math.random() * Math.PI * 2;
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
  private readonly thud: Pulse = { v: 0 };
  private readonly glitch: Pulse = { v: 0 };
  private shoveDx = 0;
  private flashTimer?: Phaser.Time.TimerEvent;
  private glitchTimer?: Phaser.Time.TimerEvent;
  private burning = false;
  private chilled = false;
  private veiled: boolean | null = null;
  private enraged: boolean | null = null;
  private airborne = false;
  private synced = false;
  private bites = 0;
  private conceals = 0;
  private blasts = 0;
  private bubble: BossBubble | null = null;
  private gone = false;
  /** Si sus frases suenan (en la galeria, si; en la portada del menu no lo saca nadie). */
  voiced = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
    emergeDelayMs = 0,
    /** Otra propuesta que la del juego: la galeria `/proposals/jefes.html` compara asi las tres (BR-01). */
    design: BrainDesign = BRAIN_DESIGN,
  ) {
    this.footY = enemy.lane + BRAIN_LOOK.footY;
    this.boardX = enemy.x;
    const ground = perspective.toScreen({ x: enemy.x, y: this.footY });
    this.cellWidth = perspective.cellWidthAt({ x: enemy.x, y: this.footY });
    this.scale = (this.cellWidth / BRAIN_LOOK.unitsPerCell) * BRAIN_LOOK.size;
    const depth = entityDepth(ground.y);
    const inv = artInv();
    this.shadow = scene.add
      .image(ground.x, ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 1.25, this.cellWidth * 0.3)
      .setDepth(depth - 0.5);
    if (fx.quality.glows) {
      this.rageGlow = scene.add.image(ground.x, ground.y, TEX.glow).setTint(BRAIN_LOOK.rage).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false);
    }
    this.flames = BRAIN_LOOK.flames.map(() =>
      scene.add
        .image(0, 0, TEX.flame)
        .setOrigin(0.5, FLAME_SIZE.footY / FLAME_SIZE.height)
        .setVisible(false),
    );
    this.frost = BRAIN_LOOK.frost.map((f) =>
      scene.add
        .image(0, 0, TEX.frost)
        .setOrigin(0.5, FROST_SIZE.footY / FROST_SIZE.height)
        .setAngle(f.angle)
        .setScale(f.scale * inv)
        .setVisible(false),
    );
    this.figure = new BrainFigure(scene, design, ground.x, ground.y, (front) => front.push(...this.frost, ...this.flames));
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
    if (emerge) scene.time.delayedCall(emergeDelayMs + 650, () => this.say(text().brain.entrance, 3400));
    this.sync(enemy);
  }

  /**
   * Coloca y pone en postura a Brain segun el estado, en cada fotograma. `stride`, para pintarlo saltando sin moverse de su
   * sitio (la galeria): lo devuelve a su sitio mientras salta (se pinta en `x + stride`). En el tablero, 0.
   */
  sync(enemy: Enemy, stride = 0): void {
    const now = this.scene.time.now;
    const holder = this.figure.holder;
    this.boardX = enemy.x;
    const foot = { x: enemy.x + stride + this.shoveDx * this.shove.v, y: this.footY };
    const ground = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.scale = (this.cellWidth / BRAIN_LOOK.unitsPerCell) * BRAIN_LOOK.size;
    holder.setDepth(entityDepth(ground.y));
    this.shadow.setDepth(entityDepth(ground.y) - 0.5);
    this.setVeiled(isHidden(enemy));
    this.setEnraged(isEnraged(enemy));

    const gait = hopGait(enemy);
    const hop = enemy.hop;
    const attacking = enemy.attackMs !== null;
    const inAir = hop?.stage === 'air';
    let crouch = 0;
    let lift = 0;
    let stretch = 0;
    let tilt = 0;
    if (hop && hop.stage === 'rest' && !attacking) {
      crouch = hop.ms < gait.crouchMs ? 1 - hop.ms / gait.crouchMs : 0;
      crouch = crouch * crouch * (3 - 2 * crouch);
    } else if (hop && inAir) {
      const span = Math.max(1e-3, hop.from - hop.to);
      const t = Phaser.Math.Clamp((hop.from - enemy.x) / span, 0, 1);
      lift = Math.sin(t * Math.PI) * Math.min(1, span / gait.length + 0.25);
      tilt = 1 - t * 2;
      stretch = Math.max(0, 1 - t * 2.5);
    }
    if (this.airborne && !inAir && this.synced) this.landed();
    this.airborne = inAir;

    const windup = attacking ? Phaser.Math.Clamp(1 - (enemy.attackMs ?? 0) / ENEMIES.brain.firstBiteMs, 0, 1) : 0;
    const lean = windup * windup + this.lunge.v * 0.8;
    const rise = this.rise.v;
    const hurt = this.hurt.v;
    const grow = this.scale * (0.3 + 0.7 * rise);
    const bumpUp = Math.sin(this.bump.v * Math.PI) * 26 * this.scale;
    const shiver = Math.sin(this.shiver.v * Math.PI * 9) * 3.5 * this.shiver.v;
    const veil = this.veiled ? 1 : 0;
    const tremble =
      veil * (Math.sin(now / 23 + this.phase) * BUG_LOOK.hidden.tremble + this.glitch.v * Math.sin(now / 9) * BUG_LOOK.hidden.glitchShift);
    const squash = crouch * BRAIN_LOOK.crouchSquash + this.thud.v * 0.18 - lift * 0.05;
    const air = lift * this.cellWidth * BRAIN_LOOK.lift;
    holder
      .setPosition(ground.x + (this.kick.v * 10 + shiver + tremble) * this.scale, ground.y + (1 - rise) * 20 * this.scale - bumpUp - air)
      .setScale(grow * (1 + hurt * 0.08 + squash * 0.5), grow * (1 - hurt * 0.08 - squash))
      .setAlpha(this.veiled ? this.veilAlpha() * (1 - this.glitch.v * 0.35) : 1);
    this.shadow
      .setPosition(ground.x, ground.y)
      .setDisplaySize(this.cellWidth * 1.25 * (1 - lift * 0.4), this.cellWidth * 0.3 * (1 - lift * 0.4))
      .setAlpha(Math.min(1, rise) * (1 - lift * 0.5) * (this.veiled ? 0.7 : 1));
    this.figure.pose(now, crouch, lift, stretch, lean, -tilt * BRAIN_LOOK.tilt * lift + crouch * 3, this.phase);

    const mood: BrainMood =
      hurt > 0.25
        ? 'hurt'
        : windup > 0.35 || this.lunge.v > 0.4
          ? 'bite'
          : lift > 0.05
            ? 'air'
            : crouch > 0.2
              ? 'ready'
              : this.bubble?.alive
                ? 'smug'
                : this.enraged
                  ? 'angry'
                  : 'idle';
    this.figure.setFace(mood);

    this.setBurning(enemy.burn !== null);
    this.setChilled(enemy.slow !== null);
    BRAIN_LOOK.flames.forEach((f, i) => this.flames[i].setPosition(this.figure.body.x + f.x, this.figure.body.y + f.y + 60));
    BRAIN_LOOK.frost.forEach((f, i) => this.frost[i].setPosition(this.figure.body.x + f.x, this.figure.body.y + f.y + 60));
    if (this.rageGlow) {
      const beat = 0.5 + 0.5 * Math.sin(now / 140);
      const size = this.cellWidth * (1.9 + 0.3 * beat);
      this.rageGlow
        .setVisible(!!this.enraged && !this.veiled && !this.gone)
        .setPosition(holder.x, holder.y - this.cellWidth * 0.8)
        .setDisplaySize(size, size * 1.2)
        .setAlpha(0.22 + 0.2 * beat)
        .setDepth(holder.depth - 0.4);
    }
    const top = this.figure.point(this.figure.rig.bubble);
    if (this.bubble?.alive) this.bubble.follow(top.x, top.y);
    this.synced = true;
  }

  /** Muerde el escudo que lo para: la boca se lanza y, de vez en cuando, se burla en su bocadillo. */
  chomp(): void {
    this.pulse(this.lunge, 320);
    const mouth = this.figure.point(this.figure.rig.mouth);
    this.fx.scrap(mouth.x, mouth.y, 2);
    if (this.bites++ % BRAIN_LOOK.biteLineEvery === 1) this.sayFrom(text().brain.bite, this.bites, 1900);
  }

  /** No escupe ni recita. */
  spat(): void {}

  inhale(): void {}

  sang(): void {}

  /** Despega: un empujon de tierra y los muelles se sueltan. Lo demas sale del estado. */
  hopped(): void {
    const { x, y } = this.ground();
    this.fx.dirt(x, y, 7);
  }

  /** Cae: se aplasta, levanta tierra y tiembla el suelo un poco (lo hace la escena). */
  landed(): void {
    this.pulse(this.thud, 320);
    const { x, y } = this.ground();
    this.fx.dirt(x, y, 8);
  }

  /**
   * Se descubre (T-039): el destello ya lo hace `sync` al dejar de estar oculto; aqui, lo que dice. Si lo descubre una mina o
   * la granada, se queja; si es el escudo que lo para, se burla al morderlo (`chomp`).
   */
  revealed(cause: RevealCause | undefined): void {
    if (cause === 'blast') this.sayFrom(text().brain.blasted, this.blasts++, 2000);
  }

  /** Vuelve a ocultarse: se burla de que ya no lo ven. */
  concealed(): void {
    if (this.conceals++ % 2 === 0) this.sayFrom(text().brain.concealed, this.conceals, 2000);
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
    this.flash(BUG_LOOK.frozenTint, 160);
    const { x, y } = this.figure.point({ x: 0, y: -60 });
    this.fx.frost(x, y, 6);
  }

  shoved(fromX: number, toX: number): void {
    this.shoveDx = fromX - toX;
    this.scene.tweens.killTweensOf(this.shove);
    this.shove.v = 1;
    this.scene.tweens.add({ targets: this.shove, v: 0, duration: 300, ease: 'Cubic.Out' });
    this.frosted();
  }

  /** Derrotado: destella en blanco, se le escapan los sectores (pixeles) y se deshace en un anillo rosa y verde. */
  die(): void {
    this.stop();
    const holder = this.figure.holder;
    const parts = this.figure.parts();
    parts.forEach((part) => part.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL));
    for (const glow of this.figure.eyes) glow.setVisible(false);
    this.figure.setFace('hurt');
    const { x, y } = this.figure.point({ x: 0, y: -60 });
    const depth = holder.depth + 0.5;
    this.fx.bits(x, y, 36);
    this.fx.sparkles(x, y, 14);
    this.fx.scrap(x, y, 8);
    this.fx.ring(x, y, this.cellWidth * 2.4, 0xff8fbf, depth, 560);
    this.fx.ring(x, y, this.cellWidth * 1.6, 0x39ff88, depth, 440);
    this.fx.glow(x, y, this.cellWidth * 2.8, 0xff8fbf, depth, 640);
    this.scene.tweens.add({
      targets: holder,
      scaleX: holder.scaleX * 1.25,
      scaleY: holder.scaleY * 1.25,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => {
        parts.forEach((part) => part.clearTint());
        this.scene.tweens.add({
          targets: holder,
          scaleX: 0,
          scaleY: 0,
          angle: -30,
          alpha: 0,
          duration: 320,
          ease: 'Back.In',
          onComplete: () => holder.destroy(),
        });
      },
    });
    this.fadeShadow(420);
  }

  /** Cruzo el borde izquierdo: se despide en su bocadillo y se cuela de un ultimo salto fuera del jardin. */
  escape(): void {
    this.say(text().brain.escape, 2600);
    this.stop(false);
    const holder = this.figure.holder;
    const dx = -this.cellWidth * 1.2;
    this.fx.dirt(holder.x, holder.y, 8);
    this.scene.tweens.add({ targets: holder, x: holder.x + dx, y: holder.y - this.cellWidth * 0.5, alpha: 0, duration: 650, ease: 'Quad.Out', onComplete: () => holder.destroy() });
    this.scene.tweens.add({ targets: this.shadow, x: this.shadow.x + dx, duration: 650 });
    this.fadeShadow(650);
  }

  /** Derrota del jugador (si sigue en pantalla): bota de contento en su sitio y se burla. */
  cheer(): void {
    this.stop(false);
    this.say(text().brain.cheer, 2600);
    this.figure.setFace('smug');
    this.scene.tweens.add({ targets: this.figure.holder, y: this.figure.holder.y - this.cellWidth * 0.2, duration: 280, yoyo: true, repeat: -1, ease: 'Sine.Out' });
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

  /** Dice una frase cualquiera en su bocadillo (la galeria `/proposals/jefes.html`). */
  taunt(line: string): void {
    this.say(line, 2400);
  }

  /** Dice una de `lines` (la `index`, dando la vuelta). */
  private sayFrom(lines: readonly string[], index: number, lifeMs: number): void {
    if (lines.length) this.say(lines[index % lines.length], lifeMs);
  }

  /** Dice una frase en su bocadillo de contestador, con su voz (T-014). Oculto no habla: no se le ve la boca. */
  private say(line: string, lifeMs: number): void {
    if (this.gone) return;
    if (this.voiced) sfx.play('brainTalk', panAt(this.boardX, BOARD.columns));
    this.bubble?.close();
    this.bubble = new BossBubble(this.scene, this.fx, line, BRAIN_LOOK.bubble, lifeMs);
    const top = this.figure.point(this.figure.rig.bubble);
    this.bubble.follow(top.x, top.y);
  }

  private setVeiled(veiled: boolean): void {
    if (veiled === this.veiled) return;
    const first = this.veiled === null;
    this.veiled = veiled;
    for (const glow of this.figure.eyes) glow.setVisible(veiled);
    this.glitchTimer?.remove();
    this.glitchTimer = undefined;
    if (veiled) {
      this.glitchTimer = this.scene.time.addEvent({
        delay: BUG_LOOK.hidden.glitchMs,
        startAt: Math.random() * BUG_LOOK.hidden.glitchMs,
        loop: true,
        callback: () => this.flicker(),
      });
    }
    if (first) {
      this.applyRestingTint();
      return;
    }
    const { x, y } = this.figure.point({ x: 0, y: -60 });
    if (!veiled) {
      this.flash(BUG_LOOK.hidden.revealColor, BUG_LOOK.hidden.revealFlashMs);
      this.fx.glow(x, y, this.cellWidth * 1.8, BUG_LOOK.hidden.revealColor, this.figure.holder.depth + 0.4, 420);
      this.fx.ring(x, y, this.cellWidth * 1.4, BUG_LOOK.hidden.revealColor, this.figure.holder.depth + 0.4, 320);
      this.fx.bits(x, y, 12);
    } else {
      this.pulse(this.glitch, 360);
      this.fx.bits(x, y, 8);
      if (!this.flashTimer) this.applyRestingTint();
    }
  }

  /** Fase 2 (BR-06): al entrar, un anillo rojo y se le enciende el halo (lo pinta `sync`). */
  private setEnraged(enraged: boolean): void {
    if (enraged === this.enraged) return;
    const first = this.enraged === null;
    this.enraged = enraged;
    if (first || !enraged) return;
    const { x, y } = this.figure.point({ x: 0, y: -60 });
    this.fx.ring(x, y, this.cellWidth * 2, BRAIN_LOOK.rage, this.figure.holder.depth + 0.5, 460);
    this.say(text().brain.enraged, 2400);
  }

  private veilAlpha(): number {
    return this.scene.game.renderer.type === Phaser.WEBGL ? HIDDEN_LOOK.alpha : BUG_LOOK.hidden.canvasAlpha;
  }

  private flicker(): void {
    if (!this.figure.holder.active || !this.veiled || this.hurt.v > 0.5) return;
    this.pulse(this.glitch, 200);
    if (this.fx.quality.extras) {
      const { x, y } = this.figure.point({ x: 0, y: -60 });
      this.fx.bits(x, y, 3);
    }
  }

  private setBurning(burning: boolean): void {
    if (burning === this.burning) return;
    this.burning = burning;
    this.scene.tweens.killTweensOf(this.flames);
    if (burning) {
      this.flames.forEach((flame, i) => {
        const base = BRAIN_LOOK.flames[i].scale * artInv();
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
        const base = BRAIN_LOOK.frost[i].scale * artInv();
        crystal.setVisible(true).setAlpha(1).setScale(base * 0.2);
        this.scene.tweens.add({ targets: crystal, scaleX: base, scaleY: base, duration: 260, delay: i * 70, ease: 'Back.Out' });
      });
    } else {
      this.scene.tweens.add({ targets: this.frost, scaleX: 0, scaleY: 0, alpha: 0, duration: 260, onComplete: () => this.frost.forEach((c) => c.setVisible(false)) });
    }
    if (!this.flashTimer) this.applyRestingTint();
  }

  /** Tinte de reposo: la silueta del oculto (como los Lurker), azul frio si va lento, anaranjado si arde. */
  private applyRestingTint(): void {
    for (const part of this.figure.parts()) {
      if (this.veiled) part.setTint(HIDDEN_LOOK.fill).setTintMode(Phaser.TintModes.FILL);
      else if (this.chilled) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(BUG_LOOK.chillTint);
      else if (this.burning) part.setTintMode(Phaser.TintModes.ADD).setTint(BUG_LOOK.burnTint);
      else if (this.figure.isFar(part)) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(FAR_TINT);
      else part.clearTint();
    }
    this.figure.antenna?.setVisible(!this.veiled);
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
    this.scene.tweens.add({ targets: this.rise, v: 1, duration: 620, ease: 'Back.Out' });
    this.fx.dirt(ground.x, ground.y, 14);
    this.fx.bits(ground.x, ground.y - this.cellWidth * 0.2, 14);
    this.fx.glow(ground.x, ground.y, this.cellWidth * 1.6, 0x39ff88, this.figure.holder.depth - 0.4, 480);
  }

  /** Deja de reaccionar y de verse el halo. `quiet` cierra el bocadillo (al caer); al escaparse o al ganar, lo deja hablar. */
  private stop(quiet = true): void {
    this.gone = true;
    this.flashTimer?.remove();
    this.glitchTimer?.remove();
    this.scene.tweens.killTweensOf([this.rise, this.lunge, this.hurt, this.kick, this.bump, this.shiver, this.thud, this.glitch]);
    if (quiet) this.bubble?.close();
    const glow = this.rageGlow;
    if (glow) this.scene.tweens.add({ targets: glow, alpha: 0, duration: 200, onComplete: () => glow.destroy() });
  }

  private fadeShadow(durationMs: number): void {
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: durationMs, onComplete: () => this.shadow.destroy() });
  }
}

/**
 * Brain preparandose (T-039): en las rondas 6 y 7, y en la preparacion de la 8, espera a la derecha sobre el suelo corrupto
 * junto a un mapa de sectores en el que va marcando sectores como defectuosos, rojos y tachados (`bossLoadProgress`), como el
 * Brain real para esconderse en ellos. Bota en su sitio y, cada poco, se oculta un instante (la silueta morada). A cada
 * tropa acelerada le manda un chispazo verde. Al empezar el combate salta al agujero de su carril. Mismo papel que
 * `CreeperOmen` y `ElkClonerOmen`.
 */
export class BrainOmen {
  private readonly figure: BrainFigure;
  private readonly map: Phaser.GameObjects.Container;
  private readonly marks: Phaser.GameObjects.Image[];
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image | null = null;
  private readonly scale: number;
  private readonly ground: { x: number; y: number };
  private readonly cellWidth: number;
  /** Donde va el mapa de sectores respecto a sus pies (pixeles de diseno) y su escala. */
  private readonly mapAt = { x: -150, y: -96, scale: 0.9 } as const;
  private progress = 0;
  private marked = -1;
  private readonly hop: Pulse = { v: 0 };
  private hideTimer?: Phaser.Time.TimerEvent;
  private hidden = false;
  private bubble: BossBubble | null = null;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    progress: number,
    appear: boolean,
    design: BrainDesign = BRAIN_DESIGN,
  ) {
    this.progress = progress;
    this.ground = perspective.toScreen(OMEN_SPOT);
    this.cellWidth = perspective.cellWidthAt(OMEN_SPOT);
    this.scale = (this.cellWidth / BRAIN_LOOK.unitsPerCell) * BRAIN_LOOK.size;
    const depth = entityDepth(this.ground.y);
    const inv = artInv();
    this.shadow = scene.add
      .image(this.ground.x, this.ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 1.2, this.cellWidth * 0.28)
      .setDepth(depth - 0.6);
    if (fx.quality.glows) {
      this.aura = scene.add
        .image(this.ground.x, this.ground.y - this.cellWidth * 1, TEX.glow)
        .setDisplaySize(this.cellWidth * 2.6, this.cellWidth * 3)
        .setTint(0x39ff88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12)
        .setDepth(depth - 0.4);
      scene.tweens.add({ targets: this.aura, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const total = SECTOR_MAP.cols * SECTOR_MAP.rows;
    const panel = scene.add.image(0, 0, BRAIN_TEX.sectorMap).setOrigin(0, 0).setScale(inv);
    this.marks = sectorOrder()
      .slice(0, total)
      .map((index) => {
        const at = sectorCell(index);
        return scene.add.image(at.x, at.y, BRAIN_TEX.badSector).setOrigin(0, 0).setScale(inv).setVisible(false);
      });
    this.map = scene.add.container(this.mapAt.x - (SECTOR_MAP.width * this.mapAt.scale) / 2, this.mapAt.y - SECTOR_MAP.height * this.mapAt.scale, [panel, ...this.marks]).setScale(this.mapAt.scale);
    this.figure = new BrainFigure(scene, design, this.ground.x, this.ground.y, (front) => front.push(this.map));
    this.figure.holder.setDepth(depth).setScale(this.scale);
    this.figure.setFace('smug');
    this.applyMarks(true);

    // Bota en su sitio y, cada poco, se oculta un instante: lo que hara en el combate.
    this.hideTimer = scene.time.addEvent({ delay: fx.ambientDelay(2600), loop: true, callback: () => this.blink() });
    if (appear) {
      this.figure.holder.setScale(this.scale * 0.2).setAlpha(0);
      scene.tweens.add({ targets: this.figure.holder, scaleX: this.scale, scaleY: this.scale, alpha: 1, duration: 520, ease: 'Back.Out' });
      fx.dirt(this.ground.x, this.ground.y, 12);
      fx.bits(this.ground.x, this.ground.y - this.cellWidth * 0.6, 14);
      fx.glow(this.ground.x, this.ground.y - this.cellWidth * 0.8, this.cellWidth * 2, 0x39ff88, depth + 1, 600);
      scene.time.delayedCall(600, () => this.say(text().brain.preparing, 3600));
    }
  }

  /** Lo que lleva marcado (0 a 1): los sectores rojos lo alcanzan poco a poco. Mientras, bota y respira. */
  setProgress(progress: number): void {
    if (this.done) return;
    this.progress += (progress - this.progress) * 0.06;
    this.applyMarks(false);
    const now = this.scene.time.now;
    const bounce = Math.max(0, Math.sin(now / 420));
    this.figure.pose(now, Math.max(0, -Math.sin(now / 420)) * 0.5, bounce * 0.12 + this.hop.v * 0.5, 0, 0, 0, 0);
    this.figure.holder.setY(this.ground.y - (bounce * 0.12 + this.hop.v * 0.5) * this.cellWidth * 0.4);
    if (this.bubble?.alive) {
      const top = this.figure.point(this.figure.rig.bubble);
      this.bubble.follow(top.x, top.y);
    }
  }

  /** Acelera a una tropa que sale (rondas 6 y 7): un chispazo verde vuela de su mapa al agujero del carril. */
  zap(lane: number): void {
    if (this.done) return;
    const from = this.figure.point({ x: this.mapAt.x + 60, y: this.mapAt.y - 40 });
    const hole = { x: SCENERY.holeX, y: lane + 0.6 };
    const to = perspective.toScreen(hole);
    const width = perspective.cellWidthAt(hole);
    const lift = Math.max(60, Math.abs(to.y - from.y) * 0.5 + 40);
    const spark = this.scene.add
      .image(from.x, from.y, BUG_TEX.eyeGlow)
      .setScale(1.4 * artInv())
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.pollen - 2);
    const path = { t: 0 };
    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration: 420,
      ease: 'Quad.In',
      onUpdate: () => {
        const u = path.t;
        spark.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * lift);
        if (this.fx.quality.extras && Math.random() < 0.3) this.fx.bits(spark.x, spark.y, 1);
      },
      onComplete: () => {
        spark.destroy();
        this.fx.glow(to.x, to.y, width * 1.1, 0x39ff88, DEPTH.highlight + 1, 360);
        this.fx.bits(to.x, to.y - width * 0.15, 4);
      },
    });
  }

  /** Manda a su escolta: bota de golpe y lo dice. */
  command(line: string): void {
    if (this.done) return;
    this.say(line, 2800);
    this.pulse(this.hop, 360);
    this.fx.bits(this.ground.x, this.ground.y - this.cellWidth * 1.2, 8);
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
    const toScale = (perspective.cellWidthAt(foot) / BRAIN_LOOK.unitsPerCell) * BRAIN_LOOK.size;
    const path = { t: 0 };
    this.fx.dirt(from.x, from.y, 10);
    this.figure.setFace('air');
    this.scene.tweens.add({ targets: this.map, alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration: OMEN_LEAP_MS,
      ease: 'Sine.InOut',
      onUpdate: () => {
        const u = path.t;
        const k = this.scale + (toScale - this.scale) * u;
        holder
          .setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * this.cellWidth * 1.4)
          .setScale(k)
          .setDepth(entityDepth(from.y + (to.y - from.y) * u));
        this.shadow.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u).setAlpha(1 - Math.sin(u * Math.PI) * 0.6);
      },
      onComplete: () => {
        this.fx.dirt(to.x, to.y, 14);
        holder.destroy();
        this.shadow.destroy();
      },
    });
    this.fadeAura();
  }

  /** Deja de verse sin combate (la partida acabo o se reinicio): se oculta y se desvanece. */
  vanish(): void {
    if (this.done) return;
    this.done = true;
    this.stopIdle();
    this.bubble?.close();
    const holder = this.figure.holder;
    this.fx.bits(holder.x, holder.y - this.cellWidth * 0.8, 10);
    this.scene.tweens.add({ targets: holder, scaleX: 0, scaleY: 0, alpha: 0, duration: 300, ease: 'Back.In', onComplete: () => holder.destroy() });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 300, onComplete: () => this.shadow.destroy() });
    this.fadeAura();
  }

  private say(line: string, lifeMs: number): void {
    if (this.done) return;
    sfx.play('brainTalk', panAt(OMEN_SPOT.x, BOARD.columns));
    this.bubble?.close();
    this.bubble = new BossBubble(this.scene, this.fx, line, BRAIN_LOOK.bubble, lifeMs);
    const top = this.figure.point(this.figure.rig.bubble);
    this.bubble.follow(top.x, top.y);
  }

  /** Marca los sectores hasta lo que lleva; al marcar uno nuevo, un destello. `force` los repasa todos. */
  private applyMarks(force: boolean): void {
    const shown = Math.round(Phaser.Math.Clamp(this.progress, 0, 1) * this.marks.length);
    if (!force && shown === this.marked) return;
    const before = this.marked;
    this.marked = shown;
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

  /** Se oculta un instante, como hara en el combate: silueta morada y ojos verdes, y vuelve. */
  private blink(): void {
    if (this.done || this.hidden) return;
    this.hidden = true;
    const parts = this.figure.parts();
    parts.forEach((part) => part.setTint(HIDDEN_LOOK.fill).setTintMode(Phaser.TintModes.FILL));
    for (const glow of this.figure.eyes) glow.setVisible(true);
    this.figure.holder.setAlpha(HIDDEN_LOOK.alpha);
    this.fx.bits(this.figure.holder.x, this.figure.holder.y - this.cellWidth * 0.7, 4);
    this.scene.time.delayedCall(900, () => {
      this.hidden = false;
      if (this.done || !this.figure.holder.active) return;
      parts.forEach((part) => (this.figure.isFar(part) ? part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(FAR_TINT) : part.clearTint()));
      for (const glow of this.figure.eyes) glow.setVisible(false);
      this.figure.holder.setAlpha(1);
      this.fx.glow(this.figure.holder.x, this.figure.holder.y - this.cellWidth * 0.7, this.cellWidth * 1.2, 0x39ff88, this.figure.holder.depth + 0.4, 300);
    });
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private stopIdle(): void {
    this.hideTimer?.remove();
    this.hideTimer = undefined;
  }

  private fadeAura(): void {
    const aura = this.aura;
    if (!aura) return;
    this.scene.tweens.killTweensOf(aura);
    this.scene.tweens.add({ targets: aura, alpha: 0, duration: 300, onComplete: () => aura.destroy() });
  }
}
