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
  leafShape,
  paintAgeLines,
  paintBlush,
  paintBrows,
  paintEars,
  paintEyes,
  paintFace,
  paintFist,
  paintMouth,
  paintNeck,
  paintSleeve,
  paintSmallNose,
  paintSweat,
  roundRectPath,
  torsoPath,
} from './kit';

/**
 * Patty (T-031, Y-02): la botanica que creo las plantas. Siempre con el pelo negro y un flequillo que le tapa parte de las
 * cejas (lo pidio Carmine); algo dice "botanica" sin texto. Tres propuestas para la galeria (`/propuestas/personajes.html`), cada
 * una de una edad: joven con bata, jardinera y exploradora.
 */

const FACE: Face = { cx: CX, top: 70, cheekY: 154, cheekW: 71, jawY: 206, jawW: 55, chinY: 238, chinW: 20 };
const NECK = { top: 214, bottom: 286, half: 21 } as const;
const TORSO = { neckY: 276, shoulderY: 298, halfW: 140, bottom: 358, neckHalf: 26 } as const;
const BROWS = { y: 134, dx: 30, length: 28, thick: 6, color: '#241f27' } as const;
const MOUTH_Y = 210;

/** Pelo negro con un brillo azulado. */
const BLACK_HAIR = { light: '#5a566c', mid: '#2a2734', dark: '#121118', outline: '#07060a', shine: 'rgba(160, 180, 230, 0.4)' } as const;

function eyes(skin: Skin, iris: readonly [string, string], bags = false): Eyes {
  return { y: 157, dx: 30, rx: 15.5, ry: 18, iris, outline: '#1f1520', lashes: true, bags, skin };
}

function hairFill(ctx: Ctx, x: number, y: number, r: number): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.08, x, y, r * 1.1);
  g.addColorStop(0, BLACK_HAIR.light);
  g.addColorStop(0.45, BLACK_HAIR.mid);
  g.addColorStop(1, BLACK_HAIR.dark);
  return g;
}

/** Brillo del pelo negro: un arco claro sobre la coronilla. */
function hairShine(ctx: Ctx, y: number): void {
  ctx.beginPath();
  ctx.arc(CX - 4, y + 70, 66, Math.PI * 1.18, Math.PI * 1.5);
  ctx.strokeStyle = BLACK_HAIR.shine;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Flequillo recto con las puntas a distinta altura: tapa la parte de arriba de las cejas (pedido de Carmine), y cada
 * propuesta le pone lo suyo encima o detras. Va de sien a sien por encima de la cabeza.
 */
function paintBangs(ctx: Ctx, crown: number): void {
  const tips: ReadonlyArray<readonly [number, number]> = [
    [62, 140],
    [50, 132],
    [38, 137],
    [26, 130],
    [13, 136],
    [0, 131],
    [-13, 137],
    [-26, 131],
    [-39, 136],
    [-51, 131],
    [-63, 140],
  ];
  ctx.beginPath();
  ctx.moveTo(CX - 74, 168);
  ctx.bezierCurveTo(CX - 84, 104, CX - 56, crown, CX, crown);
  ctx.bezierCurveTo(CX + 56, crown, CX + 84, 104, CX + 74, 168);
  ctx.quadraticCurveTo(CX + 72, 150, CX + tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) {
    const [x0, y0] = tips[i - 1];
    const [x1, y1] = tips[i];
    // Entre dos puntas el pelo sube un poco: mechones.
    ctx.quadraticCurveTo(CX + (x0 + x1) / 2, Math.min(y0, y1) - 7, CX + x1, y1);
  }
  ctx.quadraticCurveTo(CX - 72, 150, CX - 74, 168);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 10, crown + 40, 90), BLACK_HAIR.outline, LINE.face - 0.4);
  // Raya de los mechones del flequillo.
  ctx.strokeStyle = 'rgba(120, 126, 160, 0.45)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const x of [-44, -20, 6, 32, 54]) {
    ctx.beginPath();
    ctx.moveTo(CX + x * 0.7, crown + 26);
    ctx.quadraticCurveTo(CX + x * 0.95, 108, CX + x, 126);
    ctx.stroke();
  }
  hairShine(ctx, crown);
}

function paintHead(ctx: Ctx, skin: Skin, eye: Eyes, pose: Pose, lips: string, age = false, ears = true): void {
  if (ears) paintEars(ctx, FACE, 162, skin, 0.92);
  paintFace(ctx, FACE, skin);
  if (age) paintAgeLines(ctx, CX, eye, 118, skin);
  paintBlush(ctx, CX, 194, 47, skin, pose.expression);
  paintEyes(ctx, CX, eye, pose);
  paintSmallNose(ctx, CX + 3, 186, skin);
  paintMouth(ctx, { x: CX + 2, y: MOUTH_Y, w: 32, outline: skin.outline, lips }, pose);
  paintBrows(ctx, CX, BROWS, pose.expression);
}

function paintBody(ctx: Ctx, skin: Skin, colors: readonly [string, string, string], outline: string): void {
  paintNeck(ctx, CX, NECK.top, NECK.bottom, NECK.half, skin);
  torsoPath(ctx, CX, TORSO.neckY, TORSO.shoulderY, TORSO.halfW, TORSO.bottom, TORSO.neckHalf);
  fillStroke(ctx, clothFill(ctx, CX - 40, 304, 160, colors), outline, LINE.body);
}

function hurriedSweat(ctx: Ctx, pose: Pose): void {
  if (pose.expression === 'hurried') paintSweat(ctx, CX + 64, 116, 1);
}

/** Hoja con su nervio, en verde de planta. */
function paintLeaf(ctx: Ctx, x: number, y: number, length: number, width: number, angle: number): void {
  leafShape(ctx, x, y, length, width, angle);
  const g = ctx.createLinearGradient(x - length, y - length, x + length, y + length);
  g.addColorStop(0, '#9be36c');
  g.addColorStop(1, '#3f9a35');
  fillStroke(ctx, g, '#2a6b22', LINE.detail);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle) * length * 0.8, y + Math.sin(angle) * length * 0.8);
  ctx.strokeStyle = 'rgba(42, 107, 34, 0.6)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// a) Bata: la cientifica joven

const COAT_SKIN = SKINS.warm;
const COAT = ['#ffffff', '#eef3ee', '#b9c8bd'] as const;
const COAT_LINE = '#5f7a68';
const TEE = ['#a6e07e', '#5fae46', '#33702a'] as const;

/** Media melena negra hasta la mandibula, detras de la cara, con las puntas un poco hacia dentro. */
function paintBobBack(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX, 58);
  ctx.bezierCurveTo(CX + 70, 58, CX + 96, 110, CX + 94, 170);
  ctx.bezierCurveTo(CX + 93, 206, CX + 90, 230, CX + 74, 242);
  ctx.quadraticCurveTo(CX + 56, 248, CX + 48, 232);
  ctx.lineTo(CX - 48, 232);
  ctx.quadraticCurveTo(CX - 56, 248, CX - 74, 242);
  ctx.bezierCurveTo(CX - 90, 230, CX - 93, 206, CX - 94, 170);
  ctx.bezierCurveTo(CX - 96, 110, CX - 70, 58, CX, 58);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 20, 120, 110), BLACK_HAIR.outline, LINE.face - 0.4);
}

/** Mechones de la melena que caen por delante de las orejas. */
function paintBobSides(ctx: Ctx): void {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 66, 118);
    ctx.bezierCurveTo(CX + side * 84, 150, CX + side * 84, 206, CX + side * 76, 236);
    ctx.quadraticCurveTo(CX + side * 68, 244, CX + side * 60, 234);
    ctx.bezierCurveTo(CX + side * 66, 200, CX + side * 66, 160, CX + side * 56, 128);
    ctx.closePath();
    fillStroke(ctx, hairFill(ctx, CX + side * 70, 160, 60), BLACK_HAIR.outline, LINE.detail + 0.6);
  }
}

/** Flor rosa prendida en el flequillo (pedida por Carmine en lugar de la horquilla de hoja). */
function paintHairFlower(ctx: Ctx, x: number, y: number): void {
  paintFlower(ctx, x, y, 11, '#ff9cc4', '#ffd23f', '#b0306a');
  circle(ctx, x - 2, y - 2, 2.2, 'rgba(255, 255, 255, 0.8)');
}

/** Bata blanca abierta sobre una camiseta verde, con un pin de hoja en la solapa y bolis en el bolsillo. */
function paintLabCoat(ctx: Ctx): void {
  paintBody(ctx, COAT_SKIN, TEE, '#24521d');
  for (const side of [-1, 1]) {
    // Delantero de la bata con su solapa.
    ctx.beginPath();
    ctx.moveTo(CX + side * 140, 358);
    ctx.bezierCurveTo(CX + side * 140, 330, CX + side * 128, 304, CX + side * 84, 296);
    ctx.quadraticCurveTo(CX + side * 46, 288, CX + side * 30, 276);
    ctx.lineTo(CX + side * 20, 300);
    ctx.lineTo(CX + side * 36, 330);
    ctx.lineTo(CX + side * 30, 358);
    ctx.closePath();
    fillStroke(ctx, clothFill(ctx, CX + side * 70, 310, 90, COAT), COAT_LINE, LINE.body);
    ctx.beginPath();
    ctx.moveTo(CX + side * 30, 278);
    ctx.lineTo(CX + side * 48, 316);
    ctx.lineTo(CX + side * 36, 330);
    ctx.strokeStyle = 'rgba(95, 122, 104, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Pin de hoja en la solapa izquierda (la del espectador).
  paintLeaf(ctx, CX - 58, 318, 22, 8, -0.9);
  circle(ctx, CX - 58, 318, 3, '#ffd23f');
  // Bolsillo de pecho de la bata con un lapiz.
  roundRectPath(ctx, CX - 98, 322, 6, 26, 2);
  fillStroke(ctx, '#ffd23f', '#6b4a05', LINE.detail);
  roundRectPath(ctx, CX - 112, 334, 36, 24, 4);
  fillStroke(ctx, clothFill(ctx, CX - 100, 340, 30, COAT), COAT_LINE, LINE.detail);
}

/** Tubo de ensayo con agua verde y un brote que le sale por arriba. */
function paintSproutTube(ctx: Ctx): void {
  ctx.save();
  ctx.translate(252, 250);
  ctx.rotate(0.12);
  // Brote.
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(-3, -40, 1, -52);
  ctx.strokeStyle = '#3f9a35';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  paintLeaf(ctx, 1, -46, 22, 9, -2.5);
  paintLeaf(ctx, 1, -50, 20, 8, -0.55);
  // Tubo.
  ctx.beginPath();
  ctx.moveTo(-11, -28);
  ctx.lineTo(-11, 34);
  ctx.arc(0, 34, 11, Math.PI, 0, true);
  ctx.lineTo(11, -28);
  ctx.closePath();
  ctx.fillStyle = 'rgba(225, 245, 255, 0.55)';
  ctx.fill();
  // Agua verde.
  ctx.save();
  ctx.clip();
  roundRectPath(ctx, -12, 4, 24, 46, 2);
  const g = ctx.createLinearGradient(0, 4, 0, 46);
  g.addColorStop(0, '#9dfc9a');
  g.addColorStop(1, '#2fae5a');
  ctx.fillStyle = g;
  ctx.fill();
  circle(ctx, -3, 26, 2.6, 'rgba(255, 255, 255, 0.7)');
  circle(ctx, 4, 16, 1.8, 'rgba(255, 255, 255, 0.7)');
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-11, -28);
  ctx.lineTo(-11, 34);
  ctx.arc(0, 34, 11, Math.PI, 0, true);
  ctx.lineTo(11, -28);
  ctx.strokeStyle = '#4f7a8f';
  ctx.lineWidth = LINE.detail + 0.4;
  ctx.stroke();
  // Boca del tubo y brillo.
  roundRectPath(ctx, -14, -32, 28, 6, 3);
  fillStroke(ctx, 'rgba(235, 250, 255, 0.9)', '#4f7a8f', LINE.detail);
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(-6, 26);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function paintCoatHand(ctx: Ctx): void {
  paintSleeve(ctx, { x: 258, y: 351 }, { x: 262, y: 338 }, { x: 254, y: 312 }, 40, COAT, COAT_LINE);
  paintFist(ctx, 256, 292, 34, -0.18, COAT_SKIN, () => paintSproutTube(ctx));
}

function paintCoatPatty(ctx: Ctx, pose: Pose): void {
  const skin = COAT_SKIN;
  paintBobBack(ctx);
  paintLabCoat(ctx);
  paintHead(ctx, skin, eyes(skin, ['#b6e58a', '#3f7d2c']), pose, '#e0606e', false, false);
  paintBobSides(ctx);
  paintBangs(ctx, 56);
  paintHairFlower(ctx, CX + 50, 104);
  hurriedSweat(ctx, pose);
  paintCoatHand(ctx);
}

// ---------------------------------------------------------------------------
// b) Jardinera: la del peto y los guantes

const GARDEN_SKIN = SKINS.tan;
const DUNGAREES = ['#9fcf86', '#5d9a4b', '#335f2a'] as const;
const STRIPES = ['#fff6dc', '#f3e3b4', '#cdb67a'] as const;
const GLOVE: Skin = { light: '#fff6b8', mid: '#f6d23f', dark: '#c99a12', outline: '#6b4a05', blush: 'transparent' };

/** Mono alto despeinado, con un par de mechones sueltos y una flor. */
function paintBun(ctx: Ctx): void {
  ctx.beginPath();
  ctx.ellipse(CX + 6, 46, 38, 30, -0.1, 0, Math.PI * 2);
  fillStroke(ctx, hairFill(ctx, CX, 40, 40), BLACK_HAIR.outline, LINE.face - 0.4);
  ctx.strokeStyle = 'rgba(120, 126, 160, 0.5)';
  ctx.lineWidth = 2;
  for (const [a0, a1] of [
    [3.4, 4.4],
    [4.6, 5.6],
    [0.2, 1.2],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(CX + 6, 46, 26, 18, -0.1, a0, a1);
    ctx.stroke();
  }
  // Mechones sueltos que se escapan del mono.
  ctx.strokeStyle = BLACK_HAIR.mid;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX + 36, 30);
  ctx.quadraticCurveTo(CX + 54, 22, CX + 52, 8);
  ctx.moveTo(CX - 26, 30);
  ctx.quadraticCurveTo(CX - 44, 26, CX - 46, 12);
  ctx.stroke();
}

/** Pelo recogido: tirante por los lados, hacia el mono, detras del flequillo. */
function paintPulledBack(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 76, 170);
  ctx.bezierCurveTo(CX - 90, 100, CX - 56, 60, CX, 60);
  ctx.bezierCurveTo(CX + 56, 60, CX + 90, 100, CX + 76, 170);
  ctx.quadraticCurveTo(CX + 70, 120, CX, 110);
  ctx.quadraticCurveTo(CX - 70, 120, CX - 76, 170);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 20, 90, 90), BLACK_HAIR.outline, LINE.face - 0.4);
}

function paintFlower(ctx: Ctx, x: number, y: number, r: number, petal: string, center: string, outline: string): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.55, a, 0, Math.PI * 2);
    fillStroke(ctx, petal, outline, LINE.detail - 0.4);
  }
  circle(ctx, x, y, r * 0.55, center);
}

/** Peto verde con tirantes y botones sobre una camiseta de rayas; en el bolsillo, el mango de una pala. */
function paintDungarees(ctx: Ctx): void {
  paintBody(ctx, GARDEN_SKIN, STRIPES, '#8a7440');
  // Rayas de la camiseta.
  ctx.save();
  torsoPath(ctx, CX, TORSO.neckY, TORSO.shoulderY, TORSO.halfW, TORSO.bottom, TORSO.neckHalf);
  ctx.clip();
  for (let y = 290; y < 360; y += 16) {
    ctx.beginPath();
    ctx.moveTo(CX - 150, y);
    ctx.lineTo(CX + 150, y);
    ctx.strokeStyle = 'rgba(232, 120, 96, 0.55)';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.restore();
  // Peto.
  ctx.beginPath();
  ctx.moveTo(CX - 66, 358);
  ctx.lineTo(CX - 54, 306);
  ctx.quadraticCurveTo(CX, 300, CX + 54, 306);
  ctx.lineTo(CX + 66, 358);
  ctx.closePath();
  fillStroke(ctx, clothFill(ctx, CX - 20, 320, 80, DUNGAREES), '#21401b', LINE.body);
  // Costura del peto.
  ctx.beginPath();
  ctx.moveTo(CX - 46, 314);
  ctx.quadraticCurveTo(CX, 308, CX + 46, 314);
  ctx.strokeStyle = 'rgba(255, 236, 170, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Tirantes del hombro a las esquinas del peto, con su boton.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 64, 290);
    ctx.lineTo(CX + side * 84, 294);
    ctx.lineTo(CX + side * 60, 314);
    ctx.lineTo(CX + side * 42, 312);
    ctx.closePath();
    fillStroke(ctx, clothFill(ctx, CX + side * 66, 300, 30, DUNGAREES), '#21401b', LINE.detail + 0.6);
    circle(ctx, CX + side * 50, 314, 6, '#e8e1c8');
    ctx.strokeStyle = '#7a6a3a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(CX + side * 50, 314, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Mango de la pala asomando del bolsillo del peto.
  roundRectPath(ctx, CX - 10, 318, 12, 30, 5);
  fillStroke(ctx, '#c98a4a', '#5e3818', LINE.detail);
  roundRectPath(ctx, CX - 28, 338, 52, 20, 5);
  fillStroke(ctx, clothFill(ctx, CX - 10, 340, 40, DUNGAREES), '#21401b', LINE.detail + 0.4);
}

/** Maceta de barro con un brote, en la mano con el guante amarillo. */
function paintPotHand(ctx: Ctx): void {
  paintSleeve(ctx, { x: 262, y: 351 }, { x: 266, y: 340 }, { x: 256, y: 314 }, 40, STRIPES, '#8a7440');
  // Puno del guante: el pulgar sujeta la maceta por delante.
  paintFist(ctx, 258, 296, 36, -0.2, GLOVE, () => {
    const x = 236;
    const y = 262;
    // Brote.
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.quadraticCurveTo(x - 2, y - 32, x + 2, y - 44);
    ctx.strokeStyle = '#3f9a35';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    paintLeaf(ctx, x + 2, y - 40, 24, 9, -2.6);
    paintLeaf(ctx, x + 2, y - 42, 22, 8, -0.5);
    // Maceta.
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 12);
    ctx.lineTo(x + 26, y - 12);
    ctx.lineTo(x + 18, y + 30);
    ctx.lineTo(x - 18, y + 30);
    ctx.closePath();
    fillStroke(ctx, clothFill(ctx, x - 6, y, 40, ['#ffb889', '#e07a43', '#a5491f']), '#5e2a10', LINE.body);
    roundRectPath(ctx, x - 30, y - 22, 60, 14, 4);
    fillStroke(ctx, clothFill(ctx, x - 6, y - 18, 40, ['#ffc59a', '#e88a52', '#b3542a']), '#5e2a10', LINE.body);
    ellipse(ctx, x, y - 22, 24, 4, '#5a3a22');
  });
}

function paintGardenPatty(ctx: Ctx, pose: Pose): void {
  const skin = GARDEN_SKIN;
  paintBun(ctx);
  paintDungarees(ctx);
  paintHead(ctx, skin, eyes(skin, ['#d29a62', '#4a2a12']), pose, '#d24f62');
  paintPulledBack(ctx);
  paintBangs(ctx, 60);
  paintFlower(ctx, CX - 50, 76, 9, '#ff9cc4', '#ffd23f', '#b0306a');
  paintLeaf(ctx, CX - 40, 84, 18, 6, 0.3);
  hurriedSweat(ctx, pose);
  paintPotHand(ctx);
}

// ---------------------------------------------------------------------------
// c) Exploradora: la botanica de campo, mayor

const FIELD_SKIN = SKINS.rosy;
const KHAKI = ['#f1e2b8', '#cdb57a', '#937a44'] as const;
const KHAKI_LINE = '#5e4a20';
const STRAW = ['#fff1b8', '#ecc96a', '#b88a2a'] as const;

/** Trenza negra que cae por delante del hombro. */
function paintBraid(ctx: Ctx): void {
  const x0 = CX - 90;
  for (let i = 0; i < 5; i++) {
    const y = 214 + i * 22;
    const x = x0 + 14 - Math.sin(i * 0.6) * 4;
    ctx.beginPath();
    ctx.ellipse(x, y, 15 - i, 14, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
    fillStroke(ctx, hairFill(ctx, x, y, 18), BLACK_HAIR.outline, LINE.detail + 0.6);
  }
  // Lazo verde al final.
  const y = 214 + 5 * 22 - 8;
  ellipse(ctx, x0 + 6, y, 8, 5, '#5fae46', 0.6);
  ellipse(ctx, x0 + 22, y, 8, 5, '#5fae46', -0.6);
  circle(ctx, x0 + 14, y, 4, '#33702a');
}

/** Pelo por los lados, recogido hacia la trenza. */
function paintBraidHair(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX + 76, 176);
  ctx.bezierCurveTo(CX + 92, 110, CX + 60, 66, CX, 66);
  ctx.bezierCurveTo(CX - 60, 66, CX - 94, 110, CX - 84, 210);
  ctx.quadraticCurveTo(CX - 76, 222, CX - 68, 210);
  ctx.quadraticCurveTo(CX - 70, 130, CX, 116);
  ctx.quadraticCurveTo(CX + 70, 124, CX + 76, 176);
  ctx.closePath();
  fillStroke(ctx, hairFill(ctx, CX - 20, 100, 100), BLACK_HAIR.outline, LINE.face - 0.4);
}

/** Sombrero de paja de ala ancha con una cinta verde y una flor. */
function paintStrawHat(ctx: Ctx): void {
  // Ala.
  ctx.beginPath();
  ctx.ellipse(CX, 82, 118, 24, -0.04, 0, Math.PI * 2);
  fillStroke(ctx, clothFill(ctx, CX - 30, 76, 110, STRAW), '#6b4a10', LINE.body);
  // Copa.
  ctx.beginPath();
  ctx.moveTo(CX - 60, 84);
  ctx.bezierCurveTo(CX - 62, 40, CX - 40, 22, CX, 22);
  ctx.bezierCurveTo(CX + 40, 22, CX + 62, 40, CX + 60, 84);
  ctx.quadraticCurveTo(CX, 96, CX - 60, 84);
  ctx.closePath();
  fillStroke(ctx, clothFill(ctx, CX - 20, 44, 60, STRAW), '#6b4a10', LINE.body);
  // Trenzado de la paja.
  ctx.strokeStyle = 'rgba(140, 100, 30, 0.45)';
  ctx.lineWidth = 2;
  for (const y of [38, 52]) {
    ctx.beginPath();
    ctx.moveTo(CX - 54, y + 6);
    ctx.quadraticCurveTo(CX, y - 6, CX + 54, y + 6);
    ctx.stroke();
  }
  // Cinta.
  ctx.beginPath();
  ctx.moveTo(CX - 60, 70);
  ctx.quadraticCurveTo(CX, 82, CX + 60, 70);
  ctx.lineTo(CX + 60, 84);
  ctx.quadraticCurveTo(CX, 96, CX - 60, 84);
  ctx.closePath();
  fillStroke(ctx, '#5fae46', '#24521d', LINE.detail);
  paintFlower(ctx, CX + 44, 78, 8, '#ffffff', '#ffd23f', '#9a8a6a');
  paintLeaf(ctx, CX + 52, 84, 18, 6, 0.4);
}

/** Camisa caqui de campo con bolsillos y una lupa colgada al cuello. */
function paintFieldShirt(ctx: Ctx): void {
  paintBody(ctx, FIELD_SKIN, KHAKI, KHAKI_LINE);
  for (const side of [-1, 1]) {
    // Cuello.
    ctx.beginPath();
    ctx.moveTo(CX + side * 26, 274);
    ctx.quadraticCurveTo(CX + side * 40, 286, CX + side * 44, 304);
    ctx.lineTo(CX + side * 4, 300);
    ctx.quadraticCurveTo(CX + side * 10, 286, CX + side * 26, 274);
    ctx.closePath();
    fillStroke(ctx, clothFill(ctx, CX + side * 22, 286, 30, KHAKI), KHAKI_LINE, LINE.detail + 0.6);
    // Bolsillo con solapa.
    const px = CX + side * 74;
    roundRectPath(ctx, px - 22, 314, 44, 40, 5);
    fillStroke(ctx, clothFill(ctx, px - 6, 322, 36, KHAKI), KHAKI_LINE, LINE.detail + 0.4);
    roundRectPath(ctx, px - 24, 310, 48, 14, 5);
    fillStroke(ctx, clothFill(ctx, px - 6, 312, 36, KHAKI), KHAKI_LINE, LINE.detail + 0.4);
    circle(ctx, px, 318, 2.6, '#8a6a30');
  }
  // Sobres de semillas en el bolsillo izquierdo.
  roundRectPath(ctx, CX + 58, 296, 18, 22, 2);
  fillStroke(ctx, '#ffe9a8', '#8a6a30', LINE.detail);
  paintFlowerIcon(ctx, CX + 67, 306);
  roundRectPath(ctx, CX + 78, 300, 16, 18, 2);
  fillStroke(ctx, '#c8f0b0', '#4f7a3a', LINE.detail);
  // Cordon de la lupa.
  ctx.beginPath();
  ctx.moveTo(CX - 24, 278);
  ctx.quadraticCurveTo(CX - 4, 320, CX + 24, 330);
  ctx.moveTo(CX + 24, 278);
  ctx.quadraticCurveTo(CX + 30, 300, CX + 26, 326);
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = 2.6;
  ctx.stroke();
}

function paintFlowerIcon(ctx: Ctx, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 2.6, '#ff8cb8');
  }
  circle(ctx, x, y, 2, '#ffd23f');
}

/** Mano con la lupa: dentro, una hoja con sus nervios vista de cerca. */
function paintMagnifierHand(ctx: Ctx): void {
  paintSleeve(ctx, { x: 262, y: 351 }, { x: 264, y: 340 }, { x: 254, y: 316 }, 40, KHAKI, KHAKI_LINE);
  paintFist(ctx, 256, 298, 34, -0.15, FIELD_SKIN, () => {
    ctx.save();
    ctx.translate(256, 298);
    ctx.rotate(-0.15);
    roundRectPath(ctx, -7, -40, 14, 70, 6);
    fillStroke(ctx, clothFill(ctx, -2, -10, 30, ['#c98a4a', '#8a5a2a', '#5e3818']), '#3e220c', LINE.detail);
    ctx.restore();
  });
  // Lente por encima del puno.
  const x = 246;
  const y = 232;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#d8f4ff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  paintLeaf(ctx, x - 26, y + 18, 60, 24, -0.6);
  ctx.strokeStyle = 'rgba(42, 107, 34, 0.5)';
  ctx.lineWidth = 1.6;
  for (const k of [0.3, 0.5, 0.7]) {
    const bx = x - 26 + Math.cos(-0.6) * 60 * k;
    const by = y + 18 + Math.sin(-0.6) * 60 * k;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 4, by + 12);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 10, by - 6);
    ctx.stroke();
  }
  ellipse(ctx, x - 12, y - 14, 12, 6, 'rgba(255, 255, 255, 0.55)', -0.6);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.strokeStyle = '#3e220c';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#b07a3a';
  ctx.lineWidth = 5;
  ctx.stroke();
}

function paintFieldPatty(ctx: Ctx, pose: Pose): void {
  const skin = FIELD_SKIN;
  paintFieldShirt(ctx);
  paintHead(ctx, skin, eyes(skin, ['#9a7050', '#3a2010'], true), pose, '#c95466', true);
  paintBraidHair(ctx);
  paintBangs(ctx, 70);
  paintStrawHat(ctx);
  paintBraid(ctx);
  hurriedSweat(ctx, pose);
  paintMagnifierHand(ctx);
}

// ---------------------------------------------------------------------------

/** Verde de hoja: la placa con su nombre y el borde de su bocadillo. */
const PATTY_TONE = { light: '#d8f7b8', mid: '#7fd05a', dark: '#2f7a26' } as const;

export const PATTY_COAT: CharacterDesign = {
  id: 'patty-coat',
  character: 'patty',
  label: 'a) Bata',
  about: 'Joven, unos 28 años. Media melena con flequillo y una flor en el pelo, bata blanca con un pin de hoja y un tubo de ensayo con un brote.',
  tone: PATTY_TONE,
  paint: paintCoatPatty,
};

export const PATTY_GARDEN: CharacterDesign = {
  id: 'patty-garden',
  character: 'patty',
  label: 'b) Jardinera',
  about: 'Unos 38 años. Moño alto con flequillo y una flor, peto verde con la pala en el bolsillo, guante amarillo y una maceta con un brote.',
  tone: PATTY_TONE,
  paint: paintGardenPatty,
};

export const PATTY_FIELD: CharacterDesign = {
  id: 'patty-field',
  character: 'patty',
  label: 'c) Exploradora',
  about: 'Unos 55 años. Trenza con flequillo bajo un sombrero de paja con flor, camisa de campo con sobres de semillas y una lupa sobre una hoja.',
  tone: PATTY_TONE,
  paint: paintFieldPatty,
};

export const PATTY_PROPOSALS: readonly CharacterDesign[] = [PATTY_COAT, PATTY_GARDEN, PATTY_FIELD];
