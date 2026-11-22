import type * as Phaser from 'phaser';
import { OUTBREAKS } from '../config/balance';
import type { EnemyKind } from '../core/combat';
import type { OutbreakId } from '../core/outbreaks';
import type { CannonCount, ElementType, MineElement } from '../core/plants';
import { GARDEN, gardenSpots, gardenTier } from './gardenArt';
import { MEDAL, showsMedal } from './levelMedal';
import { SHOOTER } from './shooterShape';
import { FLOPPY_SIZE, HAT_SIZE, HASTE_STREAK_SIZE, MINE_SIZE, SHOOTER_SIZE, TEX, WALL_SIZE, WORM_SIZE, levelGardenTexture, medalTexture, mineTexture, shooterTexture, wallTexture } from './textures';
import type { WallWear } from './wallArt';
import { AURA_LOOK, auraTier, veilSize, veilStrength } from './wormAuraArt';
import { KIND_LOOK, WORM_LOOK } from './wormView';

/**
 * Foto de la ficha de informacion (T-010): la planta, la mina o el enemigo en reposo sobre un fondo de jardin, como
 * una foto de carne. Se compone con las texturas ya pintadas (no se pinta arte nuevo), asi que se ve igual que en el
 * tablero: con sus canones, su elemento, su armadura y su medallita. React solo la muestra como imagen (`<img>`).
 */
export type PortraitSubject =
  | { readonly kind: 'shooter'; readonly cannons: CannonCount; readonly element: ElementType | null; readonly level: number }
  | { readonly kind: 'mine'; readonly element: MineElement; readonly armed: boolean }
  /** Muro (T-024), con su desgaste. */
  | { readonly kind: 'wall'; readonly wear: WallWear }
  | {
      readonly kind: 'enemy';
      readonly enemy: EnemyKind;
      readonly level: number;
      /** Creeper en su fase 2: cara roja. */
      readonly enraged: boolean;
      /** Acelerado: lleva sus rayas de velocidad. */
      readonly hasted: boolean;
      /** Copia de un copion (T-025): sin su disquete. Sin decir, no lo es. */
      readonly clone?: boolean;
    };

/** Lado de la foto en pixeles CSS; el lienzo va al doble para que se vea nitida en pantallas densas. */
export const PORTRAIT_SIZE = 200;
const DENSITY = 2;
/** Donde apoyan los pies en la foto, y cuanto puede ocupar lo fotografiado (ancho y alto). */
const FRAME = { groundY: 170, maxWidth: 182, maxHeight: 150 } as const;

/** Fondo por tono: cielo arriba, una loma de cesped abajo y un halo suave del color de lo fotografiado. */
const BACKDROP = {
  skyTop: '#bfe6ff',
  skyBottom: '#eef9ff',
  lawnLight: '#9ad874',
  lawnDark: '#5aa642',
  corruptLight: '#6b4f8f',
  corruptDark: '#2b2034',
  halo: { plant: '#fff3b0', fire: '#ffc48a', ice: '#c9ecff', shield: '#f6dcae', enemy: '#c7ffd9' },
} as const;

/** Una pieza a pintar: textura, centro (o punto de origen) en unidades de la foto, escala y origen relativo. */
interface Piece {
  key: string;
  x: number;
  y: number;
  scale: number;
  /** Origen dentro de la textura, de 0 a 1 (como en Phaser). */
  ox: number;
  oy: number;
  /** Tamano de diseno de la textura. */
  width: number;
  height: number;
  /** No cuenta para el encuadre: puede salirse de la foto (las rayas de velocidad, el jardincito). */
  loose?: boolean;
  /** Volteada en horizontal. */
  flipX?: boolean;
  /** Opacidad (el aura de los gusanos, T-030); sin ella, opaca. */
  alpha?: number;
  /** Giro en grados alrededor de su origen (el disquete de los copiones, T-025). */
  angle?: number;
}

/**
 * El jardincito sale en la foto mas recogido que en el tablero (mas cerca de la planta y algo mas pequeno): asi asoma a
 * los lados sin que la planta encoja.
 */
const PORTRAIT_GARDEN = { spread: 0.7, scale: 0.85 } as const;

const cache = new Map<string, string>();

/**
 * Foto de `subject` como data URL (PNG). Se guarda: la misma foto no se compone dos veces. Sin fondo (`backdrop: false`)
 * sale recortada sobre transparente, con su sombra: es el dibujo de los bocadillos de los tours de ayuda (T-013).
 */
export function portraitUrl(scene: Phaser.Scene, subject: PortraitSubject, { backdrop = true }: { backdrop?: boolean } = {}): string {
  const key = `${backdrop ? 'photo' : 'cutout'}:${JSON.stringify(subject)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_SIZE * DENSITY;
  canvas.height = PORTRAIT_SIZE * DENSITY;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(DENSITY, DENSITY);
  if (backdrop) paintBackdrop(ctx, subject);
  const pieces = piecesFor(subject);
  placeInFrame(pieces);
  paintGroundShadow(ctx, pieces);
  for (const piece of pieces) drawPiece(ctx, scene, piece);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/**
 * El jefe de cada brote recortado, en reposo y sin enfadar, para los lugares de la ruta de brotes (T-019). La ruta lo
 * ensena en color si se puede jugar y en silueta si el brote esta cerrado.
 */
export function bossCutouts(scene: Phaser.Scene): Partial<Record<OutbreakId, string>> {
  const art: Partial<Record<OutbreakId, string>> = {};
  for (const { id, boss } of OUTBREAKS) {
    // Un brote en preparacion (T-024) aun no tiene jefe que recortar: la ruta lo da por "Proximamente".
    if (boss) art[id] = portraitUrl(scene, { kind: 'enemy', enemy: boss, level: 1, enraged: false, hasted: false }, { backdrop: false });
  }
  return art;
}

function paintBackdrop(ctx: CanvasRenderingContext2D, subject: PortraitSubject): void {
  const size = PORTRAIT_SIZE;
  const sky = ctx.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, BACKDROP.skyTop);
  sky.addColorStop(0.7, BACKDROP.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);

  // Halo detras de lo fotografiado, del color de su tono.
  const tone = haloOf(subject);
  const halo = ctx.createRadialGradient(size / 2, size * 0.5, 4, size / 2, size * 0.5, size * 0.55);
  halo.addColorStop(0, tone);
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Loma de cesped (o de suelo corrupto, para los enemigos, que vienen de ahi).
  const enemy = subject.kind === 'enemy';
  const lawn = ctx.createLinearGradient(0, FRAME.groundY - 30, 0, size);
  lawn.addColorStop(0, enemy ? BACKDROP.corruptLight : BACKDROP.lawnLight);
  lawn.addColorStop(1, enemy ? BACKDROP.corruptDark : BACKDROP.lawnDark);
  ctx.fillStyle = lawn;
  ctx.beginPath();
  ctx.moveTo(0, FRAME.groundY - 8);
  ctx.quadraticCurveTo(size / 2, FRAME.groundY - 34, size, FRAME.groundY - 8);
  ctx.lineTo(size, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.fill();
  if (enemy) {
    // Unas lucecitas verde neon en el suelo corrupto.
    ctx.fillStyle = 'rgba(57, 255, 136, 0.55)';
    for (const [x, y, r] of [
      [26, 186, 2.2],
      [64, 178, 1.6],
      [150, 182, 2],
      [180, 192, 1.5],
      [110, 194, 1.8],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Halo detras de lo fotografiado: el de su elemento, el de la planta o el de los enemigos. El muro, el del escudo. */
function haloOf(subject: PortraitSubject): string {
  if (subject.kind === 'enemy') return BACKDROP.halo.enemy;
  if (subject.kind === 'wall') return BACKDROP.halo.shield;
  const element: ElementType | null = subject.element;
  return element ? BACKDROP.halo[element] : BACKDROP.halo.plant;
}

/** Piezas de lo fotografiado, en unidades de su textura con los pies en (0, 0). Luego se escalan y centran. */
function piecesFor(subject: PortraitSubject): Piece[] {
  if (subject.kind === 'shooter') {
    const { width, height, footX, footY } = SHOOTER_SIZE;
    // Jardincito de los niveles con premio: lo de detras antes que la planta y lo de delante despues.
    const tier = gardenTier(subject.level);
    const garden = gardenSpots(tier).map((spot) => ({
      front: spot.front,
      piece: {
        key: levelGardenTexture(tier, spot.part),
        x: spot.dx * PORTRAIT_GARDEN.spread * SHOOTER_SIZE.width,
        y: spot.dy * SHOOTER_SIZE.width,
        scale: spot.scale * PORTRAIT_GARDEN.scale,
        ox: 0.5,
        oy: GARDEN.footY / GARDEN.height,
        width: GARDEN.width,
        height: GARDEN.height,
        loose: true,
        flipX: spot.flip,
      } satisfies Piece,
    }));
    const pieces: Piece[] = [
      ...garden.filter((g) => !g.front).map((g) => g.piece),
      { key: shooterTexture(subject.cannons, subject.element), x: 0, y: 0, scale: 1, ox: footX / width, oy: footY / height, width, height },
    ];
    if (showsMedal(subject.level)) {
      const medal = SHOOTER.medal(subject.cannons);
      pieces.push({ key: medalTexture(subject.level), x: medal.x - footX, y: medal.y - footY, scale: 1, ox: 0.5, oy: 0.5, width: MEDAL.size, height: MEDAL.size });
    }
    pieces.push(...garden.filter((g) => g.front).map((g) => g.piece));
    return pieces;
  }
  if (subject.kind === 'mine') {
    const { width, height, footX, footY } = MINE_SIZE;
    return [{ key: mineTexture(subject.element, subject.armed), x: 0, y: 0, scale: 1, ox: footX / width, oy: footY / height, width, height }];
  }
  if (subject.kind === 'wall') {
    const { width, height, footX, footY } = WALL_SIZE;
    return [{ key: wallTexture(subject.wear), x: 0, y: 0, scale: 1, ox: footX / width, oy: footY / height, width, height }];
  }
  return wormPieces(subject);
}

/**
 * El gusano en reposo, con la postura de `WORM_LOOK` y las texturas de su tipo (`KIND_LOOK`, las del tablero): rayas de
 * velocidad, anillos (y placas), el disquete de la espalda de los copiones (T-025), cabeza (y casco, o el gorro del juglar)
 * y medallita.
 */
function wormPieces(subject: Extract<PortraitSubject, { kind: 'enemy' }>): Piece[] {
  const art = KIND_LOOK[subject.enemy];
  const { head, segment } = WORM_SIZE;
  const pieces: Piece[] = [];
  // Aura de los tramos de nivel (T-030, Z-03): un velo quieto detras del cuerpo, como en el tablero en lo mas alto.
  const tier = auraTier(subject.enemy, subject.level);
  if (tier > 0) {
    const size = veilSize(tier);
    // La textura se estira a lo ancho y a lo alto por separado; aqui se aplica una sola escala: el alto se ajusta.
    const { width } = AURA_LOOK.veil;
    pieces.push({
      key: TEX.auraVeils[tier],
      x: 3,
      y: 3,
      scale: (size.width * WORM_LOOK.unitsPerCell) / width,
      ox: 0.5,
      oy: 1,
      width,
      height: (width * size.height) / size.width,
      loose: true,
      alpha: veilStrength(tier) * 0.9,
    });
  }
  if (subject.hasted) {
    const { streak } = WORM_LOOK;
    pieces.push({ key: TEX.hasteStreak, x: streak.x, y: streak.y, scale: streak.scale, ox: 0, oy: 0.5, ...HASTE_STREAK_SIZE, loose: true });
  }
  for (const s of WORM_LOOK.segments) {
    pieces.push({ key: art.segment, x: s.x, y: s.y, scale: s.scale, ox: 0.5, oy: 0.5, width: segment.size, height: segment.size });
    if (art.armor) pieces.push({ key: art.armor.plate, x: s.x, y: s.y, scale: s.scale, ox: 0.5, oy: 0.5, width: segment.size, height: segment.size });
  }
  if (art.pack && !subject.clone) {
    const [, middle, front] = WORM_LOOK.segments;
    const { pack } = WORM_LOOK;
    pieces.push({
      key: art.pack,
      x: (middle.x + front.x) / 2 + pack.x,
      y: Math.min(middle.y, front.y) + pack.y,
      scale: pack.scale,
      ox: 0.5,
      oy: 0.5,
      width: FLOPPY_SIZE.width,
      height: FLOPPY_SIZE.height,
      angle: pack.angle,
    });
  }
  const headKey = subject.enraged && art.angryHead ? art.angryHead.idle : art.head.idle;
  const headPiece = { x: WORM_LOOK.head.x, y: WORM_LOOK.head.y, scale: 1, ox: head.cx / head.width, oy: head.cy / head.height, width: head.width, height: head.height };
  pieces.push({ key: headKey, ...headPiece });
  if (art.armor) pieces.push({ key: art.armor.helmet, ...headPiece });
  if (art.hat) {
    const { width, height, cx, cy } = HAT_SIZE;
    pieces.push({ key: art.hat, x: headPiece.x, y: headPiece.y, scale: 1, ox: cx / width, oy: cy / height, width, height });
  }
  if (subject.enemy !== 'creeper' && subject.level > 1) {
    const { medal } = WORM_LOOK;
    pieces.push({
      key: medalTexture(subject.level),
      x: WORM_LOOK.head.x + medal.x,
      y: WORM_LOOK.head.y + medal.y,
      scale: medal.scale,
      ox: 0.5,
      oy: 0.5,
      width: MEDAL.size,
      height: MEDAL.size,
    });
  }
  return pieces;
}

/** Caja que ocupan las piezas que cuentan para el encuadre, en sus unidades. */
function bounds(pieces: readonly Piece[]): { left: number; right: number; top: number; bottom: number } {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const p of pieces) {
    if (p.loose) continue;
    const w = p.width * p.scale;
    const h = p.height * p.scale;
    left = Math.min(left, p.x - p.ox * w);
    right = Math.max(right, p.x + (1 - p.ox) * w);
    top = Math.min(top, p.y - p.oy * h);
    bottom = Math.max(bottom, p.y + (1 - p.oy) * h);
  }
  return { left, right, top, bottom };
}

/** Escala y centra las piezas en la foto: lo mas grande que quepa, con los pies sobre la loma. */
function placeInFrame(pieces: Piece[]): void {
  const box = bounds(pieces);
  const fit = Math.min(FRAME.maxWidth / (box.right - box.left), FRAME.maxHeight / Math.max(1, -box.top));
  const shiftX = PORTRAIT_SIZE / 2 - ((box.left + box.right) / 2) * fit;
  for (const p of pieces) {
    p.x = shiftX + p.x * fit;
    p.y = FRAME.groundY + p.y * fit;
    p.scale *= fit;
  }
}

/** Sombra en el suelo bajo lo fotografiado. */
function paintGroundShadow(ctx: CanvasRenderingContext2D, pieces: readonly Piece[]): void {
  const box = bounds(pieces);
  const width = (box.right - box.left) * 0.42;
  ctx.fillStyle = 'rgba(20, 40, 18, 0.28)';
  ctx.beginPath();
  ctx.ellipse((box.left + box.right) / 2, FRAME.groundY, width, width * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPiece(ctx: CanvasRenderingContext2D, scene: Phaser.Scene, piece: Piece): void {
  if (!scene.textures.exists(piece.key)) return;
  const image = scene.textures.get(piece.key).getSourceImage() as CanvasImageSource;
  const w = piece.width * piece.scale;
  const h = piece.height * piece.scale;
  ctx.globalAlpha = piece.alpha ?? 1;
  if (piece.angle) {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate((piece.angle * Math.PI) / 180);
    ctx.drawImage(image, -piece.ox * w, -piece.oy * h, w, h);
    ctx.restore();
    return;
  }
  if (!piece.flipX) {
    ctx.drawImage(image, piece.x - piece.ox * w, piece.y - piece.oy * h, w, h);
    return;
  }
  ctx.save();
  ctx.translate(piece.x, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, -piece.ox * w, piece.y - piece.oy * h, w, h);
  ctx.restore();
}
