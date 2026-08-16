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
      // routeTree.gen.ts is generated, src/components/ui is vendored shadcn output,
      // and main.tsx is the mount call that only a browser can exercise.
      exclude: ['src/routeTree.gen.ts', 'src/components/ui/**', 'src/main.tsx', 'src/test/**'],
    },
  },
});
