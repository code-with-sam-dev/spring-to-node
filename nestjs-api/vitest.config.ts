import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Episode 17's probes demonstrate failures on purpose; verify-testing.sh runs them.
    exclude: ['**/node_modules/**', 'src/ep16-testing/**', 'src/ep20-throttle/**', 'src/ep21-http/**', 'src/ep22-resilience/**'],
  },
});
