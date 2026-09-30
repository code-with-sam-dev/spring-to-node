import { defineConfig } from 'vitest/config';

// EPISODE 19 PROBE, C: one container from globalSetup, three files run one after another.
export default defineConfig({
  test: {
    globals: true, root: './', include: ['src/ep18-testcontainers/shared/*.spec.ts'],
    globalSetup: ['src/ep18-testcontainers/shared/global-setup.ts'], fileParallelism: false, hookTimeout: 120_000,
  },
});
