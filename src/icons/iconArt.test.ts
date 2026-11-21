import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import favicon from '../../public/favicon.svg?raw';
import appIcon from '../../public/icons/icon.svg?raw';
import { ICON, ICON_IDS, ICON_SIZE, ICON_VARIANTS, MASKABLE_SAFE_RADIUS, THEME_COLOR, iconSvg, motifBox } from './iconArt';

describe('icono del juego (T-028)', () => {
  it.each(ICON_IDS)('%s: en Android, el brote entero cabe en la zona segura del maskable', (id) => {
    const { x0, y0, x1, y1 } = motifBox(id, 'maskable');
    const c = ICON_SIZE / 2;
    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ]) {
      expect(Math.hypot(x - c, y - c)).toBeLessThanOrEqual(MASKABLE_SAFE_RADIUS);
    }
  });

  it.each(ICON_IDS)('%s: en todas las formas, el brote queda dentro del lienzo y centrado', (id) => {
    for (const variant of ICON_VARIANTS) {
      const { x0, y0, x1, y1 } = motifBox(id, variant);
      expect(x0).toBeGreaterThanOrEqual(0);
      expect(y0).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(ICON_SIZE);
      expect(y1).toBeLessThanOrEqual(ICON_SIZE);
      expect((x0 + x1) / 2).toBeCloseTo(ICON_SIZE / 2, 5);
      expect((y0 + y1) / 2).toBeCloseTo(ICON_SIZE / 2, 5);
    }
  });

  it.each(ICON_IDS)('%s: la pestana va sin fondo y el brote ocupa casi todo el lienzo', (id) => {
    const { x0, y0, x1, y1 } = motifBox(id, 'tab');
    expect(Math.max(x1 - x0, y1 - y0)).toBeGreaterThan(0.95 * ICON_SIZE);
    expect(iconSvg(id, 'tab')).not.toContain(`M0 0 L${ICON_SIZE} 0`);
  });

  it.each(ICON_IDS)('%s: iPhone y Android, a sangre (sin transparencia) y sin recorte propio', (id) => {
    for (const variant of ['full', 'maskable'] as const) {
      const svg = iconSvg(id, variant);
      expect(svg).toContain(`<path d="M0 0 L${ICON_SIZE} 0 L${ICON_SIZE} ${ICON_SIZE} L0 ${ICON_SIZE} Z"`);
      expect(svg).not.toContain('url(#tile)');
    }
  });

  it('el icono de aplicacion lleva la ficha con las esquinas redondeadas', () => {
    expect(iconSvg(ICON, 'tile')).toMatch(/<clipPath id="tile"><rect [^>]*rx="/);
  });

  it('cada SVG es un dibujo de 512 x 512 con sus degradados definidos', () => {
    for (const id of ICON_IDS) {
      for (const variant of ICON_VARIANTS) {
        const svg = iconSvg(id, variant);
        expect(svg).toMatch(new RegExp(`^<svg [^>]*viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}"`));
        for (const [, ref] of svg.matchAll(/url\(#([\w-]+)\)/g)) expect(svg).toContain(`id="${ref}"`);
      }
    }
  });
});

describe('iconos de public/ (T-028)', () => {
  it('estan al dia con el dibujo: si falla, `npm run icons` (por ejemplo, tras redibujar la disparadora)', () => {
    expect(favicon).toBe(iconSvg(ICON, 'tab'));
    expect(appIcon).toBe(iconSvg(ICON, 'tile'));
  });

  it('index.html los enlaza y lleva el color de tema', () => {
    for (const link of ['href="/favicon.ico"', 'href="/favicon.svg"', 'rel="apple-touch-icon" href="/apple-touch-icon.png"']) {
      expect(indexHtml).toContain(link);
    }
    expect(indexHtml).toContain(`<meta name="theme-color" content="${THEME_COLOR}" />`);
  });
});
