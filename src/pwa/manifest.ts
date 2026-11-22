/**
 * El juego instalable (T-029, ADR-0021): manifiesto y lo que guarda el service worker. Lo lee `vite.config.ts`, que se
 * lo pasa a `vite-plugin-pwa`; por eso aqui no entra nada del navegador. Los tests comprueban que cuadra con el icono
 * (T-028) y con lo que hay en `public/`.
 */
import type { ManifestOptions } from 'vite-plugin-pwa';
import { es } from '../i18n/es.ts';

/**
 * Manifiesto: el nombre, que no se traduce (I-08); el lema en espanol, el idioma de referencia (el manifiesto solo
 * lleva uno); a pantalla completa y en horizontal (V-04, ADR-0007 y ADR-0011), y los iconos de `npm run icons`. El color
 * de tema es el de `THEME_COLOR` y el de fondo, el verde oscuro de la carga (`body` en `styles.css`), que es lo que se
 * ve al abrir la aplicacion mientras carga.
 */
export const MANIFEST: Partial<ManifestOptions> = {
  name: 'Rebrote',
  short_name: 'Rebrote',
  description: es.title.tagline,
  lang: 'es',
  display: 'fullscreen',
  // Donde no haya pantalla completa (iPhone), sin barra de direcciones.
  display_override: ['fullscreen', 'standalone'],
  orientation: 'landscape',
  theme_color: '#2a80d2',
  background_color: '#10200f',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

/**
 * Lo que se guarda al instalar para jugar sin conexion: el juego entero y los efectos de sonido (V-05: pesan poco).
 * Solo los de la carpeta `audio/`, sin subcarpetas: la musica (T-015) ira en `audio/musica/` y se guarda al oirla
 * (`MUSIC_CACHE`). Las paginas de desarrollo (`sonidos.html`, `disparadoras.html`...) no estan: el build no las publica.
 */
export const PRECACHE_GLOBS = ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'audio/*.{ogg,mp3}'];

/** Lo que se guarda solo cuando se ha oido una vez (V-05): la musica de fondo (T-015). */
export const MUSIC_CACHE = 'rebrote-musica';

/** Archivo mas grande que se guarda: Phaser solo pasa de 1 MB y no se puede partir mas. */
export const PRECACHE_MAX_BYTES = 4 * 1024 * 1024;
