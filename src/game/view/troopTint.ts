import type { OutbreakId } from '../core/outbreaks';

/**
 * Variante de color de las tropas que vuelven en otro brote (T-041), sin Phaser y con test. Una tropa reclutada por un brote
 * (`Enemy.variant`, `troopVariant` en `src/game/core/variants.ts`) se pinta con las mismas texturas que en su brote de
 * origen, pasadas por el tinte de ese brote: uno por brote, igual para todas sus tropas (MT-01), para que se lean como "las
 * tropas de Morris". Se tiñe el dibujo de la tropa (cuerpo, cabeza, patas, armadura, disquete, gorro); la medallita, el
 * aura, las llamas, la escarcha y las rayas de velocidad no, porque son de su nivel o de su estado y tienen que seguir
 * leyéndose igual (MT-05). Oculta, la silueta es la de siempre: la pinta el tinte de relleno de la vista, por encima.
 *
 * Cómo tiñe (`tintRgb`): cada píxel conserva su luz (así se conservan el volumen, los brillos y la silueta) y cambia su color
 * por el de la rampa del tinte a esa luz, más cuanto más color tenía. Lo que casi no tiene color (los blancos de los ojos,
 * las pupilas, el brillo, el acero) se queda casi igual: la cara sigue siendo simpática. Las luces verde neón de los virus
 * (`keepNeon`) no se tocan: son la marca de la corrupción.
 */

export type Rgb = readonly [number, number, number];

export interface TroopTint {
  readonly id: string;
  /** Letra y nombre en la galería de propuestas (`/proposals/variantes.html`). */
  readonly letter: string;
  readonly name: string;
  readonly idea: string;
  /**
   * Rampa de color por luz: el color de las sombras, el de los tonos medios y el de las luces. Cada píxel toma el de su luz
   * (mezclando los dos más cercanos).
   */
  readonly ramp: readonly [string, string, string];
  /** Cuánto del color de la rampa se pone (0, nada; 1, todo) en un píxel con todo el color. */
  readonly strength: number;
  /** Luz que se le quita (negativo) o se le da (positivo) a lo que tiene color, de -1 a 1: oscurece o aclara la tropa entera. */
  readonly light: number;
}

/**
 * Propuestas de tinte para Morris (MT-01), en `/proposals/variantes.html`. Tienen que distinguir de su original a las once
 * tropas que vuelven, que entre todas ya usan casi todos los colores (morado, rosa, aguamarina, amarillo, rojo, naranja y
 * turquesa); el azul se confunde con el frenado y el verde, con las plantas y el césped. Por eso no basta con cambiar el
 * tono: un tinte de un solo color (se probó un ámbar de terminal) deja igual a la tropa que ya era de ese color, el Lurker.
 * Las tres cambian la luz o el color entero.
 */
export const TROOP_TINTS = [
  {
    id: 'shadow',
    letter: 'A',
    name: 'Sombra',
    idea: 'Cada tropa conserva sus colores, pero más hondos y oscuros, como un equipo que se queda sin recursos. Se reconoce cada una y el aura de nivel brilla más que nunca detrás.',
    ramp: ['#120a1c', '#4a3a5c', '#d8cce6'],
    strength: 0.3,
    light: -0.16,
  },
  {
    id: 'slate',
    letter: 'B',
    name: 'Pizarra',
    idea: 'Gris de máquina con un recuerdo de su color y las luces de virus en verde: chatarra de ordenador. Ninguna original es gris, así que todas cambian igual de bien.',
    ramp: ['#1b2230', '#6f7d93', '#eef2f8'],
    strength: 0.7,
    light: -0.08,
  },
  {
    id: 'photocopy',
    letter: 'C',
    name: 'Fotocopia',
    idea: 'Morris se copiaba sin parar: sus tropas son copias de copias, pálidas como una fotocopia gastada. Ojo: se pueden confundir con las copias de los Copycat.',
    ramp: ['#3b3530', '#b3a690', '#fffaf0'],
    strength: 0.62,
    light: 0.12,
  },
] as const satisfies readonly TroopTint[];

export type TroopTintId = (typeof TROOP_TINTS)[number]['id'];

/** El tinte de cada brote que recluta tropas (`OutbreakScript.recruits`). Un test vigila que ninguno se quede sin él. */
export const VARIANT_TINTS: Partial<Record<OutbreakId, TroopTintId>> = {
  // MT-01: propuesta recomendada hasta que Carmine elija en `/proposals/variantes.html`.
  morris: 'shadow',
};

export function tintById(id: TroopTintId): TroopTint {
  return TROOP_TINTS.find((tint) => tint.id === id) as TroopTint;
}

/** El tinte de las tropas reclutadas por `outbreak`, o null si no recluta. */
export function variantTint(outbreak: OutbreakId): TroopTint | null {
  const id = VARIANT_TINTS[outbreak];
  return id ? tintById(id) : null;
}

/** Clave de la textura `key` teñida con la variante del brote `variant`. */
export function variantKey(key: string, variant: OutbreakId): string {
  return `${key}@${variant}`;
}

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Tono (0 a 360), saturacion y luz (0 a 1). */
export function rgbToHsl([r, g, b]: Rgb): readonly [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Color de la rampa a la luz `l` (0 a 1): sombras en 0, tonos medios en 0,5 y luces en 1. */
export function rampAt(ramp: readonly [Rgb, Rgb, Rgb], l: number): Rgb {
  const t = clamp01(l) * 2;
  const [from, to, k] = t <= 1 ? [ramp[0], ramp[1], t] : [ramp[1], ramp[2], t - 1];
  return [mix(from[0], to[0], k), mix(from[1], to[1], k), mix(from[2], to[2], k)];
}

/** Las luces verde neón de los virus (`#39ff88` y sus brillos): muy saturadas y en ese tono. No se tiñen. */
export function keepNeon(h: number, s: number, l: number): boolean {
  return h >= 128 && h <= 162 && s >= 0.8 && l >= 0.45;
}

/** Un tinte listo para teñir muchos píxeles: la rampa ya en números. */
export interface PreparedTint {
  readonly ramp: readonly [Rgb, Rgb, Rgb];
  readonly strength: number;
  readonly light: number;
}

export function prepareTint(tint: TroopTint): PreparedTint {
  return { ramp: tint.ramp.map(hexToRgb) as unknown as [Rgb, Rgb, Rgb], strength: tint.strength, light: tint.light };
}

/**
 * Un píxel teñido. Conserva la luz (movida por `light`, más cuanto más color tiene) y pone el color de la rampa a esa luz,
 * en la parte que dice `strength` por lo que tenía de color: lo gris se queda casi igual.
 */
export function tintRgb(rgb: Rgb, tint: PreparedTint): Rgb {
  const [h, s, l] = rgbToHsl(rgb);
  if (s === 0 || keepNeon(h, s, l)) return rgb;
  // Cuánto color tiene (su croma: del canal más alto al más bajo), suavizado: el acero y los blancos casi puros (poco
  // color) apenas cambian. La saturación no sirve para esto: un blanco roto la tiene alta.
  const chroma = (Math.max(...rgb) - Math.min(...rgb)) / 255;
  const colour = clamp01((chroma - 0.06) / 0.3);
  const lit = clamp01(l + tint.light * colour * (tint.light < 0 ? l : 1 - l) * 2);
  const ramp = rampAt(tint.ramp, lit);
  // Sin rampa entera, la luz nueva sobre el color de siempre: el original algo mas oscuro o mas claro.
  const scale = l > 0 ? lit / l : 1;
  const shaded: Rgb = [rgb[0] * scale, rgb[1] * scale, rgb[2] * scale];
  const k = tint.strength * colour;
  return [
    Math.round(clamp255(mix(shaded[0], ramp[0], k))),
    Math.round(clamp255(mix(shaded[1], ramp[1], k))),
    Math.round(clamp255(mix(shaded[2], ramp[2], k))),
  ];
}

const clamp255 = (v: number) => Math.min(255, Math.max(0, v));

/** Tiñe en su sitio los píxeles RGBA de un lienzo (`ImageData.data`). La transparencia no cambia. */
export function tintPixels(data: Uint8ClampedArray, tint: TroopTint): void {
  const prepared = prepareTint(tint);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = tintRgb([data[i], data[i + 1], data[i + 2]], prepared);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}
