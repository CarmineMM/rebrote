import { defineConfig } from 'vitest/config';

// Simulacion con bots (T-026): `npm run sim`. Tarda, asi que no va con `npm test`.
export default defineConfig({
  test: { include: ['src/**/*.sim.ts'], testTimeout: 15 * 60 * 1000 },
});
