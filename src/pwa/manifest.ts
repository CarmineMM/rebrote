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
 * Solo los de la carpeta `audio/`, sin subcarpetas: la musica (T-015) va en `audio/musica/`, en los dos formatos, y no se
 * guarda al instalar; la baja el juego despues de la portada, solo en el formato que usa el navegador (`MUSIC_CACHE`,
 * U-05). Las paginas de desarrollo (`pruebas/sonidos.html`, `propuestas/disparadoras.html`...) no estan: el build no las publica.
 */
export const PRECACHE_GLOBS = ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'audio/*.{ogg,mp3}'];

/**
 * Cache de la musica de fondo (T-015, U-05): la llena el juego (`src/game/audio/music.ts`) despues de la portada, para
 * jugar sin conexion, y el service worker la usa (y la llena tambien si una pista le llega antes).
 */
export const MUSIC_CACHE = 'rebrote-musica';

/** Direcciones de la musica para el service worker: `audio/musica/<pista>.<ogg|mp3>`, con su huella (`?v=`). */
export const MUSIC_URL_PATTERN = /\/audio\/musica\/[^/?]+\.(?:ogg|mp3)(?:\?.*)?$/;

/** Archivo mas grande que se guarda: Phaser solo pasa de 1 MB y no se puede partir mas. */
export const PRECACHE_MAX_BYTES = 4 * 1024 * 1024;
