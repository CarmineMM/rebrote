/**
 * Contexto de Canvas 2D que, en vez de pintar, escribe SVG (T-028). Sirve para que el icono saque la disparadora del
 * mismo pintor que el juego (`SHOOTER.paint`, `src/game/view/shooters/`): si la disparadora se redibuja,
 * `npm run icons` rehace el icono sin tocar nada aqui.
 *
 * Cubre lo que usan los pintores de la disparadora: caminos (lineas, curvas, arcos y elipses), `fill` y `stroke` con
 * colores o degradados, `clip`, `save` y `restore` y las transformaciones `translate`, `rotate` y `scale`. Los puntos se
 * guardan ya transformados, como hace Canvas, asi que el SVG sale con coordenadas absolutas. Lo que no cubre lanza un
 * error al usarlo, para que no se pierda nada sin avisar.
 *
 * Sin DOM: funciona en Node (el script) y en el navegador (la galeria).
 */

/** Matriz afin como la de Canvas: x' = a x + c y + e, y' = b x + d y + f. */
type Matrix = readonly [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

const num = (value: number) => `${+value.toFixed(2)}`;

/** Degradado grabado: sus coordenadas, en el sistema en que se crearon, y sus paradas. */
class RecordedGradient {
  readonly stops: Array<readonly [number, string]> = [];
  readonly kind: 'linear' | 'radial';
  readonly coords: readonly number[];

  constructor(kind: 'linear' | 'radial', coords: readonly number[]) {
    this.kind = kind;
    this.coords = coords;
  }

  addColorStop(offset: number, color: string): void {
    this.stops.push([offset, color]);
  }
}

interface State {
  matrix: Matrix;
  fillStyle: string | RecordedGradient;
  strokeStyle: string | RecordedGradient;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  /** Grupos `<g clip-path>` abiertos con este estado: `restore` los cierra. */
  clips: number;
}

/** Lo que se va escribiendo: las piezas, las definiciones (degradados y recortes) y lo que ocupa lo pintado. */
export interface SvgSink {
  part(svg: string): void;
  def(svg: string): void;
  /** Un id nuevo para un degradado o un recorte. */
  id(): string;
  /** Lo pintado llega hasta (x, y), con `pad` de margen (medio trazo). */
  extend(x: number, y: number, pad: number): void;
}

export interface SvgCanvasOptions {
  /** Pinta todo de este color, sin degradados ni transparencias: la silueta. */
  silhouette?: string;
  /** Multiplica el grosor de los trazos (para que se lean en pequeno). */
  strokeScale?: number;
  /** Se salta lo semitransparente (vetas, brillos, mejillas): en pequeno solo ensucia. */
  opaqueOnly?: boolean;
}

/** Un color `rgba(...)` o `#rrggbbaa` con algo de transparencia. */
function translucent(style: string | RecordedGradient): boolean {
  if (typeof style !== 'string') return false;
  const rgba = /^rgba\([^)]*,\s*([\d.]+)\s*\)$/.exec(style);
  if (rgba) return Number(rgba[1]) < 1;
  return /^#[0-9a-f]{6}[0-9a-e][0-9a-f]$/i.test(style);
}

export class SvgCanvas {
  private state: State = {
    matrix: IDENTITY,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    clips: 0,
  };
  private readonly stack: State[] = [];
  /** Camino actual, ya en coordenadas absolutas. */
  private path: string[] = [];
  private points: Array<readonly [number, number]> = [];
  private open = false;
  private readonly sink: SvgSink;
  private readonly options: SvgCanvasOptions;

  constructor(sink: SvgSink, options: SvgCanvasOptions = {}) {
    this.sink = sink;
    this.options = options;
  }

  /** Para pasarlo a un pintor que espera un contexto de Canvas. */
  get ctx(): CanvasRenderingContext2D {
    return this as unknown as CanvasRenderingContext2D;
  }

  // --- Estado

  get fillStyle(): string | RecordedGradient {
    return this.state.fillStyle;
  }
  set fillStyle(value: string | RecordedGradient) {
    this.state.fillStyle = value;
  }
  get strokeStyle(): string | RecordedGradient {
    return this.state.strokeStyle;
  }
  set strokeStyle(value: string | RecordedGradient) {
    this.state.strokeStyle = value;
  }
  get lineWidth(): number {
    return this.state.lineWidth;
  }
  set lineWidth(value: number) {
    this.state.lineWidth = value;
  }
  get lineCap(): CanvasLineCap {
    return this.state.lineCap;
  }
  set lineCap(value: CanvasLineCap) {
    this.state.lineCap = value;
  }
  get lineJoin(): CanvasLineJoin {
    return this.state.lineJoin;
  }
  set lineJoin(value: CanvasLineJoin) {
    this.state.lineJoin = value;
  }
  get globalAlpha(): number {
    return this.state.globalAlpha;
  }
  set globalAlpha(value: number) {
    this.state.globalAlpha = value;
  }

  save(): void {
    this.stack.push(this.state);
    this.state = { ...this.state, clips: 0 };
  }

  restore(): void {
    const previous = this.stack.pop();
    if (!previous) return;
    for (let i = 0; i < this.state.clips; i++) this.sink.part('</g>');
    this.state = previous;
  }

  translate(x: number, y: number): void {
    this.state.matrix = multiply(this.state.matrix, [1, 0, 0, 1, x, y]);
  }

  rotate(angle: number): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.state.matrix = multiply(this.state.matrix, [c, s, -s, c, 0, 0]);
  }

  scale(x: number, y: number): void {
    this.state.matrix = multiply(this.state.matrix, [x, 0, 0, y, 0, 0]);
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): RecordedGradient {
    return new RecordedGradient('linear', [x0, y0, x1, y1]);
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): RecordedGradient {
    return new RecordedGradient('radial', [x0, y0, r0, x1, y1, r1]);
  }

  // --- Caminos

  beginPath(): void {
    this.path = [];
    this.points = [];
    this.open = false;
  }

  moveTo(x: number, y: number): void {
    this.path.push(`M${this.point(x, y)}`);
    this.open = true;
  }

  lineTo(x: number, y: number): void {
    this.path.push(`${this.open ? 'L' : 'M'}${this.point(x, y)}`);
    this.open = true;
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    if (!this.open) this.moveTo(cx, cy);
    this.path.push(`Q${this.point(cx, cy)} ${this.point(x, y)}`);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    if (!this.open) this.moveTo(c1x, c1y);
    this.path.push(`C${this.point(c1x, c1y)} ${this.point(c2x, c2y)} ${this.point(x, y)}`);
  }

  closePath(): void {
    if (this.open) this.path.push('Z');
  }

  arc(x: number, y: number, r: number, start: number, end: number, counterclockwise = false): void {
    this.ellipse(x, y, r, r, 0, start, end, counterclockwise);
  }

  /** Como en Canvas: une con una linea desde el punto actual y avanza por tramos de un cuarto de vuelta como mucho. */
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, counterclockwise = false): void {
    const full = Math.PI * 2;
    let sweep: number;
    if (!counterclockwise) sweep = end - start >= full ? full : (((end - start) % full) + full) % full;
    else sweep = start - end >= full ? -full : -((((start - end) % full) + full) % full);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const at = (a: number, k = 0): [number, number] => {
      // Punto del borde en el angulo `a`, o su tangente escalada por `k`.
      const ux = k === 0 ? Math.cos(a) : -Math.sin(a) * k;
      const uy = k === 0 ? Math.sin(a) : Math.cos(a) * k;
      return [(k === 0 ? x : 0) + rx * ux * cos - ry * uy * sin, (k === 0 ? y : 0) + rx * ux * sin + ry * uy * cos];
    };
    const [sx, sy] = at(start);
    this.lineTo(sx, sy);
    const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
    const step = sweep / segments;
    const k = (4 / 3) * Math.tan(step / 4);
    for (let i = 0; i < segments; i++) {
      const a0 = start + step * i;
      const a1 = a0 + step;
      const [p0x, p0y] = at(a0);
      const [t0x, t0y] = at(a0, k);
      const [p1x, p1y] = at(a1);
      const [t1x, t1y] = at(a1, k);
      this.bezierCurveTo(p0x + t0x, p0y + t0y, p1x - t1x, p1y - t1y, p1x, p1y);
    }
  }

  // --- Pintar

  fill(): void {
    if (!this.path.length || this.skipped(this.state.fillStyle)) return;
    const pad = 0;
    for (const [px, py] of this.points) this.sink.extend(px, py, pad);
    this.sink.part(`<path d="${this.path.join('')}" fill="${this.paint(this.state.fillStyle)}"${this.alpha()}/>`);
  }

  stroke(): void {
    if (!this.path.length || this.skipped(this.state.strokeStyle)) return;
    const { matrix, lineCap, lineJoin } = this.state;
    const width = this.state.lineWidth * Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])) * (this.options.strokeScale ?? 1);
    for (const [px, py] of this.points) this.sink.extend(px, py, width / 2);
    let svg = `<path d="${this.path.join('')}" fill="none" stroke="${this.paint(this.state.strokeStyle)}" stroke-width="${num(width)}"`;
    if (lineCap !== 'butt') svg += ` stroke-linecap="${lineCap}"`;
    svg += lineJoin === 'miter' ? ' stroke-miterlimit="10"' : ` stroke-linejoin="${lineJoin}"`;
    this.sink.part(`${svg}${this.alpha()}/>`);
  }

  clip(): void {
    const id = this.sink.id();
    this.sink.def(`<clipPath id="${id}"><path d="${this.path.join('')}"/></clipPath>`);
    this.sink.part(`<g clip-path="url(#${id})">`);
    this.state.clips++;
  }

  // --- Lo que no hay: mejor fallar que perder parte del dibujo sin avisar

  fillRect(): never {
    throw new Error('SvgCanvas: fillRect no esta. Anadelo si un pintor lo usa.');
  }

  private point(x: number, y: number): string {
    const m = this.state.matrix;
    const px = m[0] * x + m[2] * y + m[4];
    const py = m[1] * x + m[3] * y + m[5];
    this.points.push([px, py]);
    return `${num(px)} ${num(py)}`;
  }

  private skipped(style: string | RecordedGradient): boolean {
    return !!this.options.opaqueOnly && (this.state.globalAlpha < 1 || translucent(style));
  }

  private alpha(): string {
    const a = this.state.globalAlpha;
    return a < 1 && !this.options.silhouette ? ` opacity="${num(a)}"` : '';
  }

  private paint(style: string | RecordedGradient): string {
    if (this.options.silhouette) return this.options.silhouette;
    if (typeof style === 'string') return style;
    const id = this.sink.id();
    const stops = style.stops.map(([offset, color]) => `<stop offset="${num(offset)}" stop-color="${color}"/>`).join('');
    const transform = this.state.matrix === IDENTITY ? '' : ` gradientTransform="matrix(${this.state.matrix.map(num).join(' ')})"`;
    const c = style.coords.map(num);
    if (style.kind === 'linear') {
      this.sink.def(
        `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${c[0]}" y1="${c[1]}" x2="${c[2]}" y2="${c[3]}"${transform}>${stops}</linearGradient>`,
      );
    } else {
      this.sink.def(
        `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" fx="${c[0]}" fy="${c[1]}" fr="${c[2]}" cx="${c[3]}" cy="${c[4]}" r="${c[5]}"${transform}>${stops}</radialGradient>`,
      );
    }
    return `url(#${id})`;
  }
}
