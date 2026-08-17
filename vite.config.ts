import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
// Explicit `.ts` here and inside `build/`, unlike `src`: the config is loaded by Vite's own
// loader, whose `native` mode (a future default) does not resolve an extensionless import.
import { brotli } from './build/brotli.ts';
import { images } from './build/images.ts';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: '\\.test\\.tsx?$',
    }),
    react(),
    tailwindcss(),
    images(),
    brotli(),
  ],
  resolve: {
    // `@/*` comes from tsconfig.json's `paths`, so there is one place to change it.
    tsconfigPaths: true,
  },
  build: {
    // The brotli table `build/brotli.ts` prints is the number that matters; gzip is not
    // what gets served.
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        // `[\\/]` rather than `/`: module ids use the platform separator.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/u },
            { name: 'vendor-tanstack', test: /node_modules[\\/]@tanstack[\\/]/u },
            // Catch-all last, so a new package lands here instead of in a route chunk.
            // Deliberately untagged: adding `tags: ['$initial']` scopes these groups to
            // what the entry reaches statically, which moves every dependency a lazy
            // route owns into that route's chunk. Measured at 47 kB of vendor code
            // leaving the long-lived chunks for one that rehashes on any app change.
            { name: 'vendor', test: /node_modules[\\/]/u },
          ],
        },
      },
    },
  },
});
