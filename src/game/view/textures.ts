import * as Phaser from 'phaser';
import { BOARD } from '../config/balance';
import type { BoardPoint } from '../core/board';
import type { ScreenPoint } from './perspective';
import { SCENERY, VIEW, WORLD, perspective } from './layout';

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
  shooter: 'unit-shooter',
  coin: 'unit-coin',
} as const;

/** Punto de apoyo de la disparadora dentro de su textura (los pies). */
export const SHOOTER_SIZE = { width: 160, height: 180, footY: 174 } as const;
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
  paint(TEX.shooter, SHOOTER_SIZE.width, SHOOTER_SIZE.height, paintShooter);
  paint(TEX.coin, 72, 72, paintCoin);
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

/** Disparadora: cabeza verde redonda, un canon, hojas a los pies. Mira hacia la derecha, por donde llegan los gusanos. */
function paintShooter(ctx: Ctx): void {
  const footX = 80;
  const footY = SHOOTER_SIZE.footY;
  const outline = '#2a6b22';

  // Hojas de la base
  for (const [angle, length] of [
    [Math.PI + 0.35, 52],
    [-0.35, 50],
  ] as const) {
    leafShape(ctx, footX, footY - 4, length, 15, angle);
    const g = ctx.createLinearGradient(footX - 50, footY - 30, footX + 50, footY);
    g.addColorStop(0, '#5fb846');
    g.addColorStop(1, '#2f7a26');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = outline;
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

  // Canon (va detras de la cabeza para que salga de la cara)
  const tube = ctx.createLinearGradient(0, 62, 0, 96);
  tube.addColorStop(0, '#9be36c');
  tube.addColorStop(1, '#3f9a35');
  ctx.fillStyle = tube;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(96, 63, 52, 32, 10);
  ctx.fill();
  ctx.stroke();
  ellipse(ctx, 148, 79, 9, 19, '#6cc24a');
  ctx.beginPath();
  ctx.ellipse(148, 79, 9, 19, 0, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, 150, 79, 5, 12, '#1c3d15');

  // Cabeza
  const head = ctx.createRadialGradient(60, 60, 6, 76, 80, 50);
  head.addColorStop(0, '#d0f59a');
  head.addColorStop(0.45, '#80d153');
  head.addColorStop(1, '#4aa236');
  circle(ctx, 76, 80, 46, head);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(76, 80, 46, 0, Math.PI * 2);
  ctx.stroke();

  // Brote en la coronilla
  for (const angle of [-2.0, -1.15]) {
    leafShape(ctx, 74, 36, 26, 8, angle);
    ctx.fillStyle = '#62c046';
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Ojo mirando a la derecha, con brillo, y mejilla sonrojada
  ellipse(ctx, 72, 70, 13, 15, '#ffffff');
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(72, 70, 13, 15, 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, 77, 72, 7, '#1a2614');
  circle(ctx, 80, 68, 2.6, '#ffffff');
  ellipse(ctx, 58, 96, 8, 4.5, 'rgba(255, 130, 130, 0.38)');
  // Reflejo en la cabeza
  ellipse(ctx, 54, 52, 12, 7, 'rgba(255, 255, 255, 0.35)', -0.6);
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
