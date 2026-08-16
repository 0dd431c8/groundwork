import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Standalone, not `mergeConfig(viteConfig, ...)`: constructing the tanstackRouter plugin
// rewrites the committed src/routeTree.gen.ts. Keep the `@` alias in sync by hand.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Node 25's stub `localStorage` shadows jsdom's, which vitest only installs when the
    // global is absent. Off, so jsdom's is the only one. See vitest-dev/vitest#8757.
    execArgv: ['--no-webstorage'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
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
      ],
      // A floor against a feature landing untested, not a quality bar. Raise, never lower.
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
