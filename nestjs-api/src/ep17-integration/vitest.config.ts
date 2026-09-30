import { defineConfig } from 'vitest/config';

// EPISODE 18 PROBES: against the real Postgres from compose (host port 5434 on the recording machine).
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep17-integration/**/*.spec.ts'], fileParallelism: false },
});
