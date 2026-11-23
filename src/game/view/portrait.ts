import type * as Phaser from 'phaser';
import { BASE_LEVEL, OUTBREAKS } from '../config/balance';
import type { EnemyKind } from '../core/combat';
import type { OutbreakId } from '../core/outbreaks';
import type { CannonCount, ElementType, MineElement } from '../core/plants';
import { GARDEN, gardenSpots, gardenTier } from './gardenArt';
import { MEDAL, MEDAL_SPROUT, showsMedal, showsSprout } from './levelMedal';
import { SHOOTER } from './shooterShape';
import {
  FLOPPY_SIZE,
  GRENADE_SIZE,
  HAT_SIZE,
  HASTE_STREAK_SIZE,
  ICE_BLOCK_SIZE,
  MINE_SIZE,
  SHOOTER_SIZE,
  BRAIN_TEX,
  BUG_TEX,
  TEX,
  WALL_SIZE,
  WORM_SIZE,
  iceBlockTexture,
  levelGardenTexture,
  medalTexture,
  mineTexture,
  shooterTexture,
  variantTexture,
  wallTexture,
  type IceWear,
} from './textures';
import { tintById, type TroopTintId } from './troopTint';
import type { WallWear } from './wallArt';
import { AURA_LOOK, auraTier, veilSize, veilStrength } from './wormAuraArt';
import { isBoss } from '../core/combat';
import { KIND_LOOK, WORM_LOOK, poseOf, type WormKind } from './wormView';
import { BUG_SIZE, LURKER_RIGS, SKIPPER_RIGS, hopLegAngles, type LegMount, type SkipperRig } from './bugArt';
import { BUG_LOOK, GAME_BUGS, LURKER_VARIANT, isBugKind, type BugKind } from './bugView';
import { BRAIN_DESIGN, BRAIN_RIGS, BRAIN_SIZE, brainLimbSize } from './brainArt';

/**
 * Foto de la ficha de informacion (T-010): la planta, la mina o el enemigo en reposo sobre un fondo de jardin, como
 * una foto de carne. Se compone con las texturas ya pintadas (no se pinta arte nuevo), asi que se ve igual que en el
 * tablero: con sus canones, su elemento, su armadura y su medallita. React solo la muestra como imagen (`<img>`).
 */
export type PortraitSubject =
  | {
      readonly kind: 'shooter';
      readonly cannons: CannonCount;
      readonly element: ElementType | null;
      readonly level: number;
      /** Nivel base de su partida (T-023): con uno comprado, su medallita lleva el brote del Invernadero. Sin decir, el 1. */
      readonly baseLevel?: number;
    }
  | { readonly kind: 'mine'; readonly element: MineElement; readonly armed: boolean }
  /** Muro (T-024), con su desgaste. */
  | { readonly kind: 'wall'; readonly wear: WallWear }
  /** Bloque del muro de hielo del poder (T-021), con su desgaste; y la granada encendida, para los dibujos de su tour. */
  | { readonly kind: 'ice'; readonly wear: IceWear }
  | { readonly kind: 'grenade' }
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
      /** Variante de color (T-041, `Enemy.variant`): la tropa con el tinte del brote que la recluto. Sin decir, ninguna. */
      readonly variant?: OutbreakId | null;
      /** Otro tinte que el del brote: la galeria de propuestas (`/proposals/variantes.html`). */
      readonly tint?: TroopTintId;
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
  /**
   * Es el dibujo de la tropa (cuerpo, cabeza, patas, armadura...): con variante de color (T-041), se tine. La medallita, el
   * aura y las rayas de velocidad no.
   */
  own?: boolean;
}

/** Marca como dibujo de la tropa (`Piece.own`) las piezas de `pieces` desde `from`. */
function markOwn(pieces: Piece[], from: number): void {
  for (let i = from; i < pieces.length; i++) pieces[i] = { ...pieces[i], own: true };
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
  const variant = subject.kind === 'enemy' ? (subject.variant ?? null) : null;
  const tint = subject.kind === 'enemy' && subject.tint ? tintById(subject.tint) : null;
  for (const piece of pieces) drawPiece(ctx, scene, piece.own && variant ? { ...piece, key: variantTexture(scene, piece.key, variant, tint) } : piece);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/**
 * La disparadora recien sembrada en cada nivel base (T-023), del 1 al maximo, con su medallita, su brote del Invernadero y,
 * en el 5, su jardincito. Recortada sobre transparente: va en su lata, en el vivero del Laboratorio de Patty (T-036).
 */
export function nurseryPortraits(scene: Phaser.Scene): Record<number, string> {
  const art: Record<number, string> = {};
  for (let level = 1; level <= BASE_LEVEL.max; level++) {
    art[level] = portraitUrl(scene, { kind: 'shooter', cannons: 1, element: null, level, baseLevel: level }, { backdrop: false });
  }
  return art;
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
  if (subject.kind === 'ice') return BACKDROP.halo.ice;
  if (subject.kind === 'grenade') return BACKDROP.halo.fire;
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
      if (showsSprout(subject.level, subject.baseLevel ?? 1)) {
        const { size, dx, dy, foot } = MEDAL_SPROUT;
        pieces.push({ key: TEX.medalSprout, x: medal.x + dx - footX, y: medal.y + dy - footY, scale: 1, ox: foot.x / size, oy: foot.y / size, width: size, height: size });
      }
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
  if (subject.kind === 'ice') {
    const { width, height, footX, footY } = ICE_BLOCK_SIZE;
    return [{ key: iceBlockTexture(subject.wear), x: 0, y: 0, scale: 1, ox: footX / width, oy: footY / height, width, height }];
  }
  if (subject.kind === 'grenade') {
    const { width, height, footX, footY } = GRENADE_SIZE;
    return [{ key: TEX.grenade.lit, x: 0, y: 0, scale: 1, ox: footX / width, oy: footY / height, width, height }];
  }
  if (subject.enemy === 'brain') return brainPieces();
  return isBugKind(subject.enemy) ? bugPieces(subject, subject.enemy) : wormPieces(subject, subject.enemy);
}

/**
 * Brain (T-039) en reposo, con la propuesta del juego (`BRAIN_DESIGN`): patas de atras, cuerpo, cara, cupula (si la lleva) y
 * patas de delante, como en el tablero. No tiene nivel ni aura.
 */
function brainPieces(): Piece[] {
  const rig = BRAIN_RIGS[BRAIN_DESIGN];
  const { body, face } = BRAIN_SIZE;
  const limb = brainLimbSize(BRAIN_DESIGN);
  const limbPiece = (mount: (typeof rig.legs)[number]): Piece => ({
    key: BRAIN_TEX.limb(BRAIN_DESIGN),
    x: rig.body.x + mount.x,
    y: rig.body.y + mount.y,
    scale: 1,
    ox: limb.hipX / limb.width,
    oy: limb.hipY / limb.height,
    width: limb.width,
    height: limb.height,
    angle: mount.angle,
    alpha: mount.far ? 0.8 : 1,
  });
  const bodyPiece = { x: rig.body.x, y: rig.body.y, scale: 1, ox: body.cx / body.width, oy: body.cy / body.height, width: body.width, height: body.height };
  return [
    ...rig.legs.filter((m) => m.far).map(limbPiece),
    { key: BRAIN_TEX.body(BRAIN_DESIGN), ...bodyPiece },
    { key: BRAIN_TEX.face(BRAIN_DESIGN, 'smug'), x: rig.body.x + rig.face.x, y: rig.body.y + rig.face.y, scale: 1, ox: face.cx / face.width, oy: face.cy / face.height, width: face.width, height: face.height },
    ...(BRAIN_DESIGN === 'dome' ? [{ key: BRAIN_TEX.glass(BRAIN_DESIGN), ...bodyPiece }] : []),
    ...rig.legs.filter((m) => !m.far).map(limbPiece),
  ];
}

/** Aura de los tramos de nivel (T-030, Z-03) y rayas de velocidad: un velo quieto detras del cuerpo, como en el tablero. */
function enemyBackdrop(subject: Extract<PortraitSubject, { kind: 'enemy' }>, streak: { x: number; y: number; scale: number }): Piece[] {
  const pieces: Piece[] = [];
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
  if (subject.hasted) pieces.push({ key: TEX.hasteStreak, x: streak.x, y: streak.y, scale: streak.scale, ox: 0, oy: 0.5, ...HASTE_STREAK_SIZE, loose: true });
  return pieces;
}

/**
 * Un bicho del brote 3 (T-038) en reposo, con su montaje (`LURKER_RIGS`, `SKIPPER_RIGS`) y las texturas de las propuestas del
 * juego: las patas del otro lado (algo apagadas), la pata de saltar del Skipper, el cuerpo (y las placas del acorazado), las
 * patas de este lado, la cabeza (y el casco) y la medallita. Se ve con sus colores, aunque este oculto: la ficha lo dice.
 */
function bugPieces(subject: Extract<PortraitSubject, { kind: 'enemy' }>, kind: BugKind): Piece[] {
  const { body, head, leg, thigh, shin } = BUG_SIZE;
  const skipper = kind === 'skipper';
  const rig = skipper ? SKIPPER_RIGS[GAME_BUGS.skipper] : LURKER_RIGS[GAME_BUGS.lurker];
  const variant = skipper ? 'base' : LURKER_VARIANT[kind];
  const bodyKey = skipper ? BUG_TEX.skipperBody(GAME_BUGS.skipper) : BUG_TEX.lurkerBody(GAME_BUGS.lurker, variant);
  const legKey = skipper ? BUG_TEX.skipperLeg(GAME_BUGS.skipper) : BUG_TEX.lurkerLeg(GAME_BUGS.lurker, variant);
  const headKey = skipper ? BUG_TEX.skipperHead(GAME_BUGS.skipper, 'idle') : BUG_TEX.lurkerHead(GAME_BUGS.lurker, variant, 'idle');
  const pieces = enemyBackdrop(subject, BUG_LOOK.streak);
  const backdrop = pieces.length;
  const legPiece = (mount: LegMount): Piece => ({
    key: legKey,
    x: mount.x,
    y: mount.y,
    scale: 1,
    ox: leg.hipX / leg.width,
    oy: leg.hipY / leg.height,
    width: leg.width,
    height: leg.height,
    alpha: mount.far ? 0.8 : 1,
  });
  const jumpLeg = (far: boolean): Piece[] => {
    if (!skipper) return [];
    const r = rig as SkipperRig;
    const shift = far ? 8 : 0;
    const hip = { x: r.hip.x + shift, y: r.hip.y - (far ? 5 : 0) };
    const angles = hopLegAngles(hip, { x: r.foot.x + shift, y: r.foot.y });
    const alpha = far ? 0.8 : 1;
    const deg = (rad: number) => (rad * 180) / Math.PI;
    return [
      { key: BUG_TEX.skipperShin(GAME_BUGS.skipper), x: angles.knee.x, y: angles.knee.y, scale: 1, ox: shin.pivotX / shin.width, oy: shin.pivotY / shin.height, width: shin.width, height: shin.height, angle: deg(angles.shin), alpha },
      { key: BUG_TEX.skipperThigh(GAME_BUGS.skipper), x: hip.x, y: hip.y, scale: 1, ox: thigh.pivotX / thigh.width, oy: thigh.pivotY / thigh.height, width: thigh.width, height: thigh.height, angle: deg(angles.thigh), alpha },
    ];
  };
  pieces.push(...rig.legs.filter((m) => m.far).map(legPiece), ...jumpLeg(true));
  const bodyPiece = { x: rig.body.x, y: rig.body.y, scale: 1, ox: body.cx / body.width, oy: body.cy / body.height, width: body.width, height: body.height };
  pieces.push({ key: bodyKey, ...bodyPiece });
  if (variant === 'armored') for (const part of [1, 0] as const) pieces.push({ key: BUG_TEX.lurkerPlate(GAME_BUGS.lurker, part), ...bodyPiece });
  pieces.push(...rig.legs.filter((m) => !m.far).map(legPiece), ...jumpLeg(false));
  const headPiece = { x: rig.head.x, y: rig.head.y, scale: 1, ox: head.cx / head.width, oy: head.cy / head.height, width: head.width, height: head.height };
  pieces.push({ key: headKey, ...headPiece });
  if (variant === 'armored') pieces.push({ key: BUG_TEX.lurkerHelmet(GAME_BUGS.lurker), ...headPiece });
  markOwn(pieces, backdrop);
  if (subject.level > 1) {
    pieces.push({
      key: medalTexture(subject.level),
      x: rig.head.x + rig.medal.x,
      y: rig.head.y + rig.medal.y,
      scale: BUG_LOOK.medalScale,
      ox: 0.5,
      oy: 0.5,
      width: MEDAL.size,
      height: MEDAL.size,
    });
  }
  return pieces;
}

/**
 * El gusano en reposo, con su postura (la de `WORM_LOOK` o, Elk Cloner, la suya de pie, T-026) y las texturas de su tipo
 * (`KIND_LOOK`, las del tablero): rayas de velocidad, anillos (y placas), adornos pegados a los anillos (la gorguera y los
 * pies de Elk Cloner), el disquete de la espalda de los copiones (T-025), cabeza (y casco, o el gorro del juglar o la
 * cornamenta) y medallita.
 */
function wormPieces(subject: Extract<PortraitSubject, { kind: 'enemy' }>, kind: WormKind): Piece[] {
  const art = KIND_LOOK[kind];
  const pose = poseOf(kind);
  const { head, segment } = WORM_SIZE;
  const pieces = enemyBackdrop(subject, WORM_LOOK.streak);
  const backdrop = pieces.length;
  const trim = (behind: boolean) =>
    (art.trims ?? [])
      .filter((t) => t.behind === behind)
      .forEach((t) => {
        const s = pose.segments[t.segment];
        pieces.push({ key: t.key, x: s.x + t.x, y: s.y + t.y, scale: t.scale, ox: t.origin.x / t.size.width, oy: t.origin.y / t.size.height, ...t.size });
      });
  trim(true);
  for (const s of pose.segments) {
    pieces.push({ key: art.segment, x: s.x, y: s.y, scale: s.scale, ox: 0.5, oy: 0.5, width: segment.size, height: segment.size });
    if (art.armor) pieces.push({ key: art.armor.plate, x: s.x, y: s.y, scale: s.scale, ox: 0.5, oy: 0.5, width: segment.size, height: segment.size });
  }
  trim(false);
  if (art.pack && !subject.clone) {
    const [, middle, front] = pose.segments;
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
  const headPiece = { x: pose.head.x, y: pose.head.y, scale: 1, ox: head.cx / head.width, oy: head.cy / head.height, width: head.width, height: head.height };
  pieces.push({ key: headKey, ...headPiece });
  if (art.armor) pieces.push({ key: art.armor.helmet, ...headPiece });
  if (art.hat) {
    const { width, height, cx, cy } = HAT_SIZE;
    pieces.push({ key: art.hat, x: headPiece.x, y: headPiece.y, scale: 1, ox: cx / width, oy: cy / height, width, height });
  }
  markOwn(pieces, backdrop);
  if (!isBoss(subject.enemy) && subject.level > 1) {
    const { medal } = WORM_LOOK;
    pieces.push({
      key: medalTexture(subject.level),
      x: pose.head.x + medal.x,
      y: pose.head.y + medal.y,
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
