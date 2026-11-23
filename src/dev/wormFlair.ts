import * as Phaser from 'phaser';
import { type Ctx, circle, ellipse } from '../game/view/canvasKit';
import type { Effects } from '../game/view/effects';
import { MEDAL_TIERS, medalTier } from '../game/view/levelMedal';
import { TEX, artInv } from '../game/view/textures';
import type { WormView } from '../game/view/wormView';

/**
 * Propuestas de adorno para los tramos de nivel de los gusanos (5, 10, 15 y 20), como el jardincito de las disparadoras
 * (T-027): algo que se vea de un vistazo sin tocar el dibujo del gusano, del acorazado ni del escupidor. Solo en la
 * galeria de desarrollo (`/propuestas/gusanos.html`). Carmine eligio el aura (21 nov 2026) y ya esta en el juego (T-030): la pinta el
 * propio gusano (`src/game/view/wormAura.ts`), asi que aqui no hace nada. Las otras tres se quedan como referencia, y
 * en la galeria salen combinadas con ella.
 *
 * Cada una va en un sitio distinto del cuerpo, para no tapar la cara, la antena de serie ni la medallita de la nuca:
 * - Huella corrupta: en el suelo, bajo el gusano (la version enemiga del jardincito).
 * - Bits en orbita: alrededor de la cabeza.
 * - Banderin de la IA: clavado en la cola.
 * - Aura: una luz muy suave que sube del suelo por detras y se apaga un poco por encima de la cabeza.
 *
 * El tramo es el de la medallita (`medalTier`): 1 plata (5 a 9), 2 oro (10 a 14), 3 rubi (15 a 19) y 4 cristal (20),
 * con sus colores (`MEDAL_TIERS`), y debajo del 5 no hay adorno. En el brote 1 los enemigos llegan al nivel 10: plata y
 * oro; rubi y cristal quedan para brotes con niveles mas altos. Medidas en anchos de casilla (`w`). Respeta los niveles
 * graficos: brillos aditivos solo con `glows`, destellos y estelas solo con `extras`, particulas espaciadas con
 * `ambientDelay`.
 */

export type WormFlairId = 'trail' | 'orbit' | 'banner' | 'aura';

export const WORM_FLAIRS: ReadonlyArray<{ id: WormFlairId; letter: string; name: string; about: string }> = [
  {
    id: 'trail',
    letter: 'A',
    name: '+ Huella corrupta',
    about:
      'En el suelo, bajo el gusano: la version enemiga del jardincito. Lleva consigo un charco de suelo corrupto y va dejando pixeles que se apagan en el cesped. Plata: unos pixeles. Oro: salen pistas de circuito con nodos. Rubi: una grieta que brilla y suelta bits. Cristal: el charco parpadea como una imagen rota.',
  },
  {
    id: 'orbit',
    letter: 'B',
    name: '+ Bits en órbita',
    about:
      'Cubitos de datos del color del tramo que dan vueltas a la cabeza, por delante y por detras. Se cuentan de un vistazo: uno en el 5, dos en el 10, tres en el 15 y cuatro en el 20, que ademas cambian de color y dejan estela.',
  },
  {
    id: 'banner',
    letter: 'C',
    name: '+ Banderín de la IA',
    about:
      'Un mastil clavado en la cola con un banderin que ondea hacia atras, con el simbolo de la IA. Crece con cada tramo: banderola de plata, bandera de oro con cola de golondrina, estandarte de rubi con flecos y estandarte de cristal que brilla.',
  },
  {
    id: 'aura',
    letter: 'D',
    name: 'Aura ★',
    about:
      'Elegida y ya en el juego (T-030; en Bajo no se ve y en Medio va sin motas ni velo delantero). Una luz muy suave del color del tramo que sube del suelo por detras del gusano, en velos que se elevan y se apagan un poco por encima de su cabeza, con un halo a sus pies y alguna mota que sube. Cada tramo es algo mas alta e intensa y lleva mas velos; la de cristal cambia de color.',
  },
];

/** Tramo del adorno: 0 sin adorno (niveles 1 a 4), 1 a 4 como la medallita. */
export const wormFlairTier = (level: number): number => (level >= 5 ? medalTier(level) : 0);

const hex = (color: string): number => Number.parseInt(color.slice(1), 16);

function rgba(color: string, alpha: number): string {
  const n = hex(color);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Color del arcoiris para `t` en [0, 1): el tramo de cristal. */
function rainbow(t: number): number {
  return Phaser.Display.Color.HSVToRGB(((t % 1) + 1) % 1, 0.45, 1).color;
}

/** Colores de la corrupcion (los del suelo morado y sus luces, como en el tablero). */
const CORRUPT = { soil: '#4a3366', soilLight: '#6a4d8c', soilDark: '#2b1d3d', neon: '#39ff88', neonSoft: 'rgba(57, 229, 140, 0.8)' } as const;

// ---------------------------------------------------------------------------
// Texturas (pixeles de diseno: 160 por casilla, como el gusano)

const PATCH = { width: 220, height: 96 } as const;
const BIT = { width: 28, height: 30 } as const;
const POLE = { width: 14, height: 120 } as const;
const FLAG = { width: 78, height: 60 } as const;

const key = (kind: string, tier = 0) => `dev-wflair-${kind}-${tier}`;

/** Pinta las texturas de los adornos a la resolucion del nivel grafico (llamar despues de `registerTextures`). */
export function registerWormFlairTextures(scene: Phaser.Scene): void {
  const scale = 1 / artInv();
  const paint = (name: string, width: number, height: number, painter: (ctx: Ctx) => void) => {
    if (scene.textures.exists(name)) return;
    const texture = scene.textures.createCanvas(name, Math.ceil(width * scale), Math.ceil(height * scale));
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.scale(scale, scale);
    painter(ctx);
    texture.refresh();
  };
  paint(key('pole'), POLE.width, POLE.height, paintPole);
  for (let tier = 1; tier <= 4; tier++) {
    paint(key('patch', tier), PATCH.width, PATCH.height, (ctx) => paintPatch(ctx, tier));
    paint(key('bit', tier), BIT.width, BIT.height, (ctx) => paintBit(ctx, tier));
    paint(key('flag', tier), FLAG.width, FLAG.height, (ctx) => paintFlag(ctx, tier));
  }
}

/** Numeros pseudoaleatorios fijos: el mismo dibujo cada vez. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Charco de suelo corrupto visto de lado (ya aplastado): manchas moradas con el borde mordido en pixeles, pixeles del
 * color del tramo y, segun el tramo, pistas de circuito, una grieta que brilla y cristales de colores.
 */
function paintPatch(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const rand = seeded(97 + tier * 13);
  const cx = PATCH.width / 2;
  const cy = PATCH.height / 2;
  const rx = 62 + tier * 10;
  const ry = 20 + tier * 3;
  // Manchas que forman un charco irregular.
  const blobs: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    blobs.push([cx + Math.cos(a) * rx * 0.55, cy + Math.sin(a) * ry * 0.5, rx * (0.45 + rand() * 0.2), ry * (0.55 + rand() * 0.25)]);
  }
  for (const [x, y, bx, by] of blobs) ellipse(ctx, x, y + 2, bx, by, CORRUPT.soilDark);
  for (const [x, y, bx, by] of blobs) {
    const g = ctx.createRadialGradient(x - bx * 0.3, y - by * 0.4, 1, x, y, bx);
    g.addColorStop(0, CORRUPT.soilLight);
    g.addColorStop(1, CORRUPT.soil);
    ellipse(ctx, x, y, bx, by, g);
  }
  // Borde mordido: cuadraditos que se comen el cesped alrededor.
  for (let i = 0; i < 26 + tier * 8; i++) {
    const a = rand() * Math.PI * 2;
    const d = 0.85 + rand() * 0.35;
    const s = 3 + rand() * 4;
    ctx.fillStyle = rand() > 0.3 ? CORRUPT.soilLight : CORRUPT.soil;
    ctx.fillRect(cx + Math.cos(a) * rx * d - s / 2, cy + Math.sin(a) * ry * d - s / 2, s, s);
  }
  // Oro y mas: pistas de circuito desde el centro, con un nodo del color del tramo en la punta.
  if (tier >= 2) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const traces = 2 + tier;
    for (let i = 0; i < traces; i++) {
      const a = (i / traces) * Math.PI * 2 + rand() * 0.6;
      let x = cx + Math.cos(a) * rx * 0.2;
      let y = cy + Math.sin(a) * ry * 0.2;
      ctx.strokeStyle = CORRUPT.neonSoft;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      x += Math.cos(a) * rx * 0.45;
      ctx.lineTo(x, y);
      y += Math.sin(a) * ry * 0.5;
      x += Math.cos(a) * rx * 0.2;
      ctx.lineTo(x, y);
      ctx.stroke();
      circle(ctx, x, y, 4.2, p.outline);
      circle(ctx, x, y, 3, p.mid);
    }
  }
  // Rubi y cristal: una grieta en el centro que brilla del color del tramo.
  if (tier >= 3) {
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.45, cy + 2);
    ctx.lineTo(cx - rx * 0.15, cy - 4);
    ctx.lineTo(cx + rx * 0.05, cy + 4);
    ctx.lineTo(cx + rx * 0.38, cy - 2);
    ctx.stroke();
    ctx.strokeStyle = p.light;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  // Borde de pixeles del color del tramo: lo que dice de un vistazo si es plata, oro, rubi o cristal.
  const rim = 22 + tier * 4;
  for (let i = 0; i < rim; i++) {
    const a = (i / rim) * Math.PI * 2;
    const s = 5 + (i % 3 === 0 ? 1.5 : 0);
    const x = cx + Math.cos(a) * rx * 0.9;
    const y = cy + Math.sin(a) * ry * 0.92;
    ctx.fillStyle = p.outline;
    ctx.fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2);
    ctx.fillStyle = tier === 4 ? ['#ff9ad5', '#9fe9ff', '#fff3a6', '#b8ffcf'][i % 4] : i % 2 === 0 ? p.light : p.mid;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  // Pixeles sueltos del color del tramo (y del arcoiris, en el de cristal).
  const colors = tier === 4 ? ['#ff9ad5', '#9fe9ff', '#fff3a6', '#b8ffcf', p.light] : [p.light, p.mid];
  for (let i = 0; i < 8 + tier * 4; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * 0.8;
    const s = 3 + rand() * 3;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.fillRect(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, s, s);
  }
}

/** Cubito de datos en perspectiva: cara de arriba clara, la izquierda media y la derecha oscura, con contorno. */
function paintBit(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const cx = BIT.width / 2;
  const top = 3;
  const half = 11;
  const rise = 6;
  const height = 13;
  const faces: Array<[Array<[number, number]>, string]> = [
    [
      [
        [cx, top],
        [cx + half, top + rise],
        [cx, top + rise * 2],
        [cx - half, top + rise],
      ],
      p.light,
    ],
    [
      [
        [cx - half, top + rise],
        [cx, top + rise * 2],
        [cx, top + rise * 2 + height],
        [cx - half, top + rise + height],
      ],
      p.mid,
    ],
    [
      [
        [cx, top + rise * 2],
        [cx + half, top + rise],
        [cx + half, top + rise + height],
        [cx, top + rise * 2 + height],
      ],
      p.dark,
    ],
  ];
  ctx.lineJoin = 'round';
  for (const [points, fill] of faces) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Un pixel de luz verde de la corrupcion en la cara de delante: es un bit de la IA.
  ctx.fillStyle = CORRUPT.neon;
  ctx.fillRect(cx - half * 0.62, top + rise + height * 0.45, 4, 4);
}

/** Mastil oscuro con una bola de luz verde en la punta. */
function paintPole(ctx: Ctx): void {
  const cx = POLE.width / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a1222';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, POLE.height - 2);
  ctx.lineTo(cx, 10);
  ctx.stroke();
  ctx.strokeStyle = '#5b4a6e';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 0.8, POLE.height - 4);
  ctx.lineTo(cx - 0.8, 12);
  ctx.stroke();
  circle(ctx, cx, 8, 6.5, '#13a352');
  const g = ctx.createRadialGradient(cx - 1.5, 6.5, 0.5, cx, 8, 5.5);
  g.addColorStop(0, '#eafff3');
  g.addColorStop(1, CORRUPT.neon);
  circle(ctx, cx, 8, 5, g);
}

/**
 * Banderin que ondea hacia la derecha (hacia atras: el gusano va a la izquierda), sujeto al mastil por la izquierda. Su
 * forma crece con el tramo: banderola, cola de golondrina, estandarte con flecos y estandarte de cristal con estrella.
 * Lleva el simbolo de la IA: un gusanito de pixeles verde neon.
 */
function paintFlag(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const h = [0, 26, 34, 42, 48][tier];
  const len = [0, 48, 60, 68, 74][tier];
  const top = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (tier === 1) {
    // Banderola triangular.
    ctx.moveTo(2, top);
    ctx.lineTo(len, top + h * 0.5);
    ctx.lineTo(2, top + h);
  } else {
    // Cola de golondrina, mas honda cuanto mas tramo.
    const notch = len - 10 - tier * 2;
    ctx.moveTo(2, top);
    ctx.quadraticCurveTo(len * 0.5, top + 3, len, top);
    ctx.lineTo(notch, top + h * 0.5);
    ctx.lineTo(len, top + h);
    ctx.quadraticCurveTo(len * 0.5, top + h - 3, 2, top + h);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, p.light);
  g.addColorStop(0.55, p.mid);
  g.addColorStop(1, p.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Franja del tramo (oro y mas).
  if (tier >= 2) {
    ctx.fillStyle = rgba(p.outline, 0.35);
    ctx.fillRect(3, top + h * 0.72, len * 0.55, 3);
  }
  // Flecos del rubi y del cristal.
  if (tier >= 3) {
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 9;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, top + h - 1);
      ctx.lineTo(x, top + h + 6);
      ctx.stroke();
      circle(ctx, x, top + h + 7, 2.2, p.light);
    }
  }
  // Simbolo de la IA: un gusanito de pixeles verde neon.
  const sx = 10;
  const sy = top + h * 0.5 - 6;
  ctx.fillStyle = '#1a1222';
  ctx.fillRect(sx - 1.5, sy - 1.5, 17, 13);
  ctx.fillStyle = CORRUPT.neon;
  for (const [dx, dy] of [
    [0, 6],
    [3, 3],
    [6, 6],
    [9, 3],
    [12, 0],
  ] as const) {
    ctx.fillRect(sx + dx, sy + dy, 3, 3);
  }
  // Estrella de cristal.
  if (tier === 4) {
    const x = len * 0.62;
    const y = top + h * 0.32;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 7 : 2.6;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Adorno animado

/** Cada cuanto se apaga un pixel de la huella, por tramo (ms). */
const TRAIL_FADE_MS = [0, 900, 1100, 1300, 1500];

/**
 * Adorno de un gusano: sigue a su vista (`WormView`) cada fotograma (`update`), despues de su `sync`. `drift` es lo que
 * se mueve el suelo bajo el en casillas por segundo cuando anda sin moverse de su sitio (la vista "Niveles"): asi la
 * huella se queda atras como si avanzara. En el tablero, 0.
 */
export class WormFlair {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly loops: Phaser.Tweens.Tween[] = [];
  /** Aparece con un salto: multiplica el tamano de todo. */
  private readonly appear = { v: 0 };
  private clock = Math.random() * 10_000;
  private patch?: Phaser.GameObjects.Image;
  private patchGlow?: Phaser.GameObjects.Image;
  private glitchX = 0;
  private bits: Array<{ cube: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Image; offset: number }> = [];
  private pole?: Phaser.GameObjects.Image;
  private flag?: Phaser.GameObjects.Image;
  private flagGlow?: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    private readonly id: WormFlairId,
    private readonly tier: number,
    private readonly view: WormView,
    private readonly drift = 0,
    delayMs = 0,
  ) {
    // El aura ya la pinta el propio gusano (`WormView`, `wormAura.ts`, T-030): aqui no hace falta nada.
    if (tier < 1 || id === 'aura') return;
    this.loops.push(scene.tweens.add({ targets: this.appear, v: 1, delay: delayMs + 250, duration: 520, ease: 'Back.Out', easeParams: [2.2] }));
    if (id === 'trail') this.makeTrail();
    else if (id === 'orbit') this.makeOrbit();
    else this.makeBanner();
  }

  destroy(): void {
    this.timers.forEach((timer) => timer.remove());
    this.loops.forEach((loop) => loop.remove());
    this.scene.tweens.killTweensOf(this.parts);
    this.parts.forEach((part) => part.destroy());
  }

  private get palette() {
    return MEDAL_TIERS[this.tier];
  }

  private keep<T extends Phaser.GameObjects.GameObject>(part: T): T {
    this.parts.push(part);
    return part;
  }

  /** Ancho de casilla donde esta el gusano. */
  private get w(): number {
    return this.view.ground().cellWidth;
  }

  update(deltaMs: number): void {
    if (this.tier < 1 || this.id === 'aura') return;
    this.clock += deltaMs;
    if (this.id === 'trail') this.syncTrail();
    else if (this.id === 'orbit') this.syncOrbit();
    else this.syncBanner();
  }

  // -------------------------------------------------------------------------
  // A. Huella corrupta

  private makeTrail(): void {
    const { tier, scene, fx } = this;
    if (fx.quality.glows) {
      this.patchGlow = this.keep(scene.add.image(0, 0, TEX.glow).setTint(hex(this.palette.mid)).setBlendMode(Phaser.BlendModes.ADD));
      this.loops.push(scene.tweens.add({ targets: this.patchGlow, alpha: { from: 0.18, to: 0.38 + tier * 0.04 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    }
    this.patch = this.keep(scene.add.image(0, 0, key('patch', tier)));
    this.loops.push(scene.tweens.add({ targets: this.patch, alpha: { from: 1, to: 0.8 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));

    // Pixeles que se quedan en el cesped y se apagan.
    this.timers.push(
      scene.time.addEvent({
        delay: fx.ambientDelay(Math.max(90, 230 - tier * 35)),
        loop: true,
        callback: () => this.dropPixel(),
      }),
    );
    // Rubi y cristal: bits que suben de la grieta.
    if (tier >= 3) {
      this.timers.push(
        scene.time.addEvent({
          delay: fx.ambientDelay(tier === 4 ? 220 : 340),
          loop: true,
          callback: () => this.riseBit(),
        }),
      );
    }
    // Cristal: el charco se descoloca un instante cada tanto, como una imagen que falla.
    if (tier === 4) {
      this.timers.push(
        scene.time.addEvent({
          delay: 650,
          loop: true,
          callback: () => {
            this.glitchX = (Math.random() - 0.5) * 0.08;
            scene.time.delayedCall(70, () => (this.glitchX = 0));
          },
        }),
      );
    }
  }

  private syncTrail(): void {
    const { x, y, cellWidth: w } = this.view.ground();
    const depth = this.view.depth() - 0.6;
    const k = this.appear.v;
    // Mas grande que el gusano y corrida hacia la cola: asoma por detras, como el rastro que deja.
    const width = w * (1.3 + this.tier * 0.1) * k;
    const back = 0.22 * w;
    this.patch?.setPosition(x + back + this.glitchX * w, y + w * 0.02).setDisplaySize(width, (width * PATCH.height) / PATCH.width).setDepth(depth);
    this.patchGlow?.setPosition(x + back, y).setDisplaySize(width * 1.15, width * 0.38).setDepth(depth - 0.01);
    if (this.tier === 4) this.patchGlow?.setTint(rainbow(this.clock / 4000));
  }

  private dropPixel(): void {
    if (this.appear.v < 0.5) return;
    const { x, y, cellWidth: w } = this.view.ground();
    const px = x + (Math.random() * 0.9 - 0.05) * w;
    const py = y + (Math.random() - 0.5) * 0.14 * w;
    const light = Math.random() < 0.55;
    const tint = light ? (this.tier === 4 ? rainbow(Math.random()) : hex(this.palette.light)) : hex(CORRUPT.soil);
    const size = (w / 160) * (1.4 + Math.random() * 1.1) * artInv();
    const pixel = this.scene.add.image(px, py, TEX.pixel).setTint(tint).setScale(size).setDepth(this.view.depth() - 0.65);
    const life = TRAIL_FADE_MS[this.tier];
    this.scene.tweens.add({
      targets: pixel,
      alpha: 0,
      x: px + this.drift * w * (life / 1000),
      duration: life,
      ease: 'Quad.In',
      onComplete: () => pixel.destroy(),
    });
  }

  private riseBit(): void {
    if (this.appear.v < 0.5) return;
    const { x, y, cellWidth: w } = this.view.ground();
    const bit = this.scene.add
      .image(x + (Math.random() - 0.4) * 0.5 * w, y, TEX.pixel)
      .setTint(this.tier === 4 ? rainbow(Math.random()) : hex(this.palette.light))
      .setScale((w / 160) * 1.3 * artInv())
      .setDepth(this.view.depth() + 0.3);
    if (this.fx.quality.glows) bit.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: bit, y: y - w * 0.55, alpha: 0, duration: 1000, ease: 'Sine.Out', onComplete: () => bit.destroy() });
  }

  // -------------------------------------------------------------------------
  // B. Bits en orbita

  private makeOrbit(): void {
    for (let i = 0; i < this.tier; i++) {
      const glow = this.fx.quality.glows
        ? this.keep(this.scene.add.image(0, 0, TEX.glow).setTint(hex(this.palette.mid)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45))
        : undefined;
      const cube = this.keep(this.scene.add.image(0, 0, key('bit', this.tier)));
      this.bits.push({ cube, glow, offset: (i / this.tier) * Math.PI * 2 });
    }
    // Cristal: estela de pixeles tras cada cubito.
    if (this.tier === 4 && this.fx.quality.extras) {
      this.timers.push(
        this.scene.time.addEvent({
          delay: this.fx.ambientDelay(70),
          loop: true,
          callback: () => {
            const { cube } = this.bits[Math.floor(Math.random() * this.bits.length)];
            const mote = this.scene.add
              .image(cube.x, cube.y, TEX.pixel)
              .setTint(rainbow(Math.random()))
              .setScale(cube.scaleX * 0.35)
              .setDepth(cube.depth - 0.001);
            this.scene.tweens.add({ targets: mote, alpha: 0, scale: 0, duration: 420, onComplete: () => mote.destroy() });
          },
        }),
      );
    }
  }

  private syncOrbit(): void {
    const w = this.w;
    const k = this.appear.v;
    const center = this.view.headPoint(4, -26);
    const body = this.view.depth();
    const period = 2600 - this.tier * 180;
    const spin = (this.clock / period) * Math.PI * 2;
    // Orbita ceñida a la cabeza y cubitos pequeños (Carmine lo pidio mas pequeño para revisarlo).
    const rx = w * 0.32;
    const ry = w * 0.09;
    for (const bit of this.bits) {
      const a = spin + bit.offset;
      const front = Math.sin(a);
      const x = center.x + Math.cos(a) * rx;
      const y = center.y + front * ry + Math.sin(this.clock / 420 + bit.offset) * w * 0.02;
      const scale = (w / 160) * (0.78 + this.tier * 0.04) * (0.82 + 0.18 * front) * k * artInv();
      const depth = front > 0 ? body + 0.02 : body - 0.02;
      bit.cube.setPosition(x, y).setScale(scale).setDepth(depth).setAngle(Math.sin(a * 2) * 10);
      if (this.tier === 4) bit.cube.setTint(rainbow(this.clock / 3000 + bit.offset / 6));
      bit.glow?.setPosition(x, y).setDisplaySize(w * 0.24 * k, w * 0.24 * k).setDepth(depth - 0.001);
    }
  }

  // -------------------------------------------------------------------------
  // C. Banderin de la IA

  private makeBanner(): void {
    this.pole = this.keep(this.scene.add.image(0, 0, key('pole')).setOrigin(0.5, 1));
    if (this.tier === 4 && this.fx.quality.glows) {
      this.flagGlow = this.keep(this.scene.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5));
    }
    this.flag = this.keep(this.scene.add.image(0, 0, key('flag', this.tier)).setOrigin(0.02, 0.1));
    if (this.tier === 4 && this.fx.quality.extras) {
      this.timers.push(
        this.scene.time.addEvent({
          delay: 900,
          startAt: Math.random() * 900,
          loop: true,
          callback: () => {
            if (!this.flag) return;
            const at = { x: this.flag.x + this.flag.displayWidth * (0.3 + Math.random() * 0.5), y: this.flag.y + this.flag.displayHeight * (0.1 + Math.random() * 0.5) };
            const sparkle = this.scene.add.image(at.x, at.y, TEX.sparkle).setDepth(this.flag.depth + 0.001).setScale(0);
            const size = (this.w / 160) * 0.55 * artInv();
            this.scene.tweens.add({ targets: sparkle, scale: size, angle: 60, duration: 200, yoyo: true, onComplete: () => sparkle.destroy() });
          },
        }),
      );
    }
  }

  private syncBanner(): void {
    if (!this.pole || !this.flag) return;
    const k = this.appear.v;
    const s = this.view.bodyScale() * artInv() * k;
    const grow = 0.82 + this.tier * 0.1;
    const base = this.view.segmentPoint(0, 2, -10);
    const depth = this.view.depth() - 0.01;
    // Inclinado hacia atras (a la derecha) y meciendose con el paso.
    const lean = 12 + Math.sin(this.clock / 520) * 4;
    this.pole.setPosition(base.x, base.y).setScale(s * 0.9, s * grow).setAngle(lean).setDepth(depth);
    const rad = Phaser.Math.DegToRad(lean);
    const tipDistance = (POLE.height - 10) * s * grow;
    const tip = { x: base.x + Math.sin(rad) * tipDistance, y: base.y - Math.cos(rad) * tipDistance };
    // Ondea: se estira y se encoge, y se dobla un poco.
    const wave = Math.sin(this.clock / 180);
    this.flag
      .setPosition(tip.x, tip.y)
      .setScale(s * (1 + this.tier * 0.06) * (0.9 + 0.1 * wave), s * (1 + this.tier * 0.06) * (1 - 0.05 * wave))
      .setAngle(lean * 0.6 + wave * 5)
      .setDepth(depth);
    if (this.flagGlow) {
      this.flagGlow
        .setPosition(tip.x + this.flag.displayWidth * 0.45, tip.y + this.flag.displayHeight * 0.4)
        .setDisplaySize(this.flag.displayWidth * 1.6, this.flag.displayHeight * 1.8)
        .setTint(rainbow(this.clock / 3500))
        .setDepth(depth - 0.001);
    }
  }
}
