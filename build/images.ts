import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { optimize as optimizeSvg } from 'svgo';
import type { Plugin } from 'vite';
import { bucketOf, type Log, table, tintOf } from './report.ts';

// gif is left out: sharp keeps only the first frame unless the input is opened with
// `{ animated: true }`, and a silently de-animated gif is worse than an unoptimised one.
// ico is a multi-resolution container it does not round-trip.
const IMAGES = /\.(?:png|jpe?g|webp|avif|svg)$/u;

// The lossy part. Re-encoding is one way, so these are the bytes that ship.
const ENCODERS: Record<string, (img: Sharp) => Sharp> = {
  '.png': (img) => img.png({ quality: 80, effort: 7, palette: true }),
  '.jpg': (img) => img.jpeg({ quality: 80, mozjpeg: true }),
  '.jpeg': (img) => img.jpeg({ quality: 80, mozjpeg: true }),
  '.webp': (img) => img.webp({ quality: 80, effort: 6 }),
  '.avif': (img) => img.avif({ quality: 60, effort: 5 }),
};

export type Shrunk = { name: string; before: number; after: number };

// svgo v4 dropped `removeViewBox` from `preset-default`, so there is nothing to override
// here: passing one for a plugin the preset does not contain only logs a warning.
const shrinkSvg = (raw: Buffer, name: string): Buffer =>
  Buffer.from(optimizeSvg(raw.toString('utf8'), { path: name, multipass: true }).data);

// `toBuffer` strips all metadata, EXIF orientation included, so bake it into the pixels
// first or a phone photo ships sideways.
function shrinkRaster(raw: Buffer, ext: string): Promise<Buffer> | null {
  const encode = ENCODERS[ext];
  if (!encode) return null;
  return encode(sharp(raw).autoOrient()).toBuffer();
}

// Only ever rewrites downwards, so an already-optimised image is left alone and a second
// pass over the same output directory is a no-op.
export async function shrink(outDir: string, name: string): Promise<Shrunk | null> {
  const path = join(outDir, name);
  const raw = await readFile(path);
  const out = name.endsWith('.svg') ? shrinkSvg(raw, name) : await shrinkRaster(raw, extname(name));

  if (out === null || out.byteLength >= raw.byteLength) return null;
  await writeFile(path, out);
  return { name, before: raw.byteLength, after: out.byteLength };
}

function logImages(log: Log, outDir: string, rows: readonly Shrunk[]): void {
  const shrunk = rows
    .toSorted((a, b) => b.after - a.after)
    .map((r) => ({
      name: r.name,
      tint: tintOf(bucketOf(r.name)),
      before: r.before,
      after: r.after,
    }));

  table(log, 'images', `(${outDir}/)`, shrunk);
}

// The work is in `writeBundle` because every `writeBundle` resolves before any `closeBundle`
// starts, which is what lets `brotli()` precompress the already-minified bytes. Vite copies
// `public/` at `renderStart`, so those files are here too. Only the table waits for
// `closeBundle`, so it prints with the other two rather than above Vite's asset listing.
export function images(): Plugin {
  let outDir = 'dist';
  let log: Log | undefined;
  let shrunk: Shrunk[] = [];

  return {
    name: 'images',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir;
      log = config.logger;
    },
    async writeBundle() {
      const names = await readdir(outDir, { recursive: true });
      const rows = await Promise.all(
        names.filter((n) => IMAGES.test(n)).map((name) => shrink(outDir, name)),
      );
      shrunk = rows.filter((r) => r !== null);
    },
    closeBundle() {
      if (log) logImages(log, outDir, shrunk);
    },
  };
}
