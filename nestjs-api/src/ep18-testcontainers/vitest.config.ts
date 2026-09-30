import { defineConfig } from 'vitest/config';

// EPISODE 19 PROBES: each file starts its own Postgres container through Docker.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep18-testcontainers/**/*.spec.ts'], fileParallelism: false, hookTimeout: 120_000 },
});
