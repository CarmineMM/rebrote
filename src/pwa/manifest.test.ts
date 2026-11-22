import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { THEME_COLOR } from '../icons/iconArt';
import { MANIFEST, PRECACHE_GLOBS } from './manifest';

/** Los PNG de `public/icons/`, como `data:` en base64, por su ruta dentro de `public/`. */
const PNGS = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../public/icons/*.png', { query: '?inline', import: 'default', eager: true })).map(([path, data]) => [
    path.replace('../../public/', ''),
    data,
  ]),
);

/** Lado de un PNG, leido de su cabecera (IHDR: ancho y alto en los bytes 16 a 23). */
function pngSize(data: string): string {
  const bytes = Uint8Array.from(atob(data.split(',')[1]), (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return `${view.getUint32(16)}x${view.getUint32(20)}`;
}

describe('manifiesto del juego instalable (T-029)', () => {
  it('se llama Rebrote y se abre a pantalla completa y en horizontal (V-04)', () => {
    expect(MANIFEST.name).toBe('Rebrote');
    expect(MANIFEST.short_name).toBe('Rebrote');
    expect(MANIFEST.display).toBe('fullscreen');
    expect(MANIFEST.orientation).toBe('landscape');
  });

  it('lleva el color de tema del icono (T-028) y el de index.html', () => {
    expect(MANIFEST.theme_color).toBe(THEME_COLOR);
    expect(indexHtml).toContain(`<meta name="theme-color" content="${MANIFEST.theme_color}" />`);
  });

  it('sus iconos son los de `npm run icons`, con el tamano que dicen, y hay uno maskable para Android', () => {
    const icons = MANIFEST.icons ?? [];
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(PNGS[icon.src], icon.src).toBeDefined();
      expect(pngSize(PNGS[icon.src]), icon.src).toBe(icon.sizes);
    }
    expect(icons.some((icon) => icon.purpose === 'maskable' && icon.sizes === '512x512')).toBe(true);
    expect(icons.some((icon) => icon.purpose === 'any' && icon.sizes === '512x512')).toBe(true);
  });

  it('se guardan los efectos de sonido para jugar sin conexion (V-05), pero no las subcarpetas (la musica, al oirla)', () => {
    expect(PRECACHE_GLOBS).toContain('audio/*.{ogg,mp3}');
    expect(PRECACHE_GLOBS.some((glob) => glob.startsWith('audio/**'))).toBe(false);
  });
});
