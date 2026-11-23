import * as Phaser from 'phaser';
import { ENEMIES, HOP } from '../config/balance';
import { hpFraction, isHidden, type Enemy, type EnemyKind } from '../core/combat';
import {
  BUG_SIZE,
  HIDDEN_LOOK,
  LURKER_DESIGN,
  LURKER_RIGS,
  SKIPPER_DESIGN,
  SKIPPER_RIGS,
  hopLegAngles,
  type LegMount,
  type LurkerDesign,
  type LurkerRig,
  type LurkerVariant,
  type Point,
  type SkipperDesign,
  type SkipperRig,
} from './bugArt';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { BUG_TEX, FLAME_SIZE, FROST_SIZE, TEX, artInv, medalTexture, variantTexture } from './textures';
import type { TroopTint } from './troopTint';
import { WormAura } from './wormAura';
import { auraTier } from './wormAuraArt';
import type { EnemyView } from './wormView';

/** Las tropas del brote 3 (T-038): bichos, no gusanos. Las pinta `BugView`. */
export const BUG_KINDS = ['lurker', 'lurkerSpitter', 'lurkerArmored', 'skipper'] as const;
export type BugKind = (typeof BUG_KINDS)[number];
export type LurkerKind = Exclude<BugKind, 'skipper'>;

export function isBugKind(kind: EnemyKind): kind is BugKind {
  return (BUG_KINDS as readonly EnemyKind[]).includes(kind);
}

/** Que Lurker es cada tropa oculta: la base, la que escupe o la acorazada. */
export const LURKER_VARIANT: Record<LurkerKind, LurkerVariant> = { lurker: 'base', lurkerSpitter: 'spitter', lurkerArmored: 'armored' };

/** Las propuestas con que se pinta: las del juego, u otras en la galeria `/proposals/bichos.html`. */
export interface BugDesigns {
  readonly lurker: LurkerDesign;
  readonly skipper: SkipperDesign;
}

export const GAME_BUGS: BugDesigns = { lurker: LURKER_DESIGN, skipper: SKIPPER_DESIGN };

/**
 * Aspecto y animacion de las tropas del brote 3. Medidas en pixeles de diseno, 160 por casilla, como el gusano.
 */
export const BUG_LOOK = {
  unitsPerCell: 160,
  /** Donde apoyan dentro de su carril: como el gusano, un pelo por delante de las plantas. */
  footY: 0.64,
  /** Tamano respecto al gusano. El acorazado, algo mas grande, como el del brote 1. */
  size: { lurker: 1, lurkerSpitter: 1, lurkerArmored: 1.1, skipper: 0.95 } satisfies Record<BugKind, number>,
  growthPerLevel: 0.018,
  /** Pasos (un ciclo de patas) por casilla andada. */
  stepsPerCell: 2.6,
  /** Lo que sube y baja el cuerpo con cada paso. */
  bob: 2.2,
  /** Escupidor: lo que dura la carga antes de cada escupitajo (se echa atras), como el gusano escupidor. */
  spitChargeMs: 650,
  /**
   * Oculto (LK-02): silueta morada que tiembla (`tremble`, en pixeles de diseno) y, cada `glitchMs`, un tiron de
   * interferencia (`glitchShift`). Los ojos brillan en verde neon. Al descubrirse destella (`revealFlashMs`) y recupera sus
   * colores.
   */
  hidden: { tremble: 1.3, glitchMs: 1500, glitchShift: 6, revealFlashMs: 150, revealColor: 0x39ff88, canvasAlpha: 0.45 },
  /** Skipper: lo que sube en el punto mas alto del salto (en anchos de casilla), cuanto se agacha y cuanto se inclina. */
  hop: { lift: 0.55, crouchDrop: 12, crouchSquash: 0.16, tilt: 14, legReach: { x: 92, y: 60 } },
  /** Quemado y frenado: llamas y escarcha respecto a la cabeza y al cuerpo, como en el gusano. */
  flames: [
    { at: 'head', x: 4, y: -34, scale: 1.4 },
    { at: 'body', x: 0, y: -30, scale: 1.1 },
  ],
  frost: [
    { at: 'head', x: 24, y: -14, scale: 1.1, angle: 50 },
    { at: 'body', x: 44, y: -14, scale: 0.85, angle: 20 },
  ],
  chillTint: 0x9fd0ff,
  burnTint: 0x5a1e00,
  charredTint: 0x8a6458,
  frozenTint: 0xd8f3ff,
  burnWinceMs: 700,
  shiverMs: 900,
  /** Medallita de nivel: algo mas pequena que la del gusano, en la nuca (`rig.medal`). */
  medalScale: 0.86,
  /** Rayas del acelerado, detras. */
  streak: { x: 84, y: -40, scale: 1.3 },
} as const;

interface Pulse {
  v: number;
}

type Rig = LurkerRig | SkipperRig;

interface Leg {
  readonly image: Phaser.GameObjects.Image;
  readonly mount: LegMount;
}

/** Pata de saltar del Skipper: muslo y pierna, la de este lado delante del cuerpo y la del otro detras. */
interface JumpLeg {
  readonly thigh: Phaser.GameObjects.Image;
  readonly shin: Phaser.GameObjects.Image;
  readonly far: boolean;
}

/** Caras: las del Lurker (tranquilo, atacando, dolorido) y, el Skipper, ademas agachado y en el aire. */
interface Faces {
  readonly idle: string;
  readonly attack: string;
  readonly hurt: string;
  readonly ready: string;
  readonly air: string;
}

/** Tinte de las patas y la pata de saltar del lado de atras: mas oscuras, para que se lea el volumen. */
const FAR_TINT = 0x8f8aa0;

/**
 * Una tropa del brote 3 en pantalla (T-038): un Lurker (que anda con sus patas y, oculto, se ve como una silueta que
 * tiembla, LK-02) o el Skipper (que avanza a saltos y se agacha antes de cada uno). Sigue al enemigo del estado en `sync` y
 * anima lo que la escena le cuenta. No decide nada (ADR-0008).
 */
export class BugView implements EnemyView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly legs: Leg[];
  private readonly jumpLegs: JumpLeg[] = [];
  private readonly helmet: Phaser.GameObjects.Image | null = null;
  private readonly plates: Phaser.GameObjects.Image[] = [];
  private platesLost = 0;
  private readonly eyes: Phaser.GameObjects.Image[];
  private readonly medal: Phaser.GameObjects.Image | null = null;
  private readonly streak: Phaser.GameObjects.Image;
  /** Acelerado por su ronda (`Enemy.haste`): lleva las rayas siempre. Con la sobrecarga (T-042), tambien mientras dure. */
  private readonly hasted: boolean;
  private readonly flames: Phaser.GameObjects.Image[];
  private readonly frost: Phaser.GameObjects.Image[];
  private readonly aura: WormAura | null = null;
  private readonly faces: Faces;
  private readonly rig: Rig;
  private readonly skipper: boolean;
  private readonly size: number;
  private readonly phaseOffset = Math.random() * Math.PI * 2;
  private phase = 0;
  private walk = 1;
  private footY: number;
  private cellWidth: number;
  private scale: number;
  private headKey: string;
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
  private burnTimer?: Phaser.Time.TimerEvent;
  private chillTimer?: Phaser.Time.TimerEvent;
  private burning = false;
  private chilled = false;
  /** Oculto (LK-02): silueta y ojos brillantes. Null hasta el primer `sync`. */
  private veiled: boolean | null = null;
  /** Lo ultimo que se supo del salto: para animar el aterrizaje aunque la escena no lo cuente. */
  private airborne = false;
  private synced = false;
  private lastSync = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
    emergeDelayMs = 0,
    /** Otras propuestas que las del juego: la galeria `/proposals/bichos.html` pinta asi las que compara. */
    designs: BugDesigns = GAME_BUGS,
    /** Otro tinte que el del brote de su variante (T-041): la galeria `/proposals/variantes.html` pinta asi las propuestas. */
    tint: TroopTint | null = null,
  ) {
    // Variante de color (T-041): las piezas del bicho con el tinte del brote que lo recluto. Medallita, ojos de oculto,
    // llamas y escarcha, igual. Oculto, el relleno de la silueta tapa el color: se ve igual que uno de su brote.
    const tex = (key: string) => variantTexture(scene, key, enemy.variant, tint);
    const kind = enemy.kind as BugKind;
    this.skipper = kind === 'skipper';
    this.rig = this.skipper ? SKIPPER_RIGS[designs.skipper] : LURKER_RIGS[designs.lurker];
    this.size = BUG_LOOK.size[kind] * (1 + (enemy.level - 1) * BUG_LOOK.growthPerLevel);
    this.footY = enemy.lane + BUG_LOOK.footY;
    const ground = perspective.toScreen({ x: enemy.x, y: this.footY });
    this.cellWidth = perspective.cellWidthAt({ x: enemy.x, y: this.footY });
    this.scale = (this.cellWidth / BUG_LOOK.unitsPerCell) * this.size;
    const depth = entityDepth(ground.y);
    const inv = artInv();
    const { body, head, leg, thigh, shin, glow } = BUG_SIZE;

    let bodyKey: string;
    let legKey: string;
    if (this.skipper) {
      const d = designs.skipper;
      bodyKey = tex(BUG_TEX.skipperBody(d));
      legKey = tex(BUG_TEX.skipperLeg(d));
      this.faces = {
        idle: tex(BUG_TEX.skipperHead(d, 'idle')),
        attack: tex(BUG_TEX.skipperHead(d, 'bite')),
        hurt: tex(BUG_TEX.skipperHead(d, 'hurt')),
        ready: tex(BUG_TEX.skipperHead(d, 'ready')),
        air: tex(BUG_TEX.skipperHead(d, 'air')),
      };
    } else {
      const d = designs.lurker;
      const variant = LURKER_VARIANT[kind as LurkerKind];
      bodyKey = tex(BUG_TEX.lurkerBody(d, variant));
      legKey = tex(BUG_TEX.lurkerLeg(d, variant));
      const face = (mood: 'idle' | 'attack' | 'hurt') => tex(BUG_TEX.lurkerHead(d, variant, mood));
      this.faces = { idle: face('idle'), attack: face('attack'), hurt: face('hurt'), ready: face('attack'), air: face('idle') };
      if (variant === 'armored') {
        this.helmet = scene.add.image(0, 0, tex(BUG_TEX.lurkerHelmet(d))).setOrigin(head.cx / head.width, head.cy / head.height).setScale(inv);
        this.plates = ([1, 0] as const).map((part) =>
          scene.add.image(this.rig.body.x, this.rig.body.y, tex(BUG_TEX.lurkerPlate(d, part))).setOrigin(body.cx / body.width, body.cy / body.height).setScale(inv),
        );
      }
    }
    this.headKey = this.faces.idle;

    this.shadow = scene.add
      .image(ground.x, ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.95 * this.size, this.cellWidth * 0.24 * this.size)
      .setDepth(depth - 0.5);
    this.body = scene.add.image(this.rig.body.x, this.rig.body.y, bodyKey).setOrigin(body.cx / body.width, body.cy / body.height).setScale(inv);
    this.legs = this.rig.legs.map((mount) => ({
      mount,
      image: scene.add
        .image(mount.x, mount.y, legKey)
        .setOrigin(leg.hipX / leg.width, leg.hipY / leg.height)
        .setScale(inv),
    }));
    if (this.skipper) {
      const d = designs.skipper;
      for (const far of [true, false]) {
        this.jumpLegs.push({
          far,
          thigh: scene.add.image(0, 0, tex(BUG_TEX.skipperThigh(d))).setOrigin(thigh.pivotX / thigh.width, thigh.pivotY / thigh.height).setScale(inv),
          shin: scene.add.image(0, 0, tex(BUG_TEX.skipperShin(d))).setOrigin(shin.pivotX / shin.width, shin.pivotY / shin.height).setScale(inv),
        });
      }
    }
    this.head = scene.add.image(this.rig.head.x, this.rig.head.y, this.headKey).setOrigin(head.cx / head.width, head.cy / head.height).setScale(inv);
    this.eyes = this.rig.eyes.map((e) =>
      scene.add
        .image(0, 0, BUG_TEX.eyeGlow)
        .setScale(((e.r * 2.4) / glow.size) * inv)
        .setVisible(false),
    );
    if (enemy.level > 1) this.medal = scene.add.image(0, 0, medalTexture(enemy.level)).setScale(BUG_LOOK.medalScale * inv);
    this.streak = scene.add
      .image(BUG_LOOK.streak.x, BUG_LOOK.streak.y, TEX.hasteStreak)
      .setOrigin(0, 0.5)
      .setScale(BUG_LOOK.streak.scale * inv)
      .setVisible(enemy.haste > 1);
    this.hasted = enemy.haste > 1;
    this.flames = BUG_LOOK.flames.map(() =>
      scene.add
        .image(0, 0, TEX.flame)
        .setOrigin(0.5, FLAME_SIZE.footY / FLAME_SIZE.height)
        .setVisible(false),
    );
    this.frost = BUG_LOOK.frost.map((f) =>
      scene.add
        .image(0, 0, TEX.frost)
        .setOrigin(0.5, FROST_SIZE.footY / FROST_SIZE.height)
        .setAngle(f.angle)
        .setVisible(false),
    );
    for (const l of this.legs) if (l.mount.far) l.image.setTint(FAR_TINT);
    for (const j of this.jumpLegs) if (j.far) [j.thigh, j.shin].forEach((part) => part.setTint(FAR_TINT));

    // De atras adelante: rayas, patas y pata de saltar del otro lado, cuerpo (y placas), patas de este lado, pata de
    // saltar de este lado, cabeza (y casco), medallita, ojos de oculto, escarcha y llamas.
    const farLegs = this.legs.filter((l) => l.mount.far).map((l) => l.image);
    const nearLegs = this.legs.filter((l) => !l.mount.far).map((l) => l.image);
    const jump = (far: boolean) => this.jumpLegs.filter((j) => j.far === far).flatMap((j) => [j.shin, j.thigh]);
    this.holder = scene.add
      .container(ground.x, ground.y, [
        this.streak,
        ...farLegs,
        ...jump(true),
        this.body,
        ...this.plates,
        ...nearLegs,
        ...jump(false),
        this.head,
        ...(this.helmet ? [this.helmet] : []),
        ...(this.medal ? [this.medal] : []),
        ...this.eyes,
        ...this.frost,
        ...this.flames,
      ])
      .setDepth(depth);
    const tier = auraTier(enemy.kind, enemy.level);
    if (tier > 0 && fx.quality.auras > 0) this.aura = new WormAura(scene, fx, tier, this, emerge ? emergeDelayMs : 0);
    this.lastSync = scene.time.now;

    if (emerge && emergeDelayMs > 0) {
      this.rise.v = 0;
      this.holder.setVisible(false);
      scene.time.delayedCall(emergeDelayMs, () => {
        if (!this.holder.active) return;
        this.holder.setVisible(true);
        this.emerge({ x: this.shadow.x, y: this.shadow.y });
      });
    } else if (emerge) {
      this.emerge(ground);
    }
    this.sync(enemy);
  }

  /**
   * Coloca y pone en postura al bicho segun el estado, en cada fotograma. Un Lurker mueve las patas segun lo que avanza; el
   * Skipper sale de su salto (`Enemy.hop`). `stride`, para pintarlos en una cinta sin moverse de su sitio (la galeria): al
   * Lurker le suma lo que "anda" y al Skipper lo devuelve a su sitio mientras salta (se pinta en `x + stride`). En el
   * tablero, 0.
   */
  /** La sobrecarga (T-042) encendida o apagada: con ella, las rayas del acelerado aunque su ronda no lo acelere. */
  rush(on: boolean): void {
    this.streak.setVisible(this.hasted || on);
  }

  sync(enemy: Enemy, stride = 0): void {
    const now = this.scene.time.now;
    const drawnX = this.skipper ? enemy.x + stride : enemy.x;
    const foot = { x: drawnX + this.shoveDx * this.shove.v, y: this.footY };
    const ground = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.scale = (this.cellWidth / BUG_LOOK.unitsPerCell) * this.size;
    this.holder.setDepth(entityDepth(ground.y));
    this.shadow.setDepth(entityDepth(ground.y) - 0.5);
    this.setVeiled(isHidden(enemy));

    const stats = ENEMIES[enemy.kind];
    const attacking = enemy.attackMs !== null;
    const hop = enemy.hop;
    const inAir = hop?.stage === 'air';
    // Lurker: anda si no ataca. Skipper: "anda" (mueve las patitas) solo en el aire.
    const walking = this.skipper ? false : !attacking;
    this.walk += ((walking ? 1 : 0) - this.walk) * 0.25;
    if (walking) this.phase = this.phaseOffset - (enemy.x - stride) * BUG_LOOK.stepsPerCell * Math.PI * 2;
    const chargeMs = stats.attack === 'spit' ? BUG_LOOK.spitChargeMs : stats.attack === 'bite' ? stats.firstBiteMs : 600;
    const windup = attacking ? Phaser.Math.Clamp(1 - (enemy.attackMs ?? 0) / chargeMs, 0, 1) : 0;
    const lean = windup * windup;
    const rear = stats.attack === 'spit' ? 2 : 1;

    // Skipper: agachado al final del descanso, en el aire en curva, y aplastado al caer.
    let crouch = 0;
    let lift = 0;
    let tilt = 0;
    let stretch = 0;
    if (hop && hop.stage === 'rest' && !attacking) {
      crouch = hop.ms < HOP.crouchMs ? 1 - hop.ms / HOP.crouchMs : 0;
      crouch = crouch * crouch * (3 - 2 * crouch);
    } else if (hop && inAir) {
      const span = Math.max(1e-3, hop.from - hop.to);
      const t = Phaser.Math.Clamp((hop.from - enemy.x) / span, 0, 1);
      lift = Math.sin(t * Math.PI) * Math.min(1, span / HOP.length + 0.25);
      tilt = 1 - t * 2;
      // La pata sigue estirada la primera mitad del salto (el impulso) y se recoge para caer.
      stretch = Math.min(1, (1 - t) * 1.8);
    }
    if (this.skipper && this.airborne && !inAir && this.synced) this.landed();
    this.airborne = inAir;

    const look = BUG_LOOK.hop;
    const rise = this.rise.v;
    const hurt = this.hurt.v;
    const lunge = this.lunge.v;
    const grow = this.scale * (0.3 + 0.7 * rise);
    const bumpUp = Math.sin(this.bump.v * Math.PI) * 26 * this.scale;
    const shiver = Math.sin(this.shiver.v * Math.PI * 9) * 3.5 * this.shiver.v;
    const veil = this.veiled ? 1 : 0;
    const tremble = veil * (Math.sin(now / 23 + this.phaseOffset) * BUG_LOOK.hidden.tremble + this.glitch.v * Math.sin(now / 9) * BUG_LOOK.hidden.glitchShift);
    const squash = crouch * look.crouchSquash + this.thud.v * 0.22 - lift * 0.06;
    const air = lift * this.cellWidth * look.lift;
    this.holder
      .setPosition(ground.x + (this.kick.v * 10 + shiver + tremble) * this.scale, ground.y + (1 - rise) * 20 * this.scale - bumpUp - air)
      .setScale(grow * (1 + hurt * 0.1 + squash * 0.6), grow * (1 - hurt * 0.1 - squash))
      .setAlpha(this.veiled ? this.veilAlpha() * (1 - this.glitch.v * 0.35) : 1);
    this.shadow
      .setPosition(ground.x, ground.y)
      .setDisplaySize(this.cellWidth * 0.95 * this.size * (1 - lift * 0.4), this.cellWidth * 0.24 * this.size * (1 - lift * 0.4))
      .setAlpha(Math.min(1, rise) * (1 - lift * 0.5) * (this.veiled ? 0.7 : 1));
    if (this.streak.visible) this.streak.setAlpha((this.skipper ? 0.6 + lift * 0.4 : this.walk) * (0.65 + 0.35 * Math.sin(now / 60)));

    const rig = this.rig;
    const step = Math.sin(this.phase);
    const bob = Math.abs(Math.sin(this.phase)) * BUG_LOOK.bob * this.walk;
    const drop = crouch * look.crouchDrop;
    const bodyAngle = this.skipper ? -tilt * look.tilt * lift * 1.6 + crouch * 4 : step * 1.2 * this.walk;
    this.body.setPosition(rig.body.x + lean * 3, rig.body.y - bob + drop).setAngle(bodyAngle);
    // Las piezas pegadas al cuerpo giran con el: lo que esta en (x, y) respecto a su ancla se mueve con su angulo.
    const onBody = (p: Point): Point => {
      const a = Phaser.Math.DegToRad(bodyAngle);
      const dx = p.x - rig.body.x;
      const dy = p.y - rig.body.y;
      return { x: this.body.x + dx * Math.cos(a) - dy * Math.sin(a), y: this.body.y + dx * Math.sin(a) + dy * Math.cos(a) };
    };
    for (const l of this.legs) {
      const hip = onBody(l.mount);
      const swing = this.skipper
        ? lift > 0
          ? -28 * Math.min(1, lift * 2) + Math.sin(now / 70 + l.mount.phase * 6) * 6
          : crouch * (l.mount.far ? 8 : -8)
        : Math.sin(this.phase + l.mount.phase * Math.PI * 2) * rig.legSwing * this.walk;
      // Las patas no se hunden en el suelo al agacharse: se doblan (se acortan un poco).
      l.image.setPosition(hip.x, hip.y).setAngle(swing).setScale(artInv(), artInv() * (1 - crouch * 0.18));
    }
    for (const plate of this.plates) plate.setPosition(this.body.x, this.body.y).setAngle(bodyAngle);
    if (this.skipper) this.poseJumpLegs(rig as SkipperRig, onBody, crouch, stretch, lift);

    const headPos = onBody(rig.head);
    this.head
      .setPosition(headPos.x + lean * 10 - lunge * 16, headPos.y - lean * 7 * rear + lunge * 9 - bob * 0.6 + crouch * 4)
      .setAngle(lean * 9 * rear - lunge * 12 + step * 3 * this.walk + bodyAngle * 0.6);
    const face =
      hurt > 0.25
        ? this.faces.hurt
        : lunge > 0.45
          ? this.faces.idle
          : windup > 0.35
            ? this.faces.attack
            : this.skipper && lift > 0.05
              ? this.faces.air
              : this.skipper && crouch > 0.2
                ? this.faces.ready
                : this.faces.idle;
    this.setHead(face);
    const headPoint = (p: Point) => {
      const a = Phaser.Math.DegToRad(this.head.angle);
      return { x: this.head.x + p.x * Math.cos(a) - p.y * Math.sin(a), y: this.head.y + p.x * Math.sin(a) + p.y * Math.cos(a) };
    };
    this.helmet?.setPosition(this.head.x, this.head.y).setAngle(this.head.angle);
    if (this.medal) {
      const m = headPoint(rig.medal);
      this.medal.setPosition(m.x, m.y).setAngle(this.head.angle * 0.6);
    }
    this.eyes.forEach((glow, i) => {
      const e = headPoint(rig.eyes[i]);
      glow.setPosition(e.x, e.y).setAlpha(0.75 + 0.25 * Math.sin(now / 160 + i));
    });
    if (this.plates.length) this.syncPlates(hpFraction(enemy));

    this.setBurning(enemy.burn !== null);
    if (this.burning) {
      BUG_LOOK.flames.forEach((f, i) => {
        const base = f.at === 'head' ? this.head : this.body;
        this.flames[i].setPosition(base.x + f.x, base.y + f.y);
      });
    }
    this.setChilled(enemy.slow !== null);
    if (this.chilled) {
      BUG_LOOK.frost.forEach((f, i) => {
        const base = f.at === 'head' ? this.head : this.body;
        this.frost[i].setPosition(base.x + f.x, base.y + f.y);
      });
    }
    this.aura?.sync(Math.min(100, Math.max(0, now - this.lastSync)));
    this.lastSync = now;
    this.synced = true;
  }

  /**
   * Pata de saltar del Skipper con cinematica inversa: en tierra el pie se queda en su sitio (`rig.foot`) y, al agacharse,
   * baja la cadera y la rodilla sube; en el aire la pata se estira hacia atras al despegar y se recoge para caer.
   */
  private poseJumpLegs(rig: SkipperRig, onBody: (p: Point) => Point, crouch: number, stretch: number, lift: number): void {
    const { legReach } = BUG_LOOK.hop;
    for (const leg of this.jumpLegs) {
      const shift = leg.far ? { x: 8, y: -5 } : { x: 0, y: 0 };
      const hip = onBody({ x: rig.hip.x + shift.x, y: rig.hip.y + shift.y });
      const rest = { x: rig.foot.x + shift.x, y: rig.foot.y + shift.y };
      // En tierra el pie no se mueve; en el aire va con la cadera, estirado al despegar y recogido al caer.
      const tucked = { x: hip.x + (rest.x - rig.hip.x) * 0.7, y: hip.y + (rest.y - rig.hip.y) * 0.62 };
      const extended = { x: hip.x + legReach.x, y: hip.y + legReach.y };
      const foot = lift > 0 ? { x: tucked.x + (extended.x - tucked.x) * stretch, y: tucked.y + (extended.y - tucked.y) * stretch } : rest;
      const angles = hopLegAngles(hip, foot);
      leg.thigh.setPosition(hip.x, hip.y).setRotation(angles.thigh);
      leg.shin.setPosition(angles.knee.x, angles.knee.y).setRotation(angles.shin);
      // Muelles: se aprietan al agacharse y se estiran al despegar.
      const spring = 1 - crouch * 0.12 + stretch * lift * 0.08;
      leg.shin.setScale(artInv() * spring, artInv());
    }
  }

  chomp(): void {
    this.pulse(this.lunge, 300);
  }

  /** Escupe (el Lurker escupidor): la cabeza se lanza con un chorrito de moco. */
  spat(): void {
    this.pulse(this.lunge, 280);
    const mouth = this.mouth();
    this.fx.goo(mouth.x, mouth.y, 4);
  }

  /** No recitan. */
  inhale(): void {}

  sang(): void {}

  /** El Skipper despega (T-038): un empujon de tierra donde estaba. Lo demas sale del estado. */
  hopped(): void {
    const { x, y } = this.ground();
    this.fx.dirt(x, y, 5);
  }

  /** El Skipper cae: se aplasta y levanta un poco de tierra. */
  landed(): void {
    this.pulse(this.thud, 300);
    const { x, y } = this.ground();
    this.fx.dirt(x, y, 4);
  }

  hit(): void {
    this.pulse(this.hurt, 260);
    this.pulse(this.kick, 200);
    this.flash();
    if (this.plates.length > this.platesLost) this.fx.scrap(this.holder.x - 20 * this.scale, this.holder.y - 60 * this.scale, 2);
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
    this.fx.frost(this.holder.x, this.holder.y - 50 * this.scale, 6);
  }

  shoved(fromX: number, toX: number): void {
    this.shoveDx = fromX - toX;
    this.scene.tweens.killTweensOf(this.shove);
    this.shove.v = 1;
    this.scene.tweens.add({ targets: this.shove, v: 0, duration: 300, ease: 'Cubic.Out' });
    this.frosted();
  }

  die(): void {
    const charred = this.burning;
    const frozen = this.chilled && !charred;
    this.stopReactions();
    this.aura?.fadeOut(300);
    if (this.helmet) this.fling(this.helmet, -1, 1.4);
    const parts = this.bodyParts();
    parts.forEach((part) => part.setTint(frozen ? BUG_LOOK.frozenTint : 0xffffff).setTintMode(Phaser.TintModes.FILL));
    for (const glow of this.eyes) glow.setVisible(false);
    this.head.setTexture(this.faces.hurt);
    const x = this.holder.x;
    const y = this.holder.y - 45 * this.scale;
    const depth = this.holder.depth + 0.5;
    if (charred) {
      this.fx.smoke(x, y, 6);
      this.fx.embers(x, y, 8);
    }
    if (frozen) {
      this.fx.shards(x, y, 10);
      this.fx.frost(x, y, 5);
    }
    this.fx.bits(x, y, 16);
    this.fx.ring(x, y, this.cellWidth * 0.9, frozen ? 0xbfeaff : 0xffd6a0, depth, 300);
    this.fx.glow(x, y, this.cellWidth, 0x39ff88, depth, 320);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: this.holder.scaleX * 1.2,
      scaleY: this.holder.scaleY * 1.2,
      duration: 90,
      ease: 'Quad.Out',
      onComplete: () => {
        parts.forEach((part) => {
          if (charred) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(BUG_LOOK.charredTint);
          else if (frozen) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(BUG_LOOK.chillTint);
          else part.clearTint();
        });
        this.scene.tweens.add({
          targets: this.holder,
          scaleX: 0,
          scaleY: 0,
          angle: -25,
          alpha: 0,
          duration: 260,
          ease: 'Back.In',
          onComplete: () => this.holder.destroy(),
        });
      },
    });
    this.fadeShadow(350);
  }

  escape(): void {
    this.stopReactions();
    this.aura?.fadeOut(650);
    const dx = -this.cellWidth * 0.7;
    this.fx.dirt(this.holder.x, this.holder.y, 8);
    this.scene.tweens.add({
      targets: this.holder,
      x: this.holder.x + dx,
      y: this.holder.y + this.cellWidth * 0.08,
      scaleY: this.holder.scaleY * 0.15,
      alpha: 0,
      duration: 650,
      ease: 'Quad.In',
      onComplete: () => {
        this.fx.dirt(this.holder.x, this.holder.y, 10);
        this.holder.destroy();
      },
    });
    this.scene.tweens.add({ targets: this.shadow, x: this.shadow.x + dx, duration: 650 });
    this.fadeShadow(650);
  }

  cheer(): void {
    this.stopReactions();
    this.setHead(this.faces.idle);
    this.scene.tweens.add({
      targets: this.holder,
      y: this.holder.y - this.cellWidth * 0.12,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.Out',
      delay: Math.random() * 300,
    });
  }

  ground(): { x: number; y: number; cellWidth: number } {
    return { x: this.shadow.x, y: this.shadow.y, cellWidth: this.cellWidth };
  }

  depth(): number {
    return this.holder.depth;
  }

  contains(x: number, y: number): boolean {
    const { holder } = this;
    if (!holder.active || !holder.visible || holder.scaleX === 0 || holder.scaleY === 0) return false;
    const lx = (x - holder.x) / holder.scaleX;
    const ly = (y - holder.y) / holder.scaleY;
    const box = this.rig.hitBox;
    return lx >= box.left && lx <= box.right && ly >= box.top && ly <= box.bottom;
  }

  /** Boca en pantalla: de ahi salen los escupitajos. */
  mouth(): { x: number; y: number } {
    return {
      x: this.holder.x + (this.head.x + this.rig.mouth.x) * this.holder.scaleX,
      y: this.holder.y + (this.head.y + this.rig.mouth.y) * this.holder.scaleY,
    };
  }

  /**
   * Empieza o deja de estar oculto (LK-02). Oculto: silueta morada, ojos verdes y, cada tanto, un tiron de interferencia.
   * Al descubrirse destella en verde y suelta unos pixeles. La primera vez (al salir o al continuar la partida), sin animar.
   */
  private setVeiled(veiled: boolean): void {
    if (veiled === this.veiled) return;
    const first = this.veiled === null;
    this.veiled = veiled;
    for (const glow of this.eyes) glow.setVisible(veiled);
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
    const x = this.holder.x;
    const y = this.holder.y - 50 * this.scale;
    if (!veiled) {
      this.flash(BUG_LOOK.hidden.revealColor, BUG_LOOK.hidden.revealFlashMs);
      this.fx.glow(x, y, this.cellWidth * 1.1 * this.size, BUG_LOOK.hidden.revealColor, this.holder.depth + 0.4, 360);
      this.fx.bits(x, y, 8);
    } else {
      this.pulse(this.glitch, 320);
      this.fx.bits(x, y, 5);
      if (!this.flashTimer) this.applyRestingTint();
    }
  }

  /**
   * Opacidad del oculto: la de la silueta (LK-02) o, sin WebGL (Phaser sin tintes, en Canvas), mucho mas transparente, para
   * que se siga distinguiendo de uno descubierto.
   */
  private veilAlpha(): number {
    return this.scene.game.renderer.type === Phaser.WEBGL ? HIDDEN_LOOK.alpha : BUG_LOOK.hidden.canvasAlpha;
  }

  /** Tiron de interferencia del oculto: tiembla de lado y se apaga un instante. */
  private flicker(): void {
    if (!this.holder.active || !this.veiled || this.hurt.v > 0.5) return;
    this.pulse(this.glitch, 180);
    if (this.fx.quality.extras) this.fx.bits(this.holder.x, this.holder.y - 40 * this.scale, 2);
  }

  /** Placas del acorazado: se caen con la vida, la de atras primero. */
  private syncPlates(hpRatio: number): void {
    const keep = Math.ceil(Phaser.Math.Clamp(hpRatio, 0, 1) * this.plates.length);
    while (this.platesLost < this.plates.length - keep) {
      const plate = this.plates[this.platesLost++];
      if (this.synced) this.fling(plate, 1, 1);
      plate.setVisible(false);
    }
  }

  private fling(part: Phaser.GameObjects.Image, dir: number, lift: number): void {
    if (!part.visible) return;
    const kx = this.holder.scaleX;
    const ky = this.holder.scaleY;
    const x = this.holder.x + part.x * kx;
    const y = this.holder.y + part.y * ky;
    part.setVisible(false);
    const piece = this.scene.add
      .image(x, y, part.texture.key)
      .setOrigin(part.originX, part.originY)
      .setScale(part.scaleX * kx, part.scaleY * ky)
      .setAngle(part.angle)
      .setDepth(this.holder.depth + 0.4);
    this.fx.scrap(x, y, 5);
    const up = this.cellWidth * 0.32 * lift;
    this.scene.tweens.add({ targets: piece, x: x + dir * this.cellWidth * 0.35, angle: part.angle + dir * 220, duration: 620 });
    this.scene.tweens.add({
      targets: piece,
      y: y - up,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () =>
        this.scene.tweens.add({
          targets: piece,
          y: y + this.cellWidth * 0.18,
          alpha: 0,
          duration: 400,
          ease: 'Quad.In',
          onComplete: () => piece.destroy(),
        }),
    });
  }

  private setBurning(burning: boolean): void {
    if (burning === this.burning) return;
    this.burning = burning;
    this.scene.tweens.killTweensOf(this.flames);
    if (burning) {
      this.flames.forEach((flame, i) => {
        const base = BUG_LOOK.flames[i].scale * artInv();
        flame.setVisible(true).setAlpha(0.95).setScale(base * 0.3);
        this.scene.tweens.add({ targets: flame, scaleX: base, scaleY: base, duration: 180, ease: 'Back.Out' });
        this.scene.tweens.add({
          targets: flame,
          scaleY: { from: base * 0.82, to: base * 1.18 },
          alpha: { from: 0.8, to: 1 },
          duration: Phaser.Math.Between(110, 160),
          yoyo: true,
          repeat: -1,
          delay: 180 + i * 60,
        });
      });
      this.fx.fire(this.holder.x, this.holder.y - 50 * this.scale, 5);
      this.burnTimer = this.scene.time.addEvent({
        delay: BUG_LOOK.burnWinceMs,
        loop: true,
        callback: () => {
          this.pulse(this.hurt, 200);
          this.fx.embers(this.holder.x - 20 * this.scale, this.holder.y - 70 * this.scale, 3);
        },
      });
    } else {
      this.burnTimer?.remove();
      this.burnTimer = undefined;
      this.scene.tweens.add({
        targets: this.flames,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 220,
        onComplete: () => this.flames.forEach((flame) => flame.setVisible(false)),
      });
      this.fx.smoke(this.holder.x, this.holder.y - 60 * this.scale, 3);
    }
    if (!this.flashTimer) this.applyRestingTint();
  }

  private setChilled(chilled: boolean): void {
    if (chilled === this.chilled) return;
    this.chilled = chilled;
    this.scene.tweens.killTweensOf(this.frost);
    if (chilled) {
      this.frost.forEach((crystal, i) => {
        const base = BUG_LOOK.frost[i].scale * artInv();
        crystal.setVisible(true).setAlpha(1).setScale(base * 0.2);
        this.scene.tweens.add({ targets: crystal, scaleX: base, scaleY: base, duration: 260, delay: i * 70, ease: 'Back.Out' });
        this.scene.tweens.add({
          targets: crystal,
          alpha: { from: 1, to: 0.78 },
          duration: Phaser.Math.Between(600, 800),
          yoyo: true,
          repeat: -1,
          delay: 330 + i * 120,
          ease: 'Sine.InOut',
        });
      });
      this.fx.frost(this.holder.x, this.holder.y - 50 * this.scale, 4);
      this.chillTimer = this.scene.time.addEvent({
        delay: BUG_LOOK.shiverMs,
        loop: true,
        callback: () => {
          this.pulse(this.shiver, 340);
          this.fx.flake(this.holder.x - 20 * this.scale, this.holder.y - 85 * this.scale);
        },
      });
    } else {
      this.chillTimer?.remove();
      this.chillTimer = undefined;
      this.scene.tweens.add({
        targets: this.frost,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 260,
        onComplete: () => this.frost.forEach((crystal) => crystal.setVisible(false)),
      });
      this.fx.mist(this.holder.x, this.holder.y - 50 * this.scale, 2);
    }
    if (!this.flashTimer) this.applyRestingTint();
  }

  /** Lo que se tine y destella: cuerpo, cabeza, patas y armadura (no los ojos de oculto ni los efectos). */
  private bodyParts(): Phaser.GameObjects.Image[] {
    const jump = this.jumpLegs.flatMap((j) => [j.thigh, j.shin]);
    return [this.body, this.head, ...this.legs.map((l) => l.image), ...jump, ...this.plates, ...(this.helmet ? [this.helmet] : [])];
  }

  /** Patas del otro lado: mas oscuras, salvo cuando destella o se pinta como silueta. */
  private isFar(part: Phaser.GameObjects.Image): boolean {
    return this.legs.some((l) => l.mount.far && l.image === part) || this.jumpLegs.some((j) => j.far && (j.thigh === part || j.shin === part));
  }

  /** Tinte de reposo: la silueta del oculto (LK-02), azul frio si va lento, anaranjado si arde. */
  private applyRestingTint(): void {
    for (const part of this.bodyParts()) {
      if (this.veiled) part.setTint(HIDDEN_LOOK.fill).setTintMode(Phaser.TintModes.FILL);
      else if (this.chilled) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(BUG_LOOK.chillTint);
      else if (this.burning) part.setTintMode(Phaser.TintModes.ADD).setTint(BUG_LOOK.burnTint);
      else if (this.isFar(part)) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(FAR_TINT);
      else part.clearTint();
    }
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private flash(color = 0xffffff, durationMs = 70): void {
    this.flashTimer?.remove();
    this.bodyParts().forEach((part) => part.setTint(color).setTintMode(Phaser.TintModes.FILL));
    this.flashTimer = this.scene.time.delayedCall(durationMs, () => {
      this.flashTimer = undefined;
      this.applyRestingTint();
    });
  }

  private emerge(ground: { x: number; y: number }): void {
    this.rise.v = 0;
    this.scene.tweens.add({ targets: this.rise, v: 1, duration: 560, ease: 'Back.Out' });
    this.fx.dirt(ground.x, ground.y, 10);
    this.fx.bits(ground.x, ground.y - this.cellWidth * 0.1, 8);
    this.fx.glow(ground.x, ground.y, this.cellWidth * 1.1, 0x39ff88, this.holder.depth - 0.4, 420);
  }

  private stopReactions(): void {
    this.flashTimer?.remove();
    this.flashTimer = undefined;
    this.burnTimer?.remove();
    this.burnTimer = undefined;
    this.chillTimer?.remove();
    this.chillTimer = undefined;
    this.glitchTimer?.remove();
    this.glitchTimer = undefined;
    this.scene.tweens.killTweensOf([this.rise, this.lunge, this.hurt, this.kick, this.bump, this.shiver, this.thud, this.glitch]);
  }

  private fadeShadow(durationMs: number): void {
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: durationMs, onComplete: () => this.shadow.destroy() });
  }

  private setHead(key: string): void {
    if (key === this.headKey) return;
    this.headKey = key;
    this.head.setTexture(key);
  }
}
