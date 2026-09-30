import { defineConfig } from 'vitest/config';

// EPISODE 23 PROBES: retries and circuit breakers.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep22-resilience/**/*.spec.ts'], testTimeout: 30000 },
});
