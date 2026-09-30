import { defineConfig } from 'vitest/config';

// EPISODE 25 PROBES: scheduled jobs.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep24-schedule/**/*.spec.ts'], testTimeout: 30000, fileParallelism: false },
});
