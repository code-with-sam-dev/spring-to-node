import { defineConfig } from 'vitest/config';

// EPISODE 22 PROBES: calling other APIs.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep21-http/**/*.spec.ts'], testTimeout: 30000 },
});
