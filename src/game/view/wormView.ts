import * as Phaser from 'phaser';
import { CLONE, ELK_CLONER, ENEMIES } from '../config/balance';
import { hpFraction, isBoss, isEnraged, poemWarning, type Enemy, type EnemyKind } from '../core/combat';
import type { Effects } from './effects';
import { entityDepth, perspective } from './layout';
import { FEET_SIZE, FLAME_SIZE, FROST_SIZE, HAT_SIZE, RUFF_SIZE, TEX, WORM_SIZE, artInv, medalTexture, variantTexture } from './textures';
import type { TroopTint } from './troopTint';
import type { OutbreakId } from '../core/outbreaks';
import { WormAura, type AuraHost } from './wormAura';
import { auraTier } from './wormAuraArt';
import type { BugKind } from './bugView';

/** Los que se pintan como gusanos: todos menos los bichos del brote 3 (T-038), su jefe, Brain (T-039, `BrainView`), y Morris (T-042, `MorrisView`). */
export type WormKind = Exclude<EnemyKind, BugKind | 'brain' | 'morris'>;

/**
 * Aspecto del gusano. Las medidas locales son pixeles de diseno con 160 por casilla, como la disparadora.
 * La cabeza va levantada a la altura del canon, para que las semillas le den en la cara.
 */
export const WORM_LOOK = {
  unitsPerCell: 160,
  /** Donde apoya dentro de su carril: un pelo por delante de las plantas, para tapar a la que muerde. */
  footY: 0.64,
  /** Anillos de la cola a la cabeza. */
  segments: [
    { x: 62, y: -15, scale: 0.6 },
    { x: 41, y: -20, scale: 0.75 },
    { x: 16, y: -25, scale: 0.88 },
    { x: -12, y: -34, scale: 1 },
  ],
  head: { x: -38, y: -72 },
  /** Ondas del cuerpo por casilla recorrida: el gusano "pisa" al avanzar y se queda quieto al morder. */
  wavesPerCell: 3.4,
  humpHeight: 7,
  /** Quemado (T-004): llamas sobre la cabeza y el lomo (respecto a la cabeza y al segundo anillo), y tinte. */
  flames: [
    { x: 4, y: -30, scale: 1.45 },
    { x: 2, y: -20, scale: 1.1 },
  ],
  /** Se suma al color del cuerpo mientras arde (tinte aditivo): el morado tira a rojo encendido. */
  burnTint: 0x5a1e00,
  /** Mientras arde pone cara de "ay" y suelta brasas cada tanto: asi se ve que sigue perdiendo vida. */
  burnWinceMs: 700,
  /** Muerto quemado: queda tostado un instante antes de deshacerse. */
  charredTint: 0x8a6458,
  /**
   * Ralentizado (T-005): cristales de escarcha en la nuca y en la cola (respecto a la cabeza y al ultimo anillo).
   * No tapan las llamas del quemado, que van en la coronilla y el lomo: los dos efectos se ven a la vez.
   */
  frost: [
    { x: 24, y: -12, scale: 1.1, angle: 50 },
    { x: 4, y: -10, scale: 0.85, angle: 20 },
  ],
  /** Mientras va lento el cuerpo tira a azul frio (tinte multiplicado). Gana al rojizo del quemado; las llamas siguen. */
  chillTint: 0x9fd0ff,
  /** Mientras va lento tirita cada tanto y suelta un copo: asi se ve que sigue frenado. */
  shiverMs: 900,
  /** Alcanzado por la mina de hielo: destello azul helado. Muerto ralentizado: queda congelado y se rompe. */
  frozenTint: 0xd8f3ff,
  /** Escupidor (T-007): lo que dura la carga antes de cada escupitajo (se echa atras e hincha los mofletes). */
  spitChargeMs: 650,
  /** Boca del escupidor (y del juglar) respecto a la cabeza (pixeles de la textura de la cabeza, desde su centro). */
  mouth: { x: -20, y: 17 },
  /**
   * Juglar (T-025): cuanto se hincha mientras toma aire antes del verso (el aviso, F-04: lo que dura sale de
   * `ENEMIES.minstrel.warnMs`), cuanto se yergue y lo que dura la cara de recitar.
   */
  minstrel: { swell: 0.16, rear: 1.4, singMs: 520 },
  /**
   * Disquete a la espalda de los copiones (T-025): de pie sobre el lomo, entre el segundo y el tercer anillo (respecto
   * al punto medio de los dos), algo echado hacia atras. Sigue la joroba al andar.
   */
  pack: { x: 2, y: -36, scale: 0.92, angle: 14 },
  /**
   * Copia de un copion (T-025): mas pequena (`CLONE.size`), algo transparente y, cada tanto, un parpadeo de interferencia
   * (`glitchMs`): es una copia. Al salir, nace del tamano de su copion y encoge con un destello.
   */
  clone: { alpha: 0.9, glitchMs: 1700, glitchShift: 5, popMs: 420 },
  /** Acelerado por Creeper (T-008): rayas de velocidad detras de la cola, que titilan mientras avanza. */
  streak: { x: 74, y: -24, scale: 1.3 },
  /**
   * Salto de carril (T-008, Creeper). Agachado: se aplasta y tiembla mientras avisa. En el aire: sube en curva
   * (altura en anchos de casilla, algo mas cuanto mas lejos salta) y su sombra se encoge en el suelo.
   */
  jump: { crouchSquash: 0.2, crouchShake: 2.2, liftCells: 0.75, liftPerLane: 0.12 },
  /**
   * Nivel (T-009): desde el 2, la medallita de las disparadoras prendida en la nuca (respecto a la cabeza, que mira a
   * la izquierda: la nuca queda arriba a la derecha) y un poco mas grande por cada nivel. El de nivel 1 se ve como
   * siempre.
   */
  medal: { x: 25, y: -27, scale: 0.92 },
  growthPerLevel: 0.018,
  /**
   * Caja holgada alrededor de cabeza, cuerpo y cola en reposo, en sus medidas locales (pies en 0, 0): ahi se le puede
   * hacer doble clic para ver su ficha (T-010).
   */
  hitBox: { left: -94, right: 86, top: -142, bottom: 10 },
} as const;

interface HeadSet {
  idle: string;
  /** Atacando: mordiendo, cargando el escupitajo o, el juglar, tomando aire (T-025). */
  attack: string;
  hurt: string;
  /** Al soltar el ataque, si tiene cara propia: el juglar recitando (T-025). */
  release?: string;
  /** Tomando aire antes de un verso, si no es su cara de atacar: Elk Cloner (T-026), que ademas muerde. */
  inhale?: string;
  /** Anunciando el poema entero (Elk Cloner, T-026, L-03). */
  poem?: string;
}

/**
 * Postura del cuerpo (en pixeles de diseno, pies en 0, 0, mirando a la izquierda): sus anillos de la cola a la cabeza, la
 * cabeza, hacia donde se mueve cada anillo con la joroba al andar y la caja para el doble clic. La del gusano esta tumbada
 * (`WORM_POSE`); la de Elk Cloner (T-026), de pie.
 */
export interface WormPose {
  readonly segments: ReadonlyArray<{ readonly x: number; readonly y: number; readonly scale: number }>;
  readonly head: { readonly x: number; readonly y: number };
  readonly hump: { readonly x: number; readonly y: number };
  readonly hitBox: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
}

/**
 * Adorno pegado a un anillo (Elk Cloner, T-026: la gorguera y los pies): sigue a ese anillo con la joroba. `origin` es su
 * punto de apoyo en su textura; `behind`, si va detras de los anillos.
 */
export interface WormTrim {
  readonly key: string;
  readonly segment: number;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly origin: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
  readonly behind: boolean;
}

/** Lo que cambia con cada enemigo (ver `KIND_LOOK`). */
export interface KindLook {
  readonly head: HeadSet;
  readonly angryHead?: HeadSet;
  readonly segment: string;
  readonly size: number;
  /** Armadura: casco sobre la cabeza y una placa por anillo (el acorazado de acero; el copion, de disquete), o null. */
  readonly armor: { readonly helmet: string; readonly plate: string } | null;
  /** Lo que lleva a la espalda (el disquete de los copiones, T-025), o null. Sus copias no lo llevan. */
  readonly pack: string | null;
  /**
   * Sombrero sobre la cabeza (el del juglar, T-025, en su lienzo `HAT_SIZE`, con el centro de la cabeza de origen; la
   * cornamenta de Elk Cloner, T-026, en el mismo lienzo), o null.
   */
  readonly hat: string | null;
  /** Postura propia, en vez de la del gusano (Elk Cloner, de pie). */
  readonly pose?: WormPose;
  /** Adornos pegados a sus anillos (la gorguera y los pies de Elk Cloner). */
  readonly trims?: readonly WormTrim[];
}

/** Postura del gusano: tumbado, con la cabeza levantada a la altura del canon. */
export const WORM_POSE: WormPose = {
  segments: WORM_LOOK.segments,
  head: WORM_LOOK.head,
  hump: { x: 2.5, y: WORM_LOOK.humpHeight },
  hitBox: WORM_LOOK.hitBox,
};

/**
 * Elk Cloner (T-026, L-09): de pie, para que su silueta no se parezca a la de Creeper, que va tumbado. Cuatro cuentas
 * apiladas de mas grande (abajo) a mas pequena, el disquete encima y, con la cornamenta, mas alto que ancho. Al andar se
 * mece de lado, no de arriba abajo.
 */
export const ELK_POSE: WormPose = {
  segments: [
    { x: 10, y: -30, scale: 1.2 },
    { x: 5, y: -65, scale: 1.02 },
    { x: 1, y: -95, scale: 0.86 },
    { x: -2, y: -119, scale: 0.72 },
  ],
  head: { x: -8, y: -160 },
  hump: { x: 4, y: 1.5 },
  hitBox: { left: -66, right: 58, top: -250, bottom: 10 },
};

/** Gorguera sobre la cuenta de arriba, bajo el disquete, y los pies bajo la de abajo. */
const ELK_TRIMS: readonly WormTrim[] = [
  {
    key: TEX.elkFeet,
    segment: 0,
    x: -6,
    y: 24,
    scale: 1,
    origin: { x: FEET_SIZE.cx, y: FEET_SIZE.cy },
    size: FEET_SIZE,
    behind: true,
  },
  {
    key: TEX.elkRuff,
    segment: 3,
    x: -4,
    y: -8,
    scale: 0.92,
    origin: { x: RUFF_SIZE.cx, y: RUFF_SIZE.cy },
    size: RUFF_SIZE,
    behind: false,
  },
];

const WORM_HEAD: HeadSet = { idle: TEX.wormHead, attack: TEX.wormHeadBite, hurt: TEX.wormHeadHurt };
const COPYCAT_HEAD: HeadSet = { idle: TEX.copycatHead, attack: TEX.copycatHeadBite, hurt: TEX.copycatHeadHurt };
const STEEL_ARMOR = { helmet: TEX.armorHelmet, plate: TEX.armorPlate } as const;
const FLOPPY_ARMOR = { helmet: TEX.floppyHelmet, plate: TEX.floppyPlate } as const;
const plain = { armor: null, pack: null, hat: null } as const;

/**
 * Lo que cambia con cada enemigo (T-007): texturas de la cabeza (tranquila, atacando y dolorida) y del anillo,
 * tamano, y si lleva armadura. El acorazado es un gusano mas grande con casco y una placa por anillo. El Creeper
 * (T-008) es mucho mas grande, con cabeza de monitor, y en su fase 2 cambia de cara (`angryHead`). Las tropas del brote 2
 * (T-025) son las del brote 1 en otros colores con un disquete a la espalda (el acorazado, con armadura de disquete), y
 * el juglar, rojo y con gorro de pluma. La foto de la ficha (`portrait.ts`) pinta lo mismo.
 */
export const KIND_LOOK: Record<WormKind, KindLook> = {
  worm: { head: WORM_HEAD, segment: TEX.wormSegment, size: 1, ...plain },
  armored: { head: WORM_HEAD, segment: TEX.wormSegment, size: 1.12, ...plain, armor: STEEL_ARMOR },
  spitter: {
    head: { idle: TEX.spitterHead, attack: TEX.spitterHeadCharge, hurt: TEX.spitterHeadHurt },
    segment: TEX.spitterSegment,
    size: 1,
    ...plain,
  },
  creeper: {
    head: { idle: TEX.creeperHead, attack: TEX.creeperHeadBite, hurt: TEX.creeperHeadHurt },
    angryHead: { idle: TEX.creeperHeadAngry, attack: TEX.creeperHeadAngryBite, hurt: TEX.creeperHeadAngryHurt },
    segment: TEX.creeperSegment,
    size: 1.7,
    ...plain,
  },
  copycat: { head: COPYCAT_HEAD, segment: TEX.copycatSegment, size: 1, ...plain, pack: TEX.floppy },
  copycatArmored: { head: COPYCAT_HEAD, segment: TEX.copycatSegment, size: 1.12, ...plain, armor: FLOPPY_ARMOR, pack: TEX.floppy },
  copycatSpitter: {
    head: { idle: TEX.copycatSpitterHead, attack: TEX.copycatSpitterHeadCharge, hurt: TEX.copycatSpitterHeadHurt },
    segment: TEX.copycatSpitterSegment,
    size: 1,
    ...plain,
    pack: TEX.floppy,
  },
  minstrel: {
    head: { idle: TEX.minstrelHead, attack: TEX.minstrelHeadInhale, hurt: TEX.minstrelHeadHurt, release: TEX.minstrelHeadSing },
    segment: TEX.minstrelSegment,
    size: 1.04,
    ...plain,
    hat: TEX.minstrelHat,
  },
  elkCloner: {
    head: {
      idle: TEX.elkHead,
      attack: TEX.elkHeadBite,
      hurt: TEX.elkHeadHurt,
      release: TEX.elkHeadRecite,
      inhale: TEX.elkHeadInhale,
      poem: TEX.elkHeadPoem,
    },
    segment: TEX.elkSegment,
    size: 1.22,
    ...plain,
    hat: TEX.elkAntlers,
    pose: ELK_POSE,
    trims: ELK_TRIMS,
  },
};

/**
 * El aspecto `look` con la variante de color del brote `variant` (T-041): las mismas piezas (cabezas, anillos, armadura,
 * disquete, gorro y adornos) con sus texturas tenidas (`variantTexture`). Sin variante, `look` tal cual. `tint` cambia el
 * tinte del brote por otro (la galeria `/proposals/variantes.html`).
 */
export function variantLook(scene: Phaser.Scene, look: KindLook, variant: OutbreakId | null, tint: TroopTint | null = null): KindLook {
  if (variant === null) return look;
  const tex = (key: string) => variantTexture(scene, key, variant, tint);
  const heads = (set: HeadSet): HeadSet => Object.fromEntries(Object.entries(set).map(([mood, key]) => [mood, tex(key as string)])) as unknown as HeadSet;
  return {
    ...look,
    head: heads(look.head),
    ...(look.angryHead ? { angryHead: heads(look.angryHead) } : {}),
    segment: tex(look.segment),
    armor: look.armor ? { helmet: tex(look.armor.helmet), plate: tex(look.armor.plate) } : null,
    pack: look.pack ? tex(look.pack) : null,
    hat: look.hat ? tex(look.hat) : null,
    ...(look.trims ? { trims: look.trims.map((trim) => ({ ...trim, key: tex(trim.key) })) } : {}),
  };
}

/** Tamano del Creeper respecto al gusano, para quien lo pinta fuera de su vista (Creeper preparandose). */
export const CREEPER_SIZE = KIND_LOOK.creeper.size;

/** Postura de un enemigo: la suya o la del gusano. */
export function poseOf(kind: WormKind): WormPose {
  return KIND_LOOK[kind].pose ?? WORM_POSE;
}

/**
 * Lo que le falta a Elk Cloner (T-026) para soltar su verso o su poema, sacado del estado: cuanto ha tomado aire para el
 * siguiente verso (0 a 1, durante `warnMs`) y cuanto lleva del aviso del poema entero (0 a 1). Los demas, 0.
 */
export function recitePose(enemy: Enemy): { inhale: number; poem: number } {
  const { recital } = enemy;
  if (!recital) return { inhale: 0, poem: 0 };
  const warning = poemWarning(enemy);
  if (warning !== null) return { inhale: 0, poem: 1 - warning };
  const { warnMs } = ENEMIES.elkCloner;
  const next = recital.sung < ELK_CLONER.poemEvery && recital.ms <= warnMs ? 1 - recital.ms / warnMs : 0;
  return { inhale: Phaser.Math.Clamp(next, 0, 1), poem: 0 };
}

/** Lo que la escena le pide a la vista de cualquier enemigo. `CreeperView` (T-008) envuelve a un `WormView`. */
export interface EnemyView {
  /** `stride`: casillas que lleva andadas sin moverse de su sitio (portada del menu, T-011); en el tablero, 0. */
  sync(enemy: Enemy, stride?: number): void;
  /** La sobrecarga (T-042): las tropas llevan las rayas del acelerado mientras dura. Los jefes no la tienen: no aceleran. */
  rush?(on: boolean): void;
  chomp(): void;
  spat(): void;
  /** El juglar toma aire (T-025, F-04): el aviso de su verso. */
  inhale(): void;
  /** El juglar suelta su verso (T-025). */
  sang(): void;
  hit(): void;
  blasted(): void;
  frosted(): void;
  /** Sale de una casilla del muro de hielo del poder (T-021): se desliza de `fromX` a donde esta ya (casillas). */
  shoved(fromX: number, toX: number): void;
  die(): void;
  escape(): void;
  cheer(): void;
  /** Pies en pantalla (en el suelo, aunque este en el aire) y ancho de casilla ahi. */
  ground(): { x: number; y: number; cellWidth: number };
  /** ¿Cae el punto de pantalla sobre el? Para abrir su ficha con doble clic (T-010). */
  contains(x: number, y: number): boolean;
}

/**
 * Postura del salto de carril (T-008), sacada del estado: en que carril se pinta (entre el de salida y el de destino
 * mientras vuela), cuanto sube (0 a 1, en curva) y cuanto se agacha (0 a 1, mientras avisa).
 */
export function jumpPose(enemy: Enemy): { lane: number; lift: number; crouch: number } {
  const { jump } = enemy;
  if (!jump) return { lane: enemy.lane, lift: 0, crouch: 0 };
  const t = Phaser.Math.Clamp(1 - jump.ms / jump.stageMs, 0, 1);
  if (jump.stage === 'crouch') return { lane: jump.from, lift: 0, crouch: Math.min(1, t * 2.2) };
  const eased = t * t * (3 - 2 * t);
  return { lane: jump.from + (jump.to - jump.from) * eased, lift: Math.sin(t * Math.PI), crouch: Math.max(0, 1 - t * 5) };
}

/** Armadura del acorazado (de acero, o de disquete el copion): casco y una placa por anillo. Las placas se caen con la vida. */
interface Armor {
  readonly helmet: Phaser.GameObjects.Image;
  readonly plates: Phaser.GameObjects.Image[];
  /** Placas que ya se cayeron, empezando por la cola. */
  lost: number;
}

/** Valor animable suelto: cada reaccion tiene el suyo y se puede cortar sin tocar las demas. */
interface Pulse {
  v: number;
}

/**
 * Gusano en pantalla. Sigue al enemigo del estado (posicion y si muerde) en `sync`, y anima lo que
 * la escena le cuenta: mordisco, golpe, muerte o huida. No decide nada (ADR-0008).
 */
export class WormView implements EnemyView {
  private readonly holder: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly segments: Phaser.GameObjects.Image[];
  private readonly shadow: Phaser.GameObjects.Image;
  /** Rayas de velocidad del acelerado (T-008): ocultas si va a su velocidad. */
  private readonly streak: Phaser.GameObjects.Image;
  /** Acelerado por su ronda (`Enemy.haste`): lleva las rayas siempre. Con la sobrecarga (T-042), tambien mientras dure. */
  private readonly hasted: boolean;
  /** Medallita de nivel (T-009), o null si es de nivel 1 o el Creeper. */
  private readonly medal: Phaser.GameObjects.Image | null = null;
  /** Disquete a la espalda (los copiones, T-025), o null. */
  private readonly pack: Phaser.GameObjects.Image | null = null;
  /** Gorro (el juglar, T-025), o null. */
  private readonly hat: Phaser.GameObjects.Image | null = null;
  /** Copia de un copion (T-025): pequena, algo transparente y con su parpadeo de interferencia. */
  private readonly clone: boolean;
  private glitchTimer?: Phaser.Time.TimerEvent;
  private footY: number;
  private cellWidth: number;
  private scale: number;
  /** Tamano respecto al gusano: el de su tipo, algo mayor cuanto mas nivel (T-009). */
  private readonly size: number;
  /** Cada gusano ondula con su propio desfase para que no vayan al unisono. */
  private readonly phaseOffset = Math.random() * Math.PI * 2;
  private phase = 0;
  /** 1 mientras avanza, 0 mientras muerde; se suaviza para que el cuerpo no salte al pararse. */
  private walk = 1;
  private readonly look: KindLook;
  /** Su postura: la del gusano o, Elk Cloner (T-026), la suya. */
  private readonly pose: WormPose;
  /** Adornos pegados a sus anillos (T-026). */
  private readonly trims: Phaser.GameObjects.Image[] = [];
  private headKey: string;
  private readonly armor: Armor | null = null;
  private readonly rise: Pulse = { v: 1 };
  private readonly lunge: Pulse = { v: 0 };
  private readonly hurt: Pulse = { v: 0 };
  private readonly kick: Pulse = { v: 0 };
  /** Salto al recibir una explosion. */
  private readonly hop: Pulse = { v: 0 };
  /** Tiritona del ralentizado. */
  private readonly shiver: Pulse = { v: 0 };
  /** Empujon del muro de hielo (T-021): de 1 (donde estaba) a 0 (donde esta), y cuanto se movio en casillas. */
  private readonly shove: Pulse = { v: 0 };
  private shoveDx = 0;
  /** Aplastado al aterrizar de un salto (Creeper, T-008). */
  private readonly thud: Pulse = { v: 0 };
  /** Copia recien salida (T-025): nace del tamano de su copion (1) y encoge al suyo (0). */
  private readonly shrink: Pulse = { v: 0 };
  /** Parpadeo de interferencia de la copia (T-025). */
  private readonly glitch: Pulse = { v: 0 };
  private flashTimer?: Phaser.Time.TimerEvent;
  private readonly flames: Phaser.GameObjects.Image[];
  private burning = false;
  private burnTimer?: Phaser.Time.TimerEvent;
  private readonly frost: Phaser.GameObjects.Image[];
  private chilled = false;
  private chillTimer?: Phaser.Time.TimerEvent;
  /** Ya se pinto una vez: desde entonces, lo que cambia en el estado se anima. */
  private synced = false;
  /** Aura de los tramos de nivel (T-030), o null por debajo del 5, en Creeper o en el nivel grafico Bajo. */
  private readonly aura: WormAura | null = null;
  /** Reloj de la escena en el ultimo `sync`: el aura avanza lo que paso desde entonces (y nada durante la pausa). */
  private lastSync = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    enemy: Enemy,
    emerge: boolean,
    /** Sale del suelo pasado este tiempo, sin verse antes (el Creeper aterriza desde donde se preparaba, T-008). */
    emergeDelayMs = 0,
    /** Otro aspecto que el de su tipo: la galeria de jefes (`/proposals/jefes.html`) pinta asi las propuestas. */
    look: KindLook = KIND_LOOK[enemy.kind as WormKind],
    /** Otro tinte que el del brote de su variante (T-041): la galeria `/proposals/variantes.html` pinta asi las propuestas. */
    tint: TroopTint | null = null,
  ) {
    // Variante de color (T-041): la tropa reclutada por otro brote, con su tinte. Lo demas (medallita, aura, llamas), igual.
    this.look = variantLook(scene, look, enemy.variant, tint);
    this.pose = this.look.pose ?? WORM_POSE;
    this.clone = enemy.clone;
    this.size = this.look.size * (1 + (enemy.level - 1) * WORM_LOOK.growthPerLevel) * (enemy.clone ? CLONE.size : 1);
    this.headKey = this.look.head.idle;
    this.footY = enemy.lane + WORM_LOOK.footY;
    const ground = perspective.toScreen({ x: enemy.x, y: this.footY });
    this.cellWidth = perspective.cellWidthAt({ x: enemy.x, y: this.footY });
    this.scale = (this.cellWidth / WORM_LOOK.unitsPerCell) * this.size;
    const depth = entityDepth(ground.y);

    this.shadow = scene.add
      .image(ground.x, ground.y, TEX.shadow)
      .setDisplaySize(this.cellWidth * 0.95 * this.size, this.cellWidth * 0.24 * this.size)
      .setDepth(depth - 0.5);
    this.segments = this.pose.segments.map((s) => scene.add.image(s.x, s.y, this.look.segment).setScale(s.scale * artInv()));
    this.trims = (this.look.trims ?? []).map((trim) =>
      scene.add
        .image(0, 0, trim.key)
        .setOrigin(trim.origin.x / trim.size.width, trim.origin.y / trim.size.height)
        .setScale(trim.scale * artInv()),
    );
    this.streak = scene.add
      .image(WORM_LOOK.streak.x, WORM_LOOK.streak.y, TEX.hasteStreak)
      .setOrigin(0, 0.5)
      .setScale(WORM_LOOK.streak.scale * artInv())
      .setVisible(enemy.haste > 1);
    this.hasted = enemy.haste > 1;
    const { head } = WORM_SIZE;
    const headOrigin = { x: head.cx / head.width, y: head.cy / head.height };
    this.head = scene.add.image(this.pose.head.x, this.pose.head.y, this.headKey).setOrigin(headOrigin.x, headOrigin.y).setScale(artInv());
    // Acorazado: casco sobre la cabeza y una placa sobre cada anillo, que tapa el anillo siguiente (hacia la cabeza).
    const armorLook = this.look.armor;
    if (armorLook) {
      this.armor = {
        helmet: scene.add.image(0, 0, armorLook.helmet).setOrigin(headOrigin.x, headOrigin.y).setScale(artInv()),
        plates: this.pose.segments.map((s) => scene.add.image(s.x, s.y, armorLook.plate).setScale(s.scale * artInv())),
        lost: 0,
      };
    }
    // Copiones (T-025): el disquete a la espalda; sus copias no lo llevan. Juglar: su gorro, como el casco.
    if (this.look.pack && !enemy.clone) {
      this.pack = scene.add.image(0, 0, this.look.pack).setScale(WORM_LOOK.pack.scale * artInv());
    }
    if (this.look.hat) {
      this.hat = scene.add.image(0, 0, this.look.hat).setOrigin(HAT_SIZE.cx / HAT_SIZE.width, HAT_SIZE.cy / HAT_SIZE.height).setScale(artInv());
    }
    // Medallita de nivel (T-009): la misma de las disparadoras, en la nuca.
    if (enemy.level > 1 && !isBoss(enemy.kind)) {
      this.medal = scene.add.image(0, 0, medalTexture(enemy.level)).setScale(WORM_LOOK.medal.scale * artInv());
    }
    // Llamas del quemado: ocultas hasta que arde. Van por encima del cuerpo.
    this.flames = WORM_LOOK.flames.map(() =>
      scene.add
        .image(0, 0, TEX.flame)
        .setOrigin(0.5, FLAME_SIZE.footY / FLAME_SIZE.height)
        .setVisible(false),
    );
    // Escarcha del ralentizado: oculta hasta que va lento.
    this.frost = WORM_LOOK.frost.map((f) =>
      scene.add
        .image(0, 0, TEX.frost)
        .setOrigin(0.5, FROST_SIZE.footY / FROST_SIZE.height)
        .setAngle(f.angle)
        .setVisible(false),
    );
    // De la cola a la cabeza: cada anillo (con su placa) tapa al de atras y la cabeza va encima de todo, con el casco,
    // la escarcha y las llamas.
    const armor = this.armor;
    const body = this.segments.flatMap((segment, i) => (armor ? [segment, armor.plates[i]] : [segment]));
    const trimsOf = (behind: boolean) => this.trims.filter((_, i) => (this.look.trims ?? [])[i].behind === behind);
    const back = this.pack ? [this.pack] : [];
    const top = [this.head, ...(armor ? [armor.helmet] : []), ...(this.hat ? [this.hat] : []), ...(this.medal ? [this.medal] : [])];
    this.holder = scene.add
      .container(ground.x, ground.y, [this.streak, ...trimsOf(true), ...body, ...trimsOf(false), ...back, ...top, ...this.frost, ...this.flames])
      .setDepth(depth);
    // Aura de los tramos de nivel (T-030): detras y alrededor del cuerpo, sin tocar su dibujo. La de una copia, a su tamano.
    const tier = auraTier(enemy.kind, enemy.level);
    if (tier > 0 && fx.quality.auras > 0) this.aura = new WormAura(scene, fx, tier, this.auraHost(), emerge ? emergeDelayMs : 0);
    this.lastSync = scene.time.now;
    if (enemy.clone) {
      this.holder.setAlpha(WORM_LOOK.clone.alpha);
      this.glitchTimer = scene.time.addEvent({
        delay: WORM_LOOK.clone.glitchMs,
        startAt: Math.random() * WORM_LOOK.clone.glitchMs,
        loop: true,
        callback: () => this.flicker(),
      });
    }

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
   * Coloca y pone en postura al gusano segun el estado. Se llama en cada fotograma mientras vive. El cuerpo ondula segun
   * lo que avanza; `stride` suma lo que "anda" sin moverse de su sitio, como en una cinta (portada del menu, T-011).
   */
  /** La sobrecarga (T-042) encendida o apagada: con ella, las rayas del acelerado aunque su ronda no lo acelere. */
  rush(on: boolean): void {
    this.streak.setVisible(this.hasted || on);
  }

  sync(enemy: Enemy, stride = 0): void {
    const stats = ENEMIES[enemy.kind];
    // El carril solo cambia al saltar (Creeper): entonces cambian tambien el tamano, la profundidad y el suelo.
    const pose = jumpPose(enemy);
    this.footY = pose.lane + WORM_LOOK.footY;
    // Empujado por el muro de hielo (T-021): se pinta deslizandose desde donde estaba.
    const foot = { x: enemy.x + this.shoveDx * this.shove.v, y: this.footY };
    const ground = perspective.toScreen(foot);
    this.cellWidth = perspective.cellWidthAt(foot);
    this.scale = (this.cellWidth / WORM_LOOK.unitsPerCell) * this.size;
    this.holder.setDepth(entityDepth(ground.y));
    this.shadow.setDepth(entityDepth(ground.y) - 0.5);
    const walking = enemy.attackMs === null && enemy.jump === null;
    this.walk += ((walking ? 1 : 0) - this.walk) * 0.25;
    if (walking) this.phase = this.phaseOffset - (enemy.x - stride) * WORM_LOOK.wavesPerCell * Math.PI * 2;
    // Se echa atras mientras espera el mordisco (o carga el escupitajo, o el juglar toma aire) y se lanza al atacar (ver
    // chomp, spat y sang).
    const chargeMs = stats.attack === 'spit' ? WORM_LOOK.spitChargeMs : stats.attack === 'verse' ? stats.warnMs : stats.firstBiteMs;
    const windup = walking ? 0 : Phaser.Math.Clamp(1 - (enemy.attackMs ?? 0) / chargeMs, 0, 1);
    const lean = windup * windup;
    // El escupidor se yergue para escupir: la cabeza sube mas que al morder. El juglar, algo menos, y se hincha (F-04).
    const rear = stats.attack === 'spit' ? 2 : stats.attack === 'verse' ? WORM_LOOK.minstrel.rear : 1;
    // Elk Cloner (T-026) se hincha al tomar aire para un verso, como el juglar, y mas aun, temblando, mientras anuncia el
    // poema entero.
    const recite = recitePose(enemy);
    const tremble = recite.poem > 0 ? Math.sin(this.scene.time.now / 45) * 0.012 * recite.poem : 0;
    const swell =
      stats.attack === 'verse'
        ? Math.sin((windup * Math.PI) / 2) * WORM_LOOK.minstrel.swell
        : Math.max(Math.sin((recite.inhale * Math.PI) / 2) * WORM_LOOK.minstrel.swell * 0.8, recite.poem * WORM_LOOK.minstrel.swell * 1.2 + tremble);
    const rise = this.rise.v;
    const hurt = this.hurt.v;
    const lunge = this.lunge.v;
    // Copia recien salida (T-025): del tamano de su copion al suyo.
    const shrink = 1 + this.shrink.v * (1 / CLONE.size - 1);

    const grow = this.scale * (0.3 + 0.7 * rise) * shrink * (1 + swell);
    const hop = Math.sin(this.hop.v * Math.PI) * 26 * this.scale;
    const shiver = Math.sin(this.shiver.v * Math.PI * 9) * 3.5 * this.shiver.v;
    // Salto de carril: agachado tiembla y se aplasta; en el aire sube en curva y se estira; al caer se aplasta.
    const look = WORM_LOOK.jump;
    const span = enemy.jump ? Math.abs(enemy.jump.to - enemy.jump.from) : 0;
    const lift = pose.lift * this.cellWidth * (look.liftCells + look.liftPerLane * span);
    const shake = pose.crouch * Math.sin(this.scene.time.now / 28) * look.crouchShake;
    const squash = pose.crouch * look.crouchSquash + this.thud.v * 0.22 - pose.lift * 0.08;
    const jitter = this.glitch.v * Math.sin(this.scene.time.now / 11) * WORM_LOOK.clone.glitchShift;
    this.holder
      .setPosition(ground.x + (this.kick.v * 10 + shiver + shake + jitter) * this.scale, ground.y + (1 - rise) * 20 * this.scale - hop - lift)
      .setScale(grow * (1 + hurt * 0.1 + squash * 0.6), grow * (1 - hurt * 0.1 - squash));
    this.shadow
      .setPosition(ground.x, ground.y)
      .setDisplaySize(this.cellWidth * 0.95 * this.size * (1 - pose.lift * 0.35), this.cellWidth * 0.24 * this.size * (1 - pose.lift * 0.35))
      .setAlpha(Math.min(1, rise) * (1 - pose.lift * 0.45));
    // Acelerado: las rayas titilan mientras avanza y se apagan si se para.
    if (this.streak.visible) this.streak.setAlpha(this.walk * (0.65 + 0.35 * Math.sin(this.phase * 1.7)));

    const last = this.segments.length - 1;
    const body = this.pose;
    this.segments.forEach((image, i) => {
      const seg = body.segments[i];
      // La joroba va de la cola hacia la cabeza, como una oruga de verdad.
      const hump = Math.max(0, Math.sin(this.phase + (last - i) * 0.9)) * this.walk;
      const neck = i === last ? lean * 4 - lunge * 6 : 0;
      image.setPosition(seg.x - hump * body.hump.x + neck, seg.y - hump * body.hump.y);
    });
    (this.look.trims ?? []).forEach((trim, i) => {
      const segment = this.segments[trim.segment];
      this.trims[i].setPosition(segment.x + trim.x, segment.y + trim.y);
    });
    const bob = Math.sin(this.phase * 2) * 2.5 * this.walk;
    // Anunciando el poema, Elk Cloner echa la cabeza atras y mira al cielo.
    const gaze = recite.poem > 0 ? Math.min(1, recite.poem * 4) : 0;
    this.head
      .setPosition(body.head.x + lean * 10 - lunge * 16 + gaze * 5, body.head.y - lean * 7 * rear + lunge * 9 + bob - gaze * 6)
      .setAngle(lean * 10 * rear - lunge * 12 + Math.sin(this.phase) * 4 * this.walk + gaze * 10);
    const head = this.look.angryHead && isEnraged(enemy) ? this.look.angryHead : this.look.head;
    // Agachado para saltar o en el aire, pone la cara decidida. El juglar, al soltar el verso, pone cara de recitar. Elk
    // Cloner tiene ademas su cara de tomar aire y la del poema entero.
    const jumping = enemy.jump !== null;
    const face =
      hurt > 0.25
        ? head.hurt
        : head.release && lunge > 0.12
          ? head.release
          : head.poem && recite.poem > 0
            ? head.poem
            : head.inhale && recite.inhale > 0.3
              ? head.inhale
              : lunge > 0.45
                ? head.idle
                : windup > 0.35 || jumping
                  ? head.attack
                  : head.idle;
    this.setHead(face);
    if (this.medal) {
      this.medal.setPosition(this.head.x + WORM_LOOK.medal.x, this.head.y + WORM_LOOK.medal.y).setAngle(this.head.angle * 0.6);
    }
    if (this.hat) this.hat.setPosition(this.head.x, this.head.y).setAngle(this.head.angle);
    if (this.pack) {
      const [, middle, front] = this.segments;
      const { pack } = WORM_LOOK;
      const tilt = (front.y - middle.y - (this.pose.segments[2].y - this.pose.segments[1].y)) * 1.5;
      this.pack.setPosition((middle.x + front.x) / 2 + pack.x, Math.min(middle.y, front.y) + pack.y).setAngle(pack.angle - tilt);
    }
    if (this.armor) this.syncArmor(hpFraction(enemy));

    this.setBurning(enemy.burn !== null);
    if (this.burning) {
      const [onHead, onBack] = WORM_LOOK.flames;
      this.flames[0].setPosition(this.head.x + onHead.x, this.head.y + onHead.y);
      this.flames[1].setPosition(this.segments[1].x + onBack.x, this.segments[1].y + onBack.y);
    }
    this.setChilled(enemy.slow !== null);
    if (this.chilled) {
      const [onNape, onTail] = WORM_LOOK.frost;
      this.frost[0].setPosition(this.head.x + onNape.x, this.head.y + onNape.y);
      this.frost[1].setPosition(this.segments[0].x + onTail.x, this.segments[0].y + onTail.y);
    }
    // El aura avanza lo que paso desde el ultimo fotograma, sin saltos tras una pausa larga.
    const now = this.scene.time.now;
    this.aura?.sync(Math.min(100, Math.max(0, now - this.lastSync)));
    this.lastSync = now;
  }

  /** Mordisco: la cabeza se lanza hacia delante y cierra la boca. */
  chomp(): void {
    this.pulse(this.lunge, 300);
  }

  /** Aterriza de un salto de carril (Creeper, T-008): se aplasta contra el suelo y rebota. */
  landed(): void {
    this.pulse(this.thud, 380);
  }

  /** Pies en pantalla (en el suelo, aunque este en el aire) y ancho de casilla ahi. */
  ground(): { x: number; y: number; cellWidth: number } {
    return { x: this.shadow.x, y: this.shadow.y, cellWidth: this.cellWidth };
  }

  /** ¿Cae el punto de pantalla sobre el cuerpo? Una caja holgada (`WORM_LOOK.hitBox`) que sigue su postura y su tamano. */
  contains(x: number, y: number): boolean {
    const { holder } = this;
    if (!holder.active || !holder.visible || holder.scaleX === 0 || holder.scaleY === 0) return false;
    const lx = (x - holder.x) / holder.scaleX;
    const ly = (y - holder.y) / holder.scaleY;
    const box = this.pose.hitBox;
    return lx >= box.left && lx <= box.right && ly >= box.top && ly <= box.bottom;
  }

  /** Profundidad del cuerpo, para poner encima lo que lo acompana. */
  depth(): number {
    return this.holder.depth;
  }

  /**
   * Punto de la cabeza en pantalla, en pixeles de la textura de la cabeza respecto a su centro (por ejemplo, la antena
   * o la pantalla del Creeper).
   */
  headPoint(dx = 0, dy = 0): { x: number; y: number } {
    return {
      x: this.holder.x + (this.head.x + dx) * this.holder.scaleX,
      y: this.holder.y + (this.head.y + dy) * this.holder.scaleY,
    };
  }

  /**
   * Punto de un anillo en pantalla (0 es la cola), en pixeles de diseno respecto a su centro: sigue la joroba al
   * andar. Lo usa la galeria de propuestas de adornos de nivel (`/proposals/gusanos.html`) para clavar algo en la cola.
   */
  segmentPoint(index: number, dx = 0, dy = 0): { x: number; y: number } {
    const segment = this.segments[Math.max(0, Math.min(this.segments.length - 1, index))];
    return {
      x: this.holder.x + (segment.x + dx) * this.holder.scaleX,
      y: this.holder.y + (segment.y + dy) * this.holder.scaleY,
    };
  }

  /** Escala del cuerpo en pantalla (pixeles de pantalla por pixel de diseno), con su tamano y su postura. */
  bodyScale(): number {
    return Math.abs(this.holder.scaleX);
  }

  /**
   * Escupe (T-007): la cabeza se lanza hacia delante con un chorrito de moco en la boca. El escupitajo lo pinta
   * su propia vista.
   */
  spat(): void {
    this.pulse(this.lunge, 280);
    const mouth = this.mouth();
    this.fx.goo(mouth.x, mouth.y, 4);
  }

  /**
   * El juglar toma aire (T-025, F-04): lo que se hincha sale del estado en `sync`; aqui, un destello rosa en la boca para
   * que se vea que va a soltar algo.
   */
  inhale(): void {
    const mouth = this.mouth();
    this.fx.glow(mouth.x, mouth.y, this.cellWidth * 0.5 * this.size, 0xff8ad8, this.holder.depth + 0.4, 360);
  }

  /** El juglar suelta su verso (T-025): se lanza con la cara de recitar y le salen notas de la boca. El verso lo pinta su vista. */
  sang(): void {
    this.pulse(this.lunge, WORM_LOOK.minstrel.singMs);
    const mouth = this.mouth();
    this.fx.notes(mouth.x, mouth.y, 4);
    this.fx.ring(mouth.x, mouth.y, this.cellWidth * 0.45 * this.size, 0xff5fd2, this.holder.depth + 0.4, 260, 0.7);
  }

  /**
   * Copia recien salida de un copion (T-025, F-01): nace del tamano de su copion, en blanco, y encoge al suyo con un
   * rebote. Los anillos y el destello verdes de "copiarse" los pone la escena.
   */
  popOut(): void {
    this.rise.v = 1;
    this.shrink.v = 1;
    this.scene.tweens.add({ targets: this.shrink, v: 0, duration: WORM_LOOK.clone.popMs, ease: 'Back.Out' });
    this.flash(0xffffff, 140);
  }

  /** Golpe recibido: destello blanco, retroceso y cara de "ay". Contra la armadura, ademas, saltan esquirlas de acero. */
  hit(): void {
    this.pulse(this.hurt, 260);
    this.pulse(this.kick, 200);
    this.flash();
    if (this.armor && this.armor.lost < this.armor.plates.length) {
      this.fx.scrap(this.holder.x - 30 * this.scale, this.holder.y - 60 * this.scale, 2);
    }
  }

  /** Boca en pantalla: de ahi salen los escupitajos. */
  mouth(): { x: number; y: number } {
    const k = this.holder.scaleX;
    return {
      x: this.holder.x + (this.head.x + WORM_LOOK.mouth.x) * k,
      y: this.holder.y + (this.head.y + WORM_LOOK.mouth.y) * this.holder.scaleY,
    };
  }

  /** Sale de una casilla del muro de hielo (T-021): resbala hasta su sitio nuevo, tiritando y con un destello helado. */
  shoved(fromX: number, toX: number): void {
    this.shoveDx = fromX - toX;
    this.scene.tweens.killTweensOf(this.shove);
    this.shove.v = 1;
    this.scene.tweens.add({ targets: this.shove, v: 0, duration: 300, ease: 'Cubic.Out' });
    this.frosted();
  }

  /** Alcanzado por una explosion (mina, T-004): golpe fuerte, salto y retroceso. */
  blasted(): void {
    this.pulse(this.hurt, 420);
    this.pulse(this.kick, 320);
    this.pulse(this.hop, 380);
    this.flash();
  }

  /** Alcanzado por la mina de hielo (T-005): se queda tieso de golpe, destella en azul helado, tirita y suelta copos. */
  frosted(): void {
    this.pulse(this.hurt, 320);
    this.pulse(this.shiver, 520);
    this.flash(WORM_LOOK.frozenTint, 160);
    this.fx.frost(this.holder.x, this.holder.y - 50 * this.scale, 6);
  }

  /**
   * Sin vida: destello, se infla un instante y se encoge soltando pixeles. Si ardia, queda tostado y humea;
   * si iba ralentizado (y no ardia), queda congelado y se rompe en esquirlas.
   */
  die(): void {
    const charred = this.burning;
    const frozen = this.chilled && !charred;
    this.stopReactions();
    this.aura?.fadeOut(300);
    // Al acorazado le sale volando el casco; al copion (T-025), el disquete, del que sale su copia; al juglar, el gorro.
    if (this.armor) this.fling(this.armor.helmet, -1, 1.4);
    if (this.pack) this.fling(this.pack, 1, 1.8);
    if (this.hat) this.fling(this.hat, -1, 1.2);
    const parts = this.bodyParts();
    parts.forEach((part) => part.setTint(frozen ? WORM_LOOK.frozenTint : 0xffffff).setTintMode(Phaser.TintModes.FILL));
    this.head.setTexture(this.look.head.hurt);
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
    this.fx.ring(x, y, this.cellWidth * 0.9, frozen ? 0xbfeaff : 0xd6b8ff, depth, 300);
    this.fx.glow(x, y, this.cellWidth, 0x39ff88, depth, 320);
    this.scene.tweens.add({
      targets: this.holder,
      scaleX: this.holder.scaleX * 1.2,
      scaleY: this.holder.scaleY * 1.2,
      duration: 90,
      ease: 'Quad.Out',
      onComplete: () => {
        parts.forEach((part) => {
          if (charred) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(WORM_LOOK.charredTint);
          else if (frozen) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(WORM_LOOK.chillTint);
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

  /** Cruzo el borde izquierdo: sigue un poco por el camino y se mete bajo tierra. */
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

  /** Derrota: los gusanos que quedan saltan de contentos. */
  cheer(): void {
    this.stopReactions();
    this.setHead(this.look.head.idle);
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

  /** Sale del agujero de su carril: brota de golpe con tierra y bits de la corrupcion. */
  private emerge(ground: { x: number; y: number }): void {
    this.rise.v = 0;
    this.scene.tweens.add({ targets: this.rise, v: 1, duration: 560, ease: 'Back.Out' });
    this.fx.dirt(ground.x, ground.y, 10);
    this.fx.bits(ground.x, ground.y - this.cellWidth * 0.1, 8);
    this.fx.glow(ground.x, ground.y, this.cellWidth * 1.1, 0x39ff88, this.holder.depth - 0.4, 420);
  }

  /**
   * Empieza o deja de arder: llamas que titilan, un tinte anaranjado y, cada tanto, cara de "ay" con brasas.
   * Sigue al estado (`enemy.burn`), asi que vale tambien al continuar la partida.
   */
  private setBurning(burning: boolean): void {
    if (burning === this.burning) return;
    this.burning = burning;
    this.scene.tweens.killTweensOf(this.flames);
    if (burning) {
      this.flames.forEach((flame, i) => {
        const base = WORM_LOOK.flames[i].scale * artInv();
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
        delay: WORM_LOOK.burnWinceMs,
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

  /**
   * Empieza o deja de ir lento (T-005): le salen cristales de escarcha, el cuerpo tira a azul y cada tanto tirita
   * y suelta un copo. Al acabarse, la escarcha se derrite con un poco de vaho. Sigue al estado (`enemy.slow`).
   * Lo mas lento del gusano no hay que animarlo: ondula segun lo que avanza, asi que ondula mas despacio solo.
   */
  private setChilled(chilled: boolean): void {
    if (chilled === this.chilled) return;
    this.chilled = chilled;
    this.scene.tweens.killTweensOf(this.frost);
    if (chilled) {
      this.frost.forEach((crystal, i) => {
        const base = WORM_LOOK.frost[i].scale * artInv();
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
        delay: WORM_LOOK.shiverMs,
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

  /**
   * Armadura del acorazado (T-007): sigue a la cabeza y a los anillos, y suelta placas de la cola hacia la cabeza
   * segun la vida que le queda (`hpRatio`). Sale del estado, asi que una partida continuada se pinta igual.
   */
  private syncArmor(hpRatio: number): void {
    const armor = this.armor as Armor;
    const keep = Math.ceil(Phaser.Math.Clamp(hpRatio, 0, 1) * armor.plates.length);
    while (armor.lost < armor.plates.length - keep) {
      const plate = armor.plates[armor.lost++];
      // La primera vez que se pinta (partida continuada) se quitan sin animar.
      if (this.synced) this.fling(plate, 1, 1);
      plate.setVisible(false);
    }
    armor.plates.forEach((plate, i) => plate.setPosition(this.segments[i].x, this.segments[i].y));
    armor.helmet.setPosition(this.head.x, this.head.y).setAngle(this.head.angle);
    this.synced = true;
  }

  /**
   * Una pieza de la armadura sale despedida: una copia suelta salta, gira y cae mientras se desvanece, con
   * esquirlas. La pieza del cuerpo se oculta. `dir` es hacia donde gira (1, hacia atras) y `lift`, cuanto salta.
   */
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
    const rise = this.cellWidth * 0.32 * lift;
    this.scene.tweens.add({ targets: piece, x: x + dir * this.cellWidth * 0.35, angle: part.angle + dir * 220, duration: 620 });
    this.scene.tweens.add({
      targets: piece,
      y: y - rise,
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

  /** Lo que se tine y destella: cabeza, anillos y, en el acorazado, su armadura; tambien el disquete y el gorro (T-025). */
  private bodyParts(): Phaser.GameObjects.Image[] {
    const armor = this.armor ? [this.armor.helmet, ...this.armor.plates] : [];
    const extras = [...(this.pack ? [this.pack] : []), ...(this.hat ? [this.hat] : []), ...this.trims];
    return [this.head, ...this.segments, ...armor, ...extras];
  }

  /**
   * Lo que el aura (T-030) sabe del cuerpo: sus pies y su profundidad. La de una copia (T-025) va a su tamano: el aura mide
   * en anchos de casilla.
   */
  private auraHost(): AuraHost {
    if (!this.clone) return this;
    return {
      ground: () => {
        const ground = this.ground();
        return { ...ground, cellWidth: ground.cellWidth * CLONE.size };
      },
      depth: () => this.depth(),
    };
  }

  /** Parpadeo de interferencia de la copia (T-025): tiembla de lado y se apaga un instante, con algun pixel suelto. */
  private flicker(): void {
    if (!this.holder.active || this.hurt.v > 0.5) return;
    this.pulse(this.glitch, 200);
    this.scene.tweens.add({ targets: this.holder, alpha: WORM_LOOK.clone.alpha * 0.55, duration: 70, yoyo: true });
    if (this.fx.quality.extras) this.fx.bits(this.holder.x, this.holder.y - 40 * this.scale, 3);
  }

  /** Tinte de reposo: azul frio mientras va lento, anaranjado mientras arde (con las dos cosas, el frio). */
  private applyRestingTint(): void {
    for (const part of this.bodyParts()) {
      if (this.chilled) part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(WORM_LOOK.chillTint);
      else if (this.burning) part.setTintMode(Phaser.TintModes.ADD).setTint(WORM_LOOK.burnTint);
      else part.clearTint();
    }
  }

  private pulse(value: Pulse, durationMs: number): void {
    this.scene.tweens.killTweensOf(value);
    value.v = 1;
    this.scene.tweens.add({ targets: value, v: 0, duration: durationMs, ease: 'Quad.Out' });
  }

  private flash(color = 0xffffff, durationMs = 70): void {
    const parts = this.bodyParts();
    this.flashTimer?.remove();
    parts.forEach((part) => part.setTint(color).setTintMode(Phaser.TintModes.FILL));
    this.flashTimer = this.scene.time.delayedCall(durationMs, () => {
      this.flashTimer = undefined;
      this.applyRestingTint();
    });
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
    this.scene.tweens.killTweensOf([this.rise, this.lunge, this.hurt, this.kick, this.hop, this.shiver, this.thud, this.shrink, this.glitch]);
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
