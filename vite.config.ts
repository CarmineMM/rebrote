import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { MANIFEST, MUSIC_CACHE, PRECACHE_GLOBS, PRECACHE_MAX_BYTES } from './src/pwa/manifest.ts';

export default defineConfig({
  plugins: [
    react(),
    // Instalable y sin conexion (T-029, ADR-0021). Solo en el build: en `npm run dev` no hay service worker.
    VitePWA({
      // La version nueva espera: la aplica `src/pwa/update.ts` en la portada, nunca en mitad de una partida (V-03).
      registerType: 'prompt',
      // Lo registra `src/pwa/update.ts`, no un script inyectado.
      injectRegister: false,
      manifest: MANIFEST,
      // Los iconos ya entran por `PRECACHE_GLOBS`.
      includeManifestIcons: false,
      workbox: {
        globPatterns: PRECACHE_GLOBS,
        maximumFileSizeToCacheInBytes: PRECACHE_MAX_BYTES,
        cleanupOutdatedCaches: true,
        // La musica (T-015), cuando llegue, se guarda al oirla y se renueva por detras.
        runtimeCaching: [
          {
            urlPattern: /\/audio\/musica\/.+\.(?:ogg|mp3)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: MUSIC_CACHE, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  // Version del juego en el menu de inicio (T-011).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true, port: 5173 },
  build: {
    // Phaser solo ya pasa de 500 kB minificado y no se puede partir mas.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        // Phaser y React en archivos propios: su hash no cambia entre
        // despliegues, asi que el navegador (y el service worker de la PWA)
        // solo vuelve a bajar el codigo del juego.
        codeSplitting: {
          groups: [
            { name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
});
