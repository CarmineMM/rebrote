import { describe, expect, it } from 'vitest';
import { recruitingOutbreaks } from '../core/variants';
import { TROOP_TINTS, VARIANT_TINTS, hexToRgb, keepNeon, prepareTint, rgbToHsl, tintPixels, tintRgb, variantKey, variantTint, type Rgb, type TroopTint } from './troopTint';

/**
 * Variante de color de las tropas reutilizadas (T-041): cada brote que recluta tiene su tinte, que cambia el color de las
 * once tropas que vuelven sin tocar su luz, sus blancos ni sus luces de virus.
 */

/** El color de cuerpo de cada tropa que vuelve: el tono medio de su paleta (`docs/guias/graficos.md`, seccion 10). */
const BODIES: Record<string, string> = {
  worm: '#b48cff',
  spitter: '#ff8cc6',
  copycat: '#5fdcc4',
  copycatSpitter: '#ffd84a',
  minstrel: '#ff6b66',
  lurker: '#ff9b4e',
  lurkerSpitter: '#3fd2c4',
  skipper: '#ff8cc8',
};

const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lightness = (rgb: Rgb) => rgbToHsl(rgb)[2];

describe('tinte de las tropas reclutadas (T-041, MT-01)', () => {
  it('cada brote que recluta tiene su tinte', () => {
    for (const outbreak of recruitingOutbreaks()) expect(variantTint(outbreak), outbreak).not.toBeNull();
    expect(Object.keys(VARIANT_TINTS).sort()).toEqual([...recruitingOutbreaks()].sort());
  });

  it('las propuestas tienen nombres y letras distintos', () => {
    expect(new Set(TROOP_TINTS.map((t) => t.id)).size).toBe(TROOP_TINTS.length);
    expect(TROOP_TINTS.map((t) => t.letter)).toEqual(['A', 'B', 'C']);
  });

  it('la textura teñida lleva la variante en su clave', () => {
    expect(variantKey('worm-head', 'morris')).toBe('worm-head@morris');
  });

  for (const tint of TROOP_TINTS as readonly TroopTint[]) {
    describe(`${tint.letter} · ${tint.name}`, () => {
      const prepared = prepareTint(tint);

      it('cada tropa que vuelve se distingue de la original (su color de cuerpo cambia a la vista)', () => {
        for (const [kind, hex] of Object.entries(BODIES)) {
          const before = hexToRgb(hex);
          expect(distance(before, tintRgb(before, prepared)), kind).toBeGreaterThan(55);
        }
      });

      it('conserva el volumen: lo claro sigue mas claro que lo oscuro', () => {
        // Cabeza del gusano: luz, tono medio y sombra (`WORM_PALETTES.worm.head`).
        const ramp = ['#ead6ff', '#b48cff', '#7a4cc8'].map(hexToRgb).map((rgb) => lightness(tintRgb(rgb, prepared)));
        expect(ramp[0]).toBeGreaterThan(ramp[1]);
        expect(ramp[1]).toBeGreaterThan(ramp[2]);
      });

      it('no toca los grises (blancos de los ojos, pupilas, acero) ni las luces verde neon', () => {
        for (const grey of ['#ffffff', '#000000', '#808080']) expect(tintRgb(hexToRgb(grey), prepared)).toEqual(hexToRgb(grey));
        expect(tintRgb(hexToRgb('#39ff88'), prepared)).toEqual(hexToRgb('#39ff88'));
        // El blanco casi puro de un ojo apenas cambia.
        expect(distance(hexToRgb('#fbf8f0'), tintRgb(hexToRgb('#fbf8f0'), prepared))).toBeLessThan(12);
      });
    });
  }

  it('reconoce las luces de virus y no otros verdes', () => {
    expect(keepNeon(...rgbToHsl(hexToRgb('#39ff88')))).toBe(true);
    expect(keepNeon(...rgbToHsl(hexToRgb('#80d153')))).toBe(false); // la planta
    expect(keepNeon(...rgbToHsl(hexToRgb('#5fdcc4')))).toBe(false); // el Copycat
  });

  it('tiñe un lienzo sin tocar su transparencia', () => {
    const data = new Uint8ClampedArray([180, 140, 255, 255, 180, 140, 255, 0, 180, 140, 255, 128]);
    tintPixels(data, TROOP_TINTS[0]);
    expect([data[3], data[7], data[11]]).toEqual([255, 0, 128]);
    expect([data[0], data[1], data[2]]).not.toEqual([180, 140, 255]);
    // Lo transparente del todo no se toca.
    expect([data[4], data[5], data[6]]).toEqual([180, 140, 255]);
  });
});
