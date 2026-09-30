import { defineConfig } from 'vitest/config';

// EPISODE 20 PROBES: guards and the default-open route.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep19-guards/**/*.spec.ts'] },
});
