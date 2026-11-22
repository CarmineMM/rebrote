import { type Ctx, circle, ellipse } from './canvasKit';
import { HAT_SIZE } from './troopArt';

/**
 * Arte de Elk Cloner, el Poeta (T-026), sin Phaser: lo registra `textures.ts` y lo colocan `wormView.ts` (su cuerpo, con
 * la postura de pie de `KIND_LOOK.elkCloner`), `elkClonerView.ts` (su vista y la de cuando se prepara) y la foto de la
 * ficha (`portrait.ts`). L-09: un bicho con un disquete por cabeza, como Creeper lleva un monitor; para que no se le
 * parezca, va de pie y no tumbado, con una cornamenta (el alce de su nombre) y en azul, granate y oro, no en crema y verde.
 * - Cabeza: un disquete de 5¼ azul. La cara va dibujada en la etiqueta, como con rotulador; la boca es la ventana de lectura,
 *   por la que asoma el disco marron. El aro del centro hace de nariz.
 * - Cuerpo: cuentas granate con una banda dorada, apiladas; gorguera blanca de poeta bajo la cabeza y dos pies que asoman.
 * - Cornamenta dorada en el lienzo del sombrero (`HAT_SIZE`), con una pluma de escribir metida detras.
 * - El poema entero (L-03): el mismo verso que el del Minstrel, en dorado (`POEM_INK`). El pergamino y la pluma, para
 *   cuando se prepara escribiendolo.
 * Mismo estilo que el resto (guia de graficos, seccion 10): degradado con la luz arriba a la izquierda, contorno oscuro
 * del mismo tono y un reflejo suave.
 */

/** Cuanto se agranda el disquete dentro de su lienzo. */
const ELK_HEAD_SCALE = 1.17;

/**
 * Lo alto del disquete respecto al centro de la cabeza (el de `WORM_SIZE.head`), ya agrandado: de ahi sale la cornamenta.
 */
export const ELK_HEAD_TOP = -3 - 35 * ELK_HEAD_SCALE;

/** Disquete de la cabeza (mismo lienzo que la del gusano: `WORM_SIZE.head`, 104 x 104 con el centro en 52, 62). */
export const ELK_HEAD = {
  sleeve: ['#8fa2ff', '#4459d6', '#1f2a80'] as const,
  outline: '#0e1440',
  label: '#fff6dc',
  labelShade: '#ecdcb4',
  stripes: ['#ffcf4a', '#b8335f'] as const,
  ink: '#1c1430',
  hub: ['#ffffff', '#c9d2e3', '#7d879b'] as const,
  disk: ['#a7703f', '#6a3f1e', '#2e1708'] as const,
  blush: 'rgba(255, 128, 176, 0.55)',
  gold: '#ffd36a',
} as const;

/** Cuentas del cuerpo, gorguera y pies. */
export const ELK_BODY = {
  bead: ['#ffc8da', '#bf3b67', '#6c1336'] as const,
  outline: '#3e0a1e',
  band: '#ffd36a',
  bandDark: '#a8700e',
  ruff: ['#ffffff', '#f2ecff', '#c9bfe0'] as const,
  ruffOutline: '#5b4a6e',
} as const;

/** Cornamenta y pluma. */
export const ELK_ANTLER = {
  bone: ['#fff1c2', '#e2aa52', '#8f5a20'] as const,
  /** El asta de atras, en sombra. */
  boneBack: ['#e9d29a', '#bf8a3c', '#6f4416'] as const,
  outline: '#4e300e',
  quill: ['#ffffff', '#efe9ff', '#b7acd6'] as const,
  quillOutline: '#4b3d63',
  nib: '#2a2238',
} as const;

/** Tinta dorada del poema entero: con contorno pardo, para que sobre el cesped no se quede blanca. */
export const POEM_INK = { glow: '#fff6c2', mid: '#ffc23a', outline: '#6a3a00' } as const;

/** Gorguera: lienzo ancho y bajo; su centro va sobre la cuenta de arriba. */
export const RUFF_SIZE = { width: 104, height: 46, cx: 52, cy: 23 } as const;
/** Pies: asoman por delante de la cuenta de abajo; su origen es el centro de arriba. */
export const FEET_SIZE = { width: 88, height: 30, cx: 44, cy: 6 } as const;
/** Pergamino que escribe mientras se prepara: `lines` son los renglones (y, desde arriba) donde la vista pone la tinta. */
export const SCROLL_SIZE = { width: 112, height: 100, left: 18, right: 94, lines: [30, 41, 52, 63, 74] } as const;
/** Pluma suelta: la punta abajo a la izquierda (`nibX`, `nibY`). */
export const QUILL_SIZE = { width: 64, height: 64, nibX: 8, nibY: 58 } as const;

/** Lo que pone la cara: tranquila, mordiendo, dolorida, tomando aire, recitando o anunciando el poema entero (L-03). */
export type ElkMood = 'idle' | 'bite' | 'hurt' | 'inhale' | 'recite' | 'poem';

export const ELK_MOODS: readonly ElkMood[] = ['idle', 'bite', 'hurt', 'inhale', 'recite', 'poem'];

/**
 * Como va el aro del centro del disquete. Con el aro de metal (como al principio de T-026) parecia un tercer ojo, asi que
 * Carmine pidio quitarlo o dejarlo muy sutil (22 nov 2026). Las cuatro se comparan en `/jefes.html`; Carmine eligio el mate (C), que es `ELK_HUB`.
 */
export type ElkHub = 'metal' | 'faint' | 'matte' | 'none';

export const ELK_HUBS: ReadonlyArray<{ readonly id: ElkHub; readonly letter: string; readonly name: string; readonly about: string }> = [
  { id: 'metal', letter: 'A', name: 'Aro de metal', about: 'El de antes: plateado, con su agujero y el agujero índice al lado. Se lee como un tercer ojo.' },
  {
    id: 'faint',
    letter: 'B',
    name: 'Aro tenue',
    about: 'Solo un anillo fino y medio transparente del azul claro de la funda, con un brillo: se adivina el disquete sin que tire de la mirada.',
  },
  { id: 'matte', letter: 'C', name: 'Aro mate', about: 'Opaco, del azul oscuro de la funda y sin agujero ni brillo: un círculo hundido en el plástico, como si fuera parte de él.' },
  { id: 'none', letter: 'D', name: 'Sin aro', about: 'Nada en el centro: el disquete se reconoce por la etiqueta, la muesca y la ventana de lectura (la boca).' },
];

/** Aro que usa el juego (elegido en `/jefes.html`). */
export const ELK_HUB: ElkHub = 'matte';

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Ojo abierto pintado en la etiqueta: blanco con contorno de tinta, la pupila hacia `look` y un brillo. */
function openEye(ctx: Ctx, x: number, y: number, rx: number, ry: number, look: { x: number; y: number }, pupil: string): void {
  ellipse(ctx, x, y, rx, ry, '#ffffff');
  ctx.strokeStyle = ELK_HEAD.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  const px = x + look.x * rx * 0.4;
  const py = y + look.y * ry * 0.4;
  circle(ctx, px, py, rx * 0.52, pupil);
  circle(ctx, px - rx * 0.2, py - ry * 0.28, rx * 0.2, '#ffffff');
}

/**
 * Cabeza de Elk Cloner (`WORM_SIZE.head`): un disquete de 5¼ azul algo inclinado hacia delante (a la izquierda). En la
 * etiqueta, los ojos, dibujados con tinta; el aro del centro, de nariz; la ventana de lectura, de boca, con el disco
 * marron dentro. `scale` es la resolucion de la textura, para el brillo del poema.
 */
export function paintElkHead(ctx: Ctx, mood: ElkMood, scale: number, hubStyle: ElkHub = ELK_HUB): void {
  const H = ELK_HEAD;
  const x0 = 18;
  const y0 = 24;
  const side = 70;
  const cx = x0 + side / 2;
  const cy = y0 + side / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.07);
  // Algo mas grande que la cabeza de un gusano: es el jefe, y la cara tiene que leerse en el carril del fondo.
  ctx.scale(ELK_HEAD_SCALE, ELK_HEAD_SCALE);
  ctx.translate(-cx, -cy);

  // Funda.
  const sleeve = ctx.createLinearGradient(x0, y0, x0 + side, y0 + side);
  sleeve.addColorStop(0, H.sleeve[0]);
  sleeve.addColorStop(0.45, H.sleeve[1]);
  sleeve.addColorStop(1, H.sleeve[2]);
  roundRect(ctx, x0, y0, side, side, 9);
  ctx.fillStyle = sleeve;
  ctx.fill();
  ctx.strokeStyle = H.outline;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // Muesca de proteger contra escritura, en el borde de atras.
  ctx.fillStyle = H.outline;
  ctx.fillRect(x0 + side - 4, y0 + 30, 5, 8);
  // Reflejo en la esquina de arriba.
  ctx.save();
  roundRect(ctx, x0, y0, side, side, 9);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 26);
  ctx.lineTo(x0 + 26, y0);
  ctx.lineTo(x0 + 36, y0);
  ctx.lineTo(x0, y0 + 36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Etiqueta con sus dos rayas; ahi van los ojos.
  const label = { x: x0 + 5, y: y0 + 4, w: side - 13, h: 27 };
  const paper = ctx.createLinearGradient(0, label.y, 0, label.y + label.h);
  paper.addColorStop(0, H.label);
  paper.addColorStop(1, H.labelShade);
  roundRect(ctx, label.x, label.y, label.w, label.h, 4);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.strokeStyle = 'rgba(14, 20, 64, 0.6)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  H.stripes.forEach((stripe, i) => {
    ctx.fillStyle = stripe;
    ctx.fillRect(label.x + 4, label.y + 3 + i * 3.4, label.w - 8, 2.2);
  });

  // Ojos: el de delante (izquierda) mas grande, como los de los gusanos.
  const eyes = [
    { x: x0 + 19, y: y0 + 21, rx: 7.5, ry: 8 },
    { x: x0 + 40, y: y0 + 20, rx: 6.5, ry: 7 },
  ];
  ctx.strokeStyle = H.ink;
  if (mood === 'hurt') {
    ctx.lineWidth = 3;
    eyes.forEach((eye, i) => {
      const dir = i === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(eye.x - dir * 5, eye.y - 5.5);
      ctx.lineTo(eye.x + dir * 4, eye.y);
      ctx.lineTo(eye.x - dir * 5, eye.y + 5.5);
      ctx.stroke();
    });
  } else if (mood === 'inhale' || mood === 'recite') {
    // Ojos cerrados de gusto, con las cejas altas: esta declamando.
    ctx.lineWidth = 3;
    for (const eye of eyes) {
      ctx.beginPath();
      ctx.arc(eye.x, eye.y + 3, eye.rx * 0.7, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(eye.x, eye.y - eye.ry + 1, eye.rx * 0.7, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.lineWidth = 3;
    }
  } else if (mood === 'poem') {
    // Ojos muy abiertos mirando arriba, con las pupilas doradas: viene lo grande.
    for (const eye of eyes) openEye(ctx, eye.x, eye.y, eye.rx + 0.8, eye.ry + 1, { x: -0.4, y: -0.8 }, '#8a5a00');
    ctx.lineWidth = 2.4;
    for (const eye of eyes) {
      ctx.beginPath();
      ctx.arc(eye.x, eye.y - eye.ry - 1, eye.rx * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    for (const eye of eyes) openEye(ctx, eye.x, eye.y, eye.rx, eye.ry, { x: -1, y: 0.2 }, H.ink);
    if (mood === 'bite') {
      ctx.lineWidth = 2.6;
      for (const eye of eyes) {
        ctx.beginPath();
        ctx.moveTo(eye.x - eye.rx, eye.y - eye.ry - 1);
        ctx.lineTo(eye.x + eye.rx * 0.6, eye.y - eye.ry + 4);
        ctx.stroke();
      }
    }
  }

  // Aro del centro (`ElkHub`): de metal con su agujero, tenue, mate o ninguno.
  const hub = { x: x0 + 38, y: y0 + 44 };
  if (hubStyle === 'metal') {
    const metal = ctx.createRadialGradient(hub.x - 3, hub.y - 3, 1, hub.x, hub.y, 9);
    metal.addColorStop(0, H.hub[0]);
    metal.addColorStop(0.55, H.hub[1]);
    metal.addColorStop(1, H.hub[2]);
    circle(ctx, hub.x, hub.y, 9.5, H.outline);
    circle(ctx, hub.x, hub.y, 8, metal);
    circle(ctx, hub.x, hub.y, 3.6, H.outline);
    circle(ctx, hub.x + 13, hub.y + 1, 1.8, H.outline);
  } else if (hubStyle === 'faint') {
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(190, 205, 255, 0.32)';
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 7.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 7.5, Math.PI * 1.05, Math.PI * 1.5);
    ctx.stroke();
  } else if (hubStyle === 'matte') {
    circle(ctx, hub.x, hub.y, 8, 'rgba(14, 20, 64, 0.35)');
    circle(ctx, hub.x + 0.6, hub.y + 0.6, 6.6, H.sleeve[1]);
  }

  // Mofletes.
  const puff = mood === 'inhale' ? 1.5 : 1;
  ellipse(ctx, x0 + 8, y0 + 50, 6 * puff, 4.2 * puff, H.blush);
  ellipse(ctx, x0 + 33, y0 + 59, 5 * puff, 3.5 * puff, H.blush);

  // Boca: la ventana de lectura, con el disco marron dentro.
  const mouth = { x: x0 + 17, y: y0 + 55 };
  const disk = (rx: number, ry: number) => {
    const g = ctx.createRadialGradient(mouth.x - rx * 0.3, mouth.y - ry * 0.4, 1, mouth.x, mouth.y, Math.max(rx, ry));
    g.addColorStop(0, H.disk[0]);
    g.addColorStop(0.6, H.disk[1]);
    g.addColorStop(1, H.disk[2]);
    return g;
  };
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = H.outline;
  if (mood === 'recite' || mood === 'poem') {
    const rx = mood === 'poem' ? 9.5 : 8;
    const ry = mood === 'poem' ? 10.5 : 9;
    ellipse(ctx, mouth.x, mouth.y, rx, ry, disk(rx, ry));
    ctx.beginPath();
    ctx.ellipse(mouth.x, mouth.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ellipse(ctx, mouth.x + 1, mouth.y + ry * 0.45, rx * 0.55, ry * 0.32, '#ff7aa8');
    if (mood === 'poem') {
      // Le brilla la boca, en oro.
      ctx.save();
      ctx.shadowColor = '#ffd36a';
      ctx.shadowBlur = 8 * scale;
      ellipse(ctx, mouth.x - 1, mouth.y - 2, rx * 0.45, ry * 0.4, 'rgba(255, 230, 140, 0.8)');
      ctx.restore();
    }
  } else if (mood === 'bite') {
    roundRect(ctx, mouth.x - 9, mouth.y - 6, 18, 12, 4);
    ctx.fillStyle = disk(9, 6);
    ctx.fill();
    ctx.stroke();
    // Dientes de plastico arriba y abajo.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(mouth.x - 7 + i * 5, mouth.y - 5);
      ctx.lineTo(mouth.x - 4.5 + i * 5, mouth.y - 1);
      ctx.lineTo(mouth.x - 2 + i * 5, mouth.y - 5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mouth.x - 7 + i * 5, mouth.y + 5);
      ctx.lineTo(mouth.x - 4.5 + i * 5, mouth.y + 1);
      ctx.lineTo(mouth.x - 2 + i * 5, mouth.y + 5);
      ctx.fill();
    }
  } else if (mood === 'inhale') {
    ellipse(ctx, mouth.x + 1, mouth.y, 3.4, 3, disk(3.4, 3));
    ctx.beginPath();
    ctx.ellipse(mouth.x + 1, mouth.y, 3.4, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mood === 'hurt') {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mouth.x - 8, mouth.y + 1);
    for (let i = 1; i <= 4; i++) ctx.lineTo(mouth.x - 8 + i * 4, mouth.y + (i % 2 ? -2.5 : 2));
    ctx.stroke();
  } else {
    // Ventana cerrada en sonrisa: una media luna con el disco asomando.
    ctx.beginPath();
    ctx.moveTo(mouth.x - 9, mouth.y - 2);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 9, mouth.x + 9, mouth.y - 3);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 2, mouth.x - 9, mouth.y - 2);
    ctx.closePath();
    ctx.fillStyle = disk(9, 5);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Cuenta del cuerpo (`WORM_SIZE.segment`, 64 x 64 con radio 27): granate, con la banda dorada en el lado de atras. */
export function paintElkSegment(ctx: Ctx, w: number): void {
  const c = w / 2;
  const r = 27;
  const g = ctx.createRadialGradient(c - 9, c - 10, 3, c, c, r);
  g.addColorStop(0, ELK_BODY.bead[0]);
  g.addColorStop(0.5, ELK_BODY.bead[1]);
  g.addColorStop(1, ELK_BODY.bead[2]);
  circle(ctx, c, c, r, g);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = ELK_BODY.bandDark;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(c + 10, c, 6.5, r + 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = ELK_BODY.band;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  // Dos botoncitos dorados delante, como un jubon.
  circle(ctx, c - 12, c - 4, 2.6, ELK_BODY.bandDark);
  circle(ctx, c - 12, c - 4, 1.7, ELK_BODY.band);
  circle(ctx, c - 13, c + 7, 2.6, ELK_BODY.bandDark);
  circle(ctx, c - 13, c + 7, 1.7, ELK_BODY.band);
  ctx.strokeStyle = ELK_BODY.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, c - 9, c - 12, 8, 5, 'rgba(255, 255, 255, 0.4)', -0.5);
}

/** Gorguera de poeta (`RUFF_SIZE`): un cuello de lechuguilla blanco, plisado, visto un poco desde arriba, con un broche de oro. */
export function paintElkRuff(ctx: Ctx): void {
  const { cx, cy } = RUFF_SIZE;
  const rx = 46;
  const ry = 16;
  const bumps = 16;
  ctx.lineJoin = 'round';
  const fill = ctx.createRadialGradient(cx - 14, cy - 8, 3, cx, cy, rx);
  fill.addColorStop(0, ELK_BODY.ruff[0]);
  fill.addColorStop(0.6, ELK_BODY.ruff[1]);
  fill.addColorStop(1, ELK_BODY.ruff[2]);
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const b = ((i + 0.5) / bumps) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(cx + Math.cos(b - Math.PI / bumps) * (rx + 6), cy + Math.sin(b - Math.PI / bumps) * (ry + 4), x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ELK_BODY.ruffOutline;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Pliegues que salen del cuello.
  ctx.strokeStyle = 'rgba(91, 74, 110, 0.4)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rx * 0.35, cy + Math.sin(a) * ry * 0.35);
    ctx.lineTo(cx + Math.cos(a) * rx * 0.95, cy + Math.sin(a) * ry * 0.95);
    ctx.stroke();
  }
  // Broche de oro por delante.
  circle(ctx, cx - 26, cy + 9, 5.5, ELK_BODY.bandDark);
  circle(ctx, cx - 26, cy + 9, 4, ELK_BODY.band);
  circle(ctx, cx - 27.5, cy + 7.5, 1.4, '#ffffff');
}

/** Pies (`FEET_SIZE`): dos pies granate que asoman bajo la cuenta de abajo, el de delante mas grande, con unas de oro. */
export function paintElkFeet(ctx: Ctx): void {
  const feet = [
    { x: 60, y: 15, rx: 13, ry: 8, shade: 0.75 },
    { x: 26, y: 17, rx: 16, ry: 9, shade: 1 },
  ];
  for (const foot of feet) {
    const g = ctx.createRadialGradient(foot.x - 5, foot.y - 4, 1, foot.x, foot.y, foot.rx);
    g.addColorStop(0, ELK_BODY.bead[0]);
    g.addColorStop(0.55, ELK_BODY.bead[1]);
    g.addColorStop(1, ELK_BODY.bead[2]);
    ctx.globalAlpha = foot.shade;
    ellipse(ctx, foot.x, foot.y, foot.rx, foot.ry, g);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ELK_BODY.outline;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y, foot.rx, foot.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) circle(ctx, foot.x - foot.rx * 0.7 + i * 3.2, foot.y + foot.ry * 0.35 - i * 1.6, 1.8, ELK_BODY.band);
  }
}

/** Una punta de la cornamenta: el trazo grueso del contorno y encima el del hueso. */
function beam(ctx: Ctx, points: ReadonlyArray<readonly [number, number]>, width: number, fill: CanvasGradient): void {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    if (points.length === 3) ctx.quadraticCurveTo(points[1][0], points[1][1], points[2][0], points[2][1]);
    else ctx.lineTo(points[1][0], points[1][1]);
  };
  path();
  ctx.strokeStyle = ELK_ANTLER.outline;
  ctx.lineWidth = width + 4;
  ctx.stroke();
  path();
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
}

/**
 * Cornamenta (en el lienzo del sombrero, `HAT_SIZE`, con el centro de la cabeza en `cx`, `cy`): dos astas doradas que salen
 * de lo alto del disquete y se abren hacia arriba con sus puntas, la de atras algo mas oscura y tapada. Detras de la de
 * atras, una pluma de escribir: es el Poeta.
 */
export function paintElkAntlers(ctx: Ctx): void {
  const { cx, cy } = HAT_SIZE;
  const top = cy + ELK_HEAD_TOP + 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Algo recogida para que quepa en el lienzo encima del disquete agrandado.
  ctx.save();
  ctx.translate(cx, top);
  ctx.scale(0.86, 0.86);
  ctx.translate(-cx, -top);

  // Pluma de escribir, detras de todo.
  ctx.save();
  ctx.translate(cx + 30, top + 4);
  ctx.rotate(0.55);
  const vane = ctx.createLinearGradient(0, 0, 0, -50);
  vane.addColorStop(0, ELK_ANTLER.quill[2]);
  vane.addColorStop(0.5, ELK_ANTLER.quill[1]);
  vane.addColorStop(1, ELK_ANTLER.quill[0]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-12, -14, -8, -40, 3, -54);
  ctx.bezierCurveTo(12, -38, 11, -14, 0, 0);
  ctx.closePath();
  ctx.fillStyle = vane;
  ctx.fill();
  ctx.strokeStyle = ELK_ANTLER.quillOutline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(75, 61, 99, 0.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(1, -26, 3, -52);
  ctx.stroke();
  ctx.restore();

  const bone = (x0: number, y0: number, x1: number, y1: number, colors: readonly [string, string, string]) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.5, colors[1]);
    g.addColorStop(1, colors[2]);
    return g;
  };
  // Asta de atras (a la derecha): en sombra y algo mas pequena.
  const back = bone(cx + 30, top - 50, cx + 18, top + 4, ELK_ANTLER.boneBack);
  beam(ctx, [[cx + 18, top + 4], [cx + 30, top - 18], [cx + 38, top - 50]], 6.5, back);
  beam(ctx, [[cx + 27, top - 14], [cx + 46, top - 24]], 5, back);
  beam(ctx, [[cx + 33, top - 32], [cx + 52, top - 44]], 4.5, back);
  beam(ctx, [[cx + 36, top - 42], [cx + 28, top - 58]], 4, back);
  // Asta de delante (a la izquierda).
  const front = bone(cx - 30, top - 56, cx - 14, top + 6, ELK_ANTLER.bone);
  beam(ctx, [[cx - 14, top + 6], [cx - 30, top - 16], [cx - 36, top - 54]], 7.5, front);
  beam(ctx, [[cx - 25, top - 10], [cx - 47, top - 18]], 5.5, front);
  beam(ctx, [[cx - 32, top - 30], [cx - 54, top - 40]], 5, front);
  beam(ctx, [[cx - 35, top - 42], [cx - 25, top - 62]], 4.5, front);
  // Brillo en el asta de delante.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 18, top - 2);
  ctx.quadraticCurveTo(cx - 29, top - 18, cx - 33, top - 40);
  ctx.stroke();
  ctx.restore();
}

/** Pergamino (`SCROLL_SIZE`): una hoja crema con un rollo arriba y otro abajo y los renglones apenas marcados. */
export function paintElkScroll(ctx: Ctx): void {
  const { width, height, left, right, lines } = SCROLL_SIZE;
  ctx.lineJoin = 'round';
  const paper = ctx.createLinearGradient(0, 12, 0, height - 12);
  paper.addColorStop(0, '#fff7e0');
  paper.addColorStop(1, '#f1d9a6');
  ctx.beginPath();
  ctx.moveTo(left - 4, 14);
  ctx.lineTo(right + 4, 14);
  ctx.quadraticCurveTo(right + 8, height / 2, right + 4, height - 14);
  ctx.lineTo(left - 4, height - 14);
  ctx.quadraticCurveTo(left - 8, height / 2, left - 4, 14);
  ctx.closePath();
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.strokeStyle = '#6b4a22';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(107, 74, 34, 0.18)';
  ctx.lineWidth = 1.2;
  for (const y of lines) {
    ctx.beginPath();
    ctx.moveTo(left + 4, y + 3);
    ctx.lineTo(right - 4, y + 3);
    ctx.stroke();
  }
  // Rollos de arriba y de abajo.
  for (const y of [12, height - 12]) {
    const roll = ctx.createLinearGradient(0, y - 7, 0, y + 7);
    roll.addColorStop(0, '#f4dba2');
    roll.addColorStop(0.5, '#d9ad62');
    roll.addColorStop(1, '#9c6c30');
    roundRect(ctx, 6, y - 7, width - 12, 14, 7);
    ctx.fillStyle = roll;
    ctx.fill();
    ctx.strokeStyle = '#6b4a22';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    circle(ctx, 8, y, 4, '#b8335f');
    circle(ctx, width - 8, y, 4, '#b8335f');
  }
}

/** Pluma suelta (`QUILL_SIZE`), con la punta abajo a la izquierda: con ella escribe el poema mientras se prepara. */
export function paintElkQuill(ctx: Ctx): void {
  const { nibX, nibY } = QUILL_SIZE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(nibX, nibY);
  ctx.rotate(0.72);
  const vane = ctx.createLinearGradient(0, -8, 0, -66);
  vane.addColorStop(0, ELK_ANTLER.quill[2]);
  vane.addColorStop(0.5, ELK_ANTLER.quill[1]);
  vane.addColorStop(1, ELK_ANTLER.quill[0]);
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-13, -26, -9, -54, 3, -68);
  ctx.bezierCurveTo(13, -52, 12, -26, 0, -12);
  ctx.closePath();
  ctx.fillStyle = vane;
  ctx.fill();
  ctx.strokeStyle = ELK_ANTLER.quillOutline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = ELK_ANTLER.nib;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(75, 61, 99, 0.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(1, -40, 3, -66);
  ctx.stroke();
  ctx.restore();
}
