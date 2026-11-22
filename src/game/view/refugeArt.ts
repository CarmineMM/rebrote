import { WORLD } from './layout';
import { type Ctx, circle, ellipse } from './canvasKit';

/**
 * El refugio del Invernadero (T-036, LP-01): el invernadero atrincherado de noche. Fuera, el mundo corrupto; dentro, luz
 * calida. Aqui van las medidas y los pintores de Canvas 2D, sin Phaser; la animacion esta en `refuge.ts`.
 *
 * Todo se pinta en coordenadas del mundo (ADR-0007): el diseno (1600 x 900) mas el decorado extra, para que una pantalla
 * ancha o alta vea mas refugio y nunca bandas. Por capas: fuera (`paintRefugeOutside`), los circuitos que laten
 * (`paintRefugeCircuits`) y la sala (`paintRefugeRoom`), con los cristales transparentes para que se vea lo de fuera.
 */
export const REFUGE = {
  /** Donde acaban los cristales y empieza la pared baja de sacos terreros. */
  glassBottom: 610,
  wallTop: 600,
  floorTop: 706,
  /** Montantes de madera: uno cada `step`, de punta a punta del mundo. */
  mullion: { step: 160, width: 16 },
  /** Travesanos (el de y 0 es la viga, mas gruesa). */
  bars: [-280, -140, 130, 396],
  beam: { y: 0, height: 30 },
  /** Cristales con tablas clavadas: x, y, ancho y alto. */
  boarded: [
    { x: 0, y: 160, w: 160, h: 230 },
    { x: 1440, y: 160, w: 160, h: 230 },
    { x: 640, y: 420, w: 160, h: 180 },
    { x: -320, y: 420, w: 160, h: 180 },
    { x: 1760, y: -120, w: 160, h: 230 },
  ],
  /** Cinta en aspa sobre un cristal. */
  tape: { x: 1040, y: 269, length: 130 },
  /** La colina corrupta de fuera: donde va el gusano que pasa y la franja de los circuitos. */
  worm: { y: 520, segments: 5 },
  circuits: { top: 500, height: 140 },
  /** La lluvia de bits cae de aqui hasta la pared. */
  rain: { from: -420, to: 640 },
  moon: { x: 380, y: 150, r: 48 },
  rug: { x: 760, y: 840, rx: 520, ry: 70 },
  /** La lampara cuelga de la viga: punta del cable, largo del cable y donde da su luz. */
  lamp: { x: 900, cord: 150, glow: { x: 900, y: 260, width: 1900, height: 1400 } },
  /** Guirnaldas: de un extremo al otro, cuanto cuelgan, cuantas bombillas y sus colores. */
  lights: [
    { x0: -380, y0: 40, x1: 760, y1: 36, sag: 80, count: 12, colors: [0xffd36b, 0xff9e5e, 0xffe9a8] },
    { x0: 1020, y0: 36, x1: 1980, y1: 44, sag: 70, count: 10, colors: [0xffe9a8, 0xffd36b, 0xff9e5e] },
  ],
} as const;

export interface LightString {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly sag: number;
  readonly count: number;
}

/** Donde cuelga cada bombilla de una guirnalda: repartidas por la curva del cable. */
export function lightPoints({ x0, y0, x1, y1, sag, count }: LightString): Array<{ x: number; y: number }> {
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + sag;
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return {
      x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
      y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
    };
  });
}

/** Montantes de punta a punta del mundo. */
export function mullionXs(): number[] {
  const { step } = REFUGE.mullion;
  const xs: number[] = [];
  for (let x = Math.floor(WORLD.left / step) * step; x <= WORLD.right; x += step) xs.push(x);
  return xs;
}

/** Numeros al azar pero siempre los mismos. */
export function refugeRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Fuera

/** Cielo de noche, luna tapada, resplandor de la corrupcion y sus colinas. Del techo del mundo al pie de los cristales. */
export function paintRefugeOutside(ctx: Ctx): void {
  const bottom = REFUGE.glassBottom + 40;
  const sky = ctx.createLinearGradient(0, WORLD.top, 0, bottom);
  const at = (y: number) => (y - WORLD.top) / (bottom - WORLD.top);
  sky.addColorStop(0, '#05031a');
  sky.addColorStop(at(0), '#0d0a26');
  sky.addColorStop(at(405), '#24164a');
  sky.addColorStop(1, '#4a2468');
  ctx.fillStyle = sky;
  ctx.fillRect(WORLD.left, WORLD.top, WORLD.width, bottom - WORLD.top);

  const { moon } = REFUGE;
  const halo = ctx.createRadialGradient(moon.x, moon.y, moon.r, moon.x, moon.y, moon.r * 3);
  halo.addColorStop(0, 'rgba(220, 210, 255, 0.25)');
  halo.addColorStop(1, 'rgba(220, 210, 255, 0)');
  circle(ctx, moon.x, moon.y, moon.r * 3, halo);
  circle(ctx, moon.x, moon.y, moon.r, '#ece6ff');
  circle(ctx, moon.x + 20, moon.y - 10, moon.r * 0.92, 'rgba(36, 22, 74, 0.6)');

  // El resplandor de la corrupcion, bajo y hacia la derecha.
  ctx.save();
  ctx.translate(1150, 620);
  ctx.scale(1, 260 / 900);
  const corrupt = ctx.createRadialGradient(0, 0, 0, 0, 0, 900);
  corrupt.addColorStop(0, 'rgba(200, 107, 255, 0.55)');
  corrupt.addColorStop(1, 'rgba(200, 107, 255, 0)');
  circle(ctx, 0, 0, 900, corrupt);
  ctx.restore();

  hills(ctx, 470, 50, '#2a1542', 0);
  hills(ctx, 545, 22, '#1c0e30', 2.1);
}

/** Una fila de colinas suaves de punta a punta del mundo, hasta el pie de los cristales. */
function hills(ctx: Ctx, y: number, amplitude: number, fill: string, phase: number): void {
  ctx.beginPath();
  ctx.moveTo(WORLD.left, REFUGE.glassBottom + 40);
  for (let x = WORLD.left; x <= WORLD.right; x += 20) {
    const wave = Math.sin(x / 260 + phase) * amplitude * 0.6 + Math.sin(x / 113 + phase * 1.7) * amplitude * 0.4;
    ctx.lineTo(x, y + wave);
  }
  ctx.lineTo(WORLD.right, REFUGE.glassBottom + 40);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Pistas de circuito neon en las colinas, en una franja de `REFUGE.circuits` (coordenadas de la franja). */
export function paintRefugeCircuits(ctx: Ctx): void {
  const { top } = REFUGE.circuits;
  ctx.translate(-WORLD.left, -top);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const rand = refugeRandom(19);
  for (let x = WORLD.left + 40; x < WORLD.right - 200; x += 260 + rand() * 120) {
    const y = 560 + rand() * 50;
    const color = rand() < 0.4 ? '#c86bff' : '#5ff2d0';
    const rise = 30 + rand() * 30;
    const run = 90 + rand() * 60;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + run, y);
    ctx.lineTo(x + run + 30, y - rise);
    ctx.lineTo(x + run + 150, y - rise);
    ctx.lineTo(x + run + 170, y - rise + 26);
    ctx.stroke();
    circle(ctx, x + run + 150, y - rise, 6, color);
    circle(ctx, x, y, 5, color);
  }
}

// ---------------------------------------------------------------------------
// La sala

/** El armazon, las tablas, la cinta, los sacos terreros, el suelo, la alfombra y los cables de las guirnaldas. */
export function paintRefugeRoom(ctx: Ctx): void {
  const { glassBottom, wallTop, floorTop, mullion, bars, beam, boarded, tape, rug } = REFUGE;
  // Los cristales, algo oscuros: lo de fuera se ve, pero apagado.
  ctx.fillStyle = 'rgba(26, 16, 48, 0.25)';
  ctx.fillRect(WORLD.left, WORLD.top, WORLD.width, glassBottom - WORLD.top);
  // Reflejos de luz calida en algunos cristales.
  const xs = mullionXs();
  xs.forEach((x, i) => {
    if (i % 3 !== 1) return;
    ctx.fillStyle = 'rgba(255, 200, 140, 0.06)';
    ctx.beginPath();
    ctx.moveTo(x + 40, beam.height + 20);
    ctx.lineTo(x + 80, beam.height + 20);
    ctx.lineTo(x + 30, bars[2]);
    ctx.lineTo(x - 10, bars[2]);
    ctx.fill();
  });

  // Armazon de madera oscura.
  const wood = '#3a2414';
  for (const y of bars) {
    ctx.fillStyle = wood;
    ctx.fillRect(WORLD.left, y, WORLD.width, 14);
  }
  ctx.fillRect(WORLD.left, beam.y, WORLD.width, beam.height);
  ctx.fillStyle = '#4c311c';
  ctx.fillRect(WORLD.left, beam.y + 4, WORLD.width, 5);
  for (const x of xs) {
    ctx.fillStyle = wood;
    ctx.fillRect(x - mullion.width / 2, WORLD.top, mullion.width, glassBottom - WORLD.top);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.08)';
    ctx.fillRect(x - mullion.width / 2, WORLD.top, 4, glassBottom - WORLD.top);
  }

  // Tablas clavadas en cruz.
  for (const pane of boarded) {
    [
      { f: 0.25, angle: 7 },
      { f: 0.62, angle: -9 },
    ].forEach(({ f, angle }) => plank(ctx, pane.x + pane.w / 2, pane.y + pane.h * f, pane.w + 28, 36, angle));
  }
  // Cinta en aspa.
  ctx.fillStyle = 'rgba(230, 212, 154, 0.7)';
  for (const angle of [52, -52]) {
    ctx.save();
    ctx.translate(tape.x, tape.y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillRect(-tape.length / 2, -7, tape.length, 14);
    ctx.restore();
  }

  // Pared baja con dos filas de sacos terreros.
  ctx.fillStyle = '#3b2617';
  ctx.fillRect(WORLD.left, wallTop, WORLD.width, floorTop + 4 - wallTop);
  for (let row = 1; row >= 0; row--) {
    for (let x = WORLD.left - 56; x < WORLD.right + 60; x += 112) {
      const cx = x + (row ? 56 : 0);
      const cy = 688 - row * 44;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6f5832';
      ellipse(ctx, cx, cy, 62, 26, row ? '#c9ae7d' : '#b59a68');
      ctx.beginPath();
      ctx.ellipse(cx, cy, 62, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Las costuras de cada saco.
      ctx.strokeStyle = 'rgba(111, 88, 50, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 40, cy - 4);
      ctx.quadraticCurveTo(cx, cy + 4, cx + 40, cy - 4);
      ctx.stroke();
    }
  }

  // Suelo de tablas.
  const floor = ctx.createLinearGradient(0, floorTop, 0, WORLD.bottom);
  floor.addColorStop(0, '#5a3820');
  floor.addColorStop(0.5, '#3e2614');
  floor.addColorStop(1, '#24150b');
  ctx.fillStyle = floor;
  ctx.fillRect(WORLD.left, floorTop, WORLD.width, WORLD.bottom - floorTop);
  ctx.fillStyle = 'rgba(29, 16, 9, 0.6)';
  for (let y = floorTop + 14, gap = 30; y < WORLD.bottom; y += gap, gap += 6) ctx.fillRect(WORLD.left, y, WORLD.width, 3);

  // Alfombra con su cenefa.
  ellipse(ctx, rug.x, rug.y + 8, rug.rx + 6, rug.ry + 4, 'rgba(0, 0, 0, 0.35)');
  ellipse(ctx, rug.x, rug.y, rug.rx, rug.ry, '#8c2f39');
  ellipse(ctx, rug.x, rug.y, rug.rx - 60, rug.ry - 20, '#a33a44');
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#e8b04f';
  ctx.beginPath();
  ctx.ellipse(rug.x, rug.y, rug.rx - 40, rug.ry - 14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Cables de las guirnaldas (las bombillas son aparte: parpadean).
  ctx.strokeStyle = '#1a120c';
  ctx.lineWidth = 3;
  for (const string of REFUGE.lights) {
    const cx = (string.x0 + string.x1) / 2;
    const cy = Math.max(string.y0, string.y1) + string.sag;
    ctx.beginPath();
    ctx.moveTo(string.x0, string.y0);
    ctx.quadraticCurveTo(cx, cy, string.x1, string.y1);
    ctx.stroke();
  }
}

/** Una tabla clavada, girada `angle` grados alrededor de su centro. */
function plank(ctx: Ctx, x: number, y: number, w: number, h: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  const wood = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  wood.addColorStop(0, '#9a6a3e');
  wood.addColorStop(1, '#6f4724');
  ctx.fillStyle = wood;
  ctx.strokeStyle = '#3d2410';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(61, 36, 16, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 10, -4);
  ctx.lineTo(w / 2 - 30, -2);
  ctx.stroke();
  circle(ctx, -w / 2 + 16, 0, 3.5, '#cfcfcf');
  circle(ctx, w / 2 - 16, 0, 3.5, '#cfcfcf');
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Piezas sueltas (se animan aparte)

/** Una estrella: un punto blanco con un halo suave. */
export function paintRefugeStar(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  circle(ctx, w / 2, h / 2, w / 2, g);
}

/** Un bit de la lluvia ("0" o "1"), en blanco: se tine de verde o morado. */
export function paintRefugeBit(ctx: Ctx, w: number, h: number, bit: 0 | 1): void {
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${h - 4}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(bit), w / 2, h / 2 + 1);
}

/** Una bombilla de guirnalda colgando de su casquillo, en blanco: se tine de su color. */
export function paintRefugeBulb(ctx: Ctx, w: number): void {
  const x = w / 2;
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.roundRect(x - 3.5, 0, 7, 8, 1.5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, 7);
  ctx.bezierCurveTo(x - 8, 11, x - 8, 22, x, 27);
  ctx.bezierCurveTo(x + 8, 22, x + 8, 11, x, 7);
  ctx.fill();
  ellipse(ctx, x - 2.5, 15, 1.6, 3.2, 'rgba(255, 255, 255, 0.9)');
}

/** La lampara: cable, pantalla verde de chapa y bombilla. Su origen es la punta del cable (arriba, en medio). */
export function paintRefugeLamp(ctx: Ctx, w: number): void {
  const x = w / 2;
  const { cord } = REFUGE.lamp;
  ctx.strokeStyle = '#1a120c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, cord);
  ctx.stroke();
  ellipse(ctx, x, cord + 50, 18, 13, '#fff1c2');
  const shade = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
  shade.addColorStop(0, '#24473a');
  shade.addColorStop(0.4, '#3f7259');
  shade.addColorStop(1, '#22402f');
  ctx.fillStyle = shade;
  ctx.strokeStyle = '#173126';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 34, cord);
  ctx.lineTo(x + 34, cord);
  ctx.lineTo(x + 60, cord + 44);
  ctx.lineTo(x - 60, cord + 44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 241, 194, 0.9)';
  ctx.fillRect(x - 56, cord + 42, 112, 4);
}

/** La luz calida de la lampara: un degradado que se estira sobre la sala. */
export function paintRefugeLampGlow(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255, 207, 122, 0.55)');
  g.addColorStop(0.35, 'rgba(255, 169, 77, 0.22)');
  g.addColorStop(1, 'rgba(255, 154, 61, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
