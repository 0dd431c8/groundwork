import { defineConfig, type Logger, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import sharp, { type Sharp } from 'sharp';
import { optimize as optimizeSvg } from 'svgo';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { type InspectColor, promisify, styleText } from 'node:util';
import { brotliCompress } from 'node:zlib';

const compress = promisify(brotliCompress);

// woff2 is brotli internally, and images are already compressed; both come back larger.
const PRECOMPRESS = /\.(?:js|css|html|svg|json|txt)$/u;

// One MTU. Below it a smaller file still costs the same single round trip.
const MIN_BYTES = 1400;

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

// First match wins; anything unmatched falls into `other`.
const BUCKETS = [
  ['js', /\.js$/u],
  ['css', /\.css$/u],
  ['fonts', /\.(?:woff2?|ttf|otf|eot)$/u],
  ['images', /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/u],
] as const;

/** `br` is null for anything not precompressed: fonts, images, files under one MTU. */
type Row = { name: string; raw: number; br: number | null };
type Compressed = Row & { br: number };

// What a server sends: the `.br` where one was written, the file itself otherwise.
const transfer = (r: Row): number => r.br ?? r.raw;

const kB = (n: number): string => `${(n / 1000).toFixed(2)} kB`.padStart(9);

const files = (n: number): string => `${String(n)} file${n === 1 ? '' : 's'}`;

const sum = <T>(rows: readonly T[], pick: (r: T) => number): number =>
  rows.reduce((a, r) => a + pick(r), 0);

const bucketOf = (name: string): string =>
  BUCKETS.find(([, test]) => test.test(name))?.[0] ?? 'other';

// `styleText` inspects process.stdout itself - TTY, NO_COLOR, FORCE_COLOR, TERM=dumb - and hands
// the string back untouched when colour is unwanted, so a build piped into a log file needs no
// flag. Node and Bun both have it, which is why this is not a picocolors dependency.
type Paint = (s: string) => string;

const paint =
  (...format: InspectColor[]): Paint =>
  (s) =>
    styleText(format, s);

const plain: Paint = (s) => s;
const dim = paint('dim');
const bold = paint('bold');

// Keyed by bucket, so one map covers both the filenames and the bucket rows in `dist/ total`.
// Green is missing on purpose: it is what the size column uses to mean "this shrank".
const TINTS: Record<string, Paint> = {
  js: paint('cyan'),
  css: paint('magenta'),
  fonts: paint('yellow'),
  images: paint('blue'),
};

const tintOf = (bucket: string): Paint => TINTS[bucket] ?? plain;

/** How a row's two size columns are painted. `gain` applies only when the file got smaller. */
type Style = { size: Paint; gain: Paint };
const DATA: Style = { size: dim, gain: paint('green') };
const TOTAL: Style = { size: bold, gain: paint('bold', 'green') };

// Vite names an asset `[name]-[hash]` with an 8-character base64url hash. A name that happens to
// end in an 8-character suffix gets dimmed for nothing, which costs a shade and nothing else.
const HASH = /-[\w-]{8}(?=\.[^.]*$)/u;

// Dimming the directory and the hash leaves the part of the name that identifies the file.
function decorate(name: string, tint: Paint): string {
  const cut = name.lastIndexOf('/') + 1;
  const dir = cut === 0 ? '' : dim(name.slice(0, cut));
  const base = name.slice(cut);
  const hash = HASH.exec(base);
  if (!hash) return dir + tint(base);
  const [end, text] = [hash.index + hash[0].length, hash[0]];
  return dir + tint(base.slice(0, hash.index)) + dim(text) + tint(base.slice(end));
}

const pct = (before: number, after: number): string => {
  const change = before === 0 ? 0 : Math.round(((after - before) / before) * 100);
  return `${String(change)}%`.padStart(5);
};

type Line = { name: string; tint: Paint; before: number; after: number };

// A row stays in `style.size` when nothing shrank, so `fonts 530.58 kB → 530.58 kB` and an
// already-optimised image say so by staying dim rather than needing a column to explain it.
const row = (label: string, before: number, after: number, style: Style): string =>
  `  ${label} ${style.size(kB(before))} ${dim('→')} ${(after < before ? style.gain : style.size)(kB(after))} ${style.size(pct(before, after))}`;

// One renderer for all three tables below: they are the same shape, so the padding arithmetic and
// the palette only have to be right once. Widths are measured on the plain name and never on the
// decorated one, since `padEnd` counts escape bytes as characters and would shift every column
// right by the width of that row's own colour codes.
// `count` defaults to one file per line, which is wrong for a table whose lines are buckets:
// `dist/ total` has five rows standing for 22 files, and the label has to say 22.
function table(
  logger: Logger,
  title: string,
  note: string,
  lines: readonly Line[],
  count = lines.length,
): void {
  if (lines.length === 0) return;
  const total = files(count);
  const width = Math.max(...lines.map((l) => l.name.length), total.length);

  logger.info(`\n${bold(title)}${note === '' ? '' : ` ${dim(note)}`}`);
  for (const l of lines) {
    logger.info(
      row(decorate(l.name, l.tint) + ' '.repeat(width - l.name.length), l.before, l.after, DATA),
    );
  }
  const [before, after] = [sum(lines, (l) => l.before), sum(lines, (l) => l.after)];
  logger.info(row(bold(total.padEnd(width)), before, after, TOTAL));
}

// Reads only what it compresses: the 440 kB of font subsets are stat'd, never loaded.
async function measure(outDir: string, name: string): Promise<Row | null> {
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

function logPrecompressed(logger: Logger, outDir: string, rows: readonly Row[]): void {
  const written = rows
    .filter((r): r is Compressed => r.br !== null)
    .toSorted((a, b) => b.br - a.br)
    .map((r) => ({ name: r.name, tint: tintOf(bucketOf(r.name)), before: r.raw, after: r.br }));

  table(logger, 'brotli', `(${outDir}/, ${String(MIN_BYTES)} bytes and up)`, written);
}

// What the deploy actually weighs: every file counted once, at the size a server sends it.
function logTotal(logger: Logger, outDir: string, rows: readonly Row[]): void {
  const lines = [...Map.groupBy(rows, (r) => bucketOf(r.name))]
    .map(([bucket, group]) => ({
      name: bucket,
      tint: tintOf(bucket),
      before: sum(group, (r) => r.raw),
      after: sum(group, (r) => transfer(r)),
    }))
    .toSorted((a, b) => b.after - a.after);

  table(logger, `${outDir}/ total`, '', lines, rows.length);
}

type Shrunk = { name: string; before: number; after: number };

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

// Rewrites in place, and only ever downwards: an already-optimised jpeg comes back bigger,
// the same way woff2 does under brotli. That is also what makes a second pass a no-op.
async function shrink(outDir: string, name: string): Promise<Shrunk | null> {
  const path = join(outDir, name);
  const raw = await readFile(path);
  const out = name.endsWith('.svg') ? shrinkSvg(raw, name) : await shrinkRaster(raw, extname(name));

  if (out === null || out.byteLength >= raw.byteLength) return null;
  await writeFile(path, out);
  return { name, before: raw.byteLength, after: out.byteLength };
}

function logImages(logger: Logger, outDir: string, rows: readonly Shrunk[]): void {
  const shrunk = rows
    .toSorted((a, b) => b.after - a.after)
    .map((r) => ({
      name: r.name,
      tint: tintOf(bucketOf(r.name)),
      before: r.before,
      after: r.after,
    }));

  table(logger, 'images', `(${outDir}/)`, shrunk);
}

// The work is in `writeBundle` because every `writeBundle` resolves before any
// `closeBundle` starts: that is what lets `brotli()` below precompress the minified svg and
// the `dist/ total` table count the re-encoded bytes. Vite copies `public/` at `renderStart`,
// well before either, so `icon.svg` is already there to be found. Only the table waits for
// `closeBundle`, so it prints with the other two rather than above Vite's asset listing.
function images(): Plugin {
  let outDir = 'dist';
  let logger: Logger | undefined;
  let shrunk: Shrunk[] = [];

  return {
    name: 'images',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir;
      logger = config.logger;
    },
    async writeBundle() {
      const names = await readdir(outDir, { recursive: true });
      const rows = await Promise.all(
        names.filter((n) => IMAGES.test(n)).map((name) => shrink(outDir, name)),
      );
      shrunk = rows.filter((r) => r !== null);
    },
    closeBundle() {
      if (logger) logImages(logger, outDir, shrunk);
    },
  };
}

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
      // A stale `.br` would otherwise be counted as a file of its own under `emptyOutDir: false`.
      const measured = await Promise.all(
        names.filter((n) => !n.endsWith('.br')).map((name) => measure(outDir, name)),
      );

      const rows = measured.filter((r) => r !== null);
      if (!logger) return;
      logPrecompressed(logger, outDir, rows);
      logTotal(logger, outDir, rows);
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
    images(),
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
