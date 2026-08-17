import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone, not `mergeConfig(viteConfig, ...)`: constructing the tanstackRouter plugin
// rewrites the committed src/routeTree.gen.ts.
export default defineConfig({
  test: {
    // Two suites with nothing in common but the runner: the app needs jsdom, the React
    // plugin and the Testing Library setup, and the Vite plugins in `build/` need none of
    // the three. `setupFiles` is not per-file, so this split is what keeps
    // `localStorage.clear()` out of a Node test. Run one with `vitest --project build`.
    projects: [
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: 'app',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          // Node 25's stub `localStorage` shadows jsdom's, which vitest only installs when
          // the global is absent. Off, so jsdom's is the only one. See vitest-dev/vitest#8757.
          execArgv: ['--no-webstorage'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'build',
          environment: 'node',
          include: ['build/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'build/**/*.ts'],
      // Generated, vendored, or wiring that only a real browser exercises.
      exclude: [
        'src/routeTree.gen.ts',
        'src/components/ui/**',
        'src/main.tsx',
        'src/test/**',
        'src/routes/**',
        'src/lib/router.ts',
        'src/lib/query-client.ts',
        'src/lib/store.ts',
        'src/features/*/index.ts',
        'build/test/**',
      ],
      // A floor against a feature landing untested, not a quality bar. Raise, never lower.
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
