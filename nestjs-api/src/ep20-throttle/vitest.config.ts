import { defineConfig } from 'vitest/config';

// EPISODE 21 PROBES: rate limiting, its key and its storage.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep20-throttle/**/*.spec.ts'], fileParallelism: false, testTimeout: 120000 },
});
