import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Standalone rather than `mergeConfig(viteConfig, ...)`: vite.config.ts loads the
// tanstackRouter plugin, which rewrites the committed src/routeTree.gen.ts as a
// side effect of being constructed. A test run has no business touching that file.
// The `@` alias below is the only piece of the app config tests actually need, so
// it is duplicated on purpose; keep it in sync with vite.config.ts.
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
    // Node 25 defines a global `localStorage` that throws away every method unless
    // you pass --localstorage-file. Vitest's jsdom environment only copies a window
    // key onto the global when the global does not already have it, so Node's stub
    // wins and `localStorage.getItem` is undefined. Turning Node's Web Storage off
    // leaves jsdom's implementation as the only one. See vitest-dev/vitest#8757.
    execArgv: ['--no-webstorage'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // routeTree.gen.ts is generated and src/components/ui is vendored shadcn output.
      // The rest is wiring rather than logic: a mount call, three module-level
      // singletons and the route files that place components. All of it is exercised
      // only by a real browser, and a test asserting `store` is truthy would raise the
      // coverage number without raising confidence in anything.
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
      // A floor against code landing with no tests at all, not a quality bar: nothing
      // here stops an assertion-free test from satisfying it. The suite is at 100% once
      // the wiring above is excluded, so 90 leaves headroom while still failing on a
      // feature that arrives untested. Raise it, never quietly lower it.
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
