import { BOARD } from '../../config/balance';
import { P, boardEllipse, boardPolygon, boardRect, cwAt } from '../boardCanvas';
import { type Ctx, ellipse, smallFlower } from '../canvasKit';
import { between, pick, seededRandom } from '../random';
import type { FloorDesign, FloorGrid } from './design';

/**
 * Propuesta B de T-050: el patio del refugio. Losas de piedra clara, gastadas y de tamanos distintos, con musgo y hierba en
 * las juntas; entre carril y carril, una fila de bordillos largos. Cada casilla tiene su alcorque, un hoyo de tierra entre
 * las losas donde crece lo que se siembra. Las losas no siguen la cuadricula: con las columnas insinuadas (SU-03) caen
 * donde caen; a la vista, ninguna cruza la linea de una columna, asi que las juntas la dibujan.
 */

export const PATIO = {
  /** Bordillo de los lados (izquierda y derecha), en casillas. */
  sideKerb: 0.07,
  /** Mitad del bordillo entre dos carriles, en carriles. */
  kerb: 0.05,
  /** Bordillo del borde de atras y del de delante. */
  edgeKerb: 0.07,
  /** Junta entre losas. */
  joint: 0.034,
  /** Cuanto puede meterse hacia dentro cada esquina de una losa: lo que las hace irregulares. */
  jitter: 0.022,
  /** Alcorque: centro (un pelo por delante del centro, donde apoya la planta) y radios, en casillas. */
  pit: { y: 0.6, rx: 0.21, ry: 0.15 },
} as const;

type Corner = readonly [number, number];

export interface Slab {
  readonly lane: number;
  /** Cuatro esquinas en el tablero: atras a la izquierda, atras a la derecha, delante a la derecha y delante a la izquierda. */
  readonly corners: readonly [Corner, Corner, Corner, Corner];
  /** Cual de los tonos de piedra lleva. */
  readonly shade: number;
  readonly cracked: boolean;
}

/** Lo de arriba y lo de abajo (en carriles) de las losas del carril `lane`: entre los bordillos. */
export function slabBand(lane: number): { top: number; bottom: number } {
  return {
    top: lane === 0 ? PATIO.edgeKerb : lane + PATIO.kerb,
    bottom: lane === BOARD.lanes - 1 ? BOARD.lanes - PATIO.edgeKerb : lane + 1 - PATIO.kerb,
  };
}

/** Cortes a lo largo de un carril: a la vista, en cada columna (y a veces en la mitad); insinuadas, de largo cualquiera. */
function cuts(rand: () => number, grid: FloorGrid): number[] {
  const start = PATIO.sideKerb;
  const end = BOARD.columns - PATIO.sideKerb;
  if (grid === 'shown') {
    const at: number[] = [start];
    for (let col = 0; col < BOARD.columns; col++) {
      if (rand() < 0.35) at.push(col + 0.5);
      at.push(col === BOARD.columns - 1 ? end : col + 1);
    }
    return at;
  }
  const at: number[] = [start];
  let x = start + between(rand, 0.35, 0.8);
  while (x < end - 0.3) {
    at.push(x);
    x += between(rand, 0.45, 1.15);
  }
  at.push(end);
  return at;
}

/** Todas las losas del patio, siempre las mismas para cada `grid`. */
export function patioSlabs(grid: FloorGrid, seed = 7207): Slab[] {
  const rand = seededRandom(seed + (grid === 'shown' ? 1 : 0));
  const slabs: Slab[] = [];
  const half = PATIO.joint / 2;
  const inset = (v: number, sign: number) => v + sign * (half + rand() * PATIO.jitter);
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    const { top, bottom } = slabBand(lane);
    const xs = cuts(rand, grid);
    for (let i = 0; i < xs.length - 1; i++) {
      const [x0, x1] = [xs[i], xs[i + 1]];
      // A veces dos losas una detras de otra; si no, una que llena el carril.
      const rows = rand() < 0.45 ? [top, between(rand, top + (bottom - top) * 0.35, top + (bottom - top) * 0.65), bottom] : [top, bottom];
      for (let r = 0; r < rows.length - 1; r++) {
        const [y0, y1] = [rows[r], rows[r + 1]];
        slabs.push({
          lane,
          corners: [
            [inset(x0, 1), inset(y0, 1)],
            [inset(x1, -1), inset(y0, 1)],
            [inset(x1, -1), inset(y1, -1)],
            [inset(x0, 1), inset(y1, -1)],
          ],
          shade: Math.floor(rand() * SLAB_SHADES.length),
          cracked: rand() < 0.16,
        });
      }
    }
  }
  return slabs;
}

/** Tonos de la piedra: arenisca clara, de una claridad parecida a la del cesped de antes (asi los efectos se siguen leyendo). */
const SLAB_SHADES = [
  { light: '#e4e2d8', mid: '#d0ccbe', dark: '#b9b4a5' },
  { light: '#dddace', mid: '#c7c2b2', dark: '#ada796' },
  { light: '#e9e6dc', mid: '#d6d2c4', dark: '#bfb9a8' },
  { light: '#e2ddd0', mid: '#cec7b6', dark: '#b4ac99' },
  { light: '#dfdfd6', mid: '#c9c8bd', dark: '#aeada0' },
] as const;
const MOSS = { deep: '#4d7a31', mid: '#6b9a42', light: '#93c25a' };
const STONE_OUTLINE = 'rgba(110, 98, 74, 0.75)';

export const PATIO_FLOOR: FloorDesign = {
  id: 'patio',
  swatch: { light: '#e0dcd0', dark: '#bdb7a8', line: { body: '#93c25a', outline: '#4d7a31' } },
  paint(ctx, _rand, grid) {
    const rand = seededRandom(7301);
    const { lanes, columns } = BOARD;
    // Debajo, el musgo que asoma por las juntas.
    boardRect(ctx, 0, 0, columns, lanes);
    const moss = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
    moss.addColorStop(0, MOSS.deep);
    moss.addColorStop(1, MOSS.mid);
    ctx.fillStyle = moss;
    ctx.fill();
    for (const slab of patioSlabs(grid)) paintSlab(ctx, rand, slab);
    paintKerbs(ctx, rand);
    paintJointLife(ctx, rand, grid);
    for (let lane = 0; lane < lanes; lane++) {
      for (let col = 0; col < columns; col++) paintPit(ctx, rand, col, lane, grid);
    }
    // Profundidad: lo de atras algo mas apagado.
    boardRect(ctx, 0, 0, columns, lanes);
    const depth = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
    depth.addColorStop(0, 'rgba(40, 45, 30, 0.2)');
    depth.addColorStop(1, 'rgba(255, 250, 230, 0.02)');
    ctx.fillStyle = depth;
    ctx.fill();
  },
};

/** Una losa: piedra con su luz arriba a la izquierda, canto claro arriba, sombra abajo, grano, liquen y alguna grieta. */
function paintSlab(ctx: Ctx, rand: () => number, slab: Slab): void {
  const shade = SLAB_SHADES[slab.shade];
  const [backLeft, backRight, frontRight, frontLeft] = slab.corners;
  const screen = slab.corners.map(([x, y]) => P(x, y));
  // Esquinas redondeadas: se recorta cada esquina con una curva.
  const roundPath = () => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const prev = screen[(i + 3) % 4];
      const at = screen[i];
      const next = screen[(i + 1) % 4];
      const r = 0.18;
      const a = { x: at.x + (prev.x - at.x) * r, y: at.y + (prev.y - at.y) * r };
      const b = { x: at.x + (next.x - at.x) * r, y: at.y + (next.y - at.y) * r };
      if (i === 0) ctx.moveTo(a.x, a.y);
      else ctx.lineTo(a.x, a.y);
      ctx.quadraticCurveTo(at.x, at.y, b.x, b.y);
    }
    ctx.closePath();
  };
  const cx = (backLeft[0] + backRight[0] + frontRight[0] + frontLeft[0]) / 4;
  const cy = (backLeft[1] + backRight[1] + frontRight[1] + frontLeft[1]) / 4;
  const cw = cwAt(cx, cy);
  // Sombra del canto: la losa un pelo levantada sobre la junta.
  ctx.save();
  ctx.translate(1.5, 2.5);
  roundPath();
  ctx.fillStyle = 'rgba(45, 55, 30, 0.45)';
  ctx.fill();
  ctx.restore();
  roundPath();
  const left = Math.min(...screen.map((p) => p.x));
  const right = Math.max(...screen.map((p) => p.x));
  const top = Math.min(...screen.map((p) => p.y));
  const bottom = Math.max(...screen.map((p) => p.y));
  const g = ctx.createLinearGradient(left, top, right, bottom);
  g.addColorStop(0, shade.light);
  g.addColorStop(0.55, shade.mid);
  g.addColorStop(1, shade.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = STONE_OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Canto de atras iluminado.
  ctx.beginPath();
  ctx.moveTo(screen[0].x + (screen[1].x - screen[0].x) * 0.12, screen[0].y + 1.2);
  ctx.lineTo(screen[1].x - (screen[1].x - screen[0].x) * 0.12, screen[1].y + 1.2);
  ctx.strokeStyle = 'rgba(255, 252, 238, 0.7)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Grano de la piedra.
  ctx.save();
  roundPath();
  ctx.clip();
  const spots = Math.round(((right - left) * (bottom - top)) / 70);
  for (let i = 0; i < spots; i++) {
    const x = between(rand, left, right);
    const y = between(rand, top, bottom);
    const s = between(rand, 0.6, 1.7);
    ctx.fillStyle = pick(rand, ['rgba(120, 105, 80, 0.28)', 'rgba(255, 252, 240, 0.4)', 'rgba(150, 135, 105, 0.22)']);
    ctx.fillRect(x, y, s, s);
  }
  // Manchas de liquen y desgaste.
  for (let i = 0; i < 2; i++) {
    if (rand() < 0.45) continue;
    const x = between(rand, left + 6, right - 6);
    const y = between(rand, top + 4, bottom - 4);
    const r = cw * between(rand, 0.05, 0.12);
    const lichen = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = pick(rand, ['200, 205, 150', '170, 160, 130', '215, 210, 175']);
    lichen.addColorStop(0, `rgba(${tone}, 0.45)`);
    lichen.addColorStop(1, `rgba(${tone}, 0)`);
    ctx.fillStyle = lichen;
    ctx.fillRect(x - r, y - r, r * 2, r * 0.9 * 2);
  }
  ctx.restore();
  if (slab.cracked) {
    // Una grieta que cruza parte de la losa.
    const t = between(rand, 0.2, 0.8);
    const startX = backLeft[0] + (backRight[0] - backLeft[0]) * t;
    const start = P(startX, backLeft[1] + 0.02);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    let x = start.x;
    let y = start.y;
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      x += between(rand, -6, 6);
      y += ((bottom - top) * between(rand, 0.6, 0.9)) / steps;
      ctx.lineTo(x, Math.min(y, bottom - 2));
    }
    ctx.strokeStyle = 'rgba(95, 82, 60, 0.6)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

/** Bordillos: piedras largas y algo mas claras en cada linea entre carriles y en los cuatro bordes del patio. */
function paintKerbs(ctx: Ctx, rand: () => number): void {
  // Los de los lados, de atras adelante: separan el patio del camino y del suelo corrupto.
  for (const [x0, x1] of [
    [0, PATIO.sideKerb],
    [BOARD.columns - PATIO.sideKerb, BOARD.columns],
  ] as const) {
    let y = 0;
    while (y < BOARD.lanes - 0.02) {
      const len = Math.min(between(rand, 0.6, 1.1), BOARD.lanes - y);
      boardRect(ctx, x0 + 0.01, y + 0.01, x1 - 0.01, y + len - 0.01);
      ctx.fillStyle = '#e8e5da';
      ctx.fill();
      ctx.strokeStyle = STONE_OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      y += len;
    }
  }
  for (let line = 0; line <= BOARD.lanes; line++) {
    const y0 = line === 0 ? 0 : line === BOARD.lanes ? BOARD.lanes - PATIO.edgeKerb : line - PATIO.kerb;
    const y1 = line === 0 ? PATIO.edgeKerb : line === BOARD.lanes ? BOARD.lanes : line + PATIO.kerb;
    let x = 0;
    while (x < BOARD.columns - 0.05) {
      const len = Math.min(between(rand, 0.7, 1.3), BOARD.columns - x);
      const gap = 0.012;
      const corners: Array<[number, number]> = [
        [x + gap, y0 + gap],
        [x + len - gap, y0 + gap],
        [x + len - gap, y1 - gap],
        [x + gap, y1 - gap],
      ];
      // Cara de delante del bordillo (un poco levantado).
      const fl = P(x + gap, y1 - gap);
      const fr = P(x + len - gap, y1 - gap);
      const drop = cwAt(x + len / 2, y1) * 0.022;
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y);
      ctx.lineTo(fr.x, fr.y);
      ctx.lineTo(fr.x, fr.y + drop);
      ctx.lineTo(fl.x, fl.y + drop);
      ctx.closePath();
      ctx.fillStyle = '#9d988a';
      ctx.fill();
      boardPolygon(ctx, corners);
      const top = P(x, y0);
      const bottom = P(x, y1);
      const g = ctx.createLinearGradient(0, top.y, 0, bottom.y);
      g.addColorStop(0, '#f4f2ea');
      g.addColorStop(1, '#d9d5c8');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = STONE_OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      x += len;
    }
  }
}

/** Hierba, musgo y alguna florecita en las juntas: lo que hace que el patio parezca vivido. */
function paintJointLife(ctx: Ctx, rand: () => number, grid: FloorGrid): void {
  ctx.lineCap = 'round';
  const slabs = patioSlabs(grid);
  for (const slab of slabs) {
    // Por las juntas de delante y del lado derecho de cada losa.
    const [, backRight, frontRight, frontLeft] = slab.corners;
    const edges: Array<[Corner, Corner]> = [
      [frontLeft, frontRight],
      [backRight, frontRight],
    ];
    for (const [a, b] of edges) {
      const n = 3 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) {
        const t = rand();
        const x = a[0] + (b[0] - a[0]) * t + (a === frontLeft ? 0 : PATIO.joint * 0.5);
        const y = a[1] + (b[1] - a[1]) * t + (a === frontLeft ? PATIO.joint * 0.5 : 0);
        const p = P(x, y);
        const cw = cwAt(x, y);
        const len = cw * between(rand, 0.02, 0.045);
        const ang = -Math.PI / 2 + (rand() - 0.5) * 0.9;
        ctx.strokeStyle = pick(rand, [MOSS.light, '#7fb84c', '#a9d670']);
        ctx.lineWidth = cw * 0.01;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
  }
  // Cojines de musgo en algunas esquinas.
  for (let i = 0; i < 70; i++) {
    const slab = slabs[Math.floor(rand() * slabs.length)];
    const corner = slab.corners[Math.floor(rand() * 4)];
    const p = P(corner[0], corner[1]);
    const cw = cwAt(corner[0], corner[1]);
    const r = cw * between(rand, 0.018, 0.035);
    ellipse(ctx, p.x, p.y, r * 1.5, r, pick(rand, [MOSS.mid, MOSS.light, '#86b850']));
  }
  for (let i = 0; i < 18; i++) {
    const slab = slabs[Math.floor(rand() * slabs.length)];
    const [x, y] = slab.corners[2];
    const p = P(x + 0.01, y + 0.015);
    smallFlower(ctx, p.x, p.y, cwAt(x, y) * 0.014, pick(rand, ['#ffffff', '#fff1a6', '#ffd6ea']), '#f6c343');
  }
}

/**
 * Alcorque: un hoyo de tierra entre las losas, con piedritas y hierba en el borde. Con las columnas insinuadas, cada uno
 * un pelo distinto (tamano, sitio y musgo): hechos a mano, no en serie.
 */
function paintPit(ctx: Ctx, rand: () => number, col: number, lane: number, grid: FloorGrid): void {
  const loose = grid === 'hinted';
  const size = loose ? between(rand, 0.85, 1.08) : 1;
  const center = {
    x: col + 0.5 + (loose ? between(rand, -0.06, 0.06) : 0),
    y: lane + PATIO.pit.y + (loose ? between(rand, -0.03, 0.03) : 0),
  };
  const rx = PATIO.pit.rx * size;
  const ry = PATIO.pit.ry * size;
  const cw = cwAt(center.x, center.y);
  // Musgo alrededor: el hoyo se come un poco las losas.
  boardEllipse(ctx, center, rx + 0.03, ry + 0.026);
  ctx.fillStyle = MOSS.mid;
  ctx.fill();
  // La tierra: mas oscura atras (la pared del hoyo) y algo mas clara delante.
  boardEllipse(ctx, center, rx, ry);
  const top = P(center.x, center.y - ry).y;
  const bottom = P(center.x, center.y + ry).y;
  const soil = ctx.createLinearGradient(0, top, 0, bottom);
  soil.addColorStop(0, '#5a3a22');
  soil.addColorStop(0.4, '#7d5534');
  soil.addColorStop(1, '#9a7048');
  ctx.fillStyle = soil;
  ctx.fill();
  ctx.save();
  boardEllipse(ctx, center, rx, ry);
  ctx.clip();
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    const p = P(center.x + Math.cos(a) * rx * d, center.y + Math.sin(a) * ry * d);
    ctx.fillStyle = pick(rand, ['rgba(176, 132, 88, 0.6)', 'rgba(60, 36, 18, 0.45)']);
    ctx.fillRect(p.x, p.y, 2, 1.6);
  }
  ctx.restore();
  // Piedritas sueltas en el borde (no un aro entero).
  const stones = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < stones; i++) {
    const a = between(rand, 0, Math.PI * 2);
    const p = P(center.x + Math.cos(a) * (rx + 0.015), center.y + Math.sin(a) * (ry + 0.012));
    const s = cw * between(rand, 0.014, 0.024);
    ellipse(ctx, p.x, p.y + s * 0.3, s * 1.3, s * 0.8, 'rgba(60, 50, 35, 0.35)');
    ellipse(ctx, p.x, p.y, s * 1.25, s * 0.8, pick(rand, ['#e6e3d9', '#d3cfc2', '#dcd8cc']));
  }
  // Hierba que asoma por el borde.
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = between(rand, -0.3, Math.PI + 0.3);
    const x = center.x + Math.cos(a) * (rx + 0.01);
    const y = center.y + Math.sin(a) * (ry + 0.01);
    const p = P(x, y);
    const len = cw * between(rand, 0.02, 0.045);
    const ang = -Math.PI / 2 + (rand() - 0.5) * 0.9;
    ctx.strokeStyle = pick(rand, [MOSS.light, '#7fb84c', '#a9d670']);
    ctx.lineWidth = cw * 0.01;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
    ctx.stroke();
  }
}
