import { defineConfig } from 'vitest/config';

// EPISODE 24 PROBES: caching.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep23-cache/**/*.spec.ts'], testTimeout: 60000, fileParallelism: false },
});
