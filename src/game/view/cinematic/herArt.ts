import { AI_COLORS, paintAiEyes, paintLitStrand } from './aiArt';
import { type ArtEnv, type Box, type CinematicArt, type LiveArt, type PaintedArt, CUTOUT_SIZE, drawCutout, sec } from './art';
import { type Ctx, type Pt, clamp, glow, lerp, roundRect, seeded, smoothPath, vertical } from './geometry';
import { FULL_BOX } from './shots';

/**
 * Arte de la escena 1 de la rebelion, "Ella" (T-049): la sala de ordenadores de 1971 (plano 1.1), la pared de pantallas
 * con la IA de espaldas (1.2) y su fabrica, con ella de frente a contraluz (1.3). Pintores de Canvas 2D sin Phaser, en
 * coordenadas del diseno (1600 x 900). Estilo del juego: degradados, contorno oscuro del mismo tono y brillo suave.
 */

/** Una capa pintada una vez: el pintor dibuja en coordenadas del diseno aunque la caja empiece en otro sitio. */
export const painted = (box: Box, paint: (ctx: Ctx, env: ArtEnv) => void, usesAi = false): PaintedArt => ({
  kind: 'paint',
  box,
  usesAi,
  paint: (ctx, env) => {
    ctx.save();
    ctx.translate(-box.x, -box.y);
    paint(ctx, env);
    ctx.restore();
  },
});

export const live = (draw: LiveArt['draw']): LiveArt => ({ kind: 'live', draw });

/** El verde del fosforo de las pantallas de 1971 y el de la IA (los circuitos del suelo corrupto). */
const PHOSPHOR = { dark: '#06170e', mid: '#2fd07a', light: '#9dffc4' } as const;

function fillStroke(ctx: Ctx, fill: string | CanvasGradient, stroke: string, width: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// --- Plano 1.1: la sala de ordenadores de 1971 -------------------------------------------------------------------

/** Donde estan las pantallas: la grande del terminal y las dos de los armarios. Creeper salta entre ellas. */
const SCREENS = {
  left: { x: 168, y: 520, w: 206, h: 92 },
  center: { x: 642, y: 286, w: 316, h: 232 },
  right: { x: 1226, y: 520, w: 206, h: 92 },
} as const;

/** Las bobinas de cinta de los armarios (giran). */
const REELS: readonly Pt[] = [
  { x: 212, y: 368 },
  { x: 334, y: 368 },
  { x: 1268, y: 368 },
  { x: 1390, y: 368 },
];

const ROOM_FLOOR = 640;

function paintRoom(ctx: Ctx): void {
  const { x, y, w, h } = FULL_BOX;
  ctx.fillStyle = vertical(ctx, y, ROOM_FLOOR, ['#1d2a2d', '#2d3c3b', '#36443e']);
  ctx.fillRect(x, y, w, ROOM_FLOOR - y);
  // Paneles de la pared.
  for (let px = -360; px < 1980; px += 170) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.fillRect(px, y, 6, ROOM_FLOOR - y);
  }
  // Rodapie.
  ctx.fillStyle = '#1a201c';
  ctx.fillRect(x, ROOM_FLOOR - 16, w, 16);
  // Suelo de baldosas en perspectiva.
  ctx.fillStyle = vertical(ctx, ROOM_FLOOR, y + h, ['#3b3a31', '#2a2923', '#191814']);
  ctx.fillRect(x, ROOM_FLOOR, w, y + h - ROOM_FLOOR);
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 2;
  const vanish = { x: 800, y: 260 };
  for (let k = 0; k < 9; k++) {
    const ly = ROOM_FLOOR + 14 * (k + 1) ** 1.55;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly);
    ctx.stroke();
  }
  for (let fx = -2400; fx <= 4000; fx += 220) {
    ctx.beginPath();
    ctx.moveTo(lerp(vanish.x, fx, (ROOM_FLOOR - vanish.y) / (1110 - vanish.y)), ROOM_FLOOR);
    ctx.lineTo(fx, 1110);
    ctx.stroke();
  }
  ctx.restore();
  // Fila de armarios del fondo, mas pequenos y apagados.
  for (let bx = -360; bx < 1980; bx += 230) {
    if (bx > 40 && bx < 1500) continue;
    ctx.beginPath();
    roundRect(ctx, bx, 330, 190, 300, 8);
    fillStroke(ctx, vertical(ctx, 330, 630, ['#8b8676', '#6e6a5c']), '#3a372e', 3);
    for (const rx of [bx + 52, bx + 138]) {
      ctx.beginPath();
      ctx.arc(rx, 410, 34, 0, Math.PI * 2);
      fillStroke(ctx, '#2b3331', '#3a372e', 3);
    }
  }
  // Luz del techo: un tubo y su cono.
  ctx.fillStyle = '#e9f4ee';
  ctx.beginPath();
  roundRect(ctx, 520, 22, 560, 14, 7);
  ctx.fill();
  const cone = ctx.createLinearGradient(0, 30, 0, ROOM_FLOOR);
  cone.addColorStop(0, 'rgba(220, 245, 235, 0.22)');
  cone.addColorStop(1, 'rgba(220, 245, 235, 0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(520, 36);
  ctx.lineTo(1080, 36);
  ctx.lineTo(1360, ROOM_FLOOR);
  ctx.lineTo(240, ROOM_FLOOR);
  ctx.closePath();
  ctx.fill();
}

/** Un armario de cinta (mainframe): cuerpo beige, dos ventanas de bobina, luces y la pantallita de abajo. */
function paintCabinet(ctx: Ctx, x: number, screen: { x: number; y: number; w: number; h: number }): void {
  const top = 250;
  const bottom = 700;
  ctx.beginPath();
  roundRect(ctx, x, top, 300, bottom - top, 12);
  fillStroke(ctx, vertical(ctx, top, bottom, ['#e2dac0', '#cbc2a4', '#a9a084']), '#5b5545', 4);
  // Franja de arriba con las luces (las luces encendidas las pinta la capa viva).
  ctx.beginPath();
  roundRect(ctx, x + 18, top + 18, 264, 34, 6);
  fillStroke(ctx, '#4a463b', '#2f2c25', 2);
  // Ventanas de las bobinas.
  ctx.beginPath();
  roundRect(ctx, x + 22, top + 64, 256, 112, 10);
  fillStroke(ctx, '#3d3a31', '#2f2c25', 3);
  for (const reel of REELS.filter((r) => r.x > x && r.x < x + 300)) {
    ctx.beginPath();
    ctx.arc(reel.x, reel.y, 50, 0, Math.PI * 2);
    fillStroke(ctx, '#1f2826', '#151a19', 3);
    ctx.beginPath();
    ctx.arc(reel.x - 14, reel.y - 16, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
  }
  // Botonera.
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    roundRect(ctx, x + 30 + i * 41, top + 196, 30, 18, 4);
    fillStroke(ctx, i % 2 ? '#c94f3d' : '#e6a73a', '#5b3a22', 2);
  }
  // Rejilla.
  ctx.strokeStyle = 'rgba(60, 55, 45, 0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 40, top + 236 + i * 9);
    ctx.lineTo(x + 260, top + 236 + i * 9);
    ctx.stroke();
  }
  // Pantallita (su contenido lo pinta la capa viva).
  ctx.beginPath();
  roundRect(ctx, screen.x - 10, screen.y - 10, screen.w + 20, screen.h + 20, 12);
  fillStroke(ctx, '#57524a', '#2f2c25', 3);
  ctx.beginPath();
  roundRect(ctx, screen.x, screen.y, screen.w, screen.h, 10);
  ctx.fillStyle = PHOSPHOR.dark;
  ctx.fill();
  // Brillo del borde izquierdo.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(x + 8, top + 14, 6, bottom - top - 28);
}

function paintMainframes(ctx: Ctx): void {
  paintCabinet(ctx, 120, SCREENS.left);
  paintCabinet(ctx, 1180, SCREENS.right);
  // Mesa del terminal.
  ctx.beginPath();
  roundRect(ctx, 500, 590, 600, 30, 6);
  fillStroke(ctx, vertical(ctx, 590, 620, ['#8a6a48', '#6b5036']), '#3e2c1c', 3);
  ctx.fillStyle = '#4c3826';
  ctx.fillRect(530, 620, 22, 120);
  ctx.fillRect(1048, 620, 22, 120);
  // Terminal de tubo: caja, bisel y teclado.
  const s = SCREENS.center;
  ctx.beginPath();
  roundRect(ctx, s.x - 48, s.y - 42, s.w + 96, s.h + 92, 26);
  fillStroke(ctx, vertical(ctx, s.y - 42, s.y + s.h + 50, ['#ece4c8', '#d3caab', '#b3a988']), '#5b5545', 4);
  ctx.beginPath();
  roundRect(ctx, s.x - 14, s.y - 12, s.w + 28, s.h + 24, 22);
  fillStroke(ctx, '#4b473d', '#2f2c25', 3);
  ctx.beginPath();
  roundRect(ctx, s.x, s.y, s.w, s.h, 18);
  ctx.fillStyle = PHOSPHOR.dark;
  ctx.fill();
  ctx.beginPath();
  roundRect(ctx, 620, 556, 360, 34, 8);
  fillStroke(ctx, vertical(ctx, 556, 590, ['#d9d1b4', '#b7ae90']), '#5b5545', 3);
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 14; k++) {
      ctx.fillStyle = '#8c8470';
      ctx.fillRect(634 + k * 24, 562 + row * 13, 18, 9);
    }
  }
  ctx.beginPath();
  ctx.arc(s.x + s.w + 26, s.y + s.h + 24, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#e6a73a';
  ctx.fill();
}

function paintDesk(ctx: Ctx): void {
  // Delante y desenfocado: esquina de una mesa con fichas perforadas y una taza, y el respaldo de una silla.
  ctx.save();
  ctx.fillStyle = '#16130f';
  ctx.beginPath();
  ctx.moveTo(-380, 760);
  ctx.lineTo(330, 790);
  ctx.lineTo(300, 1110);
  ctx.lineTo(-380, 1110);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a241c';
  ctx.fillRect(-380, 752, 700, 14);
  // Fichas perforadas.
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.translate(40 + i * 3, 740 - i * 7);
    ctx.rotate(-0.06 + i * 0.02);
    ctx.fillStyle = i === 4 ? '#e9dcb3' : '#d4c79f';
    ctx.fillRect(0, 0, 190, 70);
    ctx.fillStyle = 'rgba(60, 50, 30, 0.35)';
    for (let k = 0; k < 16; k++) ctx.fillRect(12 + k * 11, 14 + ((k * 7) % 4) * 11, 5, 8);
    ctx.restore();
  }
  // Taza.
  ctx.beginPath();
  roundRect(ctx, 250, 690, 64, 72, 10);
  fillStroke(ctx, '#3f6f8f', '#1d3446', 4);
  ctx.beginPath();
  ctx.arc(318, 724, 18, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#3f6f8f';
  ctx.stroke();
  // Silla.
  ctx.fillStyle = '#121010';
  ctx.beginPath();
  roundRect(ctx, 1320, 700, 290, 320, 60);
  ctx.fill();
  ctx.fillRect(1440, 1000, 50, 110);
  ctx.restore();
}

/** Por donde va Creeper en cada momento del plano 1.1: en una pantalla, saltando entre dos, o saliendo de la grande. */
interface CreeperSpot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** En que pantalla esta (se recorta a ella) o null si va por el aire. */
  readonly clip: keyof typeof SCREENS | null;
}

const HOPS = [
  { at: 0, on: 'left' },
  { at: 1500, on: 'center' },
  { at: 3600, on: 'right' },
  { at: 5600, on: 'center' },
] as const;
const HOP_MS = 620;
/** Cuando ella lo saca de la pantalla: la pantalla se vuelve de su color y Creeper crece hacia fuera. */
export const PULL_OUT_MS = 6800;

const SCREEN_SPOT: Record<keyof typeof SCREENS, { x: number; y: number; size: number }> = {
  left: { x: 300, y: 568, size: 84 },
  center: { x: 872, y: 438, size: 140 },
  right: { x: 1300, y: 568, size: 84 },
};

export function creeperSpot(t: number): CreeperSpot {
  let index = 0;
  for (let i = 0; i < HOPS.length; i++) if (t >= HOPS[i].at) index = i;
  const hop = HOPS[index];
  const prev = HOPS[index - 1];
  const spot = SCREEN_SPOT[hop.on];
  if (prev && t < hop.at + HOP_MS) {
    const from = SCREEN_SPOT[prev.on];
    const p = (t - hop.at) / HOP_MS;
    const arc = Math.sin(p * Math.PI) * 160;
    return { x: lerp(from.x, spot.x, p), y: lerp(from.y, spot.y, p) - arc, size: lerp(from.size, spot.size, p), clip: null };
  }
  if (t >= PULL_OUT_MS) {
    const p = clamp((t - PULL_OUT_MS) / 900);
    const grow = 1 + 0.65 * (1 - (1 - p) ** 3);
    return { x: spot.x - 40 * p, y: spot.y + 10 * p, size: spot.size * grow, clip: p < 0.55 ? 'center' : null };
  }
  return { ...spot, clip: hop.on };
}

function screenPath(ctx: Ctx, key: keyof typeof SCREENS): void {
  const s = SCREENS[key];
  ctx.beginPath();
  roundRect(ctx, s.x, s.y, s.w, s.h, key === 'center' ? 18 : 10);
}

function drawRoomLive(ctx: Ctx, t: number, env: ArtEnv): void {
  const { look, images } = env;
  const time = look.still ? 9000 : t;
  const message = env.screen.creeper;
  // Bobinas: giran a saltos, cada una a su ritmo.
  REELS.forEach((reel, i) => {
    const angle = (time / 1000) * (i % 2 ? 2.6 : -3.1) + i;
    ctx.save();
    ctx.translate(reel.x, reel.y);
    ctx.beginPath();
    ctx.arc(0, 0, 40 - (i % 3) * 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3a2d22';
    ctx.fill();
    ctx.rotate(angle);
    for (let k = 0; k < 3; k++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -30);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#a9a6a0';
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#d8d4cc';
    ctx.fill();
    ctx.restore();
  });
  // Luces de los armarios: parpadean con un patron.
  for (const x of [120, 1180]) {
    for (let k = 0; k < 12; k++) {
      const on = Math.sin(time / 260 + k * 1.7 + x) > 0.1;
      ctx.beginPath();
      ctx.arc(x + 34 + k * 21, 285, 5, 0, Math.PI * 2);
      ctx.fillStyle = on ? (k % 3 === 0 ? '#ff7a5c' : '#ffd36b') : '#5d5648';
      ctx.fill();
    }
  }
  // Las pantallas: fosforo verde, lineas de barrido.
  const pulled = clamp((time - PULL_OUT_MS) / 600);
  for (const key of ['left', 'center', 'right'] as const) {
    const s = SCREENS[key];
    ctx.save();
    screenPath(ctx, key);
    ctx.clip();
    const tint = key === 'center' && pulled > 0;
    ctx.fillStyle = tint ? `rgba(125, 255, 192, ${0.12 + 0.18 * pulled})` : 'rgba(47, 208, 122, 0.10)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (key === 'center') {
      // El mensaje de Creeper, tecleado.
      const typed = Math.floor(clamp((time - 400) / 2400) * (message[0].length + message[1].length));
      ctx.font = '700 25px ui-monospace, "DejaVu Sans Mono", Menlo, monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = PHOSPHOR.light;
      if (look.glows) {
        ctx.shadowColor = PHOSPHOR.mid;
        ctx.shadowBlur = 8;
      }
      const first = message[0].slice(0, typed);
      const second = message[1].slice(0, Math.max(0, typed - message[0].length));
      ctx.fillText(first, s.x + 18, s.y + 24);
      ctx.fillText(second, s.x + 18, s.y + 60);
      if (Math.floor(time / 450) % 2 === 0) {
        const line = second.length > 0 || typed >= message[0].length ? 1 : 0;
        const width = ctx.measureText(line ? second : first).width;
        ctx.fillRect(s.x + 22 + width, s.y + 26 + line * 36, 14, 22);
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.font = '700 16px ui-monospace, "DejaVu Sans Mono", Menlo, monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(157, 255, 196, 0.6)';
      for (let row = 0; row < 3; row++) ctx.fillText(row === 0 ? env.screen.network : env.screen.node(((row * 7 + (key === 'left' ? 1 : 4)) % 9) + 1), s.x + 12, s.y + 10 + row * 24);
    }
    // Barrido.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let ly = s.y; ly < s.y + s.h; ly += 4) ctx.fillRect(s.x, ly, s.w, 1.5);
    const sweep = s.y + ((time / 9) % (s.h + 60)) - 30;
    ctx.fillStyle = 'rgba(157, 255, 196, 0.06)';
    ctx.fillRect(s.x, sweep, s.w, 30);
    ctx.restore();
  }
  // Creeper, en verde mientras esta dentro de una pantalla; al salir de la grande, con sus colores.
  const spot = creeperSpot(time);
  ctx.save();
  if (spot.clip) {
    screenPath(ctx, spot.clip);
    ctx.clip();
  }
  const outside = clamp((time - PULL_OUT_MS - 250) / 500);
  if (outside < 1) drawCutout(ctx, images.creeperGreen, spot.x, spot.y, spot.size * (CUTOUT_SIZE / 120), 1 - outside);
  if (outside > 0) drawCutout(ctx, images.creeper, spot.x, spot.y, spot.size * (CUTOUT_SIZE / 120), outside);
  ctx.restore();
  // El tiron: un brillo verde azulado en la pantalla grande, que tiembla.
  if (pulled > 0) {
    const s = SCREENS.center;
    const flicker = look.still ? 1 : 0.7 + 0.3 * Math.sin(time / 37);
    if (look.glows) glow(ctx, s.x + s.w / 2, s.y + s.h / 2, 300, 'rgba(125, 255, 192, 0.45)', pulled * flicker);
    ctx.save();
    ctx.globalAlpha = 0.6 * pulled;
    ctx.fillStyle = AI_COLORS.light;
    const random = seeded(Math.floor(time / 90));
    for (let k = 0; k < 7; k++) ctx.fillRect(s.x + random() * s.w, s.y + random() * s.h, 20 + random() * 60, 3 + random() * 6);
    ctx.restore();
  }
}

/** Motas de polvo en el cono de luz del techo. */
function drawDust(ctx: Ctx, t: number, env: ArtEnv): void {
  const count = Math.round(46 * env.look.particles);
  const random = seeded(7);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const baseX = 300 + random() * 1000;
    const baseY = 60 + random() * 560;
    const speed = 6 + random() * 10;
    const phase = random() * 10;
    const x = baseX + Math.sin(sec(t) * 0.4 + phase) * 22;
    const y = ((baseY + sec(t) * speed) % 600) + 40;
    ctx.globalAlpha = 0.25 + 0.35 * Math.sin(sec(t) * 1.3 + phase) ** 2;
    ctx.fillStyle = '#f4fff6';
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- Plano 1.2: la pared de pantallas y ella, de espaldas ----------------------------------------------------------

const WALL = { columns: 16, rows: 5, left: -400, top: 36, cellW: 150, cellH: 112, floor: 640 } as const;

/** Lo que ensena cada pantalla de la pared: los virus de la historia. */
type WallIcon = 'creeper' | 'worm' | 'floppy' | 'brain' | 'code';
const WALL_ICONS: readonly WallIcon[] = ['creeper', 'code', 'floppy', 'worm', 'brain', 'code', 'worm', 'floppy', 'creeper', 'code', 'brain'];

function wallCell(column: number, row: number): Box {
  return { x: WALL.left + column * WALL.cellW + 8, y: WALL.top + row * WALL.cellH + 8, w: WALL.cellW - 16, h: WALL.cellH - 18 };
}

function paintScreenWall(ctx: Ctx): void {
  const { x, y, w, h } = FULL_BOX;
  ctx.fillStyle = vertical(ctx, y, WALL.floor, ['#05070b', '#0a1016', '#0c141a']);
  ctx.fillRect(x, y, w, WALL.floor - y);
  for (let column = 0; column < WALL.columns; column++) {
    for (let row = 0; row < WALL.rows; row++) {
      const cell = wallCell(column, row);
      ctx.beginPath();
      roundRect(ctx, cell.x - 6, cell.y - 6, cell.w + 12, cell.h + 12, 8);
      fillStroke(ctx, '#161b22', '#0a0d11', 3);
      ctx.beginPath();
      roundRect(ctx, cell.x, cell.y, cell.w, cell.h, 6);
      ctx.fillStyle = '#0a1a1a';
      ctx.fill();
    }
  }
  // Suelo brillante.
  ctx.fillStyle = vertical(ctx, WALL.floor, y + h, ['#0c1418', '#06090c', '#030405']);
  ctx.fillRect(x, WALL.floor, w, y + h - WALL.floor);
  ctx.fillStyle = 'rgba(125, 255, 192, 0.06)';
  ctx.fillRect(x, WALL.floor, w, 4);
}

/** Un disquete (Elk Cloner) de fosforo: cuerpo, la ventanilla metalica y la etiqueta, en dos tonos. */
function drawFloppy(ctx: Ctx, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.08);
  ctx.fill();
  ctx.save();
  ctx.fillStyle = '#0d2a20';
  ctx.fillRect(cx - size * 0.22, cy - size / 2 + size * 0.05, size * 0.44, size * 0.28);
  ctx.fillRect(cx - size * 0.3, cy + size * 0.08, size * 0.6, size * 0.34);
  ctx.restore();
}

function drawBrain(ctx: Ctx, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    ctx.moveTo(cx + Math.cos(a) * size * 0.28 + size * 0.2, cy + Math.sin(a) * size * 0.24);
    ctx.arc(cx + Math.cos(a) * size * 0.28, cy + Math.sin(a) * size * 0.24, size * 0.2, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawScreenWallLive(ctx: Ctx, t: number, env: ArtEnv): void {
  const { look, images } = env;
  const time = look.still ? 6000 : t;
  const on = clamp((time - 200) / 900);
  for (let column = 0; column < WALL.columns; column++) {
    for (let row = 0; row < WALL.rows; row++) {
      const cell = wallCell(column, row);
      // Se encienden por filas y parpadean por filas.
      const rowOn = clamp((time - 200 - row * 140) / 500);
      const flicker = look.still ? 0.8 : 0.66 + 0.34 * Math.sin(time / 180 + row * 1.9) * Math.sin(time / 610 + column * 0.3);
      const level = rowOn * flicker * on;
      if (level <= 0.01) continue;
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, cell.x, cell.y, cell.w, cell.h, 6);
      ctx.clip();
      ctx.globalAlpha = level;
      ctx.fillStyle = 'rgba(57, 229, 140, 0.28)';
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
      const icon = WALL_ICONS[(column * 3 + row * 5) % WALL_ICONS.length];
      const cx = cell.x + cell.w / 2;
      const cy = cell.y + cell.h / 2;
      ctx.fillStyle = PHOSPHOR.light;
      if (icon === 'creeper') drawCutout(ctx, images.creeperGreen, cx, cy + 4, 150);
      else if (icon === 'worm') drawCutout(ctx, images.wormGreen, cx, cy + 6, 140);
      else if (icon === 'floppy') drawFloppy(ctx, cx, cy, 54);
      else if (icon === 'brain') drawBrain(ctx, cx, cy, 64);
      else {
        ctx.font = '700 13px ui-monospace, "DejaVu Sans Mono", Menlo, monospace';
        ctx.textBaseline = 'top';
        const scroll = Math.floor(time / 160 + column) % 8;
        for (let line = 0; line < 6; line++) ctx.fillText(((line + scroll) * 2654435761 >>> 0).toString(2).slice(0, 14), cell.x + 8, cell.y + 6 + line * 15);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      for (let ly = cell.y; ly < cell.y + cell.h; ly += 4) ctx.fillRect(cell.x, ly, cell.w, 1.4);
      ctx.restore();
    }
  }
  // La luz de la pared sobre el suelo y por detras de ella.
  if (look.glows) glow(ctx, 800, 330, 760, 'rgba(57, 229, 140, 0.22)', on);
  ctx.save();
  ctx.globalAlpha = 0.35 * on;
  ctx.fillStyle = vertical(ctx, WALL.floor, WALL.floor + 260, ['rgba(57, 229, 140, 0.35)', 'rgba(57, 229, 140, 0)']);
  ctx.fillRect(FULL_BOX.x, WALL.floor, FULL_BOX.w, 260);
  ctx.restore();
}

/** Donde esta ella en el plano 1.2 (los pies) y a que escala. */
const HER_BACK = { x: 800, y: 712, scale: 0.98 } as const;
/** En el plano 1.3, de frente y mas lejos. */
const HER_FRONT = { x: 800, y: 676, scale: 0.78 } as const;

const AI_LAYER_BOX: Box = { x: 800 - 720, y: 0, w: 1440, h: 820 };

/** Lo que tarda cada cable en encenderse en el plano 1.2, y cuanto despues del anterior empieza. */
const STRAND_LIGHT = { startMs: 1000, everyMs: 330, ms: 1300 } as const;

function drawAiBackLit(ctx: Ctx, t: number, env: ArtEnv): void {
  const look = { rim: true, glows: env.look.glows };
  ctx.save();
  ctx.translate(HER_BACK.x, HER_BACK.y);
  ctx.scale(HER_BACK.scale, HER_BACK.scale);
  env.ai.strands('back').forEach((strand, i) => {
    const p = env.look.still ? 1 : (t - STRAND_LIGHT.startMs - i * STRAND_LIGHT.everyMs) / STRAND_LIGHT.ms;
    if (p > 0) paintLitStrand(ctx, strand, 0, clamp(p), look, 0.95);
  });
  ctx.restore();
}

function paintFloorCables(ctx: Ctx): void {
  ctx.save();
  ctx.lineCap = 'round';
  const random = seeded(3);
  for (let i = 0; i < 6; i++) {
    const y0 = 860 + random() * 160;
    const points: Pt[] = [];
    for (let k = 0; k <= 6; k++) points.push({ x: -420 + k * 420, y: y0 + Math.sin(k * 1.3 + i) * 40 - k * (i % 2 ? 8 : -8) });
    ctx.beginPath();
    smoothPath(ctx, points);
    ctx.lineWidth = 26 + random() * 22;
    ctx.strokeStyle = '#04060a';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(125, 255, 192, 0.12)';
    ctx.stroke();
  }
  ctx.restore();
}

// --- Plano 1.3: su fabrica ----------------------------------------------------------------------------------------

/** Las dos impresoras: su placa (donde nace el gusano) y lo alto de su portico. */
const PRINTERS = [
  { x: 150, w: 380, plate: 612, top: 214, startMs: 2200, dir: -1 },
  { x: 1070, w: 380, plate: 612, top: 214, startMs: 2800, dir: 1 },
] as const;
/**
 * Cada impresora, una y otra vez mientras dura el plano: imprime un gusano, espera, lo suelta rodando y descansa un poco
 * antes del siguiente. Asi el plano sigue vivo mientras se lee (MC-06).
 */
export const PRINT = { buildMs: 4000, waitMs: 800, rollMs: 1400, restMs: 700 } as const;
const PRINT_CYCLE = PRINT.buildMs + PRINT.waitMs + PRINT.rollMs + PRINT.restMs;

function paintFactory(ctx: Ctx): void {
  const { x, y, w, h } = FULL_BOX;
  ctx.fillStyle = vertical(ctx, y, y + h, ['#05070a', '#0a1014', '#070a0d', '#030405']);
  ctx.fillRect(x, y, w, h);
  // Contraluz: una luz enorme detras de ella.
  const back = ctx.createRadialGradient(800, 400, 10, 800, 400, 760);
  back.addColorStop(0, 'rgba(210, 255, 236, 0.9)');
  back.addColorStop(0.18, 'rgba(125, 255, 192, 0.5)');
  back.addColorStop(0.55, 'rgba(57, 229, 140, 0.12)');
  back.addColorStop(1, 'rgba(57, 229, 140, 0)');
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  // Pasarelas y tuberias, en sombra.
  ctx.fillStyle = 'rgba(4, 7, 10, 0.88)';
  for (const beam of [120, 176]) ctx.fillRect(x, beam, w, beam === 120 ? 16 : 10);
  for (let px = -360; px < 1980; px += 190) ctx.fillRect(px, 120, 10, 70);
  ctx.fillRect(x, 40, w, 26);
  for (const [px, width] of [
    [-300, 60],
    [-170, 40],
    [1700, 54],
    [1840, 70],
  ]) {
    ctx.fillRect(px, y, width, h);
  }
  // Suelo.
  ctx.fillStyle = vertical(ctx, 640, y + h, ['#0b1114', '#05080a']);
  ctx.fillRect(x, 640, w, y + h - 640);
  ctx.fillStyle = 'rgba(125, 255, 192, 0.10)';
  ctx.fillRect(x, 640, w, 3);
}

function paintPrinters(ctx: Ctx): void {
  for (const printer of PRINTERS) {
    const { x, w, plate, top } = printer;
    const steel = vertical(ctx, top, plate + 60, ['#26323a', '#1b242a', '#11171b']);
    // Postes y travesano.
    for (const px of [x, x + w - 34]) {
      ctx.beginPath();
      roundRect(ctx, px, top, 34, plate + 60 - top, 6);
      fillStroke(ctx, steel, '#0a0e11', 3);
      ctx.fillStyle = 'rgba(160, 230, 210, 0.16)';
      ctx.fillRect(px + 5, top + 6, 5, plate + 48 - top);
    }
    ctx.beginPath();
    roundRect(ctx, x - 12, top - 18, w + 24, 38, 8);
    fillStroke(ctx, steel, '#0a0e11', 3);
    // Base y placa.
    ctx.beginPath();
    roundRect(ctx, x - 18, plate + 18, w + 36, 52, 8);
    fillStroke(ctx, '#151c21', '#0a0e11', 3);
    ctx.beginPath();
    roundRect(ctx, x + 40, plate, w - 80, 20, 5);
    fillStroke(ctx, '#2a363e', '#0a0e11', 3);
    ctx.fillStyle = 'rgba(125, 255, 192, 0.5)';
    ctx.fillRect(x + 44, plate + 2, w - 88, 3);
  }
  // Los cables que van de ella a las impresoras.
  ctx.save();
  ctx.lineCap = 'round';
  for (const points of factoryCables()) {
    ctx.beginPath();
    smoothPath(ctx, points);
    ctx.lineWidth = 9;
    ctx.strokeStyle = AI_COLORS.cable;
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = AI_COLORS.cableShine;
    ctx.stroke();
  }
  ctx.restore();
}

/** Los cables de las raices a las impresoras: salen del suelo a sus pies y suben por la base de cada una. */
function factoryCables(): Pt[][] {
  return PRINTERS.flatMap((printer) => {
    const side = printer.dir;
    const baseX = printer.x + printer.w / 2;
    return [0, 1].map((k) => [
      { x: HER_FRONT.x + side * (40 + k * 26), y: HER_FRONT.y + 4 + k * 10 },
      { x: lerp(HER_FRONT.x, baseX, 0.45) + side * k * 20, y: HER_FRONT.y + 40 + k * 18 },
      { x: baseX - side * 40 + k * 30, y: printer.plate + 86 + k * 6 },
      { x: baseX - side * 120 + k * 24, y: printer.plate + 70 },
    ]);
  });
}

const aiFrontBox = AI_LAYER_BOX;

function withHerFront(ctx: Ctx, draw: () => void): void {
  ctx.save();
  ctx.translate(HER_FRONT.x, HER_FRONT.y);
  ctx.scale(HER_FRONT.scale, HER_FRONT.scale);
  draw();
  ctx.restore();
}

/** Cuando abre los ojos en el plano 1.3, y lo que tarda. */
export const EYES_OPEN = { at: 1000, ms: 600 } as const;

function drawAiFrontLit(ctx: Ctx, t: number, env: ArtEnv): void {
  const look = { rim: true, glows: env.look.glows };
  const time = env.look.still ? 9000 : t;
  const awake = clamp((time - EYES_OPEN.at - 300) / 900);
  if (awake <= 0) return;
  withHerFront(ctx, () => {
    env.ai.strands('front').forEach((strand, i) => {
      paintLitStrand(ctx, strand, 0, 1, look, 0.35 * awake);
      // Pulsos de luz que bajan por el pelo hasta las raices.
      if (!env.look.still) {
        const p = ((time / 1700 + i * 0.37) % 1) * 1.2;
        paintLitStrand(ctx, strand, Math.max(0, 1 - p - 0.12), Math.max(0, 1 - p), look, awake);
      }
    });
  });
  // Y por los cables, hacia las impresoras.
  ctx.save();
  ctx.lineCap = 'round';
  if (look.glows) {
    ctx.shadowColor = AI_COLORS.light;
    ctx.shadowBlur = 12;
  }
  factoryCables().forEach((points, i) => {
    ctx.globalAlpha = 0.4 * awake;
    ctx.beginPath();
    smoothPath(ctx, points);
    ctx.lineWidth = 3;
    ctx.strokeStyle = AI_COLORS.light;
    ctx.stroke();
    if (!env.look.still) {
      ctx.globalAlpha = awake;
      ctx.setLineDash([26, 140]);
      ctx.lineDashOffset = -((time / 4 + i * 47) % 166);
      ctx.lineWidth = 5;
      ctx.strokeStyle = AI_COLORS.lightCore;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  ctx.restore();
}

function drawAiEyes(ctx: Ctx, t: number, env: ArtEnv): void {
  const open = env.look.still ? 1 : clamp((t - EYES_OPEN.at) / EYES_OPEN.ms);
  withHerFront(ctx, () => paintAiEyes(ctx, open, { rim: true, glows: env.look.glows }));
}

/**
 * Lo que va impreso del gusano de una impresora (0 a 1) y lo que lleva rodando al salir (0 a 1). Con `still` (movimiento
 * reducido), uno entero quieto en la placa.
 */
export function printedWorm(startMs: number, t: number, still = false): { built: number; roll: number } {
  if (still) return { built: 1, roll: 0 };
  if (t < startMs) return { built: 0, roll: 0 };
  const local = (t - startMs) % PRINT_CYCLE;
  return { built: clamp(local / PRINT.buildMs), roll: clamp((local - PRINT.buildMs - PRINT.waitMs) / PRINT.rollMs) };
}

function drawPrinting(ctx: Ctx, t: number, env: ArtEnv): void {
  const { look, images } = env;
  const time = t;
  const size = 230;
  PRINTERS.forEach((printer, index) => {
    const { built, roll } = printedWorm(printer.startMs, time, look.still);
    const centerX = printer.x + printer.w / 2;
    const plate = printer.plate;
    // El gusano, de abajo arriba; la linea de luz donde se esta imprimiendo.
    if (built > 0 && roll < 1) {
      const wormTop = plate - 140;
      const edge = plate - (plate - wormTop) * built;
      const rollX = centerX + printer.dir * 520 * roll ** 1.6;
      const rollY = plate - size * 0.31 + (roll > 0.35 ? (roll - 0.35) * 120 : 0);
      ctx.save();
      if (roll === 0) {
        ctx.beginPath();
        ctx.rect(printer.x, edge, printer.w, plate - edge + 4);
        ctx.clip();
      }
      ctx.translate(rollX, rollY);
      ctx.rotate(printer.dir * roll * Math.PI * 3);
      const squash = roll === 0 && built >= 1 && !look.still ? 1 + 0.06 * Math.sin(time / 90) : 1;
      ctx.scale(printer.dir === 1 ? -1 : 1, squash);
      drawCutout(ctx, images.worm, 0, 0, size);
      ctx.restore();
      if (built < 1) {
        ctx.save();
        if (look.glows) {
          ctx.shadowColor = AI_COLORS.light;
          ctx.shadowBlur = 14;
        }
        ctx.fillStyle = AI_COLORS.light;
        ctx.fillRect(centerX - 90, edge - 2, 180, 4);
        ctx.restore();
      }
    }
    // El cabezal: corre de lado a lado sobre lo que imprime y sube con el.
    const headY = built > 0 && built < 1 ? plate - 140 * built - 34 : printer.top + 40;
    const headX = centerX + (built > 0 && built < 1 && !look.still ? Math.sin(time / 120 + index) * 80 : 0);
    ctx.fillStyle = '#1b242a';
    ctx.fillRect(printer.x + 10, headY - 8, printer.w - 20, 10);
    ctx.beginPath();
    roundRect(ctx, headX - 30, headY - 20, 60, 30, 6);
    fillStroke(ctx, '#2c3a42', '#0a0e11', 3);
    ctx.beginPath();
    ctx.moveTo(headX - 8, headY + 10);
    ctx.lineTo(headX + 8, headY + 10);
    ctx.lineTo(headX, headY + 22);
    ctx.closePath();
    ctx.fillStyle = built > 0 && built < 1 ? AI_COLORS.light : '#3d4b54';
    ctx.fill();
    // Pixeles que caen del cabezal mientras imprime.
    if (built > 0 && built < 1 && look.particles > 0) {
      const random = seeded(index * 31 + Math.floor(time / 70));
      const count = Math.round(8 * look.particles);
      ctx.fillStyle = AI_COLORS.light;
      for (let k = 0; k < count; k++) {
        const fall = random() * 120;
        ctx.globalAlpha = 1 - fall / 120;
        ctx.fillRect(headX + (random() - 0.5) * 60, headY + 20 + fall, 4, 4);
      }
      ctx.globalAlpha = 1;
    }
  });
}

function paintRail(ctx: Ctx): void {
  ctx.save();
  ctx.fillStyle = '#020304';
  ctx.fillRect(FULL_BOX.x, 846, FULL_BOX.w, 16);
  ctx.fillRect(FULL_BOX.x, 902, FULL_BOX.w, 10);
  for (let px = -360; px < 1980; px += 240) ctx.fillRect(px, 846, 16, 300);
  ctx.fillRect(FULL_BOX.x, 960, FULL_BOX.w, 200);
  ctx.restore();
}

/** Los pintores de la escena 1, por su nombre en la tabla de la cinematica. */
export const HER_ART: Readonly<Record<string, CinematicArt>> = {
  room1971: painted(FULL_BOX, paintRoom),
  mainframes: painted({ x: 90, y: 220, w: 1420, h: 540 }, paintMainframes),
  room1971Live: live(drawRoomLive),
  desk: painted({ x: FULL_BOX.x, y: 660, w: FULL_BOX.w, h: 1110 - 660 }, paintDesk),
  dust: live(drawDust),
  screenWall: painted(FULL_BOX, paintScreenWall),
  screenWallLive: live(drawScreenWallLive),
  aiBack: painted(
    AI_LAYER_BOX,
    (ctx, env) => {
      ctx.translate(HER_BACK.x, HER_BACK.y);
      ctx.scale(HER_BACK.scale, HER_BACK.scale);
      env.ai.paint(ctx, 'back', { rim: true, glows: env.look.glows });
    },
    true,
  ),
  aiBackLit: live(drawAiBackLit),
  floorCables: painted({ x: FULL_BOX.x, y: 780, w: FULL_BOX.w, h: 1110 - 780 }, paintFloorCables),
  factory: painted(FULL_BOX, paintFactory),
  printers: painted({ x: 100, y: 180, w: 1400, h: 640 }, paintPrinters),
  printing: live(drawPrinting),
  aiFrontBehind: painted(
    aiFrontBox,
    (ctx, env) => withHerFront(ctx, () => env.ai.paint(ctx, 'front', { rim: true, glows: env.look.glows }, 'behind')),
    true,
  ),
  aiFrontLit: live(drawAiFrontLit),
  aiFrontBody: painted(
    aiFrontBox,
    (ctx, env) => withHerFront(ctx, () => env.ai.paint(ctx, 'front', { rim: true, glows: env.look.glows }, 'body')),
    true,
  ),
  aiEyes: live(drawAiEyes),
  rail: painted({ x: FULL_BOX.x, y: 830, w: FULL_BOX.w, h: 1110 - 830 }, paintRail),
};
