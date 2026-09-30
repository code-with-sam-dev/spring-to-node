import { defineConfig } from 'vitest/config';

// EPISODE 17 PROBE: the same shared mock with clearMocks on, the setting that gives each test a
// clean call history the way MockitoExtension does.
export default defineConfig({
  test: { globals: true, root: './', include: ['src/ep16-testing/mock-leak.spec.ts'], clearMocks: true },
});
