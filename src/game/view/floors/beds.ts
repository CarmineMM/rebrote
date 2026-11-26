import { BOARD } from '../../config/balance';
import { P, boardPath, boardRect, cwAt } from '../boardCanvas';
import { type Ctx, ellipse, leafShape } from '../canvasKit';
import { between, pick, seededRandom } from '../random';
import type { FloorDesign, FloorGrid } from './design';

/**
 * Propuesta A de T-050: bancales del huerto. Cada carril es un bancal de tierra labrada con surcos a lo largo, un poco
 * levantado y con su tabla delante; entre bancales, un pasillo estrecho de hierba. Las columnas las marcan estaquillas:
 * con las columnas insinuadas (SU-03), solo en el borde de atras y en el de delante; a la vista, en todos los pasillos y
 * con una cuerda de siembra de lado a lado de cada bancal.
 */

/** Medidas de los bancales, en casillas (x) y carriles (y). */
export const BEDS = {
  /** Mitad del pasillo de hierba entre dos bancales. */
  walk: 0.1,
  /** Pasillo del borde de atras (detras del primer bancal) y del de delante. */
  edge: 0.05,
  /** Donde empieza y acaba cada bancal por los lados. */
  fromX: 0.06,
  toX: BOARD.columns - 0.06,
  /** Alto de la tabla que se ve delante de cada bancal, en anchos de casilla de pantalla. */
  face: 0.085,
  /** Caballones (lomos de tierra) por bancal. */
  ridges: 3,
} as const;

/** Lo de arriba y lo de abajo (en carriles) de la tierra del bancal del carril `lane`. */
export function bedBand(lane: number): { top: number; bottom: number } {
  return {
    top: lane === 0 ? BEDS.edge : lane + BEDS.walk,
    bottom: lane === BOARD.lanes - 1 ? BOARD.lanes - BEDS.edge - 0.02 : lane + 1 - BEDS.walk,
  };
}

/** Donde va cada estaquilla (en el pasillo, en la linea de una columna): en los bordes siempre; en todos, a la vista. */
export function bedStakes(grid: FloorGrid): Array<{ x: number; y: number }> {
  const rows = grid === 'shown' ? Array.from({ length: BOARD.lanes + 1 }, (_v, i) => i) : [0, BOARD.lanes];
  const stakes: Array<{ x: number; y: number }> = [];
  for (const row of rows) {
    const y = row === 0 ? BEDS.edge * 0.45 : row === BOARD.lanes ? BOARD.lanes - BEDS.edge * 0.2 : row + BEDS.walk * 0.25;
    for (let col = 1; col < BOARD.columns; col++) stakes.push({ x: col, y });
  }
  return stakes;
}

const SOIL = { light: '#b07c4b', mid: '#9a6a3f', groove: 'rgba(70, 40, 18, 0.6)' };
const WOOD = { top: '#e9c58e', face: '#c8955a', faceDark: '#9f6c38', outline: '#5c3a1a' };
const GRASS = { base: '#69b447', dark: '#4f9a3c' };

export const BEDS_FLOOR: FloorDesign = {
  id: 'beds',
  paint(ctx, _rand, grid) {
    const rand = seededRandom(5101);
    const { lanes, columns } = BOARD;
    // Debajo de todo, la hierba de los pasillos.
    boardRect(ctx, 0, 0, columns, lanes);
    ctx.fillStyle = GRASS.base;
    ctx.fill();
    paintWalkGrass(ctx, rand);
    for (let lane = 0; lane < lanes; lane++) paintBed(ctx, rand, lane);
    // Profundidad: lo de atras un poco mas oscuro, como el resto del jardin.
    boardRect(ctx, 0, 0, columns, lanes);
    const depth = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, lanes).y);
    depth.addColorStop(0, 'rgba(30, 40, 10, 0.2)');
    depth.addColorStop(1, 'rgba(255, 240, 200, 0.03)');
    ctx.fillStyle = depth;
    ctx.fill();
    if (grid === 'shown') paintStrings(ctx);
    for (const stake of bedStakes(grid)) paintStake(ctx, stake.x, stake.y, 1.15);
  },
};

/** Briznas en los pasillos de hierba (lo que asoma entre bancal y bancal). */
function paintWalkGrass(ctx: Ctx, rand: () => number): void {
  ctx.lineCap = 'round';
  for (let line = 0; line <= BOARD.lanes; line++) {
    const from = line === 0 ? 0 : line - BEDS.walk;
    const to = line === 0 ? BEDS.edge : line === BOARD.lanes ? BOARD.lanes : line + BEDS.walk;
    for (let i = 0; i < 260; i++) {
      const x = 0.02 + rand() * (BOARD.columns - 0.04);
      const y = from + rand() * (to - from);
      const p = P(x, y);
      const cw = cwAt(x, y);
      const len = cw * between(rand, 0.025, 0.05);
      const a = -Math.PI / 2 + (rand() - 0.5) * 0.8;
      ctx.strokeStyle = pick(rand, ['rgba(170, 230, 120, 0.6)', 'rgba(60, 130, 45, 0.5)', 'rgba(120, 200, 90, 0.55)']);
      ctx.lineWidth = cw * 0.011;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
      ctx.stroke();
    }
  }
}

/** Un bancal: tierra con sus caballones, terrones, piedritas, paja y algun brote, y la tabla de delante. */
function paintBed(ctx: Ctx, rand: () => number, lane: number): void {
  const { top, bottom } = bedBand(lane);
  const { fromX, toX } = BEDS;
  const front = (x: number) => P(x, bottom);
  const faceAt = (x: number) => cwAt(x, bottom) * BEDS.face;

  // Sombra que la tabla de delante deja en el pasillo.
  ctx.beginPath();
  for (let x = fromX; x <= toX + 1e-6; x += 0.25) {
    const p = front(x);
    if (x === fromX) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let x = toX; x >= fromX - 1e-6; x -= 0.25) {
    const p = front(x);
    ctx.lineTo(p.x + 3, p.y + faceAt(x) * 1.9);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(30, 50, 15, 0.28)';
  ctx.fill();

  // La tierra.
  boardRect(ctx, fromX, top, toX, bottom);
  const soil = ctx.createLinearGradient(0, P(0, top).y, 0, P(0, bottom).y);
  soil.addColorStop(0, SOIL.mid);
  soil.addColorStop(0.5, SOIL.light);
  soil.addColorStop(1, SOIL.mid);
  ctx.fillStyle = soil;
  ctx.fill();

  // Caballones a lo largo: cada uno, claro arriba (le da la luz) y oscuro abajo, hasta el surco del siguiente. Un pelo
  // ondulados, como hechos a mano.
  const height = bottom - top;
  const wobble = between(rand, 0, Math.PI * 2);
  const furrowAt = (k: number, x: number) =>
    k === 0 ? top : k === BEDS.ridges ? bottom : top + (k / BEDS.ridges) * height + 0.014 * Math.sin(x * 2.7 + k * 1.9 + wobble);
  const xs: number[] = [];
  for (let x = fromX; x <= toX + 1e-6; x += 0.1) xs.push(Math.min(x, toX));
  for (let k = 0; k < BEDS.ridges; k++) {
    ctx.beginPath();
    xs.forEach((x, i) => {
      const p = P(x, furrowAt(k, x));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    for (let i = xs.length - 1; i >= 0; i--) {
      const p = P(xs[i], furrowAt(k + 1, xs[i]));
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const y0 = P(4.5, furrowAt(k, 4.5)).y;
    const y1 = P(4.5, furrowAt(k + 1, 4.5)).y;
    const ridge = ctx.createLinearGradient(0, y0, 0, y1);
    ridge.addColorStop(0, 'rgba(120, 76, 40, 0.35)');
    ridge.addColorStop(0.22, 'rgba(226, 172, 112, 0.42)');
    ridge.addColorStop(0.6, 'rgba(180, 128, 78, 0)');
    ridge.addColorStop(1, 'rgba(84, 50, 24, 0.4)');
    ctx.fillStyle = ridge;
    ctx.fill();
    if (k === 0) continue;
    boardPath(
      ctx,
      xs.map((x) => ({ x, y: furrowAt(k, x) })),
    );
    ctx.strokeStyle = SOIL.groove;
    ctx.lineWidth = cwAt(4.5, lane + 0.5) * 0.016;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Terrones y granitos de tierra.
  for (let i = 0; i < 520; i++) {
    const x = fromX + 0.02 + rand() * (toX - fromX - 0.04);
    const y = top + 0.02 + rand() * (height - 0.04);
    const p = P(x, y);
    const s = cwAt(x, y) * between(rand, 0.006, 0.016);
    ellipse(ctx, p.x, p.y, s * 1.4, s, pick(rand, ['rgba(90, 55, 28, 0.55)', 'rgba(205, 156, 104, 0.55)', 'rgba(120, 78, 42, 0.5)']));
  }
  // Piedritas.
  for (let i = 0; i < 26; i++) {
    const x = fromX + 0.05 + rand() * (toX - fromX - 0.1);
    const y = top + 0.05 + rand() * (height - 0.1);
    const p = P(x, y);
    const s = cwAt(x, y) * between(rand, 0.012, 0.022);
    ellipse(ctx, p.x, p.y + s * 0.3, s * 1.3, s * 0.8, 'rgba(70, 45, 25, 0.4)');
    ellipse(ctx, p.x, p.y, s * 1.2, s * 0.75, pick(rand, ['#d8cbb5', '#c4b59c', '#e5dac6']));
  }
  // Paja suelta.
  ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = fromX + 0.05 + rand() * (toX - fromX - 0.1);
    const y = top + 0.04 + rand() * (height - 0.08);
    const p = P(x, y);
    const cw = cwAt(x, y);
    const a = between(rand, -0.5, 0.5);
    const len = cw * between(rand, 0.04, 0.07);
    ctx.strokeStyle = pick(rand, ['#f0d892', '#e2c372', '#f7e6b0']);
    ctx.lineWidth = cw * 0.008;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(a) * len * 0.5, p.y - Math.sin(a) * len * 0.5);
    ctx.lineTo(p.x + Math.cos(a) * len * 0.5, p.y + Math.sin(a) * len * 0.5);
    ctx.stroke();
  }
  // Algun brote pequeno: el huerto esta vivo (pequenos, para no confundirse con nada sembrado).
  for (let i = 0; i < 7; i++) {
    const x = fromX + 0.15 + rand() * (toX - fromX - 0.3);
    const y = top + 0.1 + rand() * (height - 0.2);
    const p = P(x, y);
    const cw = cwAt(x, y);
    ctx.fillStyle = '#7fcf5f';
    leafShape(ctx, p.x, p.y, cw * 0.05, cw * 0.022, -2.4);
    ctx.fill();
    leafShape(ctx, p.x, p.y, cw * 0.05, cw * 0.022, -0.7);
    ctx.fill();
  }

  // Canto de atras: la tabla de atras se ve solo por arriba, una linea clara.
  boardPath(ctx, [
    { x: fromX, y: top },
    { x: toX, y: top },
  ]);
  ctx.strokeStyle = WOOD.top;
  ctx.lineWidth = cwAt(4.5, top) * 0.02;
  ctx.stroke();

  // Tabla de delante: la cara que mira a la camara, con sus vetas y los clavos de cada tramo.
  const a = front(fromX);
  const b = front(toX);
  const faceA = faceAt(fromX);
  const faceB = faceAt(toX);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(b.x, b.y + faceB);
  ctx.lineTo(a.x, a.y + faceA);
  ctx.closePath();
  const face = ctx.createLinearGradient(0, a.y, 0, a.y + faceA);
  face.addColorStop(0, WOOD.face);
  face.addColorStop(1, WOOD.faceDark);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = WOOD.outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Borde de arriba de la tabla, iluminado.
  ctx.beginPath();
  ctx.moveTo(a.x, a.y + 0.5);
  ctx.lineTo(b.x, b.y + 0.5);
  ctx.strokeStyle = WOOD.top;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Vetas y juntas entre tablas (cada dos o tres casillas, sin coincidir con las columnas).
  ctx.lineWidth = 1;
  for (let x = fromX + between(rand, 0.6, 1.4); x < toX - 0.3; x += between(rand, 1.7, 2.6)) {
    const p = front(x);
    ctx.strokeStyle = WOOD.outline;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y + faceAt(x));
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = fromX + rand() * (toX - fromX);
    const p = front(x);
    const f = faceAt(x);
    const w = cwAt(x, bottom) * between(rand, 0.12, 0.3);
    ctx.strokeStyle = 'rgba(92, 58, 26, 0.35)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + f * between(rand, 0.35, 0.75));
    ctx.lineTo(p.x + w, p.y + f * between(rand, 0.35, 0.75));
    ctx.stroke();
  }
}

/** Cuerda de siembra de lado a lado de cada bancal, en la linea de cada columna (columnas a la vista). */
function paintStrings(ctx: Ctx): void {
  ctx.lineCap = 'round';
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    const { top, bottom } = bedBand(lane);
    for (let col = 1; col < BOARD.columns; col++) {
      const back = P(col, top - 0.01);
      const front = P(col, bottom + 0.01);
      const lift = cwAt(col, bottom) * 0.03;
      // Sombra en la tierra y cuerda un pelo por encima.
      ctx.strokeStyle = 'rgba(60, 35, 15, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(back.x + 1.5, back.y + 1.5);
      ctx.lineTo(front.x + 1.5, front.y + 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#f6ecd2';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(back.x, back.y - lift * 0.6);
      ctx.lineTo(front.x, front.y - lift);
      ctx.stroke();
    }
  }
}

/** Estaquilla de madera clavada en el pasillo, con la punta clara. */
function paintStake(ctx: Ctx, x: number, y: number, size: number): void {
  const p = P(x, y);
  const cw = cwAt(x, y) * size;
  const w = cw * 0.032;
  const h = cw * 0.12;
  ellipse(ctx, p.x + w * 0.6, p.y, w * 1.6, w * 0.6, 'rgba(30, 40, 15, 0.35)');
  ctx.beginPath();
  ctx.moveTo(p.x - w / 2, p.y);
  ctx.lineTo(p.x - w / 2, p.y - h);
  ctx.quadraticCurveTo(p.x, p.y - h - w * 0.9, p.x + w / 2, p.y - h);
  ctx.lineTo(p.x + w / 2, p.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0);
  g.addColorStop(0, '#f0cf98');
  g.addColorStop(1, '#b98249');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = WOOD.outline;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Punta pintada, como las de marcar la siembra.
  ctx.fillStyle = '#ff8f6a';
  ctx.fillRect(p.x - w / 2 + 0.6, p.y - h + w * 0.2, w - 1.2, h * 0.18);
}
