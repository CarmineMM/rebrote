import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
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
