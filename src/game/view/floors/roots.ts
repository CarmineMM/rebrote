import type { BoardPoint } from '../../core/board';
import { BOARD } from '../../config/balance';
import { P, boardRect, cwAt } from '../boardCanvas';
import { type Ctx, ellipse, leafShape } from '../canvasKit';
import { between, pick, seededRandom } from '../random';
import type { FloorDesign, FloorGrid } from './design';

/**
 * Propuesta C de T-050: la red de raices. Tierra fertil y lisa y, encima, las raices vivas de las plantas de Patty, de un
 * verde lima suave: una raiz gruesa por cada linea entre carriles (los dibuja), que entra desde el jardin de la izquierda y
 * adelgaza hasta pararse antes del suelo corrupto, el reflejo vivo de sus circuitos. En cada columna, un nudo. Con las
 * columnas insinuadas (SU-03), del nudo solo salen raicillas cortas; a la vista, una raiz fina cruza el carril entero.
 */

export const ROOTS = {
  /** Donde entran las raices por la izquierda y donde se paran, antes del suelo corrupto (en casillas). */
  fromX: -0.06,
  toX: BOARD.columns - 0.3,
  /** Cuanto se aparta la raiz de su linea, en carriles: poco, para que los carriles se lean. */
  sway: 0.075,
  /** Grueso de la raiz de un carril al entrar y al pararse, en anchos de casilla. */
  width: { from: 0.06, to: 0.02 },
  /** Largo de las raicillas de cada nudo con las columnas insinuadas, en carriles. */
  sprig: 0.24,
} as const;

/** Un tramo de raiz: sus puntos en el tablero y su grueso en cada punto (en anchos de casilla). */
export interface Strand {
  readonly kind: 'lane' | 'twin' | 'cross' | 'sprig' | 'hair';
  readonly points: readonly BoardPoint[];
  readonly widths: readonly number[];
}

/** Linea de cada raiz de carril: las de los bordes, un pelo hacia dentro. */
export function laneLineY(line: number): number {
  return line === 0 ? 0.07 : line === BOARD.lanes ? BOARD.lanes - 0.07 : line;
}

/** Toda la red, siempre la misma para cada `grid`. */
export function rootNetwork(grid: FloorGrid, seed = 9311): Strand[] {
  const rand = seededRandom(seed);
  const strands: Strand[] = [];
  const lanes = BOARD.lanes;
  const mains: Array<(x: number) => number> = [];
  for (let line = 0; line <= lanes; line++) {
    const base = laneLineY(line);
    const [f1, p1, f2, p2] = [between(rand, 1.1, 1.7), rand() * 6.3, between(rand, 3.2, 4.4), rand() * 6.3];
    const outer = line === 0 || line === lanes ? 0.55 : 1;
    const yAt = (x: number) => base + outer * (ROOTS.sway * 0.7 * Math.sin(x * f1 + p1) + ROOTS.sway * 0.3 * Math.sin(x * f2 + p2));
    mains.push(yAt);
    const points: BoardPoint[] = [];
    const widths: number[] = [];
    for (let x = ROOTS.fromX; x <= ROOTS.toX + 1e-6; x += 0.05) {
      const t = (x - ROOTS.fromX) / (ROOTS.toX - ROOTS.fromX);
      points.push({ x, y: yAt(x) });
      // Adelgaza hacia la derecha y acaba en punta.
      const taper = t > 0.94 ? (1 - t) / 0.06 : 1;
      widths.push((ROOTS.width.from + (ROOTS.width.to - ROOTS.width.from) * t) * (line === 0 || line === lanes ? 0.8 : 1) * Math.max(0.15, taper));
    }
    strands.push({ kind: 'lane', points, widths });
    // Una raiz mas fina que se enrosca con la gruesa en la mitad izquierda: la red parece tejida.
    if (line > 0 && line < lanes) {
      const [f, p, length] = [between(rand, 2.6, 3.6), rand() * 6.3, between(rand, 4.5, 6.8)];
      const twin: BoardPoint[] = [];
      const twinWidths: number[] = [];
      for (let x = 0.15; x <= length; x += 0.05) {
        const t = (x - 0.15) / (length - 0.15);
        twin.push({ x, y: yAt(x) + 0.055 * Math.sin(x * f + p) });
        twinWidths.push(0.022 * (1 - t * 0.7) * Math.min(1, (1 - t) / 0.12));
      }
      strands.push({ kind: 'twin', points: twin, widths: twinWidths });
    }
  }
  // En cada columna, de linea a linea: la raicilla que cruza el carril (a la vista) o dos cortas desde cada nudo.
  for (let lane = 0; lane < lanes; lane++) {
    for (let col = 1; col < BOARD.columns; col++) {
      const top = mains[lane](col);
      const bottom = mains[lane + 1](col);
      if (grid === 'shown') {
        const bend = between(rand, -0.06, 0.06);
        const points: BoardPoint[] = [];
        const widths: number[] = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          points.push({ x: col + bend * Math.sin(t * Math.PI) + 0.015 * Math.sin(t * 9 + col), y: top + (bottom - top) * t });
          widths.push(0.017 - 0.004 * Math.sin(t * Math.PI));
        }
        strands.push({ kind: 'cross', points, widths });
      } else {
        // Dos raicillas que salen del nudo hacia dentro del carril, en diagonal hacia delante (crecen hacia la derecha, como
        // la red), curvadas y en punta; la mas larga, con una horquilla.
        for (const [from, dir] of [
          [top, 1],
          [bottom, -1],
        ] as const) {
          const length = ROOTS.sprig * between(rand, 0.7, 1.05);
          const reach = between(rand, 0.12, 0.22);
          const points: BoardPoint[] = [];
          const widths: number[] = [];
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            points.push({ x: col + reach * Math.sin((t * Math.PI) / 2), y: from + dir * length * t });
            widths.push(0.017 * (1 - t) + 0.002);
          }
          strands.push({ kind: 'sprig', points, widths });
          const fork = points[5];
          strands.push({
            kind: 'hair',
            points: [fork, { x: fork.x - between(rand, 0.03, 0.08), y: fork.y + dir * between(rand, 0.05, 0.09) }],
            widths: [0.008, 0.002],
          });
        }
      }
    }
  }
  // Pelillos sueltos de las raices gruesas, cortos y finos.
  for (let line = 0; line <= lanes; line++) {
    for (let x = 0.15; x < ROOTS.toX - 0.4; x += between(rand, 0.22, 0.45)) {
      const from = { x, y: mains[line](x) };
      const dir = line === 0 ? 1 : line === lanes ? -1 : rand() < 0.5 ? 1 : -1;
      const length = between(rand, 0.05, 0.11);
      const angle = between(rand, 0.4, 1.1) * (rand() < 0.5 ? -1 : 1);
      const points = [from, { x: from.x + Math.sin(angle) * length, y: from.y + dir * Math.cos(angle) * length * 0.8 }];
      strands.push({ kind: 'hair', points, widths: [0.008, 0.002] });
    }
  }
  return strands;
}

/** Nudos de la red: donde cada columna cruza una linea entre carriles. */
export function rootKnots(): BoardPoint[] {
  const mains = rootNetwork('hinted').filter((strand) => strand.kind === 'lane');
  const knots: BoardPoint[] = [];
  for (const main of mains) {
    for (let col = 1; col < BOARD.columns; col++) {
      const nearest = main.points.reduce((best, p) => (Math.abs(p.x - col) < Math.abs(best.x - col) ? p : best));
      knots.push(nearest);
    }
  }
  return knots;
}

const SOIL = { back: '#7c573a', front: '#93694a' };
const ROOT = { outline: '#4d6b22', body: '#b4dc68', light: '#e2f4a6', shadow: 'rgba(35, 20, 8, 0.38)' };

export const ROOTS_FLOOR: FloorDesign = {
  id: 'roots',
  paint(ctx, _rand, grid) {
    const rand = seededRandom(9401);
    const { lanes, columns } = BOARD;
    paintSoil(ctx, rand);
    const strands = rootNetwork(grid);
    // Por capas, para que todas las raices compartan contorno y la red se lea como una: sombra, contorno, cuerpo y brillo.
    const order: Strand['kind'][] = ['hair', 'sprig', 'cross', 'twin', 'lane'];
    for (const pass of ['shadow', 'outline', 'body', 'light'] as const) {
      for (const kind of order) {
        if (pass === 'light' && (kind === 'hair' || kind === 'sprig')) continue;
        for (const strand of strands) if (strand.kind === kind) strokeStrand(ctx, strand, pass);
      }
    }
    for (const knot of rootKnots()) paintKnot(ctx, rand, knot);
    // Profundidad.
    boardRect(ctx, 0, 0, columns, lanes);
    const depth = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
    depth.addColorStop(0, 'rgba(25, 20, 10, 0.18)');
    depth.addColorStop(1, 'rgba(255, 235, 200, 0.03)');
    ctx.fillStyle = depth;
    ctx.fill();
  },
  paintFront(ctx) {
    // Raices que asoman por el borde de delante y cuelgan sobre el corte de tierra, curvas y en punta.
    const rand = seededRandom(9501);
    for (let x = 0.5; x < ROOTS.toX - 0.4; x += between(rand, 0.9, 1.6)) {
      const length = between(rand, 0.18, 0.34);
      const hook = between(rand, -0.12, 0.12);
      const cw = cwAt(x, BOARD.lanes);
      const start = P(x, BOARD.lanes - 0.03);
      const points: BoardPoint[] = [];
      const widths: number[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        // Bajan en pantalla: se pinta en pixeles y se pasa a casillas solo para el grueso.
        points.push({ x: start.x + cw * (hook * Math.sin(t * 2.4) + 0.03 * t), y: start.y + cw * length * t });
        widths.push(0.024 * (1 - t) + 0.003);
      }
      const segment = (pass: 'outline' | 'body') => {
        ctx.lineCap = 'round';
        for (let i = 0; i < points.length - 1; i++) {
          const w = widths[i] * cw;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[i + 1].x, points[i + 1].y);
          ctx.strokeStyle = pass === 'outline' ? ROOT.outline : ROOT.body;
          ctx.lineWidth = pass === 'outline' ? w + 2 : w;
          ctx.stroke();
        }
      };
      segment('outline');
      segment('body');
    }
  },
};

/** Tierra fertil y lisa: un degradado, manchas suaves de humedad, granitos y alguna piedrita. */
function paintSoil(ctx: Ctx, rand: () => number): void {
  const { lanes, columns } = BOARD;
  boardRect(ctx, 0, 0, columns, lanes);
  const soil = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
  soil.addColorStop(0, SOIL.back);
  soil.addColorStop(1, SOIL.front);
  ctx.fillStyle = soil;
  ctx.fill();
  ctx.save();
  boardRect(ctx, 0, 0, columns, lanes);
  ctx.clip();
  for (let i = 0; i < 160; i++) {
    const x = rand() * columns;
    const y = rand() * lanes;
    const p = P(x, y);
    const r = cwAt(x, y) * between(rand, 0.15, 0.4);
    const blot = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    const tone = pick(rand, ['70, 45, 25', '170, 125, 85', '120, 82, 50']);
    blot.addColorStop(0, `rgba(${tone}, 0.18)`);
    blot.addColorStop(1, `rgba(${tone}, 0)`);
    ctx.fillStyle = blot;
    ctx.fillRect(p.x - r, p.y - r * 0.6, r * 2, r * 1.2);
  }
  ctx.restore();
  for (let i = 0; i < 2600; i++) {
    const x = rand() * columns;
    const y = rand() * lanes;
    const p = P(x, y);
    const s = cwAt(x, y) * between(rand, 0.005, 0.012);
    ctx.fillStyle = pick(rand, ['rgba(60, 38, 20, 0.5)', 'rgba(190, 145, 100, 0.45)', 'rgba(100, 68, 40, 0.45)']);
    ctx.fillRect(p.x, p.y, s * 1.4, s);
  }
  for (let i = 0; i < 30; i++) {
    const x = 0.1 + rand() * (columns - 0.2);
    const y = 0.1 + rand() * (lanes - 0.2);
    const p = P(x, y);
    const s = cwAt(x, y) * between(rand, 0.01, 0.02);
    ellipse(ctx, p.x, p.y + s * 0.3, s * 1.3, s * 0.8, 'rgba(40, 25, 12, 0.4)');
    ellipse(ctx, p.x, p.y, s * 1.2, s * 0.75, pick(rand, ['#c9b9a0', '#b5a387', '#d8cab3']));
  }
  // Vetas finas y oscuras: raicillas viejas bajo la tierra, que hacen que la red siga por debajo.
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = 0.1 + rand() * (columns - 1.4);
    let y = 0.1 + rand() * (lanes - 0.2);
    ctx.beginPath();
    const start = P(x, y);
    ctx.moveTo(start.x, start.y);
    for (let k = 0; k < 4; k++) {
      x += between(rand, 0.05, 0.16);
      y += between(rand, -0.07, 0.07);
      const p = P(x, y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(70, 44, 24, 0.35)';
    ctx.lineWidth = cwAt(x, y) * 0.006;
    ctx.stroke();
  }
  // Alguna hoja seca caida, para que no sea solo tierra.
  for (let i = 0; i < 12; i++) {
    const x = 0.2 + rand() * (columns - 1);
    const y = 0.15 + rand() * (lanes - 0.3);
    const p = P(x, y);
    const cw = cwAt(x, y);
    leafShape(ctx, p.x, p.y, cw * 0.06, cw * 0.025, between(rand, -3, 3));
    ctx.fillStyle = pick(rand, ['rgba(214, 170, 90, 0.8)', 'rgba(190, 130, 70, 0.8)', 'rgba(150, 175, 80, 0.75)']);
    ctx.fill();
  }
}

/** Traza una raiz por tramos (su grueso cambia por el camino). Cerca del suelo corrupto se apaga un poco. */
function strokeStrand(ctx: Ctx, strand: Strand, pass: 'shadow' | 'outline' | 'body' | 'light'): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const { points, widths } = strand;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const pa = P(a.x, a.y);
    const pb = P(b.x, b.y);
    const cw = cwAt(a.x, a.y);
    const w = Math.max(0.6, widths[i] * cw);
    const fade = a.x > BOARD.columns - 1.3 ? Math.max(0.45, 1 - (a.x - (BOARD.columns - 1.3)) / 1.6) : 1;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    if (pass === 'shadow') {
      ctx.moveTo(pa.x + 1, pa.y + w * 0.45 + 1);
      ctx.lineTo(pb.x + 1, pb.y + w * 0.45 + 1);
      ctx.strokeStyle = ROOT.shadow;
      ctx.lineWidth = w + 1.5;
    } else if (pass === 'outline') {
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = ROOT.outline;
      ctx.lineWidth = w + 2.2;
    } else if (pass === 'body') {
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = ROOT.body;
      ctx.lineWidth = w;
    } else {
      ctx.moveTo(pa.x, pa.y - w * 0.22);
      ctx.lineTo(pb.x, pb.y - w * 0.22);
      ctx.strokeStyle = ROOT.light;
      ctx.lineWidth = w * 0.32;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Nudo donde la raiz de un carril cruza una columna: un bultito claro y, en algunos, dos hojitas que brotan. */
function paintKnot(ctx: Ctx, rand: () => number, knot: BoardPoint): void {
  const p = P(knot.x, knot.y);
  const cw = cwAt(knot.x, knot.y);
  const fade = knot.x > BOARD.columns - 1.3 ? 0.6 : 1;
  ctx.globalAlpha = fade;
  const r = cw * 0.03;
  ellipse(ctx, p.x, p.y + 1, r * 1.5 + 1.2, r + 1.2, ROOT.outline);
  ellipse(ctx, p.x, p.y, r * 1.5, r, ROOT.body);
  ellipse(ctx, p.x - r * 0.4, p.y - r * 0.35, r * 0.6, r * 0.35, ROOT.light);
  if (rand() < 0.3 && knot.x < BOARD.columns - 1.5) {
    ctx.fillStyle = '#8fd45a';
    ctx.strokeStyle = ROOT.outline;
    ctx.lineWidth = 1;
    for (const angle of [-2.3, -0.8]) {
      leafShape(ctx, p.x, p.y - r * 0.5, cw * 0.05, cw * 0.022, angle);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
