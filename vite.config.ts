import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
// import { compression } from "vite-plugin-compression2";
// import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: '\\.test\\.tsx?$',
    }),
    react(),
    tailwindcss(),
    // compression({ algorithm: "brotliCompress" }),
    // process.env.ANALYZE === "true" &&
    //   visualizer({
    //     filename: "dist/stats.html",
    //     gzipSize: true,
    //     brotliSize: true,
    //   }),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    sourcemap: 'hidden',
    cssMinify: 'lightningcss',
    rolldownOptions: {
      output: {
        // `[\\/]` rather than `/`: module ids use the platform separator.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/u },
            { name: 'vendor-tanstack', test: /node_modules[\\/]@tanstack[\\/]/u },
            // Catch-all last, so a new package lands here instead of in a route chunk.
            { name: 'vendor', test: /node_modules[\\/]/u },
          ],
        },
      },
    },
  },
});
