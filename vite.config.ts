import { defineConfig, type Logger, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress } from 'node:zlib';

const compress = promisify(brotliCompress);

// woff2 is brotli internally, and images are already compressed; both come back larger.
const PRECOMPRESS = /\.(?:js|css|html|svg|json|txt)$/u;

// One MTU. Below it a smaller file still costs the same single round trip.
const MIN_BYTES = 1400;

const kB = (n: number): string => `${(n / 1000).toFixed(2)} kB`.padStart(9);

// Runs in `closeBundle`, after Vite's own reporter, so the `.br` files stay out of its
// listing instead of being interleaved with the assets they duplicate.
function brotli(): Plugin {
  let outDir = 'dist';
  let logger: Logger | undefined;

  return {
    name: 'brotli',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir;
      logger = config.logger;
    },
    async closeBundle() {
      const names = await readdir(outDir, { recursive: true });
      const rows = await Promise.all(
        names
          .filter((n) => PRECOMPRESS.test(n))
          .map(async (name) => {
            const raw = await readFile(join(outDir, name));
            if (raw.byteLength < MIN_BYTES) return null;
            const br = await compress(raw);
            await writeFile(join(outDir, `${name}.br`), br);
            return { name, raw: raw.byteLength, br: br.byteLength };
          }),
      );

      const written = rows.filter((r) => r !== null).toSorted((a, b) => b.br - a.br);
      if (written.length === 0 || !logger) return;
      const width = Math.max(...written.map((r) => r.name.length));
      const sum = (pick: (r: (typeof written)[number]) => number): number =>
        written.reduce((a, r) => a + pick(r), 0);

      logger.info(`\nbrotli (${outDir}/, ${String(MIN_BYTES)} bytes and up)`);
      for (const r of written) {
        logger.info(`  ${r.name.padEnd(width)} ${kB(r.raw)} → ${kB(r.br)}`);
      }
      const label = `${String(written.length)} files`.padEnd(width);
      logger.info(`  ${label} ${kB(sum((r) => r.raw))} → ${kB(sum((r) => r.br))}`);
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: '\\.test\\.tsx?$',
    }),
    react(),
    tailwindcss(),
    brotli(),
  ],
  resolve: {
    // `@/*` comes from tsconfig.json's `paths`, so there is one place to change it.
    tsconfigPaths: true,
  },
  build: {
    // The brotli table below is the number that matters; gzip is not what gets served.
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
