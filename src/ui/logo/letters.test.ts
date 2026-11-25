import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { GLYPHS, layoutWord } from './letters';
import { logoFit } from './TitleLogo';

/** Las palabras que salen en el logo: el nombre del juego y la del Invernadero en cada idioma. */
const WORDS = ['REBROTE', es.greenhouse.logo, en.greenhouse.logo];

describe('letras del logo', () => {
  it('estan dibujadas todas las letras de las palabras del titulo', () => {
    for (const word of WORDS) {
      for (const letter of word) expect(GLYPHS[letter], `falta la letra "${letter}" de ${word} en GLYPHS`).toBeDefined();
    }
  });

  it('las letras van una tras otra sin solaparse', () => {
    const { letters, width } = layoutWord('REBROTE');
    for (let k = 1; k < letters.length; k++) {
      const previous = letters[k - 1];
      expect(letters[k].x).toBeGreaterThan(previous.x + previous.glyph.w);
    }
    expect(width).toBeGreaterThan(letters[letters.length - 1].x);
  });

  it('REBROTE sale entero y una palabra larga encoge', () => {
    expect(logoFit('REBROTE')).toBe(1);
    expect(logoFit(es.greenhouse.logo)).toBeLessThan(1);
    expect(logoFit(es.greenhouse.logo)).toBeGreaterThan(0.6);
  });
});
