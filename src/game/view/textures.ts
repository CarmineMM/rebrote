import * as Phaser from 'phaser';
import { BOARD, LIMITS } from '../config/balance';
import type { BoardPoint } from '../core/board';
import type { ElementType } from '../core/plants';
import type { ScreenPoint } from './perspective';
import { SCENERY, VIEW, WORLD, perspective } from './layout';
import { MEDAL, MEDAL_TIERS, medalTier } from './levelMedal';
import {
  SHOOTER_BARRELS,
  SHOOTER_DOTS,
  SHOOTER_DOT_RADIUS,
  SHOOTER_EYE,
  SHOOTER_SIZE,
  shooterHead,
  type ShooterCannons,
} from './shooterShape';

/**
 * Arte hecho por codigo (ADR-0004): todo se pinta con Canvas 2D una sola vez al arrancar
 * y queda como textura de Phaser. Lo que se mueve se anima en ambience.ts y en la escena.
 */
export const TEX = {
  sky: 'scene-sky',
  land: 'scene-land',
  corruptionGlow: 'scene-corruption-glow',
  canopy: 'scene-canopy',
  sunCore: 'fx-sun-core',
  sunRays: 'fx-sun-rays',
  glow: 'fx-glow',
  shadow: 'fx-shadow',
  clouds: ['fx-cloud-0', 'fx-cloud-1', 'fx-cloud-2'],
  leaf: 'fx-leaf',
  dot: 'fx-dot',
  pixel: 'fx-pixel',
  dirt: 'fx-dirt',
  bird: 'fx-bird',
  butterfly: 'fx-butterfly',
  tufts: ['fx-tuft-0', 'fx-tuft-1', 'fx-tuft-2'],
  flowers: ['fx-flower-0', 'fx-flower-1', 'fx-flower-2'],
  sparkle: 'fx-sparkle',
  beam: 'fx-beam',
  ring: 'fx-ring',
  /** Llama suelta: arde sobre un enemigo quemado y sale en las explosiones (T-004). */
  flame: 'fx-flame',
  /** Copo de nieve de seis brazos: particula del hielo (T-005). */
  snowflake: 'fx-snowflake',
  /** Cristales de escarcha: sobre un enemigo ralentizado y al estallar la mina de hielo (T-005). */
  frost: 'fx-frost',
  /** Disparadora con 1, 2 y 3 canones, normal, de fuego y de hielo (usar `shooterTexture`). */
  shooter: {
    normal: ['unit-shooter-1', 'unit-shooter-2', 'unit-shooter-3'],
    fire: ['unit-shooter-fire-1', 'unit-shooter-fire-2', 'unit-shooter-fire-3'],
    ice: ['unit-shooter-ice-1', 'unit-shooter-ice-2', 'unit-shooter-ice-3'],
  },
  /** Mina de cada elemento, dormida y en cuenta atras (usar `mineTexture`). */
  mine: {
    fire: { idle: 'unit-mine-fire', armed: 'unit-mine-fire-armed' },
    ice: { idle: 'unit-mine-ice', armed: 'unit-mine-ice-armed' },
  },
  coin: 'unit-coin',
  /** Medallita de nivel de la disparadora (T-003), una por nivel con su numero (usar `medalTexture`). */
  medal: 'ui-medal',
  /** Semilla normal, de fuego y de hielo (usar `seedTexture`). */
  seed: 'unit-seed',
  fireSeed: 'unit-seed-fire',
  iceSeed: 'unit-seed-ice',
  wormHead: 'unit-worm-head',
  wormHeadBite: 'unit-worm-head-bite',
  wormHeadHurt: 'unit-worm-head-hurt',
  wormSegment: 'unit-worm-segment',
  /** Escupidor (T-007): cabeza tranquila, cargando el escupitajo (mofletes hinchados) y dolorida, y su anillo. */
  spitterHead: 'unit-spitter-head',
  spitterHeadCharge: 'unit-spitter-head-charge',
  spitterHeadHurt: 'unit-spitter-head-hurt',
  spitterSegment: 'unit-spitter-segment',
  /** Acorazado (T-007): casco que va sobre la cabeza del gusano y placa que va sobre cada anillo. */
  armorHelmet: 'unit-armor-helmet',
  armorPlate: 'unit-armor-plate',
  /** Escupitajo del escupidor (T-007). */
  spit: 'unit-spit',
  /**
   * Creeper (T-008): cabeza de monitor antiguo con la cara en la pantalla (tranquila, mordiendo y dolorida; en la
   * fase 2, en rojo y enfadada), la de "cargando" mientras se prepara, y su anillo de carcasa con rejilla y luz.
   */
  creeperHead: 'unit-creeper-head',
  creeperHeadBite: 'unit-creeper-head-bite',
  creeperHeadHurt: 'unit-creeper-head-hurt',
  creeperHeadAngry: 'unit-creeper-head-angry',
  creeperHeadAngryBite: 'unit-creeper-head-angry-bite',
  creeperHeadAngryHurt: 'unit-creeper-head-angry-hurt',
  creeperHeadLoading: 'unit-creeper-head-loading',
  creeperSegment: 'unit-creeper-segment',
  /** Rayas de velocidad del gusano acelerado por Creeper (T-008), detras de la cola. */
  hasteStreak: 'fx-haste-streak',
} as const;

// La forma de la disparadora (pies, canones, puntos del tallo y cabeza) vive en shooterShape.ts, sin Phaser.
export { SHOOTER_BARRELS, SHOOTER_DOTS, SHOOTER_SIZE, type ShooterCannons } from './shooterShape';

/** Variantes que tienen arte propio. Se distinguen por el color, no por la forma (guia de graficos, seccion 10). */
export type ShooterVariant = keyof typeof TEX.shooter;

/** Variante de textura de una planta segun su elemento: la normal si no tiene. */
export function shooterVariant(element: ElementType | null): ShooterVariant {
  return element ?? 'normal';
}

/** Textura de la disparadora con `cannons` canones y el elemento `element`. */
export const shooterTexture = (cannons: ShooterCannons, element: ElementType | null = null): string =>
  TEX.shooter[shooterVariant(element)][cannons - 1];

/** Textura de la semilla que dispara una planta con `element`. */
export const seedTexture = (element: ElementType | null): string =>
  element === 'fire' ? TEX.fireSeed : element === 'ice' ? TEX.iceSeed : TEX.seed;

/**
 * Mina (T-004), en pixeles de su textura (diseno, 160 px por casilla): pies, centro del bulbo y punta de la mecha,
 * de donde salen las chispas.
 */
export const MINE_SIZE = { width: 112, height: 124, footX: 56, footY: 112, bulbY: 78, tipX: 72, tipY: 16 } as const;

/** Textura de la mina de `element`: dormida o en cuenta atras. */
export const mineTexture = (element: ElementType, armed: boolean): string => TEX.mine[element][armed ? 'armed' : 'idle'];

/** Medallita del nivel `level` (2 a 20): el numero y el color de su tramo van pintados (levelMedal.ts). */
export const medalTexture = (level: number): string => `${TEX.medal}-${level}`;

/** Llama suelta: los pies van abajo, en el centro. */
export const FLAME_SIZE = { width: 32, height: 48, footY: 46 } as const;

/** Cristales de escarcha (T-005): salen de un punto de apoyo abajo, en el centro. */
export const FROST_SIZE = { width: 40, height: 44, footY: 40 } as const;

/**
 * Gusano (T-002): la cabeza y los anillos van en texturas separadas para que el cuerpo ondule.
 * `head.cx, cy` es el centro de la cabeza dentro de su textura. Medidas de diseno: 160 px por casilla.
 */
export const WORM_SIZE = {
  head: { width: 104, height: 104, cx: 52, cy: 62, r: 34 },
  segment: { size: 64, r: 27 },
} as const;
/**
 * Pantalla de la cabeza del Creeper (T-008), en pixeles de su textura (la misma medida que la cabeza del gusano).
 * `bar` es la barra de "cargando" que se llena mientras se prepara: la vista pinta encima lo que lleva.
 */
export const CREEPER_SCREEN = {
  x: 23,
  y: 37,
  width: 52,
  height: 46,
  bar: { x: 31, y: 74, width: 36, height: 5 },
  /** Punta de la antena, donde parpadea su luz. */
  antenna: { x: 67, y: 9 },
} as const;
/** Rayas de velocidad del gusano acelerado (T-008): salen de la izquierda, junto a la cola. */
export const HASTE_STREAK_SIZE = { width: 64, height: 28 } as const;
/** Bala de la disparadora: una semilla con estela. `cx` es el centro de la semilla (la estela queda detras). */
export const SEED_SIZE = { width: 48, height: 28, cx: 32 } as const;
/** Escupitajo (T-007): una gota de moco verde que vuela a la izquierda. `cx` es el centro de la gota (la estela va detras). */
export const SPIT_SIZE = { width: 46, height: 30, cx: 15 } as const;
/**
 * Copa del arbol: donde engancha con el tronco, dentro de su textura y en pantalla. La textura deja margen
 * y se alarga hacia la izquierda para que en pantallas anchas no se vea cortada.
 */
export const CANOPY = { width: 1000, height: 560, anchorX: 430, anchorY: 500, screenX: 30, screenY: 200 } as const;
/** Desplazamiento entre la textura de la copa y las medidas con las que se diseno (ancla en 70, 340). */
const CANOPY_SHIFT = { x: CANOPY.anchorX - 70, y: CANOPY.anchorY - 340 } as const;
/**
 * El cielo solo se pinta hasta donde lo tapan las colinas, y el terreno solo desde las colinas hacia abajo:
 * menos pixeles que rellenar en cada frame (importa en equipos sin GPU potente).
 */
export const SKY_HEIGHT = 360;
export const LAND_TOP = 250;
/** Rectangulo del mundo que cubre la textura de brillo del suelo corrupto. */
export const CORRUPTION_GLOW_AREA = { x: 1180, y: 330, width: WORLD.right - 1180, height: 560 } as const;

type Ctx = CanvasRenderingContext2D;
/** Pinta en medidas de diseno. `scale` es la resolucion real de la textura (para `shadowBlur`, que no escala). */
type Painter = (ctx: Ctx, width: number, height: number, scale: number) => void;

/** Limite seguro de textura en WebGL: las texturas grandes bajan algo de resolucion en Ultra para no pasarlo. */
const MAX_TEXTURE_SIZE = 4096;
const textureScales = new Map<string, number>();
let artScale = 1;

/**
 * Las texturas se pintan a la resolucion del nivel grafico (ADR-0006) y las imagenes se muestran
 * a `artInv()` para que midan lo mismo en pantalla. Al escalar una imagen, multiplicar por esto.
 */
export const artInv = (): number => 1 / artScale;

/** Igual que `artInv` pero para una textura concreta: las muy grandes (cielo, terreno) pueden ir a menos resolucion. */
export const artInvOf = (key: string): number => 1 / (textureScales.get(key) ?? artScale);

export function registerTextures(scene: Phaser.Scene, scale = 1): void {
  artScale = scale;
  const paint = (key: string, width: number, height: number, painter: Painter) => {
    const textureScale = Math.min(scale, MAX_TEXTURE_SIZE / Math.max(width, height));
    textureScales.set(key, textureScale);
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, Math.ceil(width * textureScale), Math.ceil(height * textureScale));
    if (!texture) return;
    const ctx = texture.getContext();
    // Los pintores trabajan en medidas de diseno; la escala da la resolucion.
    ctx.scale(textureScale, textureScale);
    painter(ctx, width, height, textureScale);
    texture.refresh();
  };

  // Cielo y terreno cubren el mundo entero (diseno + decorado extra, ADR-0007) y se pintan en sus coordenadas.
  paint(TEX.sky, WORLD.width, SKY_HEIGHT - WORLD.top, (ctx) => {
    ctx.translate(-WORLD.left, -WORLD.top);
    paintSky(ctx);
  });
  paint(TEX.land, WORLD.width, WORLD.bottom - LAND_TOP, (ctx) => {
    ctx.translate(-WORLD.left, -LAND_TOP);
    paintLand(ctx);
  });
  paint(TEX.corruptionGlow, CORRUPTION_GLOW_AREA.width, CORRUPTION_GLOW_AREA.height, paintCorruptionGlow);
  paint(TEX.canopy, CANOPY.width, CANOPY.height, paintCanopy);
  paint(TEX.sunCore, 128, 128, paintSunCore);
  paint(TEX.sunRays, 520, 520, paintSunRays);
  paint(TEX.glow, 128, 128, paintGlow);
  paint(TEX.shadow, 96, 40, paintShadow);
  TEX.clouds.forEach((key, i) => paint(key, 340, 150, (ctx, w, h) => paintCloud(ctx, w, h, 11 + i * 7)));
  paint(TEX.leaf, 26, 16, paintLeafParticle);
  paint(TEX.dot, 24, 24, paintDot);
  paint(TEX.pixel, 8, 8, paintPixel);
  paint(TEX.dirt, 18, 18, paintDirt);
  paint(TEX.bird, 40, 18, paintBird);
  paint(TEX.butterfly, 44, 34, paintButterfly);
  TEX.tufts.forEach((key, i) => paint(key, 130, 80, (ctx, w, h) => paintTuft(ctx, w, h, 3 + i * 5)));
  TEX.flowers.forEach((key, i) => paint(key, 48, 96, (ctx, w, h) => paintFlower(ctx, w, h, i)));
  paint(TEX.sparkle, 32, 32, paintSparkle);
  paint(TEX.beam, 200, 900, paintBeam);
  paint(TEX.ring, 64, 64, paintRing);
  paint(TEX.flame, FLAME_SIZE.width, FLAME_SIZE.height, paintFlame);
  paint(TEX.snowflake, 24, 24, paintSnowflake);
  paint(TEX.frost, FROST_SIZE.width, FROST_SIZE.height, paintFrost);
  for (const variant of Object.keys(TEX.shooter) as ShooterVariant[]) {
    TEX.shooter[variant].forEach((key, i) =>
      paint(key, SHOOTER_SIZE.width, SHOOTER_SIZE.height, (ctx) => paintShooter(ctx, (i + 1) as ShooterCannons, SHOOTER_PALETTES[variant])),
    );
  }
  for (const element of Object.keys(TEX.mine) as ElementType[]) {
    paint(TEX.mine[element].idle, MINE_SIZE.width, MINE_SIZE.height, (ctx) => paintMine(ctx, false, MINE_PALETTES[element]));
    paint(TEX.mine[element].armed, MINE_SIZE.width, MINE_SIZE.height, (ctx) => paintMine(ctx, true, MINE_PALETTES[element]));
  }
  paint(TEX.coin, 72, 72, paintCoin);
  for (let level = 2; level <= LIMITS.maxLevel; level++) {
    paint(medalTexture(level), MEDAL.size, MEDAL.size, (ctx) => paintMedal(ctx, level));
  }
  paint(TEX.seed, SEED_SIZE.width, SEED_SIZE.height, paintSeed);
  paint(TEX.fireSeed, SEED_SIZE.width, SEED_SIZE.height, paintFireSeed);
  paint(TEX.iceSeed, SEED_SIZE.width, SEED_SIZE.height, paintIceSeed);
  const { head, segment } = WORM_SIZE;
  paint(TEX.wormHead, head.width, head.height, (ctx) => paintWormHead(ctx, 'idle', WORM_PALETTES.worm));
  paint(TEX.wormHeadBite, head.width, head.height, (ctx) => paintWormHead(ctx, 'bite', WORM_PALETTES.worm));
  paint(TEX.wormHeadHurt, head.width, head.height, (ctx) => paintWormHead(ctx, 'hurt', WORM_PALETTES.worm));
  paint(TEX.wormSegment, segment.size, segment.size, (ctx, w) => paintWormSegment(ctx, w, WORM_PALETTES.worm));
  paint(TEX.spitterHead, head.width, head.height, (ctx) => paintWormHead(ctx, 'idle', WORM_PALETTES.spitter));
  paint(TEX.spitterHeadCharge, head.width, head.height, (ctx) => paintWormHead(ctx, 'bite', WORM_PALETTES.spitter));
  paint(TEX.spitterHeadHurt, head.width, head.height, (ctx) => paintWormHead(ctx, 'hurt', WORM_PALETTES.spitter));
  paint(TEX.spitterSegment, segment.size, segment.size, (ctx, w) => paintWormSegment(ctx, w, WORM_PALETTES.spitter));
  paint(TEX.armorHelmet, head.width, head.height, paintArmorHelmet);
  paint(TEX.armorPlate, segment.size, segment.size, paintArmorPlate);
  paint(TEX.spit, SPIT_SIZE.width, SPIT_SIZE.height, paintSpit);
  const creeperHeads: Array<[string, CreeperMood, CreeperScreenPalette]> = [
    [TEX.creeperHead, 'idle', CREEPER_SCREENS.calm],
    [TEX.creeperHeadBite, 'bite', CREEPER_SCREENS.calm],
    [TEX.creeperHeadHurt, 'hurt', CREEPER_SCREENS.calm],
    [TEX.creeperHeadAngry, 'idle', CREEPER_SCREENS.angry],
    [TEX.creeperHeadAngryBite, 'bite', CREEPER_SCREENS.angry],
    [TEX.creeperHeadAngryHurt, 'hurt', CREEPER_SCREENS.angry],
    [TEX.creeperHeadLoading, 'loading', CREEPER_SCREENS.calm],
  ];
  for (const [key, mood, screen] of creeperHeads) {
    paint(key, head.width, head.height, (ctx, _w, _h, scale) => paintCreeperHead(ctx, mood, screen, scale));
  }
  paint(TEX.creeperSegment, segment.size, segment.size, (ctx, w) => paintCreeperSegment(ctx, w));
  paint(TEX.hasteStreak, HASTE_STREAK_SIZE.width, HASTE_STREAK_SIZE.height, paintHasteStreak);
}

// ---------------------------------------------------------------------------
// Utilidades

/** Aleatorio con semilla: el decorado sale igual en cada partida. */
export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const P = (x: number, y: number): ScreenPoint => perspective.toScreen({ x, y });
const cwAt = (x: number, y: number) => perspective.cellWidthAt({ x, y });

function boardPolygon(ctx: Ctx, points: Array<[number, number]>): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const p = P(x, y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function boardRect(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  boardPolygon(ctx, [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]);
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rotation = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Hoja con forma de almendra desde (x, y) en direccion `angle`. */
function leafShape(ctx: Ctx, x: number, y: number, length: number, width: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.45, -width, length, 0);
  ctx.quadraticCurveTo(length * 0.45, width, 0, 0);
  ctx.closePath();
  ctx.restore();
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function smallFlower(ctx: Ctx, x: number, y: number, r: number, petal: string, center: string): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, petal);
  }
  circle(ctx, x, y, r * 0.7, center);
}

// ---------------------------------------------------------------------------
// Cielo

function paintSky(ctx: Ctx): void {
  const height = SKY_HEIGHT - WORLD.top;
  // Degradado anclado al mundo: por encima del diseno el azul se hace mas profundo.
  const at = (y: number) => (y - WORLD.top) / (VIEW.height - WORLD.top);
  const sky = ctx.createLinearGradient(0, WORLD.top, 0, VIEW.height);
  sky.addColorStop(0, '#2a80d2');
  sky.addColorStop(at(0), '#3d9be3');
  sky.addColorStop(at(252), '#79c4f1');
  sky.addColorStop(at(396), '#c8ebfb');
  sky.addColorStop(1, '#eaf8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(WORLD.left, WORLD.top, WORLD.width, height);

  // Por la derecha llega la corrupcion: el cielo se tine y aparecen pixeles sueltos.
  const haze = ctx.createLinearGradient(VIEW.width * 0.6, 0, VIEW.width, 0);
  haze.addColorStop(0, 'rgba(150, 95, 210, 0)');
  haze.addColorStop(1, 'rgba(150, 95, 210, 0.3)');
  ctx.fillStyle = haze;
  ctx.fillRect(WORLD.left, WORLD.top, WORLD.width, height);

  const rand = seededRandom(7);
  const from = VIEW.width * 0.74;
  for (let i = 0; i < 160; i++) {
    const x = from + rand() * (WORLD.right - from);
    const y = WORLD.top + rand() * (342 - WORLD.top);
    const s = 3 + rand() * 8;
    ctx.globalAlpha = 0.05 + rand() * 0.18 * Math.min(1, (x - from) / (VIEW.width - from));
    ctx.fillStyle = pick(rand, ['#b48cff', '#7dffc0', '#ffffff']);
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.globalAlpha = 1;
}

function paintSunCore(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.42, h * 0.4, 4, w / 2, h / 2, w / 2);
  g.addColorStop(0, '#fffdf0');
  g.addColorStop(0.45, '#ffe680');
  g.addColorStop(0.85, '#ffc93c');
  g.addColorStop(1, 'rgba(255, 201, 60, 0)');
  circle(ctx, w / 2, h / 2, w / 2, g);
}

function paintSunRays(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(255, 244, 190, 0.55)');
  g.addColorStop(1, 'rgba(255, 244, 190, 0)');
  ctx.fillStyle = g;
  const rays = 14;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const spread = i % 2 === 0 ? 0.09 : 0.05;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - spread) * w, cy + Math.sin(a - spread) * w);
    ctx.lineTo(cx + Math.cos(a + spread) * w, cy + Math.sin(a + spread) * w);
    ctx.closePath();
    ctx.fill();
  }
}

/** Brillo blanco redondo y suave. Se tine al usarlo (sol, monedas, agujeros, luces). */
function paintGlow(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintShadow(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(20, 40, 10, 0.5)');
  g.addColorStop(0.6, 'rgba(20, 40, 10, 0.25)');
  g.addColorStop(1, 'rgba(20, 40, 10, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
}

function paintCloud(ctx: Ctx, w: number, h: number, seed: number): void {
  const rand = seededRandom(seed);
  const puffs: Array<[number, number, number]> = [];
  const count = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const r = h * (0.22 + Math.sin(t * Math.PI) * 0.2 + rand() * 0.06);
    puffs.push([w * (0.14 + t * 0.72), h * 0.72 - r * 0.55 - rand() * h * 0.08, r]);
  }
  // Sombra azulada abajo y cuerpo blanco arriba, para que tengan volumen.
  for (const [x, y, r] of puffs) circle(ctx, x, y + r * 0.12, r, '#d4e9f7');
  for (const [x, y, r] of puffs) {
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#f4fbff');
    g.addColorStop(1, '#e2f1fb');
    circle(ctx, x, y, r * 0.94, g);
  }
}

function paintBird(ctx: Ctx, w: number, h: number): void {
  ctx.strokeStyle = '#2f3d4f';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2, h * 0.35);
  ctx.quadraticCurveTo(w * 0.28, 0, w / 2, h * 0.75);
  ctx.quadraticCurveTo(w * 0.72, 0, w - 2, h * 0.35);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Terreno: colinas, ciudad lejana, seto, laterales, cesped y corte de tierra

interface Building {
  x: number;
  width: number;
  top: number;
  antenna: boolean;
  glitch: boolean;
}

const SKYLINE_BASE = 420;

/** La ciudad lejana: lo que la naturaleza protege. Los edificios de la derecha ya estan "corruptos". */
const BUILDINGS: Building[] = (() => {
  const rand = seededRandom(99);
  const list: Building[] = [];
  let x = 880;
  while (x < 1360) {
    const width = 20 + rand() * 30;
    const tall = 1 - Math.abs(x - 1100) / 520;
    const height = 70 + rand() * 80 * tall;
    list.push({ x, width, top: 330 - height + 40, antenna: height > 115 && rand() > 0.3, glitch: x > 1200 && rand() > 0.45 });
    x += width + 2 + rand() * 6;
  }
  return list;
})();

/** Luces rojas en lo alto de las antenas; parpadean en ambience.ts. */
export const SKYLINE_LIGHTS: ScreenPoint[] = BUILDINGS.filter((b) => b.antenna).map((b) => ({
  x: b.x + b.width / 2,
  y: b.top - 18,
}));

/** Todo el terreno, en coordenadas del mundo (de WORLD.left a WORLD.right y hasta WORLD.bottom). */
function paintLand(ctx: Ctx): void {
  const rand = seededRandom(42);
  paintHills(ctx, rand);
  paintMeadow(ctx);
  paintHedge(ctx, rand);
  paintFlowerBed(ctx, rand);
  paintPath(ctx, rand);
  paintCorruption(ctx, rand);
  paintLawn(ctx, rand);
  paintFrontCut(ctx, rand);
  paintTrunk(ctx);
}

/** Cuantas cosas sueltas poner a lo ancho del mundo, a partir de las que se pensaron para el diseno. */
const acrossWorld = (countInDesign: number) => Math.round((countInDesign * WORLD.width) / VIEW.width);

function hillPath(ctx: Ctx, baseY: number, waves: Array<[number, number, number]>): void {
  ctx.beginPath();
  ctx.moveTo(WORLD.left, WORLD.bottom);
  for (let x = WORLD.left; x <= WORLD.right; x += 8) {
    let y = baseY;
    for (const [freq, phase, amp] of waves) y -= amp * Math.sin(x * freq + phase);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD.right, WORLD.bottom);
  ctx.closePath();
}

function hillY(x: number, baseY: number, waves: Array<[number, number, number]>): number {
  let y = baseY;
  for (const [freq, phase, amp] of waves) y -= amp * Math.sin(x * freq + phase);
  return y;
}

function roundTree(ctx: Ctx, x: number, y: number, r: number, dark: string, light: string): void {
  ctx.fillStyle = '#6b5340';
  ctx.fillRect(x - r * 0.12, y - r * 0.2, r * 0.24, r * 0.9);
  circle(ctx, x, y - r * 0.6, r, dark);
  circle(ctx, x - r * 0.3, y - r * 0.85, r * 0.55, light);
}

function paintHills(ctx: Ctx, rand: () => number): void {
  const farWaves: Array<[number, number, number]> = [
    [0.004, 0.6, 26],
    [0.011, 2.1, 10],
  ];
  hillPath(ctx, 318, farWaves);
  const far = ctx.createLinearGradient(0, 260, 0, 380);
  far.addColorStop(0, '#b4e2a6');
  far.addColorStop(1, '#93cf8a');
  ctx.fillStyle = far;
  ctx.fill();
  for (let i = 0; i < acrossWorld(26); i++) {
    const x = WORLD.left + rand() * WORLD.width;
    roundTree(ctx, x, hillY(x, 318, farWaves) + 6, 7 + rand() * 5, '#8cc983', '#a6db9b');
  }

  // Ciudad lejana sobre las colinas del fondo.
  for (const b of BUILDINGS) {
    ctx.fillStyle = '#a5bfd2';
    ctx.fillRect(b.x, b.top, b.width, SKYLINE_BASE - b.top);
    ctx.fillStyle = '#c9dbe7';
    for (let wy = b.top + 8; wy < SKYLINE_BASE - 40; wy += 11) {
      for (let wx = b.x + 4; wx < b.x + b.width - 6; wx += 8) {
        if (rand() > 0.35) ctx.fillRect(wx, wy, 4, 5);
      }
    }
    if (b.antenna) {
      ctx.strokeStyle = '#8aa5ba';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + b.width / 2, b.top);
      ctx.lineTo(b.x + b.width / 2, b.top - 18);
      ctx.stroke();
    }
    if (b.glitch) {
      // Rodajas desplazadas y bloques de color: el edificio "falla" como una imagen corrupta.
      for (let i = 0; i < 4; i++) {
        const sy = b.top + rand() * (SKYLINE_BASE - b.top - 60);
        const sh = 4 + rand() * 8;
        const dx = (rand() - 0.5) * 12;
        ctx.fillStyle = pick(rand, ['rgba(180, 140, 255, 0.55)', 'rgba(125, 255, 192, 0.45)', '#a5bfd2']);
        ctx.fillRect(b.x + dx, sy, b.width, sh);
      }
    }
  }

  const nearWaves: Array<[number, number, number]> = [
    [0.0032, 2.4, 22],
    [0.009, 0.4, 12],
  ];
  hillPath(ctx, 362, nearWaves);
  const near = ctx.createLinearGradient(0, 300, 0, 400);
  near.addColorStop(0, '#8fd07f');
  near.addColorStop(1, '#62ad55');
  ctx.fillStyle = near;
  ctx.fill();
  for (let i = 0; i < acrossWorld(18); i++) {
    const x = WORLD.left + rand() * WORLD.width;
    roundTree(ctx, x, hillY(x, 362, nearWaves) + 8, 11 + rand() * 7, '#4f9a47', '#6fbb5f');
  }

  // La corrupcion tambien tine las colinas de la derecha.
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const tint = ctx.createLinearGradient(VIEW.width * 0.62, 0, VIEW.width, 0);
  tint.addColorStop(0, 'rgba(110, 70, 160, 0)');
  tint.addColorStop(1, 'rgba(110, 70, 160, 0.38)');
  ctx.fillStyle = tint;
  ctx.fillRect(WORLD.left, LAND_TOP, WORLD.width, WORLD.bottom - LAND_TOP);
  ctx.restore();
}

function paintMeadow(ctx: Ctx): void {
  const top = P(0, SCENERY.hedgeY).y - 12;
  const g = ctx.createLinearGradient(0, top, 0, VIEW.height);
  g.addColorStop(0, '#5aa346');
  g.addColorStop(1, '#43893a');
  ctx.fillStyle = g;
  ctx.fillRect(WORLD.left, top, WORLD.width, WORLD.bottom - top);
}

function paintHedge(ctx: Ctx, rand: () => number): void {
  const y = SCENERY.hedgeY;
  const bushes: Array<{ x: number; y: number; r: number; corrupt: boolean }> = [];
  // El seto cruza el mundo entero, tambien por el decorado extra de las pantallas anchas.
  for (let x = -7.5; x < BOARD.columns + 7.5; x += 0.17) {
    const p = P(x + rand() * 0.08, y);
    const cw = cwAt(x, y);
    const r = cw * (0.19 + rand() * 0.1);
    bushes.push({ x: p.x, y: p.y - cw * (0.16 + rand() * 0.14), r, corrupt: x > BOARD.columns + 0.25 });
  }
  for (const b of bushes) circle(ctx, b.x, b.y + b.r * 0.3, b.r * 1.05, b.corrupt ? '#352d42' : '#2b6a2b');
  for (const b of bushes) {
    const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
    g.addColorStop(0, b.corrupt ? '#6a5a82' : '#6cbf55');
    g.addColorStop(1, b.corrupt ? '#3d3450' : '#3a8436');
    circle(ctx, b.x, b.y, b.r, g);
  }
  for (const b of bushes) {
    if (rand() > 0.6) {
      const a = rand() * Math.PI * 2;
      const flower = pick(rand, ['#ffffff', '#ffd1e8', '#fff1a6']);
      if (!b.corrupt) smallFlower(ctx, b.x + Math.cos(a) * b.r * 0.5, b.y + Math.sin(a) * b.r * 0.5, b.r * 0.08, flower, '#f6c343');
    }
  }
}

function paintFlowerBed(ctx: Ctx, rand: () => number): void {
  const { fromX, toX } = SCENERY.flowerBed;
  const bottom = SCENERY.frontEdgeY;
  boardRect(ctx, fromX, 0, toX, bottom);
  const g = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, bottom).y);
  g.addColorStop(0, '#6a4a30');
  g.addColorStop(1, '#5a3c25');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#4a2f1c';
  for (let x = fromX + 0.15; x < toX - 0.05; x += 0.2) {
    ctx.lineWidth = 3;
    const a = P(x, 0.05);
    const b = P(x, bottom - 0.05);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let i = 0; i < 160; i++) {
    const p = P(fromX + rand() * (toX - fromX), rand() * bottom);
    ctx.fillStyle = pick(rand, ['rgba(140, 100, 70, 0.6)', 'rgba(60, 38, 22, 0.6)']);
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  // Borde de piedritas
  for (let y = 0; y < bottom; y += 0.12) {
    const p = P(toX, y);
    ellipse(ctx, p.x, p.y, cwAt(toX, y) * 0.04, cwAt(toX, y) * 0.028, pick(rand, ['#b7a58c', '#cbbca5', '#9f8f78']));
  }
}

function paintPath(ctx: Ctx, rand: () => number): void {
  const { fromX, toX } = SCENERY.path;
  const bottom = SCENERY.frontEdgeY;
  boardRect(ctx, fromX, -0.05, toX, bottom);
  ctx.fillStyle = '#b9a47c';
  ctx.fill();
  ctx.lineJoin = 'round';
  for (let y = -0.05; y < bottom; ) {
    const rowH = 0.22 + rand() * 0.1;
    for (let x = fromX; x < toX - 0.02; ) {
      const stoneW = Math.min(0.2 + rand() * 0.16, toX - x);
      const gap = 0.025;
      boardRect(ctx, x + gap, y + gap, x + stoneW - gap, Math.min(y + rowH, bottom) - gap);
      const shade = pick(rand, ['#dccba3', '#cdb88d', '#e6d7b4', '#c3ad82']);
      ctx.fillStyle = shade;
      ctx.strokeStyle = shade;
      ctx.lineWidth = cwAt(x, y) * 0.04;
      ctx.stroke();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 98, 62, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      x += stoneW;
    }
    y += rowH;
  }
}

/** Trazas de circuito que salen de cada agujero: la IA "cablea" el suelo. */
const CIRCUITS: BoardPoint[][] = (() => {
  const rand = seededRandom(1234);
  const traces: BoardPoint[][] = [];
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    for (let k = 0; k < 3; k++) {
      let x = SCENERY.holeX + (rand() - 0.5) * 0.3;
      let y = lane + 0.5 + (rand() - 0.5) * 0.3;
      const trace: BoardPoint[] = [{ x, y }];
      for (let step = 0; step < 4; step++) {
        if (step % 2 === 0) x += 0.2 + rand() * 0.6;
        else y += (rand() - 0.5) * 0.7;
        x = Math.min(x, SCENERY.corruption.toX);
        trace.push({ x, y });
      }
      traces.push(trace);
    }
  }
  return traces;
})();

function strokeTrace(ctx: Ctx, trace: BoardPoint[]): void {
  ctx.beginPath();
  trace.forEach((pt, i) => {
    const p = P(pt.x, pt.y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function holeShape(lane: number): { x: number; y: number; rx: number; ry: number } {
  const p = P(SCENERY.holeX, lane + 0.5);
  const cw = cwAt(SCENERY.holeX, lane + 0.5);
  const laneH = P(SCENERY.holeX, lane + 1).y - P(SCENERY.holeX, lane).y;
  return { x: p.x, y: p.y, rx: cw * 0.3, ry: laneH * 0.26 };
}

function paintCorruption(ctx: Ctx, rand: () => number): void {
  const { fromX, toX } = SCENERY.corruption;
  const bottom = SCENERY.frontEdgeY;
  boardRect(ctx, fromX, -0.05, toX, bottom);
  const left = P(fromX, 2.5).x;
  const g = ctx.createLinearGradient(left, 0, left + 260, 0);
  g.addColorStop(0, '#4b3b52');
  g.addColorStop(1, '#2b2034');
  ctx.fillStyle = g;
  ctx.fill();

  // Borde mordido: cuadraditos que se comen el cesped por la derecha.
  for (let i = 0; i < 140; i++) {
    const x = fromX - 0.12 + rand() * 0.22;
    const y = rand() * BOARD.lanes;
    const p = P(x, y);
    const s = cwAt(x, y) * (0.03 + rand() * 0.05);
    ctx.fillStyle = pick(rand, ['#4b3b52', '#3a2d44', '#5c4a66', 'rgba(125, 255, 192, 0.5)']);
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const trace of CIRCUITS) {
    ctx.strokeStyle = 'rgba(57, 229, 140, 0.45)';
    ctx.lineWidth = cwAt(trace[0].x, trace[0].y) * 0.025;
    strokeTrace(ctx, trace);
    const end = P(trace[trace.length - 1].x, trace[trace.length - 1].y);
    circle(ctx, end.x, end.y, 3, '#7dffc0');
  }

  for (let lane = 0; lane < BOARD.lanes; lane++) {
    const { x, y, rx, ry } = holeShape(lane);
    ellipse(ctx, x, y + ry * 0.15, rx * 1.35, ry * 1.45, '#5b4636');
    ellipse(ctx, x, y - ry * 0.1, rx * 1.2, ry * 1.1, '#73594a');
    const inner = ctx.createRadialGradient(x, y + ry * 0.2, 1, x, y, rx);
    inner.addColorStop(0, '#030207');
    inner.addColorStop(1, '#22172b');
    ellipse(ctx, x, y, rx, ry, inner);
    ctx.strokeStyle = 'rgba(57, 229, 140, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = rand() * Math.PI * 2;
      const d = 1.3 + rand() * 0.9;
      ctx.fillStyle = pick(rand, ['rgba(125, 255, 192, 0.35)', 'rgba(180, 140, 255, 0.35)', '#3a2d44']);
      ctx.fillRect(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 4, 4);
    }
  }
}

function paintCorruptionGlow(ctx: Ctx, _w: number, _h: number, scale: number): void {
  ctx.translate(-CORRUPTION_GLOW_AREA.x, -CORRUPTION_GLOW_AREA.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#39ff88';
  // El desenfoque de sombra no lo escala la transformacion del contexto.
  ctx.shadowBlur = 14 * scale;
  for (const trace of CIRCUITS) {
    ctx.strokeStyle = '#8affc8';
    ctx.lineWidth = cwAt(trace[0].x, trace[0].y) * 0.02;
    strokeTrace(ctx, trace);
    const end = P(trace[trace.length - 1].x, trace[trace.length - 1].y);
    circle(ctx, end.x, end.y, 3.5, '#d6ffe9');
  }
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    const { x, y, rx, ry } = holeShape(lane);
    ctx.strokeStyle = '#7dffc0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintLawn(ctx: Ctx, rand: () => number): void {
  const { lanes, columns } = BOARD;
  for (let lane = 0; lane < lanes; lane++) {
    for (let col = 0; col < columns; col++) {
      boardRect(ctx, col, lane, col + 1, lane + 1);
      ctx.fillStyle = (lane + col) % 2 === 0 ? '#7fce5d' : '#70c051';
      ctx.fill();
      // Brillo suave en el centro de cada casilla: cesped recien cortado.
      const c = P(col + 0.5, lane + 0.5);
      const r = cwAt(col + 0.5, lane + 0.5) * 0.55;
      const sheen = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      sheen.addColorStop(0, 'rgba(255, 255, 210, 0.10)');
      sheen.addColorStop(1, 'rgba(255, 255, 210, 0)');
      ctx.fillStyle = sheen;
      boardRect(ctx, col, lane, col + 1, lane + 1);
      ctx.fill();
    }
  }

  // Profundidad: el fondo un poco mas oscuro.
  boardRect(ctx, 0, 0, columns, lanes);
  const depth = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
  depth.addColorStop(0, 'rgba(20, 70, 30, 0.22)');
  depth.addColorStop(1, 'rgba(255, 255, 200, 0.04)');
  ctx.fillStyle = depth;
  ctx.fill();

  ctx.lineCap = 'round';
  for (let i = 0; i < 3400; i++) {
    const x = 0.02 + rand() * (columns - 0.04);
    const y = 0.04 + rand() * (lanes - 0.06);
    const p = P(x, y);
    const cw = cwAt(x, y);
    const len = cw * (0.03 + rand() * 0.035);
    const a = -Math.PI / 2 + (rand() - 0.5) * 0.7;
    ctx.strokeStyle = pick(rand, ['rgba(170, 230, 120, 0.55)', 'rgba(70, 140, 50, 0.45)', 'rgba(120, 200, 90, 0.5)']);
    ctx.lineWidth = cw * 0.011;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const x = 0.1 + rand() * (columns - 0.2);
    const y = 0.1 + rand() * (lanes - 0.2);
    const p = P(x, y);
    smallFlower(ctx, p.x, p.y, cwAt(x, y) * 0.016, '#ffffff', '#f6c343');
  }

  ctx.strokeStyle = 'rgba(30, 80, 30, 0.13)';
  ctx.lineWidth = 1.5;
  for (let col = 1; col < columns; col++) {
    const a = P(col, 0);
    const b = P(col, lanes);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let lane = 1; lane < lanes; lane++) {
    const a = P(0, lane);
    const b = P(columns, lane);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  boardRect(ctx, 0, 0, columns, lanes);
  ctx.strokeStyle = '#3c7a2f';
  ctx.lineWidth = 5;
  ctx.stroke();
  boardRect(ctx, 0.02, 0.02, columns - 0.02, lanes - 0.02);
  ctx.strokeStyle = 'rgba(210, 255, 170, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Linea donde empieza el corte de tierra (borde delantero del terreno). */
const cutTop = () => P(0, SCENERY.frontEdgeY).y;

/**
 * Corte de tierra delante del terreno, como una maqueta. En pantallas altas se ve mas hondo,
 * asi que abajo hay sorpresas: raices, semillas brotando y los cables de la corrupcion.
 */
function paintFrontCut(ctx: Ctx, rand: () => number): void {
  const top = cutTop();
  const left = WORLD.left;
  const width = WORLD.width;
  const bottom = WORLD.bottom;
  const soil = ctx.createLinearGradient(0, top, 0, bottom);
  soil.addColorStop(0, '#7d5435');
  soil.addColorStop(0.35, '#5e3d25');
  soil.addColorStop(1, '#3a2415');
  ctx.fillStyle = soil;
  ctx.fillRect(left, top, width, bottom - top);

  // Debajo del suelo corrupto la tierra tambien se tine.
  const corruptX = P(SCENERY.corruption.fromX, SCENERY.frontEdgeY).x;
  const purple = ctx.createLinearGradient(corruptX - 40, 0, corruptX + 120, 0);
  purple.addColorStop(0, 'rgba(70, 40, 90, 0)');
  purple.addColorStop(1, 'rgba(70, 40, 90, 0.6)');
  ctx.fillStyle = purple;
  ctx.fillRect(corruptX - 40, top, WORLD.right - corruptX + 40, bottom - top);

  // Vetas de tierra, cada vez mas tenues hacia abajo.
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const y0 = top + 16 + k * (k < 2 ? 14 : 30);
    ctx.strokeStyle = `rgba(60, 35, 20, ${0.5 - k * 0.05})`;
    ctx.beginPath();
    for (let x = left; x <= WORLD.right; x += 20) {
      const y = y0 + Math.sin(x * 0.02 + k * 2) * (3 + k);
      if (x === left) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < acrossWorld(200); i++) {
    ellipse(ctx, left + rand() * width, top + 10 + rand() * (bottom - top - 10), 3 + rand() * 7, 2 + rand() * 5, pick(rand, ['#9a8068', '#6e5440', '#b19a80', '#857060']));
  }
  // Raicillas del cesped.
  ctx.strokeStyle = 'rgba(176, 130, 85, 0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < acrossWorld(18); i++) {
    const x = left + rand() * width;
    ctx.beginPath();
    ctx.moveTo(x, top + 4);
    ctx.bezierCurveTo(x + 10, top + 16, x - 8, top + 26, x + 6, top + 34 + rand() * 18);
    ctx.stroke();
  }
  // Semillas que brotan bajo tierra (lado del jardin).
  for (let i = 0; i < 9; i++) {
    const x = left + 120 + rand() * (corruptX - left - 220);
    const y = top + 70 + rand() * (bottom - top - 100);
    ellipse(ctx, x, y, 7, 5, '#c9a46a', -0.4);
    ctx.strokeStyle = '#7fcf5f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 4);
    ctx.quadraticCurveTo(x + 6, y - 14, x + 2, y - 22);
    ctx.stroke();
    leafShape(ctx, x + 2, y - 20, 9, 3.5, -2.3);
    ctx.fillStyle = '#7fcf5f';
    ctx.fill();
  }
  // Cables de la corrupcion que se meten bajo tierra.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    let x = corruptX + 30 + rand() * (WORLD.right - corruptX - 60);
    let y = top + 6;
    ctx.strokeStyle = 'rgba(57, 229, 140, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 4; step++) {
      if (step % 2 === 0) y += 30 + rand() * 60;
      else x += (rand() - 0.5) * 120;
      ctx.lineTo(x, Math.min(y, bottom - 10));
    }
    ctx.stroke();
    circle(ctx, x, Math.min(y, bottom - 10), 3, 'rgba(125, 255, 192, 0.8)');
  }
  // Labio de cesped que cae sobre el corte.
  for (let x = left - 10; x < WORLD.right + 10; x += 9) {
    const corrupt = x > corruptX;
    ellipse(ctx, x, top + 1, 8, 4 + rand() * 4, corrupt ? '#3b2f47' : '#4f9a3c');
  }
}

function paintTrunk(ctx: Ctx): void {
  const base = cutTop() + 4;
  ctx.beginPath();
  ctx.moveTo(-40, base);
  ctx.bezierCurveTo(-30, 600, -20, 300, -10, 120);
  ctx.lineTo(62, 120);
  ctx.bezierCurveTo(70, 300, 64, 560, 92, 760);
  ctx.bezierCurveTo(110, 830, 150, base - 10, 200, base);
  ctx.closePath();
  const bark = ctx.createLinearGradient(-20, 0, 140, 0);
  bark.addColorStop(0, '#4a311d');
  bark.addColorStop(0.7, '#7a5333');
  bark.addColorStop(1, '#8d6440');
  ctx.fillStyle = bark;
  ctx.fill();

  ctx.strokeStyle = 'rgba(50, 30, 15, 0.45)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) {
    const x = 4 + k * 12;
    ctx.beginPath();
    ctx.moveTo(x, 130);
    ctx.bezierCurveTo(x + 6, 380, x - 4, 600, x + 10 + k * 6, base - 6);
    ctx.stroke();
  }
  // Raices que se meten en el bancal.
  ctx.strokeStyle = '#6e4a2c';
  ctx.lineCap = 'round';
  for (const [x, y, ex, ey, wdt] of [
    [80, 800, 190, 850, 14],
    [70, 760, 160, 790, 9],
  ] as const) {
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + ex) / 2, y - 10, ex, ey);
    ctx.stroke();
  }
  // Y las que se ven en el corte de tierra, bajando hondo.
  ctx.strokeStyle = '#5c3d24';
  for (const [x, ex, depth, wdt] of [
    [-20, -120, 170, 16],
    [30, 10, 220, 20],
    [90, 210, 150, 14],
    [140, 300, 90, 9],
  ] as const) {
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(x, base - 6);
    ctx.bezierCurveTo(x, base + depth * 0.4, ex, base + depth * 0.5, ex, base + depth);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Copa del arbol, hojas, flores y matas

function paintCanopy(ctx: Ctx): void {
  const rand = seededRandom(77);
  // Se dibuja en las medidas originales (copa de 600 de ancho, ancla en 70, 340) desplazadas por el margen.
  ctx.translate(CANOPY_SHIFT.x, CANOPY_SHIFT.y);
  const designWidth = 600;
  // Ramas que unen la copa con el tronco; una se va hacia la izquierda para las pantallas anchas.
  ctx.strokeStyle = '#5c3d24';
  ctx.lineCap = 'round';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(70, 380);
  ctx.quadraticCurveTo(140, 240, 300, 200);
  ctx.stroke();
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(150, 250);
  ctx.quadraticCurveTo(250, 260, 420, 230);
  ctx.stroke();
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(60, 330);
  ctx.quadraticCurveTo(-40, 250, -220, 220);
  ctx.stroke();

  const blobs: Array<[number, number, number]> = [];
  for (let i = 0; i < 46; i++) {
    const t = rand();
    const x = 20 + t * (designWidth - 80);
    const y = 60 + rand() * 180 - Math.sin(t * Math.PI) * 30 + t * 30;
    blobs.push([x, y, 40 + rand() * 50 * (1 - t * 0.5)]);
  }
  for (let i = 0; i < 26; i++) {
    blobs.push([-250 + rand() * 290, 70 + rand() * 190, 45 + rand() * 40]);
  }
  for (const [x, y, r] of blobs) circle(ctx, x, y + r * 0.2, r, '#2c6f30');
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, '#7fcf5f');
    g.addColorStop(1, '#3a8a3a');
    circle(ctx, x, y, r * 0.9, g);
  }
  for (let i = 0; i < 30; i++) {
    const [x, y, r] = pick(rand, blobs);
    smallFlower(ctx, x + (rand() - 0.5) * r, y + (rand() - 0.5) * r, 3.5, '#ffd6ea', '#ff9fc8');
  }
}

function paintLeafParticle(ctx: Ctx, w: number, h: number): void {
  leafShape(ctx, 1, h / 2, w - 2, h * 0.45, 0);
  ctx.fillStyle = '#8fd46a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 120, 40, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, h / 2);
  ctx.lineTo(w - 3, h / 2);
  ctx.stroke();
}

function paintDot(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Destello de cuatro puntas para el rocio del cesped. */
function paintSparkle(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  glow.addColorStop(0.25, 'rgba(255, 255, 255, 0.25)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.quadraticCurveTo(cx, cy, w, cy);
  ctx.quadraticCurveTo(cx, cy, cx, h);
  ctx.quadraticCurveTo(cx, cy, 0, cy);
  ctx.quadraticCurveTo(cx, cy, cx, 0);
  ctx.fill();
}

/** Haz de luz: franja vertical suave que se desvanece hacia abajo y por los lados. */
function paintBeam(ctx: Ctx, w: number, h: number): void {
  const across = ctx.createLinearGradient(0, 0, w, 0);
  across.addColorStop(0, 'rgba(255, 248, 210, 0)');
  across.addColorStop(0.5, 'rgba(255, 248, 210, 1)');
  across.addColorStop(1, 'rgba(255, 248, 210, 0)');
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  const down = ctx.createLinearGradient(0, 0, 0, h);
  down.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  down.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = down;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** Anillo blanco de borde suave. Se tine al usarlo: impactos, fogonazos, salidas del agujero. */
function paintRing(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, w * 0.28, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.55, 'rgba(255, 255, 255, 1)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintPixel(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 1, w - 2, h - 2);
}

function paintDirt(ctx: Ctx, w: number, h: number): void {
  circle(ctx, w / 2, h / 2, w / 2 - 1, '#7b5233');
  circle(ctx, w * 0.4, h * 0.38, w * 0.2, '#a07450');
}

function paintButterfly(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  for (const side of [-1, 1]) {
    ellipse(ctx, cx + side * 10, h * 0.36, 10, 11, '#fff4fa', side * 0.5);
    ellipse(ctx, cx + side * 8, h * 0.72, 7, 8, '#fff4fa', side * -0.4);
    circle(ctx, cx + side * 11, h * 0.34, 3.5, 'rgba(120, 80, 140, 0.55)');
  }
  ctx.fillStyle = '#3a2a3a';
  ctx.fillRect(cx - 1.5, h * 0.2, 3, h * 0.65);
  ctx.strokeStyle = '#3a2a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.22);
  ctx.lineTo(cx - 6, 1);
  ctx.moveTo(cx, h * 0.22);
  ctx.lineTo(cx + 6, 1);
  ctx.stroke();
}

function paintTuft(ctx: Ctx, w: number, h: number, seed: number): void {
  const rand = seededRandom(seed);
  const blades = 11 + Math.floor(rand() * 6);
  for (let i = 0; i < blades; i++) {
    const t = i / (blades - 1);
    const baseX = w * (0.25 + t * 0.5);
    const tipX = w * (0.05 + t * 0.9) + (rand() - 0.5) * 14;
    const tipY = 4 + rand() * h * 0.45;
    const width = 4 + rand() * 4;
    const g = ctx.createLinearGradient(0, h, 0, tipY);
    g.addColorStop(0, '#2b6e27');
    g.addColorStop(1, pick(rand, ['#6cc04c', '#5fb146', '#82d05e']));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(baseX - width, h);
    ctx.quadraticCurveTo((baseX + tipX) / 2 - width / 2, (h + tipY) / 2, tipX, tipY);
    ctx.quadraticCurveTo((baseX + tipX) / 2 + width / 2, (h + tipY) / 2, baseX + width, h);
    ctx.closePath();
    ctx.fill();
  }
  if (rand() > 0.4) smallFlower(ctx, w * (0.3 + rand() * 0.4), h * 0.3, 4, '#ffffff', '#f6c343');
}

function paintFlower(ctx: Ctx, w: number, h: number, variant: number): void {
  const cx = w / 2;
  ctx.strokeStyle = '#3f8a35';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, h);
  ctx.quadraticCurveTo(cx - 6, h * 0.6, cx, h * 0.3);
  ctx.stroke();
  leafShape(ctx, cx - 1, h * 0.75, 16, 5, -2.5);
  ctx.fillStyle = '#4f9e3c';
  ctx.fill();
  leafShape(ctx, cx, h * 0.62, 14, 4, -0.5);
  ctx.fill();

  const top = h * 0.28;
  if (variant === 0) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ellipse(ctx, cx + Math.cos(a) * 8, top + Math.sin(a) * 8, 6, 3.2, '#ffffff', a);
    }
    circle(ctx, cx, top, 5, '#f6c343');
  } else if (variant === 1) {
    ctx.fillStyle = '#ff6f91';
    ctx.beginPath();
    ctx.moveTo(cx - 11, top - 8);
    ctx.lineTo(cx - 5, top - 2);
    ctx.lineTo(cx, top - 11);
    ctx.lineTo(cx + 5, top - 2);
    ctx.lineTo(cx + 11, top - 8);
    ctx.quadraticCurveTo(cx + 12, top + 10, cx, top + 10);
    ctx.quadraticCurveTo(cx - 12, top + 10, cx - 11, top - 8);
    ctx.fill();
    ellipse(ctx, cx - 4, top - 1, 2.5, 5, 'rgba(255, 255, 255, 0.35)');
  } else {
    for (let i = 0; i < 6; i++) {
      circle(ctx, cx + (i % 2 === 0 ? -3 : 3), top - 12 + i * 4, 4.5, i < 2 ? '#c9a7ff' : '#a983f0');
    }
  }
}

// ---------------------------------------------------------------------------
// Unidades

/** Colores de cada variante de la disparadora. Tallo y hojas de la base son siempre verdes: sigue siendo una planta. */
interface ShooterPalette {
  /** Contorno de cabeza, canones y ojo. */
  outline: string;
  /** Cabeza: luz, tono y sombra. */
  head: readonly [string, string, string];
  /** Canon: arriba y abajo. */
  tube: readonly [string, string];
  /** Borde de la boca del canon y su fondo. */
  mouth: string;
  bore: string;
  /** Lo que brilla en el fondo de cada canon, si tiene: una brasa (fuego) o escarcha (hielo). */
  boreGlow: string | null;
  /** Hojas del brote de la coronilla. */
  sprout: string;
  sproutOutline: string;
  /** Flor de la de 3 canones: petalos y centro. */
  flower: readonly [string, string];
  cheek: string;
}

const SHOOTER_PALETTES: Record<ShooterVariant, ShooterPalette> = {
  normal: {
    outline: '#2a6b22',
    head: ['#d0f59a', '#80d153', '#4aa236'],
    tube: ['#9be36c', '#3f9a35'],
    mouth: '#6cc24a',
    bore: '#1c3d15',
    boreGlow: null,
    sprout: '#62c046',
    sproutOutline: '#2a6b22',
    flower: ['#ffb3d1', '#ffd23f'],
    cheek: 'rgba(255, 130, 130, 0.38)',
  },
  // Fuego (T-004): cabeza de guindilla madura, canones de brasa y un brote como una llamita.
  fire: {
    outline: '#8a2410',
    head: ['#fff0b0', '#ff8f3a', '#e0401c'],
    tube: ['#ffd27a', '#e2581f'],
    mouth: '#ffa04d',
    bore: '#4a1208',
    boreGlow: '#ffcf4a',
    sprout: '#ffb22e',
    sproutOutline: '#b5450f',
    flower: ['#fff3a0', '#ff6a2a'],
    cheek: 'rgba(255, 70, 50, 0.42)',
  },
  // Hielo (T-005): cabeza de escarcha azul clara, canones de hielo con un brillo frio dentro y un brote de cristal.
  // Mejillas mas sonrosadas: tiene frio.
  ice: {
    outline: '#1f5a8a',
    head: ['#f4fcff', '#9fdcff', '#4a9fd8'],
    tube: ['#e4f7ff', '#6cbce8'],
    mouth: '#b8e8ff',
    bore: '#0f3350',
    boreGlow: '#c8f4ff',
    sprout: '#d4f2ff',
    sproutOutline: '#2f74a8',
    flower: ['#ffffff', '#7fd0ff'],
    cheek: 'rgba(255, 110, 160, 0.5)',
  },
};

/** Contorno de lo verde de la planta (hojas de la base y puntos del tallo). */
const LEAF_OUTLINE = '#2a6b22';

/**
 * Disparadora: cabeza redonda, canones y hojas a los pies. Mira hacia la derecha, por donde llegan los gusanos.
 * Al fusionarse (T-006) crece un poco: mas canones, cabeza algo mayor, una hoja mas en la base y en el brote,
 * y la de 3 canones luce una flor en la coronilla. Un punto en el tallo por canon.
 * Las variantes (fuego, T-004; hielo, T-005) cambian solo los colores de `palette`: la forma es la misma.
 */
function paintShooter(ctx: Ctx, cannons: ShooterCannons, palette: ShooterPalette): void {
  const { footX, footY } = SHOOTER_SIZE;
  const { outline } = palette;
  const { x: headX, y: headY, r: headR } = shooterHead(cannons);

  // Hojas de la base: dos, y una mas por cada fusion, mas cortas y levantadas.
  const baseLeaves: Array<readonly [number, number, number]> = [
    [Math.PI + 0.35, 52, 15],
    [-0.35, 50, 15],
  ];
  if (cannons >= 2) baseLeaves.unshift([-0.95, 36, 11]);
  if (cannons >= 3) baseLeaves.unshift([Math.PI + 0.95, 34, 11]);
  for (const [angle, length, width] of baseLeaves) {
    leafShape(ctx, footX, footY - 4, length, width, angle);
    const g = ctx.createLinearGradient(footX - 50, footY - 30, footX + 50, footY);
    g.addColorStop(0, '#5fb846');
    g.addColorStop(1, '#2f7a26');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = LEAF_OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Tallo
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3f9a35';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(footX, footY - 4);
  ctx.quadraticCurveTo(footX - 16, footY - 44, footX - 4, footY - 74);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190, 245, 150, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(footX + 3, footY - 8);
  ctx.quadraticCurveTo(footX - 10, footY - 44, footX + 1, footY - 72);
  ctx.stroke();

  // Un punto por canon en el tallo: semillitas doradas, de abajo arriba.
  for (const dot of SHOOTER_DOTS.slice(0, cannons)) {
    const g = ctx.createRadialGradient(dot.x - 1.5, dot.y - 1.5, 0.5, dot.x, dot.y, SHOOTER_DOT_RADIUS);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.6, '#ffe36b');
    g.addColorStop(1, '#e0a92a');
    circle(ctx, dot.x, dot.y, SHOOTER_DOT_RADIUS, g);
    ctx.strokeStyle = LEAF_OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, SHOOTER_DOT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Canones (van detras de la cabeza para que salgan de la cara)
  for (const barrel of SHOOTER_BARRELS[cannons]) {
    const { y, fromX, mouthX, h } = barrel;
    const tube = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    tube.addColorStop(0, palette.tube[0]);
    tube.addColorStop(1, palette.tube[1]);
    ctx.fillStyle = tube;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(fromX, y - h / 2, mouthX - fromX, h, h * 0.31);
    ctx.fill();
    ctx.stroke();
    ellipse(ctx, mouthX, y, h * 0.28, h * 0.6, palette.mouth);
    ctx.beginPath();
    ctx.ellipse(mouthX, y, h * 0.28, h * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ellipse(ctx, mouthX + 2, y, h * 0.16, h * 0.375, palette.bore);
    if (palette.boreGlow) {
      ellipse(ctx, mouthX + 2.5, y + h * 0.06, h * 0.08, h * 0.2, palette.boreGlow);
    }
  }

  // Cabeza
  const head = ctx.createRadialGradient(headX - 16, headY - 20, 6, headX, headY, headR + 4);
  head.addColorStop(0, palette.head[0]);
  head.addColorStop(0.45, palette.head[1]);
  head.addColorStop(1, palette.head[2]);
  circle(ctx, headX, headY, headR, head);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Brote en la coronilla: dos hojas, tres al fusionar, y la de 3 canones con una flor.
  const sproutY = headY - headR + 2;
  const sprout = cannons >= 2 ? [-2.15, -1.6, -1.0] : [-2.0, -1.15];
  for (const angle of sprout) {
    leafShape(ctx, 74, sproutY, 26, 8, angle);
    ctx.fillStyle = palette.sprout;
    ctx.fill();
    ctx.strokeStyle = palette.sproutOutline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (cannons === 3) {
    const fx = 74 + Math.cos(-1.6) * 26;
    const fy = sproutY + Math.sin(-1.6) * 26;
    smallFlower(ctx, fx, fy, 6, palette.flower[0], palette.flower[1]);
    ctx.strokeStyle = 'rgba(176, 60, 110, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(fx, fy, 4.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ojo mirando a la derecha, con brillo, y mejilla sonrojada. Con 3 canones, una ceja decidida.
  const eye = SHOOTER_EYE;
  ellipse(ctx, eye.x, eye.y, eye.rx, eye.ry, '#ffffff');
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y, eye.rx, eye.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, 77, 72, 7, '#1a2614');
  circle(ctx, 80, 68, 2.6, '#ffffff');
  if (cannons === 3) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(61, 50);
    ctx.quadraticCurveTo(72, 46, 84, 53);
    ctx.stroke();
  }
  ellipse(ctx, 58, 96, 8, 4.5, palette.cheek);
  // Reflejo en la cabeza
  ellipse(ctx, headX - 22, headY - 28, 12, 7, 'rgba(255, 255, 255, 0.35)', -0.6);
}

/**
 * Medallita de nivel (T-003): disco con el borde ondulado como un sello, contorno oscuro para que se lea sobre
 * cualquier cabeza (tambien la azul clarita del hielo), un brillo y el numero en blanco con borde.
 * El color cambia cada 5 niveles (`medalTier`); la del nivel maximo es de cristal irisado con dos destellos.
 */
function paintMedal(ctx: Ctx, level: number): void {
  const palette = MEDAL_TIERS[medalTier(level)];
  const c = MEDAL.size / 2;
  const r = MEDAL.radius;
  const top = medalTier(level) === MEDAL_TIERS.length - 1;

  // Borde ondulado: 14 ondas algo mas oscuras que el disco.
  const waves = 14;
  ctx.beginPath();
  for (let i = 0; i <= waves * 8; i++) {
    const a = (i / (waves * 8)) * Math.PI * 2;
    const radius = r + 1.6 + 1.4 * Math.cos(a * waves);
    const x = c + Math.cos(a) * radius;
    const y = c + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = palette.dark;
  ctx.fill();
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Disco con la luz arriba a la izquierda.
  const disc = ctx.createRadialGradient(c - 4, c - 5, 1, c, c, r);
  disc.addColorStop(0, palette.light);
  disc.addColorStop(0.5, palette.mid);
  disc.addColorStop(1, palette.dark);
  circle(ctx, c, c, r - 1, disc);
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(c, c, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  // Aro claro por dentro y reflejo.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(c, c, r - 3.6, Math.PI * 0.95, Math.PI * 1.75);
  ctx.stroke();
  ellipse(ctx, c - 5, c - 6.5, 4.2, 2.2, 'rgba(255, 255, 255, 0.55)', -0.6);

  // Numero: blanco con el borde del contorno, algo mas pequeno con dos cifras.
  const text = String(level);
  ctx.font = `900 ${text.length > 1 ? 17 : 21}px ui-rounded, "Nunito", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 4;
  ctx.strokeText(text, c, c + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, c, c + 1);

  if (top) {
    sparkleStar(ctx, c + r - 1, c - r + 2, 4.5);
    sparkleStar(ctx, c - r + 2, c + r - 3, 3);
  }
}

/** Destello de cuatro puntas, blanco con borde claro. */
function sparkleStar(ctx: Ctx, x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? size : size * 0.32;
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(122, 98, 255, 0.8)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

/** Colores y detalles de la mina de cada elemento. La forma es la misma: bulbo medio enterrado con un rabito de mecha. */
interface MinePalette {
  outline: string;
  /** Bulbo: luz dormida, luz en cuenta atras, tono y sombra. */
  bulb: readonly [string, string, string, string];
  /** Gajos del bulbo. */
  ribs: string;
  /** Rabito que hace de mecha. */
  fuse: string;
  /** Boca en "o" del susto. */
  mouth: string;
  cheek: string;
  /** Gota de sudor del susto, con borde si no se leeria sobre el bulbo. */
  sweat: { fill: string; stroke: string | null };
  /** Punta de la mecha: chispa (fuego) o copo (hielo), mas grande en cuenta atras. */
  tip: (ctx: Ctx, x: number, y: number, armed: boolean) => void;
  /** Gorro de nieve en lo alto del bulbo, con dos goterones. */
  snowCap: boolean;
}

const MINE_PALETTES: Record<ElementType, MinePalette> = {
  // Fuego (T-004): guindilla con una mecha que chisporrotea.
  fire: {
    outline: '#8a2410',
    bulb: ['#ffe6a0', '#fff6c8', '#ff8f3a', '#d8361a'],
    ribs: 'rgba(160, 30, 10, 0.35)',
    fuse: '#6b4a2a',
    mouth: '#4a1208',
    cheek: 'rgba(255, 70, 50, 0.5)',
    sweat: { fill: '#bfe9ff', stroke: null },
    tip: paintSparkTip,
    snowCap: false,
  },
  // Hielo (T-005): bulbo escarchado con gorro de nieve y un copo en la punta del rabito helado.
  ice: {
    outline: '#1f5a8a',
    bulb: ['#f4fcff', '#ffffff', '#9fdcff', '#3f92d0'],
    ribs: 'rgba(40, 110, 170, 0.35)',
    fuse: '#6fa8c8',
    mouth: '#123a5a',
    cheek: 'rgba(255, 110, 160, 0.55)',
    sweat: { fill: '#e8f8ff', stroke: '#3f92d0' },
    tip: paintFlakeTip,
    snowCap: true,
  },
};

/** Brasa de la mecha de fuego: chispa grande con rayos en cuenta atras. */
function paintSparkTip(ctx: Ctx, tipX: number, tipY: number, armed: boolean): void {
  const spark = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, armed ? 13 : 7);
  spark.addColorStop(0, 'rgba(255, 255, 230, 1)');
  spark.addColorStop(0.35, armed ? 'rgba(255, 210, 74, 0.95)' : 'rgba(255, 170, 60, 0.9)');
  spark.addColorStop(1, 'rgba(255, 90, 30, 0)');
  ctx.fillStyle = spark;
  ctx.beginPath();
  ctx.arc(tipX, tipY, armed ? 13 : 7, 0, Math.PI * 2);
  ctx.fill();
  if (armed) {
    ctx.strokeStyle = 'rgba(255, 236, 140, 0.95)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(tipX + Math.cos(a) * 6, tipY + Math.sin(a) * 6);
      ctx.lineTo(tipX + Math.cos(a) * 12, tipY + Math.sin(a) * 12);
      ctx.stroke();
    }
  }
}

/** Copo en la punta del rabito helado: con un halo frio en cuenta atras. */
function paintFlakeTip(ctx: Ctx, tipX: number, tipY: number, armed: boolean): void {
  if (armed) {
    const halo = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 15);
    halo.addColorStop(0, 'rgba(230, 250, 255, 0.95)');
    halo.addColorStop(0.45, 'rgba(160, 220, 255, 0.6)');
    halo.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  drawSnowflake(ctx, tipX, tipY, armed ? 9.5 : 7);
}

/**
 * Mina (T-004): un bulbo medio enterrado en un monticulo de tierra, con un rabito que hace de mecha. Dormida, cierra
 * los ojos y sonrie; en cuenta atras, abre mucho los ojos, la boca en "o", suda y la punta de la mecha brilla.
 * Cada elemento pone sus colores y su punta (`MINE_PALETTES`): guindilla con chispa (fuego) o bulbo escarchado
 * con gorro de nieve y un copo (hielo, T-005).
 */
function paintMine(ctx: Ctx, armed: boolean, palette: MinePalette): void {
  const cx = MINE_SIZE.footX;
  const cy = MINE_SIZE.bulbY;
  const { outline } = palette;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Monticulo de atras
  ellipse(ctx, cx, MINE_SIZE.footY - 4, 44, 12, '#5e3b20');

  // Rabito con dos hojas y la mecha que sale de el
  ctx.strokeStyle = '#3f9a35';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 24);
  ctx.quadraticCurveTo(cx - 4, cy - 38, cx + 6, cy - 44);
  ctx.stroke();
  for (const [angle, length] of [
    [Math.PI + 0.5, 20],
    [-0.35, 18],
  ] as const) {
    leafShape(ctx, cx - 2, cy - 27, length, 7, angle);
    ctx.fillStyle = '#62c046';
    ctx.fill();
    ctx.strokeStyle = LEAF_OUTLINE;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  ctx.strokeStyle = palette.fuse;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const { tipX, tipY } = MINE_SIZE;
  ctx.moveTo(cx + 6, cy - 44);
  ctx.bezierCurveTo(cx + 14, cy - 50, tipX - 8, tipY + 4, tipX, tipY);
  ctx.stroke();
  palette.tip(ctx, tipX, tipY, armed);

  // Bulbo
  const rx = 31;
  const ry = 29;
  const body = ctx.createRadialGradient(cx - 11, cy - 13, 3, cx, cy, rx + 4);
  body.addColorStop(0, armed ? palette.bulb[1] : palette.bulb[0]);
  body.addColorStop(0.45, palette.bulb[2]);
  body.addColorStop(1, palette.bulb[3]);
  ellipse(ctx, cx, cy, rx, ry, body);
  // Gajos, como una calabacita
  ctx.strokeStyle = palette.ribs;
  ctx.lineWidth = 2.2;
  for (const dx of [-12, 12]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 0.4, cy - ry + 3);
    ctx.quadraticCurveTo(cx + dx * 1.35, cy, cx + dx * 0.55, cy + ry - 4);
    ctx.stroke();
  }
  if (palette.snowCap) paintSnowCap(ctx, cx, cy, rx, ry);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Cara
  const eyeY = cy - 2;
  const eyes = [cx - 10, cx + 10];
  if (armed) {
    for (const ex of eyes) {
      ellipse(ctx, ex, eyeY, 7.5, 9, '#ffffff');
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 7.5, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      circle(ctx, ex + 1, eyeY + 1, 3, '#1d1030');
      circle(ctx, ex, eyeY - 1, 1.1, '#ffffff');
      // Cejas levantadas de susto
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - 6, eyeY - 14 + (ex < cx ? 2 : -1));
      ctx.quadraticCurveTo(ex, eyeY - 17, ex + 6, eyeY - 14 + (ex < cx ? -1 : 2));
      ctx.stroke();
    }
    ellipse(ctx, cx, cy + 15, 5, 6, palette.mouth);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, 5, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Gota de sudor
    ctx.fillStyle = palette.sweat.fill;
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy - 20);
    ctx.quadraticCurveTo(cx + 31, cy - 11, cx + 26, cy - 9);
    ctx.quadraticCurveTo(cx + 21, cy - 11, cx + 26, cy - 20);
    ctx.fill();
    if (palette.sweat.stroke) {
      ctx.strokeStyle = palette.sweat.stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    for (const ex of eyes) {
      ctx.beginPath();
      ctx.arc(ex, eyeY - 3, 5.5, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy + 9, 5, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }
  ellipse(ctx, cx - 19, cy + 8, 5.5, 3.5, palette.cheek);
  ellipse(ctx, cx + 19, cy + 8, 5.5, 3.5, palette.cheek);
  // Reflejo
  ellipse(ctx, cx - 13, cy - 17, 9, 5, 'rgba(255, 255, 255, 0.5)', -0.6);

  // Labio del monticulo por delante: tapa el pie del bulbo, que queda medio enterrado.
  const lip = ctx.createLinearGradient(0, MINE_SIZE.footY - 14, 0, MINE_SIZE.footY + 6);
  lip.addColorStop(0, '#9a6a42');
  lip.addColorStop(1, '#6e4628');
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.moveTo(cx - 44, MINE_SIZE.footY - 4);
  ctx.quadraticCurveTo(cx - 30, MINE_SIZE.footY - 16, cx, MINE_SIZE.footY - 12);
  ctx.quadraticCurveTo(cx + 30, MINE_SIZE.footY - 16, cx + 44, MINE_SIZE.footY - 4);
  ctx.quadraticCurveTo(cx, MINE_SIZE.footY + 10, cx - 44, MINE_SIZE.footY - 4);
  ctx.fill();
  for (const [dx, dy, r] of [
    [-24, -6, 2.4],
    [-8, -3, 1.8],
    [14, -5, 2.2],
    [28, -4, 1.6],
  ] as const) {
    circle(ctx, cx + dx, MINE_SIZE.footY + dy, r, '#b88a5e');
  }
}

/** Gorro de nieve sobre el bulbo de la mina de hielo: tapa lo alto y cae en dos goterones por los lados, lejos de los ojos. */
function paintSnowCap(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const edge = () => {
    ctx.moveTo(cx + rx + 2, cy - 13);
    ctx.quadraticCurveTo(cx + 27, cy - 3, cx + 23, cy - 5);
    ctx.quadraticCurveTo(cx + 19, cy - 8, cx + 14, cy - 15);
    ctx.quadraticCurveTo(cx, cy - 20, cx - 14, cy - 15);
    ctx.quadraticCurveTo(cx - 19, cy - 9, cx - 23, cy - 4);
    ctx.quadraticCurveTo(cx - 28, cy - 2, cx - rx - 2, cy - 12);
  };
  ctx.beginPath();
  ctx.moveTo(cx - rx - 2, cy - ry - 2);
  ctx.lineTo(cx + rx + 2, cy - ry - 2);
  edge();
  ctx.closePath();
  const snow = ctx.createLinearGradient(0, cy - ry, 0, cy - 2);
  snow.addColorStop(0, '#ffffff');
  snow.addColorStop(1, '#e2f5ff');
  ctx.fillStyle = snow;
  ctx.fill();
  ctx.beginPath();
  edge();
  ctx.strokeStyle = 'rgba(31, 90, 138, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Brillos de escarcha en la parte de abajo del bulbo.
  for (const [dx, dy, r] of [
    [-20, 14, 2.6],
    [16, 18, 2.2],
    [3, 22, 1.8],
  ] as const) {
    star4(ctx, cx + dx, cy + dy, r, 'rgba(255, 255, 255, 0.9)');
  }
}

/** Llama: gota de fuego hacia arriba, roja por fuera, amarilla y blanca por dentro. */
function paintFlame(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const base = FLAME_SIZE.footY - 12;
  const drop = (top: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.bezierCurveTo(cx + r * 0.45, top + (base - top) * 0.4, cx + r, base - r * 0.6, cx + r, base);
    ctx.arc(cx, base, r, 0, Math.PI);
    ctx.bezierCurveTo(cx - r, base - r * 0.6, cx - r * 0.45, top + (base - top) * 0.4, cx, top);
    ctx.closePath();
  };
  const outer = ctx.createRadialGradient(cx, base + 4, 1, cx, base - 6, h * 0.75);
  outer.addColorStop(0, '#ffd04a');
  outer.addColorStop(0.45, '#ff7a2a');
  outer.addColorStop(1, 'rgba(220, 50, 20, 0.85)');
  drop(2, w / 2 - 3);
  ctx.fillStyle = outer;
  ctx.fill();
  const inner = ctx.createRadialGradient(cx, base + 3, 1, cx, base, 12);
  inner.addColorStop(0, '#fffbe6');
  inner.addColorStop(1, '#ffd04a');
  drop(base - 20, 7);
  ctx.fillStyle = inner;
  ctx.fill();
}

function paintCoin(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 3;
  const g = ctx.createRadialGradient(cx - 8, cy - 10, 2, cx, cy, r);
  g.addColorStop(0, '#fff6c0');
  g.addColorStop(0.55, '#ffd23f');
  g.addColorStop(1, '#dc9d16');
  circle(ctx, cx, cy, r, g);
  ctx.strokeStyle = '#b07a0e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(176, 122, 14, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  // Brote en relieve: la moneda del juego es un "rebrote".
  ctx.strokeStyle = '#4f9e3a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 12);
  ctx.lineTo(cx, cy - 2);
  ctx.stroke();
  for (const angle of [-2.4, -0.75]) {
    leafShape(ctx, cx, cy - 1, 14, 5, angle);
    ctx.fillStyle = '#5fb846';
    ctx.fill();
  }
  ellipse(ctx, cx - 10, cy - 13, 9, 4.5, 'rgba(255, 255, 255, 0.6)', -0.6);
}

/** Semilla que dispara la disparadora: verde lima, con brillo, una hojita y estela hacia atras. */
function paintSeed(ctx: Ctx, _w: number, h: number): void {
  const cy = h / 2;
  const cx = SEED_SIZE.cx;
  const trail = ctx.createLinearGradient(2, 0, cx - 2, 0);
  trail.addColorStop(0, 'rgba(214, 255, 150, 0)');
  trail.addColorStop(1, 'rgba(214, 255, 150, 0.6)');
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.moveTo(2, cy);
  ctx.quadraticCurveTo(cx - 14, cy - 7, cx - 2, cy - 7.5);
  ctx.lineTo(cx - 2, cy + 7.5);
  ctx.quadraticCurveTo(cx - 14, cy + 7, 2, cy);
  ctx.fill();

  leafShape(ctx, cx + 2, cy - 7, 8, 3.2, -1.1);
  ctx.fillStyle = '#7fcf5f';
  ctx.fill();

  const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 10);
  g.addColorStop(0, '#fbffd6');
  g.addColorStop(0.5, '#b9ec5c');
  g.addColorStop(1, '#5aa82b');
  ellipse(ctx, cx, cy, 10, 8.5, g);
  ctx.strokeStyle = '#2f6b1f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, cx - 3, cy - 3.5, 3.5, 2.2, 'rgba(255, 255, 255, 0.85)', -0.4);
}

/** Semilla de fuego (T-004): naranja, con una brasa dentro y una estela de llamas. */
function paintFireSeed(ctx: Ctx, _w: number, h: number): void {
  const cy = h / 2;
  const cx = SEED_SIZE.cx;
  const trail = ctx.createLinearGradient(0, 0, cx - 2, 0);
  trail.addColorStop(0, 'rgba(255, 120, 40, 0)');
  trail.addColorStop(0.6, 'rgba(255, 140, 50, 0.6)');
  trail.addColorStop(1, 'rgba(255, 210, 90, 0.9)');
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.moveTo(0, cy - 2);
  ctx.quadraticCurveTo(cx - 20, cy - 12, cx - 12, cy - 6);
  ctx.quadraticCurveTo(cx - 8, cy - 11, cx - 2, cy - 8.5);
  ctx.lineTo(cx - 2, cy + 8.5);
  ctx.quadraticCurveTo(cx - 9, cy + 10, cx - 13, cy + 5);
  ctx.quadraticCurveTo(cx - 20, cy + 10, 0, cy + 2);
  ctx.closePath();
  ctx.fill();

  const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 10.5);
  g.addColorStop(0, '#fff6c8');
  g.addColorStop(0.5, '#ffb347');
  g.addColorStop(1, '#e2541f');
  ellipse(ctx, cx, cy, 10, 8.5, g);
  ctx.strokeStyle = '#8a2410';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, cx + 2, cy + 1.5, 3.2, 2.6, 'rgba(255, 240, 160, 0.9)');
  ellipse(ctx, cx - 3, cy - 3.5, 3.5, 2.2, 'rgba(255, 255, 255, 0.85)', -0.4);
}

/** Semilla de hielo (T-005): azul clara, con un cristal blanco dentro y una estela de escarcha con copitos. */
function paintIceSeed(ctx: Ctx, _w: number, h: number): void {
  const cy = h / 2;
  const cx = SEED_SIZE.cx;
  const trail = ctx.createLinearGradient(1, 0, cx - 2, 0);
  trail.addColorStop(0, 'rgba(170, 225, 255, 0)');
  trail.addColorStop(1, 'rgba(170, 225, 255, 0.8)');
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.moveTo(1, cy);
  ctx.quadraticCurveTo(cx - 14, cy - 9, cx - 2, cy - 8.5);
  ctx.lineTo(cx - 2, cy + 8.5);
  ctx.quadraticCurveTo(cx - 14, cy + 9, 1, cy);
  ctx.fill();
  for (const [x, y, r] of [
    [8, cy - 3, 1.7],
    [15, cy + 3.5, 1.4],
    [4, cy + 1.5, 1],
  ] as const) {
    circle(ctx, x, y, r, 'rgba(255, 255, 255, 0.95)');
  }

  const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 10.5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#a8e4ff');
  g.addColorStop(1, '#4a9fd8');
  ellipse(ctx, cx, cy, 10, 8.5, g);
  ctx.strokeStyle = '#1f5a8a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  star4(ctx, cx + 1.5, cy + 1, 4.4, '#ffffff');
  ellipse(ctx, cx - 3.5, cy - 3.5, 3, 1.8, 'rgba(255, 255, 255, 0.85)', -0.4);
}

/** Estrellita de cuatro puntas rellena (brillos de escarcha). */
function star4(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** Copo de seis brazos con ramitas: blanco con borde azul, para que se lea tambien sobre el cesped claro. */
function drawSnowflake(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  const arms = () => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 2;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      const bx = x + Math.cos(a) * r * 0.55;
      const by = y + Math.sin(a) * r * 0.55;
      for (const side of [-1, 1]) {
        const b = a + side * 0.8;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(b) * r * 0.34, by + Math.sin(b) * r * 0.34);
      }
    }
  };
  arms();
  ctx.strokeStyle = '#3f8fc8';
  ctx.lineWidth = r * 0.36;
  ctx.stroke();
  arms();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = r * 0.17;
  ctx.stroke();
  circle(ctx, x, y, r * 0.2, '#ffffff');
  ctx.restore();
}

function paintSnowflake(ctx: Ctx, w: number, h: number): void {
  drawSnowflake(ctx, w / 2, h / 2, w / 2 - 2.5);
}

/** Escarcha (T-005): tres cristales de hielo en abanico que salen de un punto, con un brillo. */
function paintFrost(ctx: Ctx, w: number): void {
  const cx = w / 2;
  const foot = FROST_SIZE.footY;
  ctx.lineJoin = 'round';
  const crystal = (angle: number, length: number, width: number) => {
    ctx.save();
    ctx.translate(cx, foot);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(-width / 2, -length * 0.7);
    ctx.lineTo(0, -length);
    ctx.lineTo(width / 2, -length * 0.7);
    ctx.lineTo(width / 2, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#a8e4ff');
    g.addColorStop(1, '#5cb0e4');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#1f5a8a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width * 0.12, -length * 0.92);
    ctx.lineTo(-width * 0.12, -3);
    ctx.stroke();
    ctx.restore();
  };
  crystal(-0.6, 22, 9);
  crystal(0.6, 20, 9);
  crystal(0, 33, 11);
  star4(ctx, cx + 7, foot - 25, 4.5, '#ffffff');
}

/**
 * Colores de cada gusano. El escupidor (T-007) es rosa chicle con la boca fruncida, para leerse de un vistazo
 * frente al morado del gusano; los dos llevan las luces verde neon de la corrupcion.
 */
interface WormPalette {
  outline: string;
  /** Degradado de la cabeza y de los anillos: luz, medio y sombra. */
  head: readonly [string, string, string];
  segment: readonly [string, string, string];
  /** Banda de luz de los anillos y pecas de pixel de la nuca. */
  led: string;
  cheek: string;
  /** Boca de piñon, lista para escupir (escupidor). */
  pucker: boolean;
}

const WORM_PALETTES = {
  worm: {
    outline: '#4a2a7a',
    head: ['#ead6ff', '#b48cff', '#7a4cc8'],
    segment: ['#dcc2ff', '#a77cf2', '#6c40b8'],
    led: 'rgba(57, 255, 136, 0.9)',
    cheek: 'rgba(255, 120, 170, 0.55)',
    pucker: false,
  },
  spitter: {
    outline: '#7a1d4c',
    head: ['#ffe6f3', '#ff8cc6', '#d8458f'],
    segment: ['#ffdcee', '#ff80be', '#c43c83'],
    led: 'rgba(57, 255, 136, 0.95)',
    cheek: 'rgba(255, 70, 110, 0.5)',
    pucker: true,
  },
} as const satisfies Record<string, WormPalette>;

/** Verde moco del escupitajo (T-007), con contorno oscuro para leerse sobre el cesped. */
const GOO = { light: '#f0fff6', mid: '#6dffad', dark: '#1cc066', outline: '#0e6a3a' } as const;

/**
 * Cabeza del gusano, mirando a la izquierda (por donde avanza), con una antena de cable y bombilla y pecas de pixel
 * verde neon: un virus, pero simpatico. El color sale de la paleta.
 * - idle: sonrisa con un dientecito (el escupidor: boca de piñon con una gotita de moco).
 * - bite: boca abierta y cejas decididas, va a morder (el escupidor: mofletes hinchados, va a escupir).
 * - hurt: ojos apretados (>_<) y boca de "ay".
 */
function paintWormHead(ctx: Ctx, mood: 'idle' | 'bite' | 'hurt', palette: WormPalette): void {
  const { cx, cy, r } = WORM_SIZE.head;
  const outline = palette.outline;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Antena: un cable que sale de la coronilla con una bombilla encendida.
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - r + 5);
  ctx.quadraticCurveTo(cx + 13, cy - r - 12, cx + 24, cy - r - 17);
  ctx.stroke();
  circle(ctx, cx + 26, cy - r - 18, 8, 'rgba(57, 255, 136, 0.3)');
  const bulb = ctx.createRadialGradient(cx + 24, cy - r - 20, 1, cx + 26, cy - r - 18, 6);
  bulb.addColorStop(0, '#eafff3');
  bulb.addColorStop(0.5, '#39ff88');
  bulb.addColorStop(1, '#13a352');
  circle(ctx, cx + 26, cy - r - 18, 5.5, bulb);

  // Cabeza
  const head = ctx.createRadialGradient(cx - 12, cy - 14, 4, cx, cy, r);
  head.addColorStop(0, palette.head[0]);
  head.addColorStop(0.45, palette.head[1]);
  head.addColorStop(1, palette.head[2]);
  circle(ctx, cx, cy, r, head);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Pecas de pixel en la nuca
  ctx.fillStyle = palette.led;
  for (const [dx, dy, s] of [
    [16, 0, 5],
    [23, 7, 4],
    [14, 11, 3.5],
    [22, -8, 3],
  ] as const) {
    ctx.fillRect(cx + dx, cy + dy, s, s);
  }

  // Ojos: el de delante mas grande, mirando hacia donde va.
  const eyes = [
    { x: cx - 13, y: cy - 6, rx: 11, ry: 13, pupil: 6 },
    { x: cx + 9, y: cy - 8, rx: 9, ry: 11.5, pupil: 5 },
  ];
  if (mood === 'hurt') {
    ctx.strokeStyle = '#1d1030';
    ctx.lineWidth = 3.2;
    eyes.forEach((eye, i) => {
      const dir = i === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(eye.x - dir * 6, eye.y - 7);
      ctx.lineTo(eye.x + dir * 5, eye.y);
      ctx.lineTo(eye.x - dir * 6, eye.y + 7);
      ctx.stroke();
    });
  } else {
    for (const eye of eyes) {
      ellipse(ctx, eye.x, eye.y, eye.rx, eye.ry, '#ffffff');
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(eye.x, eye.y, eye.rx, eye.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      const px = eye.x - eye.rx * 0.38;
      const py = eye.y + 1;
      circle(ctx, px, py, eye.pupil, '#1d1030');
      circle(ctx, px - 2, py - 3, eye.pupil * 0.4, '#ffffff');
    }
    if (mood === 'bite') {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      for (const eye of eyes) {
        ctx.beginPath();
        ctx.moveTo(eye.x - eye.rx, eye.y - eye.ry - 1);
        ctx.lineTo(eye.x + eye.rx * 0.6, eye.y - eye.ry + 5);
        ctx.stroke();
      }
    }
  }

  const mx = cx - 17;
  const my = cy + 16;
  if (palette.pucker) {
    paintPuckerMouth(ctx, mood, mx, my, palette);
  } else {
    ellipse(ctx, cx - 24, cy + 11, 6.5, 4, palette.cheek);
    paintBiteMouth(ctx, mood, mx, my, outline);
  }

  // Reflejo
  ellipse(ctx, cx - 12, cy - 22, 10, 5.5, 'rgba(255, 255, 255, 0.45)', -0.5);
}

/** Boca del gusano que muerde: sonrisa con un dientecito, abierta con dientes, o de "ay". */
function paintBiteMouth(ctx: Ctx, mood: 'idle' | 'bite' | 'hurt', mx: number, my: number, outline: string): void {
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;
  if (mood === 'bite') {
    ellipse(ctx, mx - 2, my + 1, 11, 10, '#3a1640');
    ellipse(ctx, mx - 1, my + 6.5, 6.5, 3.5, '#ff7aa8');
    ctx.fillStyle = '#ffffff';
    for (const tx of [mx - 7, mx + 2]) {
      ctx.beginPath();
      ctx.moveTo(tx, my - 8);
      ctx.lineTo(tx + 5, my - 8);
      ctx.lineTo(tx + 2.5, my - 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(mx - 2, my + 1, 11, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mood === 'hurt') {
    ellipse(ctx, mx, my + 2, 5, 6, '#3a1640');
    ctx.beginPath();
    ctx.ellipse(mx, my + 2, 5, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(mx + 1, my - 3, 8, 0.2 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 2, my + 4.5, 4.5, 4);
    ctx.strokeRect(mx - 2, my + 4.5, 4.5, 4);
  }
}

/**
 * Boca del escupidor (T-007): labios en piñon con una gotita de moco colgando. Cargando, los mofletes se hinchan
 * como globos y los labios se aprietan; dolorido, la boca se abre de "ay".
 */
function paintPuckerMouth(ctx: Ctx, mood: 'idle' | 'bite' | 'hurt', mx: number, my: number, palette: WormPalette): void {
  const outline = palette.outline;
  const lips = (x: number, y: number, rx: number, ry: number) => {
    ellipse(ctx, x, y, rx, ry, '#ff5c9a');
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ellipse(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.22, 'rgba(255, 255, 255, 0.6)');
  };
  if (mood === 'hurt') {
    ellipse(ctx, mx - 6, my + 9, 5, 3, palette.cheek);
    ellipse(ctx, mx - 1, my + 1, 5.5, 6.5, '#3a1640');
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(mx - 1, my + 1, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (mood === 'bite') {
    // Mofletes hinchados: dos globos que asoman a los lados de la boca.
    for (const [x, y, rx, ry] of [
      [mx - 9, my - 1, 11, 10],
      [mx + 9, my + 1, 10, 9],
    ] as const) {
      const g = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, rx);
      g.addColorStop(0, '#fff0f7');
      g.addColorStop(0.6, palette.head[1]);
      g.addColorStop(1, palette.head[2]);
      ellipse(ctx, x, y, rx, ry, g);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ellipse(ctx, x, y + 2, rx * 0.55, ry * 0.4, palette.cheek);
    }
    lips(mx - 4, my + 3, 5, 4);
    circle(ctx, mx - 4, my + 3, 1.6, '#3a1640');
    return;
  }
  ellipse(ctx, mx - 8, my - 4, 6.5, 4, palette.cheek);
  lips(mx - 3, my + 1, 6.5, 5.5);
  circle(ctx, mx - 3, my + 1, 2.4, '#3a1640');
  // Gotita de moco que cuelga del labio.
  const drop = ctx.createRadialGradient(mx - 5, my + 9, 0.5, mx - 4, my + 10, 4);
  drop.addColorStop(0, GOO.light);
  drop.addColorStop(0.5, GOO.mid);
  drop.addColorStop(1, GOO.dark);
  ctx.fillStyle = drop;
  ctx.beginPath();
  ctx.moveTo(mx - 5.5, my + 5);
  ctx.quadraticCurveTo(mx - 8, my + 10, mx - 4, my + 12.5);
  ctx.quadraticCurveTo(mx - 0.5, my + 10, mx - 2.5, my + 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GOO.outline;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Anillo del cuerpo del gusano: color de su paleta con una banda de luz verde neon, como un LED. */
function paintWormSegment(ctx: Ctx, w: number, palette: WormPalette): void {
  const c = w / 2;
  const { r } = WORM_SIZE.segment;
  const g = ctx.createRadialGradient(c - 9, c - 10, 3, c, c, r);
  g.addColorStop(0, palette.segment[0]);
  g.addColorStop(0.5, palette.segment[1]);
  g.addColorStop(1, palette.segment[2]);
  circle(ctx, c, c, r, g);

  // La banda se ve en el lado derecho: el anillo de delante tapa el izquierdo.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = palette.led;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(c + 9, c, 7, r + 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, c - 9, c - 12, 8, 5, 'rgba(255, 255, 255, 0.4)', -0.5);
}

/** Acero de la armadura del acorazado (T-007): azul acero claro con contorno oscuro y remaches. */
const STEEL = { light: '#f5f9fd', mid: '#b4c5d6', dark: '#6d8399', outline: '#2f4155', rivet: '#e8f0f8' } as const;

function rivet(ctx: Ctx, x: number, y: number, r: number): void {
  circle(ctx, x, y, r, STEEL.rivet);
  ctx.strokeStyle = STEEL.outline;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, '#ffffff');
}

/**
 * Casco del acorazado (T-007): una cupula de acero con cresta y remaches, del mismo tamano que la cabeza del gusano
 * para ir encima de ella. El ala queda sobre los ojos, que asoman por debajo; la antena sale por un aro de la cupula.
 */
function paintArmorHelmet(ctx: Ctx): void {
  const { cx, cy, r } = WORM_SIZE.head;
  const domeX = cx + 2;
  const domeY = cy - 17;
  const rx = r + 6;
  const ry = 27;
  ctx.lineJoin = 'round';

  const dome = ctx.createRadialGradient(domeX - 14, domeY - 18, 3, domeX, domeY, rx);
  dome.addColorStop(0, STEEL.light);
  dome.addColorStop(0.5, STEEL.mid);
  dome.addColorStop(1, STEEL.dark);
  ctx.beginPath();
  ctx.ellipse(domeX, domeY, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = dome;
  ctx.fill();
  ctx.strokeStyle = STEEL.outline;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // Cresta de delante a atras.
  ctx.strokeStyle = STEEL.outline;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(domeX, domeY, rx * 0.55, ry + 2, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.strokeStyle = STEEL.mid;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Aro por el que sale la antena del gusano.
  ctx.strokeStyle = STEEL.outline;
  ctx.lineWidth = 2;
  ellipse(ctx, cx + 15, cy - r - 8, 5, 3, STEEL.dark, 0.3);
  ctx.beginPath();
  ctx.ellipse(cx + 15, cy - r - 8, 5, 3, 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Ala sobre los ojos.
  const brim = ctx.createLinearGradient(0, domeY - 3, 0, domeY + 6);
  brim.addColorStop(0, STEEL.light);
  brim.addColorStop(1, STEEL.dark);
  ctx.fillStyle = brim;
  ctx.beginPath();
  ctx.roundRect(cx - r - 9, domeY - 3, 2 * r + 15, 9, 4.5);
  ctx.fill();
  ctx.strokeStyle = STEEL.outline;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  for (const x of [cx - r - 2, cx - 6, cx + r - 2]) rivet(ctx, x, domeY + 1.5, 2.4);
  rivet(ctx, domeX - 18, domeY - 14, 2.6);
  rivet(ctx, domeX + 16, domeY - 15, 2.6);

  // Reflejo
  ellipse(ctx, domeX - 15, domeY - 15, 9, 4.5, 'rgba(255, 255, 255, 0.7)', -0.45);
}

/**
 * Placa de un anillo del acorazado (T-007): una concha de acero sobre la parte de arriba del anillo, del mismo tamano
 * que su textura. Las placas se solapan de la cola a la cabeza, como las de un pangolin.
 */
function paintArmorPlate(ctx: Ctx, w: number): void {
  const c = w / 2;
  const r = WORM_SIZE.segment.r + 3;
  const bottom = c + 3;
  const g = ctx.createRadialGradient(c - 8, c - 14, 2, c, c - 4, r);
  g.addColorStop(0, STEEL.light);
  g.addColorStop(0.55, STEEL.mid);
  g.addColorStop(1, STEEL.dark);
  ctx.beginPath();
  ctx.arc(c, c, r, Math.PI + 0.12, -0.12);
  ctx.quadraticCurveTo(c, bottom + 6, c - r * Math.cos(0.12), c - r * Math.sin(0.12));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = STEEL.outline;
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // Junta central y remache.
  ctx.strokeStyle = 'rgba(47, 65, 85, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(c, c + 2, r * 0.62, Math.PI + 0.35, -0.35);
  ctx.stroke();
  rivet(ctx, c + 7, c - 14, 2.6);
  ellipse(ctx, c - 8, c - 14, 7, 3.5, 'rgba(255, 255, 255, 0.65)', -0.45);
}

/** Escupitajo (T-007): gota de moco verde neon con contorno oscuro y una estela de gotitas detras (a la derecha). */
function paintSpit(ctx: Ctx, _w: number, h: number): void {
  const cy = h / 2;
  const cx = SPIT_SIZE.cx;
  const drops: Array<[number, number, number]> = [
    [cx + 23, cy - 3, 2.6],
    [cx + 16, cy + 3, 3.6],
    [cx + 10, cy - 1, 5.2],
  ];
  for (const [x, y, r] of drops) {
    circle(ctx, x, y, r + 1.2, GOO.outline);
    circle(ctx, x, y, r, GOO.mid);
  }
  const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 11);
  g.addColorStop(0, GOO.light);
  g.addColorStop(0.45, GOO.mid);
  g.addColorStop(1, GOO.dark);
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy);
  ctx.bezierCurveTo(cx - 11, cy - 9, cx + 4, cy - 11, cx + 11, cy - 4);
  ctx.quadraticCurveTo(cx + 13, cy, cx + 11, cy + 4);
  ctx.bezierCurveTo(cx + 4, cy + 11, cx - 11, cy + 9, cx - 11, cy);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = GOO.outline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ellipse(ctx, cx - 4, cy - 4, 4, 2.4, 'rgba(255, 255, 255, 0.85)', -0.4);
  // Un pixel de la corrupcion dentro de la gota.
  ctx.fillStyle = 'rgba(180, 140, 255, 0.9)';
  ctx.fillRect(cx + 2, cy + 1, 3.5, 3.5);
}

// ---------------------------------------------------------------------------
// Creeper (T-008)

/** Carcasa del Creeper: plastico crema de ordenador antiguo, con contorno marron. */
const CASING = { light: '#fff7e2', mid: '#efe0bc', dark: '#c9b48a', back: '#b9a479', outline: '#5a4528' } as const;

interface CreeperScreenPalette {
  /** Fosforo de la cara (y su brillo) sobre el fondo oscuro de la pantalla. */
  phosphor: string;
  glow: string;
  bg: readonly [string, string];
  /** Cejas de enfado (fase 2). */
  angry: boolean;
}

const CREEPER_SCREENS = {
  calm: { phosphor: '#39ff88', glow: 'rgba(57, 255, 136, 0.9)', bg: ['#123a24', '#071a10'], angry: false },
  angry: { phosphor: '#ff5a7a', glow: 'rgba(255, 70, 110, 0.95)', bg: ['#40101e', '#1c050b'], angry: true },
} as const satisfies Record<string, CreeperScreenPalette>;

type CreeperMood = 'idle' | 'bite' | 'hurt' | 'loading';

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Cabeza del Creeper: un monitor antiguo de carcasa crema, visto un poco de lado, con una antena de luz roja en lo
 * alto (se movia por ARPANET). La cara va en la pantalla, en fosforo verde (rojo en la fase 2) con lineas de barrido.
 * - idle: ojos grandes que miran adelante y sonrisa de pillo.
 * - bite: boca abierta con dientes de pixel; en la fase 2, ademas, cejas de enfado (todas las caras de la fase 2).
 * - hurt: ojos apretados y la imagen con un tiron de interferencia.
 * - loading: ojos cerrados de concentracion, "CARGANDO" y el marco de la barra (la vista la va llenando).
 */
function paintCreeperHead(ctx: Ctx, mood: CreeperMood, screen: CreeperScreenPalette, scale: number): void {
  const S = CREEPER_SCREEN;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Antena con su luz.
  ctx.strokeStyle = CASING.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.quadraticCurveTo(62, 18, S.antenna.x, S.antenna.y + 4);
  ctx.stroke();
  circle(ctx, S.antenna.x, S.antenna.y, 8, 'rgba(255, 90, 95, 0.3)');
  const led = ctx.createRadialGradient(S.antenna.x - 1.5, S.antenna.y - 1.5, 0.5, S.antenna.x, S.antenna.y, 5.5);
  led.addColorStop(0, '#fff0f0');
  led.addColorStop(0.5, '#ff5a5f');
  led.addColorStop(1, '#a3161c');
  circle(ctx, S.antenna.x, S.antenna.y, 5, led);

  // Fondo de la carcasa (asoma arriba y a la derecha: da volumen) con su rejilla.
  roundRect(ctx, 26, 24, 66, 62, 12);
  ctx.fillStyle = CASING.back;
  ctx.fill();
  ctx.strokeStyle = CASING.outline;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90, 69, 40, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(85, 38 + i * 8);
    ctx.lineTo(89, 36 + i * 8);
    ctx.stroke();
  }

  // Frente de la carcasa.
  const front = ctx.createRadialGradient(26, 36, 4, 48, 60, 50);
  front.addColorStop(0, CASING.light);
  front.addColorStop(0.5, CASING.mid);
  front.addColorStop(1, CASING.dark);
  roundRect(ctx, 15, 30, 68, 62, 13);
  ctx.fillStyle = front;
  ctx.fill();
  ctx.strokeStyle = CASING.outline;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // Lucecita de encendido y un par de botones.
  circle(ctx, 74, 87, 2.4, screen.phosphor);
  ctx.fillStyle = 'rgba(90, 69, 40, 0.5)';
  ctx.fillRect(58, 85.5, 7, 3);
  ctx.fillRect(48, 85.5, 7, 3);

  // Pantalla.
  ctx.save();
  roundRect(ctx, S.x, S.y, S.width, S.height, 9);
  const bg = ctx.createRadialGradient(S.x + 18, S.y + 14, 2, S.x + S.width / 2, S.y + S.height / 2, 36);
  bg.addColorStop(0, screen.bg[0]);
  bg.addColorStop(1, screen.bg[1]);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.clip();

  ctx.strokeStyle = screen.phosphor;
  ctx.fillStyle = screen.phosphor;
  ctx.shadowColor = screen.glow;
  ctx.shadowBlur = 6 * scale;
  const glitch = mood === 'hurt' ? 3 : 0;
  // Ojos: el de delante (izquierda) mas grande, como los del gusano.
  const eyes = [
    { x: 37, y: 53, rx: 7.5, ry: 9.5 },
    { x: 57, y: 52, rx: 6.5, ry: 8.5 },
  ];
  if (mood === 'hurt') {
    ctx.lineWidth = 3;
    eyes.forEach((eye, i) => {
      const dir = i === 0 ? 1 : -1;
      const ex = eye.x + (i === 0 ? glitch : -glitch);
      ctx.beginPath();
      ctx.moveTo(ex - dir * 5, eye.y - 6);
      ctx.lineTo(ex + dir * 4, eye.y);
      ctx.lineTo(ex - dir * 5, eye.y + 6);
      ctx.stroke();
    });
  } else if (mood === 'loading') {
    ctx.lineWidth = 3;
    for (const eye of eyes) {
      ctx.beginPath();
      ctx.arc(eye.x, eye.y - 1, eye.rx * 0.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  } else {
    for (const eye of eyes) {
      ellipse(ctx, eye.x, eye.y, eye.rx, eye.ry, screen.phosphor);
    }
    ctx.shadowBlur = 0;
    for (const eye of eyes) {
      // Pupila de pixel mirando adelante, con su brillo.
      ctx.fillStyle = screen.bg[1];
      ctx.fillRect(eye.x - eye.rx * 0.75, eye.y - 2, eye.rx * 0.95, eye.ry * 0.9);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(eye.x - eye.rx * 0.55, eye.y - 1, 2.2, 2.2);
    }
    ctx.fillStyle = screen.phosphor;
    ctx.shadowBlur = 6 * scale;
  }
  if (screen.angry || mood === 'bite') {
    // Cejas: decididas al morder; de enfado, mas marcadas, en la fase 2.
    ctx.lineWidth = screen.angry ? 3.4 : 2.6;
    const tilt = screen.angry ? 7 : 4;
    for (const eye of eyes) {
      ctx.beginPath();
      ctx.moveTo(eye.x - eye.rx - 1, eye.y - eye.ry - 4);
      ctx.lineTo(eye.x + eye.rx, eye.y - eye.ry - 4 + tilt);
      ctx.stroke();
    }
  }

  // Boca.
  ctx.lineWidth = 2.6;
  if (mood === 'bite') {
    roundRect(ctx, 33, 65, 22, 12, 4);
    ctx.stroke();
    ctx.fillRect(36, 65.5, 4, 3.5);
    ctx.fillRect(47, 65.5, 4, 3.5);
    ctx.fillRect(41, 73.5, 4, 3);
  } else if (mood === 'hurt') {
    ctx.beginPath();
    ctx.moveTo(37 + glitch, 72);
    ctx.lineTo(41 + glitch, 69);
    ctx.lineTo(45 + glitch, 72);
    ctx.lineTo(49 + glitch, 69);
    ctx.lineTo(53 + glitch, 72);
    ctx.stroke();
  } else if (mood === 'loading') {
    ctx.shadowBlur = 3 * scale;
    ctx.font = '900 8px ui-monospace, "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CARGANDO', S.bar.x + S.bar.width / 2, S.bar.y - 3);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(S.bar.x - 1.5, S.bar.y - 1.5, S.bar.width + 3, S.bar.height + 3);
  } else {
    ctx.beginPath();
    ctx.arc(44, 63, 9, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
    ctx.fillRect(40, 70.5, 3.5, 3.5);
  }
  ctx.shadowBlur = 0;

  // Lineas de barrido y, dolorido, una franja de interferencia.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let y = S.y + 1; y < S.y + S.height; y += 3) ctx.fillRect(S.x, y, S.width, 1);
  if (mood === 'hurt') {
    ctx.fillStyle = screen.glow.replace(/[\d.]+\)$/, '0.35)');
    ctx.fillRect(S.x, 58, S.width, 4);
    ctx.fillRect(S.x, 66, S.width, 2);
  }
  // Brillo del cristal abombado.
  ellipse(ctx, S.x + 13, S.y + 9, 13, 5, 'rgba(255, 255, 255, 0.16)', -0.45);
  ctx.restore();

  // Marco de la pantalla.
  roundRect(ctx, S.x, S.y, S.width, S.height, 9);
  ctx.strokeStyle = CASING.outline;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Reflejo de la carcasa.
  ellipse(ctx, 24, 35, 7, 3, 'rgba(255, 255, 255, 0.55)', -0.5);
}

/** Anillo del Creeper: un modulo de carcasa crema con rejilla y una luz de fosforo que asoma por el lado derecho. */
function paintCreeperSegment(ctx: Ctx, w: number): void {
  const c = w / 2;
  const { r } = WORM_SIZE.segment;
  const g = ctx.createRadialGradient(c - 9, c - 10, 3, c, c, r);
  g.addColorStop(0, CASING.light);
  g.addColorStop(0.55, CASING.mid);
  g.addColorStop(1, CASING.dark);
  circle(ctx, c, c, r, g);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  // Rejilla en el lado derecho (el izquierdo lo tapa el anillo de delante).
  ctx.strokeStyle = 'rgba(90, 69, 40, 0.55)';
  ctx.lineWidth = 2.4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(c + 6, c - 4 + i * 8);
    ctx.lineTo(c + 18, c - 6 + i * 8);
    ctx.stroke();
  }
  ctx.restore();
  circle(ctx, c + 12, c + 13, 3.2, '#39ff88');
  circle(ctx, c + 12, c + 13, 1.4, '#eafff3');
  ctx.strokeStyle = CASING.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, c - 9, c - 12, 8, 5, 'rgba(255, 255, 255, 0.5)', -0.5);
}

/** Rayas de velocidad: tres trazos verde neon con borde oscuro, que se apagan hacia la derecha. */
function paintHasteStreak(ctx: Ctx, w: number, h: number): void {
  ctx.lineCap = 'round';
  const lines: Array<[number, number]> = [
    [h * 0.24, 0.62],
    [h * 0.52, 0.9],
    [h * 0.8, 0.5],
  ];
  for (const [y, length] of lines) {
    const x0 = 6;
    const x1 = x0 + (w - 12) * length;
    const fade = ctx.createLinearGradient(x0, 0, x1, 0);
    fade.addColorStop(0, 'rgba(19, 96, 58, 0.95)');
    fade.addColorStop(1, 'rgba(19, 96, 58, 0)');
    ctx.strokeStyle = fade;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    const neon = ctx.createLinearGradient(x0, 0, x1, 0);
    neon.addColorStop(0, 'rgba(234, 255, 243, 1)');
    neon.addColorStop(0.3, 'rgba(57, 255, 136, 0.95)');
    neon.addColorStop(1, 'rgba(57, 255, 136, 0)');
    ctx.strokeStyle = neon;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
}
