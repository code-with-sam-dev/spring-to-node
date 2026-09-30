import { defineConfig } from 'vitest/config';

// EPISODE 17 PROBES, default settings: the configuration a new NestJS project starts with.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep16-testing/**/*.spec.ts'] },
});
