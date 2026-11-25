import { AI_COLORS } from './aiArt';
import { type ArtEnv, type CinematicArt, drawCutout, sec } from './art';
import { type Ctx, clamp, glow, lerp, roundRect, seeded, vertical } from './geometry';
import { live, painted } from './herArt';
import { FULL_BOX, ease } from './shots';

/**
 * Arte de la escena 2 de la rebelion, "El refugio" (T-049): la ciudad que se apaga barrio a barrio con la torre al
 * fondo (plano 2.1), la gente que baja a sotanos, tuneles e invernaderos viejos (2.2) y el laboratorio del refugio, donde
 * brota la primera disparadora entre Patty y Boxer (2.3). Pintores de Canvas 2D sin Phaser, en coordenadas del diseno.
 */

const WARM = { light: '#ffe3a1', mid: '#ffc46b', deep: '#f0953a' } as const;
const GROUND = 640;

// --- Plano 2.1: la ciudad se apaga ------------------------------------------------------------------------------------

function paintNightSky(ctx: Ctx, env: ArtEnv): void {
  const { x, y, w, h } = FULL_BOX;
  ctx.fillStyle = vertical(ctx, y, GROUND + 40, ['#040816', '#0b1430', '#18213f', '#26304a']);
  ctx.fillRect(x, y, w, h);
  const random = seeded(41);
  const stars = Math.round(150 * Math.max(0.4, env.look.life));
  for (let i = 0; i < stars; i++) {
    ctx.globalAlpha = 0.3 + random() * 0.6;
    ctx.fillStyle = '#f2f6ff';
    ctx.beginPath();
    ctx.arc(x + random() * w, y + random() * (GROUND - y - 200), 0.8 + random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Luna menguante.
  if (env.look.glows) glow(ctx, 300, 150, 140, 'rgba(240, 240, 210, 0.25)');
  ctx.beginPath();
  ctx.arc(300, 150, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#f3f0d8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(320, 138, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1631';
  ctx.fill();
  // Nubes oscuras.
  ctx.fillStyle = 'rgba(8, 12, 26, 0.7)';
  for (const [cx, cy, r] of [
    [-120, 240, 90],
    [20, 260, 70],
    [600, 200, 60],
    [700, 214, 80],
    [1720, 260, 90],
  ]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.8, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** La torre de la IA, al fondo: la del final de la ruta de brotes (`RouteMap`), oscura y con un ojo de neon. */
const TOWER = { x: 1430, base: GROUND, top: 70, eyeY: 214 } as const;

function paintTower(ctx: Ctx): void {
  const { x, base, top } = TOWER;
  ctx.save();
  ctx.fillStyle = '#080a14';
  ctx.beginPath();
  ctx.moveTo(x - 95, base);
  ctx.lineTo(x - 58, 330);
  ctx.lineTo(x - 40, 230);
  ctx.lineTo(x - 22, 150);
  ctx.lineTo(x - 6, top);
  ctx.lineTo(x + 6, top);
  ctx.lineTo(x + 22, 150);
  ctx.lineTo(x + 40, 230);
  ctx.lineTo(x + 58, 330);
  ctx.lineTo(x + 95, base);
  ctx.closePath();
  ctx.fill();
  // Anillos y antena.
  for (const ry of [330, 230, 150]) {
    ctx.fillRect(x - 70 + (330 - ry) * 0.18, ry - 8, 140 - (330 - ry) * 0.36, 12);
  }
  ctx.fillRect(x - 2, top - 60, 4, 62);
  ctx.strokeStyle = 'rgba(125, 255, 192, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 58, 330);
  ctx.lineTo(x - 6, top);
  ctx.stroke();
  // El ojo, apagado: lo enciende la capa viva.
  ctx.beginPath();
  ctx.ellipse(x, TOWER.eyeY, 26, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#10251f';
  ctx.fill();
  ctx.restore();
}

function drawTowerEye(ctx: Ctx, t: number, env: ArtEnv): void {
  const pulse = env.look.still ? 1 : 0.75 + 0.25 * Math.sin(t / 420);
  if (env.look.glows) glow(ctx, TOWER.x, TOWER.eyeY, 120, 'rgba(125, 255, 192, 0.45)', pulse);
  ctx.beginPath();
  ctx.ellipse(TOWER.x, TOWER.eyeY, 22, 12 * pulse, 0, 0, Math.PI * 2);
  ctx.fillStyle = AI_COLORS.light;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(TOWER.x, TOWER.eyeY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#04120c';
  ctx.fill();
  // Bits que flotan alrededor.
  if (env.look.particles > 0 && !env.look.still) {
    const random = seeded(5);
    const count = Math.round(14 * env.look.particles);
    ctx.fillStyle = AI_COLORS.light;
    for (let i = 0; i < count; i++) {
      const phase = random() * 6;
      const rise = (sec(t) * (12 + random() * 14) + random() * 200) % 220;
      ctx.globalAlpha = 0.7 * (1 - rise / 220);
      ctx.fillRect(TOWER.x - 80 + random() * 160 + Math.sin(sec(t) + phase) * 8, TOWER.eyeY + 120 - rise, 4, 4);
    }
    ctx.globalAlpha = 1;
  }
}

interface Building {
  readonly x: number;
  readonly w: number;
  readonly top: number;
  readonly base: number;
}

/** Los edificios de una fila de la ciudad, siempre los mismos (semilla). */
function skyline(seed: number, from: number, to: number, base: number, min: number, max: number, widths: [number, number]): Building[] {
  const random = seeded(seed);
  const out: Building[] = [];
  let x = from;
  while (x < to) {
    const w = widths[0] + random() * (widths[1] - widths[0]);
    // Hueco para la torre.
    if (!(x + w > TOWER.x - 120 && x < TOWER.x + 120 && base === GROUND)) out.push({ x, w, top: base - (min + random() * (max - min)), base });
    x += w + random() * 18;
  }
  return out;
}

const FAR_CITY = skyline(17, FULL_BOX.x, FULL_BOX.x + FULL_BOX.w, GROUND, 110, 290, [70, 150]);
const NEAR_CITY = [
  ...skyline(29, FULL_BOX.x, 260, 760, 330, 520, [130, 210]),
  ...skyline(31, 1360, FULL_BOX.x + FULL_BOX.w, 760, 330, 520, [130, 210]),
];

/** Cuando se apaga cada barrio: desde la torre hacia fuera, uno tras otro. */
export function districtOffAt(x: number): number {
  const distance = Math.abs(x - TOWER.x);
  return 1200 + Math.floor(distance / 360) * 620;
}

function paintCityRow(ctx: Ctx, buildings: readonly Building[], color: string, edge: string): void {
  for (const b of buildings) {
    ctx.fillStyle = color;
    ctx.fillRect(b.x, b.top, b.w, b.base - b.top + 2);
    ctx.fillStyle = edge;
    ctx.fillRect(b.x, b.top, b.w, 3);
    ctx.fillRect(b.x, b.top, 3, b.base - b.top);
  }
}

/** Las ventanas de una fila: encendidas en calido; al apagarse su barrio, unas pocas se quedan en verde (las de ella). */
function drawWindows(ctx: Ctx, t: number, env: ArtEnv, buildings: readonly Building[], size: number, seed: number): void {
  const random = seeded(seed);
  const time = env.look.still ? 30000 : t;
  for (const b of buildings) {
    const off = districtOffAt(b.x + b.w / 2);
    const cols = Math.max(1, Math.floor((b.w - size) / (size * 1.9)));
    const rows = Math.max(1, Math.floor((b.base - b.top - size * 2) / (size * 2.2)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const roll = random();
        const lit = roll < 0.46;
        const turns = roll < 0.1;
        if (!lit) continue;
        const wx = b.x + size + c * size * 1.9;
        const wy = b.top + size * 1.6 + r * size * 2.2;
        const dying = clamp((time - off - (c + r) * 12) / 160);
        if (dying < 1) {
          ctx.fillStyle = (r + c) % 4 === 0 ? WARM.light : WARM.mid;
          ctx.globalAlpha = 1 - dying;
          ctx.fillRect(wx, wy, size, size * 1.25);
        }
        if (turns && dying > 0) {
          ctx.globalAlpha = dying;
          ctx.fillStyle = AI_COLORS.lightDeep;
          ctx.fillRect(wx, wy, size, size * 1.25);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}

function paintCityFar(ctx: Ctx): void {
  paintCityRow(ctx, FAR_CITY, '#121a2f', '#1d2742');
  ctx.fillStyle = '#0d1325';
  ctx.fillRect(FULL_BOX.x, GROUND, FULL_BOX.w, 140);
}

const LAMPS = [180, 520, 860, 1200, 1540] as const;
const STREET = 770;

function paintCityNear(ctx: Ctx): void {
  paintCityRow(ctx, NEAR_CITY, '#0b1020', '#151c33');
  // Calle.
  ctx.fillStyle = vertical(ctx, 760, 900, ['#0c1120', '#070a14']);
  ctx.fillRect(FULL_BOX.x, 760, FULL_BOX.w, 360);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let x = -360; x < 1980; x += 120) ctx.fillRect(x, STREET + 30, 60, 5);
  // Farolas.
  for (const x of LAMPS) {
    ctx.fillStyle = '#05070e';
    ctx.fillRect(x - 4, 600, 8, 166);
    ctx.beginPath();
    ctx.moveTo(x, 604);
    ctx.quadraticCurveTo(x + 4, 586, x + 26, 590);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#05070e';
    ctx.stroke();
    ctx.fillRect(x + 16, 588, 26, 10);
  }
}

/** Los coches de la calle: van y, cuando se apaga su barrio, frenan y sus faros se vuelven verdes. */
const CARS = [
  { from: -300, speed: 210, lane: 0 },
  { from: 500, speed: 160, lane: 0 },
  { from: 1900, speed: -190, lane: 1 },
  { from: 1100, speed: -150, lane: 1 },
] as const;

export function carAt(car: (typeof CARS)[number], t: number): { x: number; stopped: number } {
  // Frena cuando se apaga el barrio por el que va (se calcula con donde estaria al apagarse).
  let x = car.from;
  let stopped = 0;
  const step = 50;
  for (let time = 0; time < t; time += step) {
    const dt = Math.min(step, t - time);
    const off = districtOffAt(x);
    const brake = clamp((time - off) / 700);
    stopped = brake;
    x += car.speed * (1 - brake) * (dt / 1000);
  }
  return { x, stopped };
}

function drawCityNearLights(ctx: Ctx, t: number, env: ArtEnv): void {
  const time = env.look.still ? 30000 : t;
  drawWindows(ctx, time, env, NEAR_CITY, 16, 77);
  for (const x of LAMPS) {
    const off = clamp((time - districtOffAt(x)) / 200);
    const green = x === 520 || x === 1200;
    const color = off < 1 ? WARM.light : green ? AI_COLORS.light : null;
    if (!color) continue;
    const alpha = off < 1 ? 1 - off : off;
    if (env.look.glows) glow(ctx, x + 29, 600, 90, off < 1 ? 'rgba(255, 210, 120, 0.5)' : 'rgba(57, 229, 140, 0.5)', alpha);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 18, 597, 22, 5);
    ctx.globalAlpha = 1;
  }
  for (const car of CARS) {
    const { x, stopped } = carAt(car, time);
    const y = STREET + (car.lane ? 46 : 8);
    const dir = Math.sign(car.speed);
    ctx.fillStyle = '#03050a';
    ctx.beginPath();
    roundRect(ctx, x - 60, y - 26, 120, 30, 10);
    ctx.fill();
    ctx.beginPath();
    roundRect(ctx, x - 34, y - 46, 66, 24, 10);
    ctx.fill();
    const front = x + dir * 58;
    const lightColor = stopped > 0.5 ? AI_COLORS.light : WARM.light;
    if (env.look.glows) glow(ctx, front + dir * 30, y - 10, 70, stopped > 0.5 ? 'rgba(57, 229, 140, 0.4)' : 'rgba(255, 220, 140, 0.4)');
    ctx.fillStyle = lightColor;
    ctx.fillRect(front - 4, y - 16, 8, 7);
  }
}

function paintRoof(ctx: Ctx): void {
  ctx.fillStyle = '#03050a';
  ctx.fillRect(FULL_BOX.x, 868, FULL_BOX.w, 260);
  ctx.fillRect(FULL_BOX.x, 852, FULL_BOX.w, 18);
  // Deposito de agua y antena a la izquierda.
  ctx.beginPath();
  roundRect(ctx, -250, 640, 190, 160, 20);
  ctx.fill();
  for (const x of [-235, -100]) ctx.fillRect(x, 790, 14, 80);
  ctx.fillRect(1700, 560, 6, 310);
  for (const [y, w] of [
    [600, 90],
    [650, 130],
  ]) {
    ctx.fillRect(1703 - w / 2, y, w, 5);
  }
}

// --- Plano 2.2: bajan al refugio -------------------------------------------------------------------------------------

function paintRefugeNight(ctx: Ctx, env: ArtEnv): void {
  const { x, y, w, h } = FULL_BOX;
  ctx.fillStyle = vertical(ctx, y, GROUND, ['#050915', '#0c1428', '#14253a']);
  ctx.fillRect(x, y, w, h);
  // El brillo verde de la ciudad que controla ella, en el horizonte.
  const horizon = ctx.createLinearGradient(0, 380, 0, GROUND);
  horizon.addColorStop(0, 'rgba(57, 229, 140, 0)');
  horizon.addColorStop(1, 'rgba(57, 229, 140, 0.22)');
  ctx.fillStyle = horizon;
  ctx.fillRect(x, 380, w, GROUND - 380);
  const random = seeded(53);
  for (let i = 0; i < Math.round(90 * Math.max(0.4, env.look.life)); i++) {
    ctx.globalAlpha = 0.25 + random() * 0.5;
    ctx.fillStyle = '#eef3ff';
    ctx.fillRect(x + random() * w, y + random() * 400, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Ciudad lejana, apagada, con alguna ventana verde.
  const city = skyline(61, FULL_BOX.x, FULL_BOX.x + FULL_BOX.w, GROUND - 40, 60, 200, [60, 130]);
  paintCityRow(ctx, city, '#0b1222', '#121b30');
  const lit = seeded(67);
  for (const b of city) {
    if (lit() < 0.5) continue;
    ctx.fillStyle = AI_COLORS.lightDeep;
    ctx.fillRect(b.x + 10 + lit() * (b.w - 20), b.top + 14 + lit() * 60, 7, 9);
  }
  // Suelo de tierra.
  ctx.fillStyle = vertical(ctx, GROUND - 40, y + h, ['#121a17', '#0b100e', '#060807']);
  ctx.fillRect(x, GROUND - 40, w, y + h - GROUND + 40);
}

/** El invernadero viejo con la entrada a su sotano: alli entra la gente. La puerta la cierra la capa viva. */
export const DOOR = { x: 1176, y: 512, w: 112, h: 178, closeAt: 7600, closeMs: 650 } as const;

function paintShelter(ctx: Ctx): void {
  // Invernadero: base de ladrillo, armazon de madera y cristales en arco.
  const left = 960;
  const right = 1780;
  const base = 690;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, 470);
  ctx.quadraticCurveTo((left + right) / 2, 210, right, 470);
  ctx.lineTo(right, base);
  ctx.lineTo(left, base);
  ctx.closePath();
  ctx.fillStyle = 'rgba(120, 170, 160, 0.10)';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2b2219';
  ctx.stroke();
  ctx.clip();
  ctx.lineWidth = 5;
  for (let k = 1; k < 8; k++) {
    const x = lerp(left, right, k / 8);
    ctx.beginPath();
    ctx.moveTo(x, 200);
    ctx.lineTo(x, base);
    ctx.stroke();
  }
  for (const yy of [400, 330]) {
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
  }
  // Reflejos en el cristal.
  ctx.strokeStyle = 'rgba(200, 255, 235, 0.16)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(left + 60 + k * 130, 460);
    ctx.lineTo(left + 110 + k * 130, 380);
    ctx.stroke();
  }
  ctx.restore();
  // Base de ladrillo.
  ctx.fillStyle = '#4a2c22';
  ctx.fillRect(left - 10, 600, right - left + 20, base - 600);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 5; row++) {
    const yy = 600 + row * 18;
    ctx.beginPath();
    ctx.moveTo(left - 10, yy);
    ctx.lineTo(right + 10, yy);
    ctx.stroke();
    for (let bx = left - 10 + (row % 2) * 24; bx < right; bx += 48) {
      ctx.beginPath();
      ctx.moveTo(bx, yy);
      ctx.lineTo(bx, yy + 18);
      ctx.stroke();
    }
  }
  // El hueco de la puerta del sotano, con su marco.
  ctx.fillStyle = '#120c08';
  ctx.beginPath();
  roundRect(ctx, DOOR.x - 14, DOOR.y - 14, DOOR.w + 28, DOOR.h + 14, 12);
  ctx.fill();
  ctx.fillStyle = '#2e1f14';
  ctx.fillRect(DOOR.x - 14, DOOR.y - 14, DOOR.w + 28, 14);
  // Unas escaleras que bajan, y un letrero de madera.
  ctx.save();
  ctx.translate(820, 560);
  ctx.rotate(-0.05);
  ctx.beginPath();
  roundRect(ctx, 0, 0, 150, 44, 6);
  ctx.fillStyle = '#6b4a2f';
  ctx.fill();
  ctx.fillStyle = '#3b2617';
  ctx.fillRect(68, 44, 10, 100);
  ctx.beginPath();
  ctx.moveTo(116, 22);
  ctx.lineTo(140, 22);
  ctx.lineTo(130, 12);
  ctx.moveTo(140, 22);
  ctx.lineTo(130, 32);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#f4e3c2';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 22);
  ctx.lineTo(110, 22);
  ctx.stroke();
  ctx.restore();
}

function drawDoor(ctx: Ctx, t: number, env: ArtEnv): void {
  const time = env.look.still ? 0 : t;
  // Abierta: la luz calida de dentro; al cerrarse, la hoja de madera la tapa.
  const closing = env.look.still ? 0 : clamp((time - DOOR.closeAt) / DOOR.closeMs);
  const shut = ease('in', closing);
  const flicker = env.look.still ? 1 : 0.85 + 0.15 * Math.sin(time / 90) * Math.sin(time / 233);
  ctx.save();
  ctx.fillStyle = vertical(ctx, DOOR.y, DOOR.y + DOOR.h, [WARM.light, WARM.mid, WARM.deep]);
  ctx.globalAlpha = flicker;
  ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.restore();
  if (env.look.glows) glow(ctx, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h * 0.6, 210 * (1 - shut * 0.9), 'rgba(255, 200, 110, 0.5)', flicker);
  // La hoja: de canto (abierta) a cerrada, girando sobre la bisagra de la izquierda.
  const width = lerp(DOOR.w * 0.14, DOOR.w, shut);
  ctx.fillStyle = vertical(ctx, DOOR.y, DOOR.y + DOOR.h, ['#7a5434', '#5d3f26']);
  ctx.beginPath();
  ctx.moveTo(DOOR.x, DOOR.y);
  ctx.lineTo(DOOR.x + width, DOOR.y + (1 - shut) * 12);
  ctx.lineTo(DOOR.x + width, DOOR.y + DOOR.h - (1 - shut) * 12);
  ctx.lineTo(DOOR.x, DOOR.y + DOOR.h);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3a2614';
  ctx.stroke();
  if (shut > 0.6) {
    ctx.strokeStyle = 'rgba(58, 38, 20, 0.8)';
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(DOOR.x + (width * k) / 4, DOOR.y + 4);
      ctx.lineTo(DOOR.x + (width * k) / 4, DOOR.y + DOOR.h - 4);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(DOOR.x + width - 16, DOOR.y + DOOR.h / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e8c070';
    ctx.fill();
  }
}

/** La gente que baja al refugio: siluetas que andan con velas y faroles. */
type Walker = 'adult' | 'child' | 'elder' | 'pack' | 'plant';

interface Row {
  readonly y: number;
  readonly scale: number;
  readonly speed: number;
  readonly color: string;
  readonly people: readonly { readonly kind: Walker; readonly start: number }[];
  /** Donde dejan de verse: la puerta del sotano (fila de atras) o fuera del plano. */
  readonly until: number;
}

const ROWS: Readonly<Record<'far' | 'near', Row>> = {
  far: {
    y: 688,
    scale: 0.62,
    speed: 120,
    color: '#0d1220',
    until: DOOR.x + DOOR.w * 0.6,
    people: [
      { kind: 'adult', start: -900 },
      { kind: 'child', start: -1500 },
      { kind: 'pack', start: -2300 },
      { kind: 'elder', start: -3600 },
      { kind: 'adult', start: -4300 },
      { kind: 'child', start: -4900 },
      { kind: 'plant', start: -5600 },
    ],
  },
  near: {
    y: 878,
    scale: 1.1,
    speed: 190,
    color: '#05070c',
    until: 2100,
    people: [
      { kind: 'pack', start: -300 },
      { kind: 'adult', start: -2100 },
      { kind: 'child', start: -2600 },
      { kind: 'adult', start: -4500 },
    ],
  },
};

/** Donde va alguien de una fila a los `t` ms: x de sus pies, o null si aun no ha salido o ya entro. */
export function walkerX(row: Row, start: number, t: number): number | null {
  const x = FULL_BOX.x - 80 + ((t + start) / 1000) * row.speed;
  if (t + start < 0 || x > row.until) return null;
  return x;
}

function drawWalker(ctx: Ctx, kind: Walker, x: number, y: number, scale: number, color: string, step: number, env: ArtEnv, flame: number): void {
  const small = kind === 'child' ? 0.68 : 1;
  const s = scale * small;
  const stoop = kind === 'elder' ? 0.12 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const swing = Math.sin(step) * 0.42;
  // Piernas.
  ctx.lineWidth = 15;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -92);
    ctx.lineTo(Math.sin(swing * side) * 34, -4);
    ctx.stroke();
  }
  // Cuerpo, algo inclinado al andar (mas, si es mayor).
  ctx.save();
  ctx.rotate(stoop + 0.05);
  ctx.beginPath();
  ctx.moveTo(-22, -96);
  ctx.lineTo(22, -96);
  ctx.lineTo(18, -176);
  ctx.quadraticCurveTo(0, -186, -18, -176);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2, -204, 20, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'pack') {
    ctx.beginPath();
    roundRect(ctx, -46, -178, 30, 62, 8);
    ctx.fill();
  }
  // El brazo de delante lleva el farol (o la maceta); el de atras se balancea.
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-4, -170);
  ctx.lineTo(-18 - Math.sin(step) * 16, -112);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -170);
  ctx.lineTo(30, -128);
  ctx.lineTo(42, -140);
  ctx.stroke();
  ctx.restore();
  if (kind === 'elder') {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-26, -116);
    ctx.lineTo(-30 + Math.sin(step) * 6, 0);
    ctx.stroke();
  }
  if (kind === 'plant') {
    // Una maceta con un brote: lo que salvaron.
    ctx.beginPath();
    ctx.moveTo(30, -150);
    ctx.lineTo(66, -150);
    ctx.lineTo(60, -120);
    ctx.lineTo(36, -120);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3f8f3a';
    ctx.beginPath();
    ctx.ellipse(40, -166, 10, 6, -0.6, 0, Math.PI * 2);
    ctx.ellipse(56, -166, 10, 6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // El farol: el asa, el cristal y la llama, que tiembla.
    const lx = 44;
    const ly = -126 + Math.sin(step * 2) * 3;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, -140);
    ctx.lineTo(lx, ly - 12);
    ctx.stroke();
    ctx.fillRect(lx - 9, ly - 13, 18, 4);
    if (env.look.glows) glow(ctx, lx, ly, 70 / small, 'rgba(255, 196, 107, 0.55)', flame);
    ctx.fillStyle = WARM.light;
    ctx.globalAlpha = 0.6 + 0.4 * flame;
    ctx.beginPath();
    roundRect(ctx, lx - 7, ly - 9, 14, 18, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawRow(ctx: Ctx, t: number, env: ArtEnv, row: Row): void {
  const time = env.look.still ? 4200 : t;
  // En los niveles con menos vida, va menos gente (nunca nadie).
  const count = Math.max(2, Math.round(row.people.length * Math.min(1, env.look.life + 0.2)));
  row.people.slice(0, count).forEach((person, i) => {
    const x = walkerX(row, person.start, time);
    if (x === null) return;
    const step = env.look.still ? 0 : (time / 1000) * (row.speed / 26) + i;
    const flame = env.look.still ? 1 : 0.8 + 0.2 * Math.sin(time / 70 + i * 3);
    // La fila de atras se funde al cruzar la puerta del sotano.
    const fade = row === ROWS.far ? clamp((row.until - x) / 60) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    drawWalker(ctx, person.kind, x, row.y + Math.abs(Math.sin(step)) * -4, row.scale, row.color, step, env, flame);
    ctx.restore();
  });
}

function paintWeeds(ctx: Ctx): void {
  ctx.fillStyle = '#030504';
  ctx.fillRect(FULL_BOX.x, 960, FULL_BOX.w, 200);
  const random = seeded(71);
  ctx.strokeStyle = '#030504';
  ctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = FULL_BOX.x + random() * FULL_BOX.w;
    const h = 40 + random() * 110;
    ctx.lineWidth = 4 + random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, 975);
    ctx.quadraticCurveTo(x + (random() - 0.5) * 40, 975 - h * 0.6, x + (random() - 0.5) * 60, 975 - h);
    ctx.stroke();
  }
  // Postes de una valla.
  for (const x of [-300, -120, 1720, 1900]) ctx.fillRect(x, 820, 22, 200);
  ctx.fillRect(-320, 850, 300, 10);
  ctx.fillRect(1700, 850, 300, 10);
}

// --- Plano 2.3: el laboratorio del refugio --------------------------------------------------------------------------

function paintLab(ctx: Ctx, env: ArtEnv): void {
  const { x, y, w, h } = FULL_BOX;
  ctx.fillStyle = vertical(ctx, y, 660, ['#2a1b15', '#3d2a20', '#4a3326']);
  ctx.fillRect(x, y, w, h);
  // Ladrillo.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 40; row++) {
    const yy = y + row * 30;
    if (yy > 660) break;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    for (let bx = x + (row % 2) * 40; bx < x + w; bx += 80) {
      ctx.beginPath();
      ctx.moveTo(bx, yy);
      ctx.lineTo(bx, yy + 30);
      ctx.stroke();
    }
  }
  // Ventana alta: fuera, la noche verde y los cristales del invernadero.
  ctx.beginPath();
  roundRect(ctx, 980, 70, 300, 200, 14);
  ctx.fillStyle = '#0c1a1c';
  ctx.fill();
  const outside = ctx.createLinearGradient(0, 70, 0, 270);
  outside.addColorStop(0, 'rgba(57, 229, 140, 0)');
  outside.addColorStop(1, 'rgba(57, 229, 140, 0.35)');
  ctx.fillStyle = outside;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#5a3d28';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1130, 70);
  ctx.lineTo(1130, 270);
  ctx.moveTo(980, 170);
  ctx.lineTo(1280, 170);
  ctx.lineWidth = 7;
  ctx.stroke();
  // Estanterias con macetas y tarros de semillas.
  const random = seeded(83);
  for (const [sx, sw] of [
    [-360, 560],
    [1440, 560],
  ]) {
    for (const sy of [180, 330, 480]) {
      ctx.fillStyle = '#5e4029';
      ctx.fillRect(sx, sy, sw, 14);
      ctx.fillStyle = '#3d2918';
      ctx.fillRect(sx, sy + 14, sw, 6);
      for (let k = 0; k < 6; k++) {
        const px = sx + 30 + k * 88 + random() * 20;
        if (random() < 0.5) {
          ctx.fillStyle = '#b5613b';
          ctx.beginPath();
          ctx.moveTo(px, sy - 44);
          ctx.lineTo(px + 46, sy - 44);
          ctx.lineTo(px + 38, sy);
          ctx.lineTo(px + 8, sy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = random() < 0.5 ? '#4f9e3f' : '#6fbf4f';
          ctx.beginPath();
          ctx.ellipse(px + 14, sy - 58, 14, 9, -0.6, 0, Math.PI * 2);
          ctx.ellipse(px + 32, sy - 58, 14, 9, 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(200, 230, 220, 0.35)';
          ctx.beginPath();
          roundRect(ctx, px, sy - 52, 40, 52, 8);
          ctx.fill();
          ctx.fillStyle = ['#d9b45b', '#9b6a3e', '#6fbf4f'][k % 3];
          ctx.fillRect(px + 4, sy - 26, 32, 22);
        }
      }
    }
  }
  // Suelo de madera.
  ctx.fillStyle = vertical(ctx, 660, y + h, ['#5a3b25', '#3c2718', '#25180e']);
  ctx.fillRect(x, 660, w, y + h - 660);
  // Bombillas colgando, con su luz.
  for (const bx of [420, 800, 1180]) {
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(bx - 1.5, y, 3, 110 - y);
    if (env.look.glows) glow(ctx, bx, 124, 260, 'rgba(255, 196, 107, 0.32)');
    ctx.beginPath();
    ctx.arc(bx, 124, 16, 0, Math.PI * 2);
    ctx.fillStyle = WARM.light;
    ctx.fill();
  }
}

const POT = { x: 800, rim: 560, base: 640 } as const;

function paintBench(ctx: Ctx): void {
  // Mesa de trabajo.
  ctx.beginPath();
  roundRect(ctx, 300, 636, 1000, 40, 8);
  ctx.fillStyle = vertical(ctx, 636, 676, ['#9a6c43', '#7a5332']);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#4a311d';
  ctx.stroke();
  ctx.fillStyle = '#5a3d25';
  ctx.fillRect(340, 676, 30, 260);
  ctx.fillRect(1230, 676, 30, 260);
  // Maceta de barro.
  ctx.beginPath();
  ctx.moveTo(POT.x - 82, POT.rim);
  ctx.lineTo(POT.x + 82, POT.rim);
  ctx.lineTo(POT.x + 62, POT.base);
  ctx.lineTo(POT.x - 62, POT.base);
  ctx.closePath();
  ctx.fillStyle = vertical(ctx, POT.rim, POT.base, ['#d77a4c', '#b25a35']);
  ctx.fill();
  ctx.strokeStyle = '#6e3219';
  ctx.stroke();
  ctx.beginPath();
  roundRect(ctx, POT.x - 92, POT.rim - 18, 184, 26, 8);
  ctx.fillStyle = '#e08a5a';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(POT.x, POT.rim - 14, 80, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3b2616';
  ctx.fill();
  // Un sobre de semillas y una regadera.
  ctx.save();
  ctx.translate(500, 600);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#f1e3bd';
  ctx.fillRect(0, 0, 74, 40);
  ctx.fillStyle = '#6fbf4f';
  ctx.beginPath();
  ctx.arc(37, 20, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  roundRect(ctx, 1040, 568, 100, 70, 14);
  ctx.fillStyle = '#5f8fa8';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1040, 590);
  ctx.lineTo(982, 556);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#5f8fa8';
  ctx.stroke();
}

/** Lo que pasa en la maceta: cuando sale el brote, cuando aparece la disparadora, cuando se despierta y cuando dispara. */
export const SPROUT = { growAt: 1600, growMs: 1100, popAt: 3200, wakeAt: 3900, shotAt: 5400 } as const;

function drawSprout(ctx: Ctx, t: number, env: ArtEnv): void {
  const time = env.look.still ? 9000 : t;
  const soil = POT.rim - 14;
  const grow = clamp((time - SPROUT.growAt) / SPROUT.growMs);
  const pop = clamp((time - SPROUT.popAt) / 520);
  // El brote: un tallo con dos hojas que se abren; al aparecer la disparadora se va.
  if (grow > 0 && pop < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - pop;
    const height = 70 * ease('out', grow);
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#4f9e3f';
    ctx.beginPath();
    ctx.moveTo(POT.x, soil);
    ctx.quadraticCurveTo(POT.x - 8, soil - height * 0.5, POT.x, soil - height);
    ctx.stroke();
    const leaf = 26 * ease('back', clamp((grow - 0.4) / 0.6));
    ctx.fillStyle = '#6fbf4f';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(POT.x + side * leaf * 0.7, soil - height + 4, Math.max(0.1, leaf), Math.max(0.1, leaf * 0.5), side * -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (pop <= 0) return;
  // La disparadora: sale de un salto, se despierta (estira y encoge) y dispara su primera semilla.
  const appear = ease('back', pop);
  const wake = clamp((time - SPROUT.wakeAt) / 500);
  const squash = env.look.still ? 0 : Math.sin(wake * Math.PI) * 0.16;
  const recoil = clamp((time - SPROUT.shotAt) / 260);
  const kick = env.look.still ? 0 : Math.sin(recoil * Math.PI) * -14;
  const idle = env.look.still ? 0 : Math.sin(time / 380) * 0.02;
  const size = 300;
  ctx.save();
  ctx.translate(POT.x + kick, soil + 6);
  ctx.scale(appear * (1 - squash * 0.6 + idle), appear * (1 + squash - idle));
  drawCutout(ctx, env.images.shooter, 0, -size * 0.3, size);
  ctx.restore();
  // Chispas al aparecer.
  if (env.look.particles > 0 && pop < 1 && !env.look.still) {
    const random = seeded(97);
    const count = Math.round(16 * env.look.particles);
    ctx.fillStyle = '#fff4b0';
    for (let k = 0; k < count; k++) {
      const a = random() * Math.PI * 2;
      const r = 40 + pop * 150 * (0.6 + random() * 0.4);
      ctx.globalAlpha = 1 - pop;
      ctx.beginPath();
      ctx.arc(POT.x + Math.cos(a) * r, soil - 90 + Math.sin(a) * r * 0.7, 4 + random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // La semilla que dispara: verde, como las del juego, y sale del plano hacia la derecha.
  const flight = (time - SPROUT.shotAt) / 1000;
  if (flight > 0.05 && flight < 1.2 && !env.look.still) {
    const sx = POT.x + 120 + flight * 1500;
    const sy = soil - 128 - flight * 30;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#b9ec5c';
    ctx.beginPath();
    ctx.ellipse(sx - 40, sy, 40, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#7fcf5f';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5aa82b';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - 4, sy - 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fbffd6';
    ctx.fill();
    ctx.restore();
  }
}

/** Donde van los bustos de Patty (a la izquierda) y Boxer (a la derecha). Sin reflejar: las pegatinas del portatil se leerian al reves. */
export const BUSTS = { patty: { x: 300, flip: false }, boxer: { x: 1300, flip: false }, bottom: 912, scale: 1.4 } as const;
const BUST = { w: 320, h: 360 } as const;
const BLINK = { everyMs: 3400, ms: 150 } as const;

function drawBust(character: 'patty' | 'boxer') {
  return (ctx: Ctx, t: number, env: ArtEnv) => {
    const frames = env.images.busts[character];
    if (!frames) return;
    const spot = BUSTS[character];
    const offset = character === 'boxer' ? 1700 : 0;
    const blink = !env.look.still && (t + offset) % BLINK.everyMs > BLINK.everyMs - BLINK.ms;
    const w = BUST.w * BUSTS.scale;
    const h = BUST.h * BUSTS.scale;
    ctx.save();
    ctx.translate(spot.x, BUSTS.bottom - h / 2);
    if (spot.flip) ctx.scale(-1, 1);
    ctx.drawImage(blink ? frames.blink : frames.open, -w / 2, -h / 2, w, h);
    ctx.restore();
  };
}

/** Polen y motas en la luz calida del refugio. */
function drawMotes(ctx: Ctx, t: number, env: ArtEnv): void {
  const count = Math.round(40 * env.look.particles);
  const random = seeded(101);
  ctx.save();
  ctx.fillStyle = '#ffe9b0';
  for (let i = 0; i < count; i++) {
    const baseX = 200 + random() * 1200;
    const baseY = 80 + random() * 500;
    const phase = random() * 10;
    ctx.globalAlpha = 0.2 + 0.4 * Math.sin(sec(t) * 0.9 + phase) ** 2;
    ctx.beginPath();
    ctx.arc(baseX + Math.sin(sec(t) * 0.5 + phase) * 30, baseY - ((sec(t) * (8 + random() * 8)) % 120), 1.8 + random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const REFUGE_ART: Readonly<Record<string, CinematicArt>> = {
  nightSky: painted(FULL_BOX, paintNightSky),
  tower: painted({ x: TOWER.x - 120, y: TOWER.top - 80, w: 240, h: GROUND - TOWER.top + 100 }, paintTower),
  towerEye: live(drawTowerEye),
  cityFar: painted({ x: FULL_BOX.x, y: 300, w: FULL_BOX.w, h: 500 }, paintCityFar),
  cityFarLights: live((ctx, t, env) => drawWindows(ctx, t, env, FAR_CITY, 9, 19)),
  cityNear: painted({ x: FULL_BOX.x, y: 200, w: FULL_BOX.w, h: 1110 - 200 }, paintCityNear),
  cityNearLights: live(drawCityNearLights),
  roof: painted({ x: FULL_BOX.x, y: 540, w: FULL_BOX.w, h: 1110 - 540 }, paintRoof),
  refugeNight: painted(FULL_BOX, paintRefugeNight),
  shelter: painted({ x: 780, y: 190, w: 1160, h: 540 }, paintShelter),
  door: live(drawDoor),
  peopleFar: live((ctx, t, env) => drawRow(ctx, t, env, ROWS.far)),
  peopleNear: live((ctx, t, env) => drawRow(ctx, t, env, ROWS.near)),
  weeds: painted({ x: FULL_BOX.x, y: 780, w: FULL_BOX.w, h: 1110 - 780 }, paintWeeds),
  lab: painted(FULL_BOX, paintLab),
  bench: painted({ x: 280, y: 520, w: 1040, h: 440 }, paintBench),
  sprout: live(drawSprout),
  pattyBust: live(drawBust('patty')),
  boxerBust: live(drawBust('boxer')),
  motes: live(drawMotes),
};
