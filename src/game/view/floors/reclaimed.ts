import type { BoardPoint } from '../../core/board';
import { BOARD } from '../../config/balance';
import { P, boardEllipse, boardPath, boardRect, cwAt } from '../boardCanvas';
import { type Ctx, ellipse, leafShape, smallFlower } from '../canvasKit';
import { between, pick, seededRandom } from '../random';
import type { FloorDesign, FloorGrid } from './design';

/**
 * Propuesta E de T-050 (libertad creativa, pedida por Carmine el 26 nov 2026): la placa reconquistada. El tablero es una
 * placa de circuito vieja y enorme, tirada en el jardin, que las plantas han hecho suya: barniz verde, pistas de cobre
 * dorado y serigrafia blanca, con musgo, hiedra y florecillas por encima. Es lo contrario del suelo corrupto de la
 * derecha (morado, con circuitos de neon que se comen el jardin): aqui es el jardin el que se come la tecnologia, sin luz
 * propia. Una pista ancha de cobre (el bus) va por cada linea entre carriles y los dibuja; por dentro de cada carril,
 * pistas finas a 45 grados con sus vias. Columnas insinuadas (SU-03): una via en el bus donde cruza cada columna;
 * a la vista, ademas, la serigrafia del contorno de cada casilla, como la huella de un componente.
 */

export const RECLAIMED = {
  /** Mitad del bus de cobre de cada linea entre carriles, en carriles. */
  bus: 0.055,
  /** Franja del carril por donde van las pistas finas: la de atras, detras de lo que se apoya (en el 0,62). */
  traces: { from: 0.14, to: 0.4 },
} as const;

/** Linea de cada bus: las de los bordes, un pelo hacia dentro. */
export function busLineY(line: number): number {
  return line === 0 ? 0.06 : line === BOARD.lanes ? BOARD.lanes - 0.06 : line;
}

/** Pistas finas de un carril: tramos rectos y quiebros a 45 grados, entre dos alturas de su franja; acaban en una via. */
export function reclaimedTraces(seed = 6607): BoardPoint[][] {
  const rand = seededRandom(seed);
  const traces: BoardPoint[][] = [];
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    const low = lane + RECLAIMED.traces.from;
    const high = lane + RECLAIMED.traces.to;
    let x = between(rand, 0.25, 1);
    while (x < BOARD.columns - 1.2) {
      let y = rand() < 0.5 ? low : high;
      const trace: BoardPoint[] = [{ x, y }];
      const legs = 1 + Math.floor(rand() * 3);
      const end = BOARD.columns - 0.4;
      for (let leg = 0; leg < legs; leg++) {
        // Sin sitio para otro quiebro antes del suelo corrupto: la pista acaba aqui.
        if (x + 0.9 + (high - low) > end) break;
        x += between(rand, 0.3, 0.9);
        trace.push({ x, y });
        // Quiebro a 45 grados (en el tablero) hacia la otra altura.
        const target = y === low ? high : low;
        x += Math.abs(target - y);
        y = target;
        trace.push({ x, y });
      }
      x += between(rand, 0.2, 0.6);
      trace.push({ x: Math.min(x, end), y });
      traces.push(trace);
      x += between(rand, 0.6, 1.6);
    }
  }
  return traces;
}

const MASK = { back: '#2d7346', front: '#3a8d56', weave: 'rgba(20, 60, 30, 0.22)' };
const COPPER = { body: '#e5b54c', edge: '#8a6216', light: '#fff1b6', thin: '#d8a640', worn: '#c27a3a' };
const SILK = 'rgba(244, 248, 236, 0.78)';
const MOSS = ['#7cc24a', '#5ea83a', '#9bd65e'];

export const RECLAIMED_FLOOR: FloorDesign = {
  id: 'reclaimed',
  swatch: { light: '#3a8d56', dark: '#2d7346', line: { body: '#e5b54c', outline: '#8a6216' } },
  paint(ctx, _rand, grid) {
    const rand = seededRandom(6701);
    const { lanes, columns } = BOARD;
    paintMask(ctx);
    paintTraces(ctx);
    if (grid === 'shown') paintFootprints(ctx);
    paintLabels(ctx, rand, grid);
    for (let line = 0; line <= lanes; line++) paintBus(ctx, rand, line);
    paintLife(ctx, rand);
    // Profundidad.
    boardRect(ctx, 0, 0, columns, lanes);
    const depth = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
    depth.addColorStop(0, 'rgba(10, 30, 15, 0.2)');
    depth.addColorStop(1, 'rgba(255, 255, 220, 0.03)');
    ctx.fillStyle = depth;
    ctx.fill();
  },
  paintFront(ctx) {
    // El canto de la placa, que asoma sobre el corte: capas de barniz, cobre y fibra, como una maqueta.
    const a = P(0, BOARD.lanes);
    const b = P(BOARD.columns, BOARD.lanes);
    const h = cwAt(BOARD.columns / 2, BOARD.lanes) * 0.07;
    const band = (top: number, bottom: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + h * top);
      ctx.lineTo(b.x, b.y + h * top);
      ctx.lineTo(b.x, b.y + h * bottom);
      ctx.lineTo(a.x, a.y + h * bottom);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    band(0, 1, '#d9d2a8');
    band(0, 0.28, '#256a3c');
    band(0.28, 0.42, COPPER.body);
    band(0.82, 1, '#256a3c');
    ctx.strokeStyle = '#163f24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + h);
    ctx.lineTo(b.x, b.y + h);
    ctx.stroke();
    // Musgo que cae por el canto.
    const rand = seededRandom(6801);
    for (let x = 0.2; x < BOARD.columns - 0.2; x += between(rand, 0.4, 1)) {
      const p = P(x, BOARD.lanes);
      const cw = cwAt(x, BOARD.lanes);
      ellipse(ctx, p.x, p.y + h * 0.4, cw * between(rand, 0.06, 0.12), h * between(rand, 0.5, 0.9), pick(rand, MOSS));
    }
  },
};

/** El barniz verde de la placa, con la trama de la fibra apenas marcada. */
function paintMask(ctx: Ctx): void {
  const { lanes, columns } = BOARD;
  boardRect(ctx, 0, 0, columns, lanes);
  const mask = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
  mask.addColorStop(0, MASK.back);
  mask.addColorStop(1, MASK.front);
  ctx.fillStyle = mask;
  ctx.fill();
  ctx.save();
  boardRect(ctx, 0, 0, columns, lanes);
  ctx.clip();
  ctx.strokeStyle = MASK.weave;
  ctx.lineWidth = 1;
  for (let k = -lanes; k < columns; k += 0.12) {
    boardPath(ctx, [
      { x: k, y: 0 },
      { x: k + lanes, y: lanes },
    ]);
    ctx.stroke();
  }
  ctx.restore();
  // Un brillo suave, como de barniz.
  const shine = P(columns * 0.62, lanes * 0.35);
  const r = cwAt(columns * 0.62, lanes * 0.35) * 3;
  const glow = ctx.createRadialGradient(shine.x, shine.y, 0, shine.x, shine.y, r);
  glow.addColorStop(0, 'rgba(220, 255, 200, 0.12)');
  glow.addColorStop(1, 'rgba(220, 255, 200, 0)');
  ctx.fillStyle = glow;
  boardRect(ctx, 0, 0, columns, lanes);
  ctx.fill();
}

/** Pistas finas de cobre por dentro de los carriles, con una via redonda en cada punta. */
function paintTraces(ctx: Ctx): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const trace of reclaimedTraces()) {
    const w = cwAt(trace[0].x, trace[0].y) * 0.022;
    boardPath(ctx, trace);
    ctx.strokeStyle = 'rgba(15, 45, 25, 0.5)';
    ctx.lineWidth = w + 2;
    ctx.stroke();
    boardPath(ctx, trace);
    ctx.strokeStyle = COPPER.thin;
    ctx.lineWidth = w;
    ctx.stroke();
    for (const end of [trace[0], trace[trace.length - 1]]) paintVia(ctx, end, 0.03);
  }
}

/** Via: un aro de cobre con su agujero. */
function paintVia(ctx: Ctx, at: BoardPoint, radius: number): void {
  boardEllipse(ctx, at, radius, radius * 0.8, 14);
  ctx.fillStyle = COPPER.body;
  ctx.fill();
  ctx.strokeStyle = COPPER.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  boardEllipse(ctx, at, radius * 0.42, radius * 0.34, 10);
  ctx.fillStyle = '#1b2a1c';
  ctx.fill();
}

/** Columnas a la vista: la serigrafia del contorno de cada casilla, como la huella de un componente, con su muesca. */
function paintFootprints(ctx: Ctx): void {
  ctx.strokeStyle = SILK;
  ctx.lineWidth = 1.4;
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    for (let col = 0; col < BOARD.columns; col++) {
      const [x0, y0, x1, y1] = [col + 0.08, lane + 0.1, col + 0.92, lane + 0.9];
      boardPath(ctx, [
        { x: x0, y: y0 },
        { x: col + 0.42, y: y0 },
      ]);
      ctx.stroke();
      boardPath(ctx, [
        { x: col + 0.58, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
        { x: x0, y: y0 },
      ]);
      ctx.stroke();
    }
  }
}

/** Rotulos de serigrafia sueltos (R12, C3, U7...): pocos, que se lea "placa" sin llenar el tablero de letras. */
function paintLabels(ctx: Ctx, rand: () => number, grid: FloorGrid): void {
  const count = grid === 'shown' ? 22 : 14;
  ctx.fillStyle = SILK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const col = Math.floor(rand() * BOARD.columns);
    const lane = Math.floor(rand() * BOARD.lanes);
    const at = { x: col + between(rand, 0.12, 0.5), y: lane + between(rand, 0.78, 0.86) };
    const p = P(at.x, at.y);
    const size = Math.round(cwAt(at.x, at.y) * 0.09);
    ctx.font = `700 ${size}px ui-monospace, "DejaVu Sans Mono", monospace`;
    ctx.fillText(`${pick(rand, ['R', 'C', 'U', 'D', 'L', 'Q'])}${1 + Math.floor(rand() * 64)}`, p.x, p.y);
  }
  // Un rotulo grande, como el nombre de la placa, en el fondo a la izquierda.
  const p = P(0.25, 0.3);
  ctx.font = `800 ${Math.round(cwAt(0.25, 0.3) * 0.11)}px ui-monospace, "DejaVu Sans Mono", monospace`;
  ctx.fillText('REFUGIO-01  REV B', p.x, p.y);
}

/** El bus de cobre de una linea entre carriles: ancho, con brillo, algo gastado, y una via donde cruza cada columna. */
function paintBus(ctx: Ctx, rand: () => number, line: number): void {
  const y = busLineY(line);
  const half = RECLAIMED.bus * (line === 0 || line === BOARD.lanes ? 0.8 : 1);
  const from = 0.05;
  const to = BOARD.columns - 0.05;
  // Sombra, cuerpo, canto oscuro y brillo arriba.
  boardRect(ctx, from, y - half + 0.012, to, y + half + 0.012);
  ctx.fillStyle = 'rgba(10, 40, 20, 0.45)';
  ctx.fill();
  boardRect(ctx, from, y - half, to, y + half);
  const top = P(4.5, y - half).y;
  const bottom = P(4.5, y + half).y;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, COPPER.light);
  g.addColorStop(0.35, COPPER.body);
  g.addColorStop(1, COPPER.thin);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = COPPER.edge;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Manchas de cobre gastado.
  for (let i = 0; i < 10; i++) {
    const at = { x: between(rand, from + 0.2, to - 0.2), y: y + between(rand, -half * 0.5, half * 0.5) };
    boardEllipse(ctx, at, between(rand, 0.06, 0.16), half * 0.5, 12);
    ctx.fillStyle = 'rgba(194, 122, 58, 0.45)';
    ctx.fill();
  }
  for (let col = 1; col < BOARD.columns; col++) paintVia(ctx, { x: col, y }, half * 0.9);
}

/** Musgo sobre el cobre y en las esquinas, hiedra que cruza algun bus y florecillas: el jardin se queda con la placa. */
function paintLife(ctx: Ctx, rand: () => number): void {
  // Cojines de musgo, sobre todo en los buses y hacia la izquierda (de donde viene el jardin).
  for (let i = 0; i < 150; i++) {
    const line = Math.floor(rand() * (BOARD.lanes + 1));
    const x = Math.pow(rand(), 1.4) * (BOARD.columns - 0.4) + 0.1;
    const at = { x, y: busLineY(line) + between(rand, -0.06, 0.06) };
    const p = P(at.x, at.y);
    const cw = cwAt(at.x, at.y);
    const r = cw * between(rand, 0.03, 0.07);
    ellipse(ctx, p.x, p.y + 1, r * 1.6, r, 'rgba(20, 60, 20, 0.35)');
    ellipse(ctx, p.x, p.y, r * 1.5, r * 0.9, pick(rand, MOSS));
    ellipse(ctx, p.x - r * 0.4, p.y - r * 0.3, r * 0.6, r * 0.35, '#b9eb84');
  }
  // Hiedra: un tallo que serpentea a lo largo de un trozo de bus con sus hojitas.
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const line = 1 + Math.floor(rand() * (BOARD.lanes - 1));
    const start = between(rand, 0.2, BOARD.columns - 3);
    const length = between(rand, 1.2, 2.6);
    const phase = rand() * 6.3;
    const points: BoardPoint[] = [];
    for (let x = start; x <= start + length; x += 0.05) points.push({ x, y: line + 0.07 * Math.sin(x * 4 + phase) });
    boardPath(ctx, points);
    ctx.strokeStyle = '#2f6a22';
    ctx.lineWidth = cwAt(start, line) * 0.014;
    ctx.stroke();
    for (let k = 3; k < points.length; k += 5) {
      const p = P(points[k].x, points[k].y);
      const cw = cwAt(points[k].x, points[k].y);
      leafShape(ctx, p.x, p.y, cw * 0.05, cw * 0.026, (k % 2 === 0 ? -1 : 1) * between(rand, 0.6, 1.4) - Math.PI / 2);
      ctx.fillStyle = pick(rand, ['#6cc24a', '#86d35a', '#55ad3c']);
      ctx.fill();
    }
  }
  for (let i = 0; i < 20; i++) {
    const line = Math.floor(rand() * (BOARD.lanes + 1));
    const at = { x: between(rand, 0.2, BOARD.columns - 0.8), y: busLineY(line) + between(rand, -0.05, 0.05) };
    const p = P(at.x, at.y);
    smallFlower(ctx, p.x, p.y, cwAt(at.x, at.y) * 0.016, pick(rand, ['#ffffff', '#fff1a6', '#ffd6ea']), '#f6c343');
  }
}
