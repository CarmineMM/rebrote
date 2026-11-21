import type { CharacterDesign, Pose } from './design';
import {
  CX,
  type Ctx,
  type Eyes,
  type Face,
  LINE,
  SKINS,
  type Skin,
  circle,
  clothFill,
  ellipse,
  fillStroke,
  paintAgeLines,
  paintBlush,
  paintBrows,
  paintButtonNose,
  paintEars,
  paintEyes,
  paintFace,
  paintFist,
  paintGlasses,
  paintMouth,
  paintNeck,
  paintPointingHand,
  paintSleeve,
  paintSweat,
  roundRectPath,
  shine,
  torsoPath,
} from './kit';

/**
 * Boxer (T-031, Y-01): el mentor, antes informatico. Segunda ronda de propuestas (21 nov 2026): Carmine descarto las tres
 * primeras y pidio un informatico moderno, de pelo oscuro y con una edad distinta en cada propuesta (unos 30, 40 y 50),
 * con libertad creativa en lo demas. Eligio una mezcla de a) y b) (`BOXER_MIX`); las tres quedan como referencia. Complexion normal en las tres: misma cara y medidas; cambian el pelo, la barba, la
 * ropa y lo que lleva en la mano, que dice "informatico" sin texto. Se comparan en la galeria (`/personajes.html`).
 */

/** Cara de un hombre de complexion normal: ni gordo ni flaco, con la mandibula algo cuadrada. */
const FACE: Face = { cx: CX, top: 64, cheekY: 150, cheekW: 75, jawY: 210, jawW: 61, chinY: 243, chinW: 23 };
const NECK = { top: 214, bottom: 286, half: 26 } as const;
const TORSO = { neckY: 274, shoulderY: 294, halfW: 150, bottom: 358, neckHalf: 31 } as const;
const BROW_Y = 121;
const MOUTH_Y = 212;

/** Pelo oscuro, casi negro, con un brillo calido. */
const DARK_HAIR = { light: '#6e5c52', mid: '#2f2622', dark: '#15100d', outline: '#0a0706' } as const;
const BROW_COLOR = '#2a201b';

function eyes(skin: Skin, iris: readonly [string, string], bags: boolean): Eyes {
  return { y: 151, dx: 32, rx: 15, ry: 17, iris, outline: '#33211a', bags, skin };
}

function hairFill(ctx: Ctx, x: number, y: number, r: number): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.08, x, y, r * 1.1);
  g.addColorStop(0, DARK_HAIR.light);
  g.addColorStop(0.45, DARK_HAIR.mid);
  g.addColorStop(1, DARK_HAIR.dark);
  return g;
}

/** Mechones: trazos finos y claros que siguen el peinado. */
function strands(ctx: Ctx, lines: ReadonlyArray<readonly [number, number, number, number, number, number]>): void {
  ctx.strokeStyle = 'rgba(190, 160, 140, 0.35)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [x0, y0, cx, cy, x1, y1] of lines) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
}

/** Lo comun: orejas, cara, mejillas, ojos y nariz. `age` pone las arrugas de la edad. */
function paintHead(ctx: Ctx, skin: Skin, eye: Eyes, pose: Pose, age: boolean): void {
  paintEars(ctx, FACE, 160, skin);
  paintFace(ctx, FACE, skin);
  shine(ctx, CX - 38, 98, 16, 9, -0.5);
  if (age) paintAgeLines(ctx, CX, eye, 108, skin);
  paintBlush(ctx, CX, 192, 50, skin, pose.expression);
  paintEyes(ctx, CX, eye, pose);
  paintButtonNose(ctx, CX + 3, 184, 13, skin);
}

function paintBody(ctx: Ctx, skin: Skin, colors: readonly [string, string, string], outline: string): void {
  paintNeck(ctx, CX, NECK.top, NECK.bottom, NECK.half, skin);
  torsoPath(ctx, CX, TORSO.neckY, TORSO.shoulderY, TORSO.halfW, TORSO.bottom, TORSO.neckHalf);
  fillStroke(ctx, clothFill(ctx, CX - 40, 300, 170, colors), outline, LINE.body);
}

function hurriedSweat(ctx: Ctx, pose: Pose): void {
  if (pose.expression === 'hurried') paintSweat(ctx, CX + 70, 112, 1.1);
}

/** Cuello alto alrededor del cuello: la capucha de una sudadera o el cuello de una chaqueta. */
function paintCollar(ctx: Ctx, colors: readonly [string, string, string], outline: string, high = 0): void {
  ctx.beginPath();
  ctx.moveTo(CX - 62, 288);
  ctx.bezierCurveTo(CX - 58, 262 - high, CX - 34, 258 - high, CX, 266 - high);
  ctx.bezierCurveTo(CX + 34, 258 - high, CX + 58, 262 - high, CX + 62, 288);
  ctx.bezierCurveTo(CX + 40, 302, CX - 40, 302, CX - 62, 288);
  ctx.closePath();
  fillStroke(ctx, clothFill(ctx, CX - 20, 272, 60, colors), outline, LINE.body);
}

// ---------------------------------------------------------------------------
// a) Portatil: unos 30 anos

const LAPTOP_SKIN = SKINS.rosy;
const HOODIE = ['#5d6372', '#33373f', '#1b1d22'] as const;
const HOODIE_LINE = '#0e0f12';
const TEE = ['#b6ec8c', '#6cc24a', '#3a7d2c'] as const;
const PHONES = ['#ffffff', '#d9f3ea', '#8fc9b6'] as const;

/** Tupe: los lados cortos y degradados, y arriba un mechon alto que se levanta hacia el bocadillo. */
function paintQuiff(ctx: Ctx): void {
  // Lados cortos.
  ctx.beginPath();
  ctx.moveTo(CX - 77, 150);
  ctx.bezierCurveTo(CX - 84, 110, CX - 72, 80, CX - 42, 72);
  ctx.lineTo(CX + 42, 72);
  ctx.bezierCurveTo(CX + 72, 80, CX + 84, 110, CX + 77, 150);
  ctx.bezierCurveTo(CX + 74, 128, CX + 70, 114, CX + 60, 106);
  ctx.lineTo(CX - 60, 106);
  ctx.bezierCurveTo(CX - 70, 114, CX - 74, 128, CX - 77, 150);
  ctx.closePath();
  const sides = ctx.createLinearGradient(0, 80, 0, 150);
  sides.addColorStop(0, '#3a2f2a');
  sides.addColorStop(1, '#5a4a42');
  fillStroke(ctx, sides, DARK_HAIR.outline, LINE.detail + 0.6);
  // Mechon de arriba.
  ctx.beginPath();
  ctx.moveTo(CX - 64, 112);
  ctx.bezierCurveTo(CX - 74, 72, CX - 44, 38, CX + 4, 34);
  ctx.bezierCurveTo(CX + 50, 30, CX + 88, 46, CX + 84, 78);
  ctx.bezierCurveTo(CX + 82, 96, CX + 68, 104, CX + 56, 100);
  ctx.bezierCurveTo(CX + 40, 92, CX + 20, 96, CX + 8, 104);
  ctx.bezierCurveTo(CX - 14, 112, CX - 40, 104, CX - 64, 112);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX, 60, 90), DARK_HAIR.outline, LINE.face - 0.4);
  strands(ctx, [
    [CX - 48, 100, CX - 40, 56, CX + 6, 46],
    [CX - 20, 102, CX - 6, 62, CX + 40, 48],
    [CX + 10, 98, CX + 30, 64, CX + 70, 60],
    [CX + 36, 94, CX + 60, 80, CX + 74, 86],
  ]);
  shine(ctx, CX - 14, 52, 22, 7, -0.25);
}

/** Barba de pocos dias, oscura y suave, con el bigote. */
function paintStubble(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 64, 186);
  ctx.bezierCurveTo(CX - 62, 222, CX - 34, 244, CX, 244);
  ctx.bezierCurveTo(CX + 34, 244, CX + 62, 222, CX + 64, 186);
  ctx.bezierCurveTo(CX + 48, 206, CX + 30, 198, CX + 18, 196);
  ctx.quadraticCurveTo(CX, 192, CX - 16, 196);
  ctx.bezierCurveTo(CX - 30, 198, CX - 48, 206, CX - 64, 186);
  ctx.closePath();
  ctx.fillStyle = 'rgba(60, 44, 40, 0.18)';
  ctx.fill();
}

/** Diadema de los cascos: va por detras de la nuca, asi que se pinta antes que el cuello. */
function paintNeckPhonesBand(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 50, 272);
  ctx.bezierCurveTo(CX - 58, 232, CX + 58, 232, CX + 50, 272);
  ctx.strokeStyle = '#1b1d22';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = PHONES[1];
  ctx.lineWidth = 5;
  ctx.stroke();
}

/** Cascos inalambricos colgados al cuello: los dos auriculares sobre las claviculas. */
function paintNeckPhonesCups(ctx: Ctx): void {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(CX + side * 52, 274, 15, 19, side * 0.55, 0, Math.PI * 2);
    fillStroke(ctx, clothFill(ctx, CX + side * 52, 270, 22, PHONES), '#2f4a42', LINE.body);
    ctx.beginPath();
    ctx.ellipse(CX + side * 48, 272, 7, 11, side * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2f36';
    ctx.fill();
  }
}

/** Sudadera negra con cremallera, la capucha bajada y una camiseta verde asomando. */
function paintZipHoodie(ctx: Ctx): void {
  paintBody(ctx, LAPTOP_SKIN, HOODIE, HOODIE_LINE);
  paintCollar(ctx, HOODIE, HOODIE_LINE);
  // Cuello redondo de la camiseta verde asomando por la cremallera.
  ctx.beginPath();
  ctx.moveTo(CX - 24, 276);
  ctx.quadraticCurveTo(CX, 284, CX + 24, 276);
  ctx.quadraticCurveTo(CX + 18, 292, CX, 294);
  ctx.quadraticCurveTo(CX - 18, 292, CX - 24, 276);
  ctx.closePath();
  fillStroke(ctx, clothFill(ctx, CX - 6, 282, 26, TEE), '#24521d', LINE.detail);
  // Cremallera con su tirador.
  ctx.beginPath();
  ctx.moveTo(CX, 292);
  ctx.lineTo(CX, 358);
  ctx.strokeStyle = '#8b919c';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#1b1d22';
  ctx.lineWidth = 1.4;
  for (let y = 298; y < 356; y += 5) {
    ctx.beginPath();
    ctx.moveTo(CX - 2.4, y);
    ctx.lineTo(CX + 2.4, y);
    ctx.stroke();
  }
  roundRectPath(ctx, CX - 3.5, 294, 7, 16, 3);
  fillStroke(ctx, '#c9ced6', '#4a5260', LINE.detail - 0.4);
}

/** Portatil cerrado, visto por la tapa, lleno de pegatinas: un brote, unos corchetes de codigo, un rayo y un corazon. */
function paintLaptop(ctx: Ctx, x: number, y: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(0.88, 0.88);
  roundRectPath(ctx, -50, -36, 100, 72, 8);
  fillStroke(ctx, clothFill(ctx, -10, -10, 70, ['#f4f6f9', '#c8ced8', '#949cab']), '#454c59', LINE.body);
  // Pegatina del brote.
  circle(ctx, -26, -12, 13, '#6cc24a');
  ctx.beginPath();
  ctx.arc(-26, -12, 13, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.lineTo(-26, -14);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ellipse(ctx, -31, -16, 5, 2.6, '#ffffff', -0.5);
  ellipse(ctx, -21, -17, 5, 2.6, '#ffffff', 0.5);
  // Pegatina de codigo: corchetes verdes sobre negro.
  roundRectPath(ctx, 4, -26, 34, 22, 5);
  fillStroke(ctx, '#20242c', '#ffffff', 2);
  ctx.beginPath();
  ctx.moveTo(15, -21);
  ctx.lineTo(10, -15);
  ctx.lineTo(15, -9);
  ctx.moveTo(27, -21);
  ctx.lineTo(32, -15);
  ctx.lineTo(27, -9);
  ctx.moveTo(23, -22);
  ctx.lineTo(19, -8);
  ctx.strokeStyle = '#7fe0a0';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  // Rayo amarillo.
  ctx.beginPath();
  ctx.moveTo(24, 4);
  ctx.lineTo(14, 18);
  ctx.lineTo(21, 18);
  ctx.lineTo(16, 30);
  ctx.lineTo(30, 13);
  ctx.lineTo(23, 13);
  ctx.closePath();
  fillStroke(ctx, '#ffd23f', '#8a5d08', 1.8);
  // Corazon rosa.
  ctx.beginPath();
  ctx.moveTo(-14, 26);
  ctx.bezierCurveTo(-30, 16, -24, 4, -14, 12);
  ctx.bezierCurveTo(-4, 4, 2, 16, -14, 26);
  fillStroke(ctx, '#ff7aa8', '#8a1f45', 1.8);
  ctx.restore();
}

function paintLaptopHand(ctx: Ctx): void {
  paintSleeve(ctx, { x: 232, y: 351 }, { x: 230, y: 340 }, { x: 232, y: 330 }, 40, HOODIE, HOODIE_LINE);
  paintFist(ctx, 232, 312, 36, -0.08, LAPTOP_SKIN, () => paintLaptop(ctx, 268, 298, -0.1));
}

function paintLaptopBoxer(ctx: Ctx, pose: Pose): void {
  const skin = LAPTOP_SKIN;
  const eye = eyes(skin, ['#c8945a', '#5a3418'], false);
  paintNeckPhonesBand(ctx);
  paintZipHoodie(ctx);
  paintNeckPhonesCups(ctx);
  paintHead(ctx, skin, eye, pose, false);
  paintStubble(ctx);
  paintMouth(ctx, { x: CX + 2, y: MOUTH_Y, w: 38, outline: skin.outline }, pose);
  paintBrows(ctx, CX, { y: BROW_Y, dx: 32, length: 30, thick: 8, color: BROW_COLOR }, pose.expression);
  paintQuiff(ctx);
  hurriedSweat(ctx, pose);
  paintLaptopHand(ctx);
}

// ---------------------------------------------------------------------------
// b) Tableta: unos 40 anos

const TABLET_SKIN = SKINS.tan;
const BOMBER = ['#6f8fc4', '#3a5687', '#1f3050'] as const;
const BOMBER_LINE = '#101a2c';
const MUSTARD = ['#ffe9a0', '#f2b632', '#b07a0e'] as const;

/** Pelo corto con la raya a un lado y el flequillo peinado hacia el bocadillo. */
function paintSidePart(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 78, 150);
  ctx.bezierCurveTo(CX - 88, 96, CX - 60, 48, CX - 4, 44);
  ctx.bezierCurveTo(CX + 58, 42, CX + 90, 86, CX + 78, 150);
  ctx.bezierCurveTo(CX + 74, 124, CX + 70, 108, CX + 58, 100);
  ctx.bezierCurveTo(CX + 30, 106, CX - 4, 98, CX - 30, 86);
  ctx.quadraticCurveTo(CX - 52, 92, CX - 62, 104);
  ctx.bezierCurveTo(CX - 70, 114, CX - 74, 130, CX - 78, 150);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 10, 76, 96), DARK_HAIR.outline, LINE.face - 0.4);
  // Raya.
  ctx.beginPath();
  ctx.moveTo(CX - 30, 86);
  ctx.quadraticCurveTo(CX - 36, 66, CX - 34, 50);
  ctx.strokeStyle = '#120d0b';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  strands(ctx, [
    [CX - 26, 82, CX - 10, 56, CX + 30, 52],
    [CX - 18, 92, CX + 10, 70, CX + 56, 66],
    [CX + 4, 98, CX + 34, 84, CX + 64, 90],
    [CX - 40, 62, CX - 56, 74, CX - 64, 100],
  ]);
  shine(ctx, CX + 6, 56, 24, 7, -0.15);
}

/** Barba oscura y cuidada, con bigote: deja ver los labios. */
function paintFullBeard(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 72, 160);
  ctx.bezierCurveTo(CX - 70, 226, CX - 40, 258, CX, 258);
  ctx.bezierCurveTo(CX + 40, 258, CX + 70, 226, CX + 72, 160);
  ctx.bezierCurveTo(CX + 64, 196, CX + 46, 214, CX + 30, 220);
  ctx.quadraticCurveTo(CX + 2, 232, CX - 26, 220);
  ctx.bezierCurveTo(CX - 46, 214, CX - 64, 196, CX - 72, 160);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 10, 220, 60), DARK_HAIR.outline, LINE.detail + 0.6);
  strands(ctx, [
    [CX - 40, 226, CX - 36, 240, CX - 26, 248],
    [CX + 42, 226, CX + 38, 240, CX + 28, 248],
    [CX, 238, CX + 2, 246, CX, 252],
  ]);
}

function paintMustache(ctx: Ctx, pose: Pose): void {
  const y = MOUTH_Y - 6 + (pose.open ? -2 : 0);
  ctx.beginPath();
  ctx.moveTo(CX - 30, y + 4);
  ctx.quadraticCurveTo(CX - 18, y - 12, CX + 2, y - 7);
  ctx.quadraticCurveTo(CX + 22, y - 12, CX + 34, y + 4);
  ctx.quadraticCurveTo(CX + 18, y, CX + 2, y + 1);
  ctx.quadraticCurveTo(CX - 14, y, CX - 30, y + 4);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX, y - 6, 30), DARK_HAIR.outline, LINE.detail);
}

/** Bomber azul con el cuello de punto y una camiseta mostaza con una hoja de circuito estampada. */
function paintBomber(ctx: Ctx): void {
  paintBody(ctx, TABLET_SKIN, MUSTARD, '#6b4a05');
  // Hoja de circuito en la camiseta.
  ctx.beginPath();
  ctx.moveTo(CX - 6, 330);
  ctx.quadraticCurveTo(CX - 22, 312, CX - 2, 296);
  ctx.quadraticCurveTo(CX + 18, 314, CX - 6, 330);
  fillStroke(ctx, '#3f9a35', '#1f4d18', 2);
  ctx.beginPath();
  ctx.moveTo(CX - 6, 330);
  ctx.lineTo(CX - 4, 304);
  ctx.moveTo(CX - 5, 318);
  ctx.lineTo(CX + 4, 312);
  ctx.strokeStyle = '#c8ffd8';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  circle(ctx, CX + 4, 312, 2.2, '#c8ffd8');
  // Delanteros de la bomber, abiertos.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 150, 358);
    ctx.bezierCurveTo(CX + side * 150, 330, CX + side * 140, 300, CX + side * 96, 290);
    ctx.quadraticCurveTo(CX + side * 60, 284, CX + side * 32, 276);
    ctx.quadraticCurveTo(CX + side * 36, 320, CX + side * 30, 358);
    ctx.closePath();
    fillStroke(ctx, clothFill(ctx, CX + side * 90, 310, 90, BOMBER), BOMBER_LINE, LINE.body);
    // Cremallera abierta en el borde.
    ctx.beginPath();
    ctx.moveTo(CX + side * 34, 282);
    ctx.quadraticCurveTo(CX + side * 38, 320, CX + side * 33, 356);
    ctx.strokeStyle = '#9aa6b8';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  // Cuello de punto con sus rayas.
  ctx.beginPath();
  ctx.moveTo(CX - 40, 282);
  ctx.bezierCurveTo(CX - 36, 264, CX - 20, 262, CX, 268);
  ctx.bezierCurveTo(CX + 20, 262, CX + 36, 264, CX + 40, 282);
  ctx.strokeStyle = BOMBER_LINE;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = '#ff9a4a';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = BOMBER[1];
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** Tableta con la pantalla hacia el jugador: un radar y unas barras en verde, como quien ensena un plano. */
function paintTablet(ctx: Ctx, x: number, y: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  roundRectPath(ctx, -36, -48, 72, 96, 10);
  fillStroke(ctx, '#2a2f3a', '#0f1218', LINE.body);
  roundRectPath(ctx, -30, -40, 60, 80, 4);
  const screen = ctx.createLinearGradient(0, -40, 0, 40);
  screen.addColorStop(0, '#16382c');
  screen.addColorStop(1, '#0a1a14');
  ctx.fillStyle = screen;
  ctx.fill();
  // Radar.
  ctx.strokeStyle = '#7fe0a0';
  ctx.lineWidth = 1.8;
  for (const r of [7, 14]) {
    ctx.beginPath();
    ctx.arc(0, -16, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(11, -26);
  ctx.stroke();
  circle(ctx, -8, -20, 2.4, '#ffd23f');
  circle(ctx, 6, -8, 2.4, '#ff7a8a');
  // Barras.
  for (const [bx, bh] of [
    [-20, 12],
    [-8, 20],
    [4, 15],
    [16, 24],
  ] as const) {
    roundRectPath(ctx, bx, 34 - bh, 7, bh, 2);
    ctx.fillStyle = '#6cc24a';
    ctx.fill();
  }
  // Reflejo del cristal.
  ctx.beginPath();
  ctx.moveTo(-26, 20);
  ctx.lineTo(20, -36);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 8;
  ctx.stroke();
  circle(ctx, 0, -44, 1.6, '#5a6272');
  ctx.restore();
}

function paintTabletHand(ctx: Ctx): void {
  paintSleeve(ctx, { x: 218, y: 351 }, { x: 214, y: 338 }, { x: 214, y: 322 }, 42, BOMBER, BOMBER_LINE);
  // Puno de punto naranja de la manga.
  roundRectPath(ctx, 192, 314, 44, 12, 5);
  fillStroke(ctx, '#ff9a4a', BOMBER_LINE, LINE.detail);
  paintFist(ctx, 216, 300, 36, -0.12, TABLET_SKIN, () => paintTablet(ctx, 254, 276, 0.1));
}

/** Auricular inalambrico en la oreja que se ve libre. */
function paintEarbud(ctx: Ctx): void {
  ellipse(ctx, CX + 81, 164, 6, 8, '#f6f8fb');
  ctx.beginPath();
  ctx.ellipse(CX + 81, 164, 6, 8, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#5d6878';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  roundRectPath(ctx, CX + 79, 168, 5, 14, 2.5);
  fillStroke(ctx, '#f6f8fb', '#5d6878', 1.8);
}

function paintTabletBoxer(ctx: Ctx, pose: Pose): void {
  const skin = TABLET_SKIN;
  const eye = eyes(skin, ['#9a6a44', '#2e1a0c'], false);
  paintBomber(ctx);
  paintHead(ctx, skin, eye, pose, false);
  paintFullBeard(ctx);
  paintMouth(ctx, { x: CX + 2, y: MOUTH_Y, w: 36, outline: skin.outline }, pose);
  paintMustache(ctx, pose);
  paintGlasses(ctx, CX, eye, 'rect', '#14141a', 74);
  paintBrows(ctx, CX, { y: BROW_Y - 3, dx: 32, length: 30, thick: 8, color: BROW_COLOR }, pose.expression);
  paintSidePart(ctx);
  paintEarbud(ctx);
  hurriedSweat(ctx, pose);
  paintTabletHand(ctx);
}

// ---------------------------------------------------------------------------
// c) Visor: unos 50 anos

const VISOR_SKIN = SKINS.deep;
const TECHWEAR = ['#646c78', '#323740', '#181a1f'] as const;
const TECHWEAR_LINE = '#0b0c0f';
/** Verde de planta para los vivos de la chaqueta: el neon es de la corrupcion. */
const PIPING = '#a6e07e';

/** Pelo oscuro peinado hacia atras, con las sienes canosas. */
function paintSlickedBack(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 77, 148);
  ctx.bezierCurveTo(CX - 86, 96, CX - 60, 50, CX, 46);
  ctx.bezierCurveTo(CX + 60, 50, CX + 86, 96, CX + 77, 148);
  ctx.bezierCurveTo(CX + 72, 120, CX + 64, 100, CX + 42, 94);
  ctx.quadraticCurveTo(CX, 86, CX - 42, 94);
  ctx.bezierCurveTo(CX - 64, 100, CX - 72, 120, CX - 77, 148);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 10, 70, 96), DARK_HAIR.outline, LINE.face - 0.4);
  strands(ctx, [
    [CX - 50, 98, CX - 56, 70, CX - 34, 54],
    [CX - 18, 92, CX - 20, 66, CX - 4, 50],
    [CX + 16, 92, CX + 18, 66, CX + 30, 52],
    [CX + 48, 98, CX + 58, 72, CX + 44, 56],
  ]);
  // Sienes canosas.
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (const [dx, y0, y1] of [
      [68, 114, 146],
      [62, 108, 136],
      [72, 124, 150],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(CX + side * dx, y0);
      ctx.quadraticCurveTo(CX + side * (dx + 4), (y0 + y1) / 2, CX + side * (dx + 2), y1);
      ctx.strokeStyle = 'rgba(214, 216, 222, 0.85)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
  }
}

/** Perilla y bigote oscuros, con algo de gris en la barbilla. */
function paintGoatee(ctx: Ctx, pose: Pose): void {
  ctx.beginPath();
  ctx.moveTo(CX - 26, 222);
  ctx.quadraticCurveTo(CX, 232, CX + 30, 222);
  ctx.bezierCurveTo(CX + 30, 240, CX + 20, 254, CX + 2, 256);
  ctx.bezierCurveTo(CX - 16, 254, CX - 26, 240, CX - 26, 222);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 222, 0, 256);
  g.addColorStop(0, DARK_HAIR.mid);
  g.addColorStop(1, '#6d6a6e');
  fillStroke(ctx, g, DARK_HAIR.outline, LINE.detail);
  const y = MOUTH_Y - 6 + (pose.open ? -2 : 0);
  ctx.beginPath();
  ctx.moveTo(CX - 30, y + 8);
  ctx.quadraticCurveTo(CX - 20, y - 10, CX + 2, y - 6);
  ctx.quadraticCurveTo(CX + 24, y - 10, CX + 34, y + 8);
  ctx.quadraticCurveTo(CX + 22, y + 1, CX + 2, y + 1);
  ctx.quadraticCurveTo(CX - 18, y + 1, CX - 30, y + 8);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX, y - 4, 30), DARK_HAIR.outline, LINE.detail);
}

/**
 * Visor de realidad aumentada subido a la frente: una sola lente ancha y tintada, como unas gafas de esqui, con montura
 * gruesa, piezas a los lados, una linea de datos en verde y la cinta que va por detras de las orejas.
 */
function paintVisor(ctx: Ctx): void {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 74, 112);
    ctx.quadraticCurveTo(CX + side * 84, 126, CX + side * 80, 144);
    ctx.strokeStyle = '#1b2530';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  const visorPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 72, 100);
    ctx.bezierCurveTo(CX - 56, 70, CX + 56, 70, CX + 72, 100);
    ctx.lineTo(CX + 70, 118);
    ctx.bezierCurveTo(CX + 50, 98, CX - 50, 98, CX - 70, 118);
    ctx.closePath();
  };
  visorPath();
  const lens = ctx.createLinearGradient(0, 74, 0, 116);
  lens.addColorStop(0, '#1f4f78');
  lens.addColorStop(0.55, '#3aa6d8');
  lens.addColorStop(1, '#a8ecff');
  fillStroke(ctx, lens, '#111820', 4.4);
  // Reflejo y una linea de datos dentro de la lente.
  ctx.save();
  visorPath();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(CX - 50, 104);
  ctx.lineTo(CX - 22, 76);
  ctx.lineTo(CX - 8, 76);
  ctx.lineTo(CX - 36, 104);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(CX + 8, 92);
  ctx.lineTo(CX + 22, 92);
  ctx.lineTo(CX + 28, 86);
  ctx.lineTo(CX + 44, 86);
  ctx.strokeStyle = '#7fe0a0';
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(ctx, CX + 48, 86, 2.4, '#7fe0a0');
  ctx.restore();
  // Piezas de los lados.
  for (const side of [-1, 1]) {
    roundRectPath(ctx, CX + side * 74 - 7, 96, 14, 24, 5);
    fillStroke(ctx, '#2c3440', '#111820', LINE.detail);
  }
  circle(ctx, CX + 74, 104, 2.4, '#7fe0a0');
}

/** Chaqueta tecnica negra de cuello alto, con la cremallera cruzada y vivos verdes. */
function paintTechwear(ctx: Ctx): void {
  paintBody(ctx, VISOR_SKIN, TECHWEAR, TECHWEAR_LINE);
  paintCollar(ctx, TECHWEAR, TECHWEAR_LINE, 10);
  // Cremallera cruzada.
  ctx.beginPath();
  ctx.moveTo(CX + 26, 268);
  ctx.bezierCurveTo(CX + 18, 300, CX - 8, 320, CX - 12, 358);
  ctx.strokeStyle = PIPING;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Vivos en los hombros.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 64, 292);
    ctx.quadraticCurveTo(CX + side * 100, 290, CX + side * 128, 306);
    ctx.strokeStyle = PIPING;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  // Bolsillo de pecho con su pestana.
  roundRectPath(ctx, CX - 98, 314, 44, 32, 6);
  fillStroke(ctx, clothFill(ctx, CX - 84, 320, 36, TECHWEAR), TECHWEAR_LINE, LINE.detail + 0.4);
  roundRectPath(ctx, CX - 82, 310, 12, 12, 3);
  fillStroke(ctx, PIPING, '#2a6b22', LINE.detail);
}

/** Mano levantada senalando hacia arriba, con un reloj inteligente en la muneca. */
function paintWatchHand(ctx: Ctx): void {
  paintSleeve(ctx, { x: 262, y: 351 }, { x: 266, y: 336 }, { x: 262, y: 316 }, 40, TECHWEAR, TECHWEAR_LINE);
  paintPointingHand(ctx, 262, 280, 36, 0.06, VISOR_SKIN);
  // Reloj: correa y esfera con un anillo verde.
  roundRectPath(ctx, 242, 300, 38, 11, 4);
  fillStroke(ctx, '#1b1d22', TECHWEAR_LINE, LINE.detail);
  roundRectPath(ctx, 250, 295, 22, 20, 6);
  fillStroke(ctx, '#2c313b', '#0b0c0f', LINE.detail);
  ctx.beginPath();
  ctx.arc(261, 305, 5.4, -Math.PI / 2, Math.PI * 1.1);
  ctx.strokeStyle = '#7fe0a0';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function paintVisorBoxer(ctx: Ctx, pose: Pose): void {
  const skin = VISOR_SKIN;
  const eye = eyes(skin, ['#c9b06a', '#4e4018'], true);
  paintTechwear(ctx);
  paintHead(ctx, skin, eye, pose, true);
  paintGoatee(ctx, pose);
  paintMouth(ctx, { x: CX + 2, y: MOUTH_Y, w: 36, outline: skin.outline }, pose);
  paintBrows(ctx, CX, { y: BROW_Y + 1, dx: 32, length: 30, thick: 8, color: BROW_COLOR }, pose.expression);
  paintSlickedBack(ctx);
  paintVisor(ctx);
  hurriedSweat(ctx, pose);
  paintWatchHand(ctx);
}

// ---------------------------------------------------------------------------
// El elegido (Y-01): mezcla de a) y b)

/**
 * Boxer del juego: la piel y la sudadera de a), el peinado, la barba completa con bigote y las gafas de pasta de b), y el
 * portatil con pegatinas. Sin cascos al cuello ni auricular (lo pidio Carmine).
 */
function paintMixBoxer(ctx: Ctx, pose: Pose): void {
  const skin = LAPTOP_SKIN;
  const eye = eyes(skin, ['#c8945a', '#5a3418'], false);
  paintZipHoodie(ctx);
  paintHead(ctx, skin, eye, pose, false);
  paintFullBeard(ctx);
  paintMouth(ctx, { x: CX + 2, y: MOUTH_Y, w: 36, outline: skin.outline }, pose);
  paintMustache(ctx, pose);
  paintGlasses(ctx, CX, eye, 'rect', '#14141a', 74);
  paintBrows(ctx, CX, { y: BROW_Y - 3, dx: 32, length: 30, thick: 8, color: BROW_COLOR }, pose.expression);
  paintSidePart(ctx);
  hurriedSweat(ctx, pose);
  paintLaptopHand(ctx);
}

// ---------------------------------------------------------------------------

/** Naranja de taller: la placa con su nombre y el borde de su bocadillo. */
const BOXER_TONE = { light: '#ffe0b8', mid: '#f0a04b', dark: '#9a5414' } as const;

export const BOXER_LAPTOP: CharacterDesign = {
  id: 'boxer-laptop',
  character: 'boxer',
  label: 'a) Portátil',
  about: 'Unos 30 años. Tupé oscuro y barba de pocos días, sudadera negra con cremallera, cascos al cuello y un portátil lleno de pegatinas.',
  tone: BOXER_TONE,
  paint: paintLaptopBoxer,
};

export const BOXER_TABLET: CharacterDesign = {
  id: 'boxer-tablet',
  character: 'boxer',
  label: 'b) Tableta',
  about: 'Unos 40 años. Pelo oscuro con raya y barba cuidada, gafas de pasta, auricular en la oreja, bomber azul y una tableta con un radar.',
  tone: BOXER_TONE,
  paint: paintTabletBoxer,
};

export const BOXER_VISOR: CharacterDesign = {
  id: 'boxer-visor',
  character: 'boxer',
  label: 'c) Visor',
  about: 'Unos 50 años. Pelo oscuro hacia atrás con las sienes canosas, perilla, visor de realidad aumentada en la frente, chaqueta técnica y reloj inteligente.',
  tone: BOXER_TONE,
  paint: paintVisorBoxer,
};

export const BOXER_PROPOSALS: readonly CharacterDesign[] = [BOXER_LAPTOP, BOXER_TABLET, BOXER_VISOR];

/**
 * El Boxer del juego, elegido por Carmine el 21 nov 2026 (Y-01): la piel, la sudadera y el portatil con pegatinas de a)
 * con el peinado, la barba completa y las gafas de pasta de b).
 */
export const BOXER_MIX: CharacterDesign = {
  id: 'boxer-mix',
  character: 'boxer',
  label: 'Boxer (a + b)',
  about: 'Elegido: la piel, la sudadera y el portátil con pegatinas de a), con el peinado, la barba completa con bigote y las gafas de pasta de b).',
  tone: BOXER_TONE,
  paint: paintMixBoxer,
};
