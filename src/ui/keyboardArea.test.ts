import { describe, expect, it } from 'vitest';
import { KEYBOARD, keyboardArea } from './keyboardArea';

const viewport = (height: number, offsetTop = 0, scale = 1) => ({ height, offsetTop, scale });

describe('el teclado en pantalla (T-033)', () => {
  it('movil en horizontal escribiendo: lo que se ve es el trozo de encima del teclado', () => {
    expect(keyboardArea(375, viewport(170), true)).toEqual({ top: 0, height: 170 });
    expect(keyboardArea(320, viewport(118.6, 40.2), true)).toEqual({ top: 40, height: 119 });
  });

  it('sin escribir no hay teclado, aunque lo que se ve sea menos', () => {
    expect(keyboardArea(375, viewport(170), false)).toBeNull();
  });

  it('la barra del navegador que aparece y desaparece no es un teclado', () => {
    expect(keyboardArea(375, viewport(375 - KEYBOARD.minPx + 1), true)).toBeNull();
    expect(keyboardArea(900, viewport(900 * (1 - KEYBOARD.minShare) + 1), true)).toBeNull();
  });

  it('si la pagina entera encoge al abrir el teclado, no hace falta nada', () => {
    expect(keyboardArea(150, viewport(150), true)).toBeNull();
  });

  it('ampliando con los dedos, o sin saber lo que se ve, no se toca nada', () => {
    expect(keyboardArea(375, viewport(170, 0, 2), true)).toBeNull();
    expect(keyboardArea(375, null, true)).toBeNull();
  });
});
