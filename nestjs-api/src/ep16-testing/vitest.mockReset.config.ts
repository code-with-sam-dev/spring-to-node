import { defineConfig } from 'vitest/config';

// EPISODE 17 PROBE, F: reset mode "mockReset".
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep16-testing/reset-modes.spec.ts'], mockReset: true },
});
