import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress } from 'node:zlib';
import type { Plugin } from 'vite';
import { bucketOf, type Log, sum, table, tintOf } from './report.ts';

const compress = promisify(brotliCompress);

// woff2 is brotli internally, and images are already compressed; both come back larger.
const PRECOMPRESS = /\.(?:js|css|html|svg|json|txt)$/u;

/** One MTU. Below it a smaller file still costs the same single round trip. */
export const MIN_BYTES = 1400;

/** `br` is null for anything not precompressed: fonts, images, files under one MTU. */
export type Row = { name: string; raw: number; br: number | null };
type Compressed = Row & { br: number };

// What a server sends: the `.br` where one was written, the file itself otherwise.
const transfer = (r: Row): number => r.br ?? r.raw;

// Reads only what it compresses: the 440 kB of font subsets are stat'd, never loaded.
export async function measure(outDir: string, name: string): Promise<Row | null> {
  const path = join(outDir, name);
  const info = await stat(path);
  if (!info.isFile()) return null;
  if (!PRECOMPRESS.test(name) || info.size < MIN_BYTES) {
    return { name, raw: info.size, br: null };
  }
  const br = await compress(await readFile(path));
  await writeFile(`${path}.br`, br);
  return { name, raw: info.size, br: br.byteLength };
}

function logPrecompressed(log: Log, outDir: string, rows: readonly Row[]): void {
  const written = rows
    .filter((r): r is Compressed => r.br !== null)
    .toSorted((a, b) => b.br - a.br)
    .map((r) => ({ name: r.name, tint: tintOf(bucketOf(r.name)), before: r.raw, after: r.br }));

  table(log, 'brotli', `(${outDir}/, ${String(MIN_BYTES)} bytes and up)`, written);
}

// What the deploy actually weighs: every file counted once, at the size a server sends it.
function logTotal(log: Log, outDir: string, rows: readonly Row[]): void {
  const lines = [...Map.groupBy(rows, (r) => bucketOf(r.name))]
    .map(([bucket, group]) => ({
      name: bucket,
      tint: tintOf(bucket),
      before: sum(group, (r) => r.raw),
      after: sum(group, (r) => transfer(r)),
    }))
    .toSorted((a, b) => b.after - a.after);

  table(log, `${outDir}/ total`, '', lines, rows.length);
}

// Runs in `closeBundle`, after Vite's own reporter, so the `.br` files stay out of its
// listing instead of being interleaved with the assets they duplicate.
export function brotli(): Plugin {
  let outDir = 'dist';
  let log: Log | undefined;

  return {
    name: 'brotli',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir;
      log = config.logger;
    },
    async closeBundle() {
      const names = await readdir(outDir, { recursive: true });
      // A stale `.br` would otherwise be counted as a file of its own under `emptyOutDir: false`.
      const measured = await Promise.all(
        names.filter((n) => !n.endsWith('.br')).map((name) => measure(outDir, name)),
      );

      const rows = measured.filter((r) => r !== null);
      if (!log) return;
      logPrecompressed(log, outDir, rows);
      logTotal(log, outDir, rows);
    },
  };
}
