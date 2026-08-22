import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { type InspectColor, promisify, styleText } from 'node:util';
import { brotliCompress } from 'node:zlib';
import sharp, { type Sharp } from 'sharp';
import { optimize as optimizeSvg } from 'svgo';
import type { Plugin } from 'vite';

type Log = { info: (message: string) => void };
type Paint = (value: string) => string;
type ImageRow = { name: string; before: number; after: number };
type OutputRow = { name: string; raw: number; br: number | null };
type CompressedRow = OutputRow & { br: number };
type Line = { name: string; tint: Paint; before: number; after: number };
type Style = { size: Paint; gain: Paint };

const compress = promisify(brotliCompress);
const MIN_BYTES = 1400;
const PRECOMPRESS = /\.(?:js|css|html|svg|json|txt)$/u;
const IMAGES = /\.(?:png|jpe?g|webp|avif|svg)$/u;
const HASH = /-[\w-]{8}(?=\.[^.]*$)/u;
const BUCKETS = [
  ['js', /\.js$/u],
  ['css', /\.css$/u],
  ['fonts', /\.(?:woff2?|ttf|otf|eot)$/u],
  ['images', /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/u],
] as const;

const encode: Record<string, (image: Sharp) => Sharp> = {
  '.png': (image) => image.png({ quality: 80, effort: 7, palette: true }),
  '.jpg': (image) => image.jpeg({ quality: 80, mozjpeg: true }),
  '.jpeg': (image) => image.jpeg({ quality: 80, mozjpeg: true }),
  '.webp': (image) => image.webp({ quality: 80, effort: 6 }),
  '.avif': (image) => image.avif({ quality: 60, effort: 5 }),
};

const paint =
  (...format: InspectColor[]): Paint =>
  (value) =>
    styleText(format, value);

const plain: Paint = (value) => value;
const dim = paint('dim');
const bold = paint('bold');
const DATA: Style = { size: dim, gain: paint('green') };
const TOTAL: Style = { size: bold, gain: paint('bold', 'green') };
const TINTS: Record<string, Paint> = {
  js: paint('cyan'),
  css: paint('magenta'),
  fonts: paint('yellow'),
  images: paint('blue'),
};

const bucketOf = (name: string): string =>
  BUCKETS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other';
const tintOf = (bucket: string): Paint => TINTS[bucket] ?? plain;
const sum = <T>(rows: readonly T[], pick: (item: T) => number): number =>
  rows.reduce((total, item) => total + pick(item), 0);
const transfer = (item: OutputRow): number => item.br ?? item.raw;
const kilobytes = (value: number): string => `${(value / 1000).toFixed(2)} kB`.padStart(9);
const fileCount = (count: number): string => `${String(count)} file${count === 1 ? '' : 's'}`;

function decorate(name: string, tint: Paint): string {
  const cut = name.lastIndexOf('/') + 1;
  const directory = cut === 0 ? '' : dim(name.slice(0, cut));
  const base = name.slice(cut);
  const hash = HASH.exec(base);
  if (!hash) return directory + tint(base);
  const end = hash.index + hash[0].length;
  return directory + tint(base.slice(0, hash.index)) + dim(hash[0]) + tint(base.slice(end));
}

function percentage(before: number, after: number): string {
  const change = before === 0 ? 0 : Math.round(((after - before) / before) * 100);
  return `${String(change)}%`.padStart(5);
}

function row(label: string, before: number, after: number, style: Style): string {
  const afterStyle = after < before ? style.gain : style.size;
  return `  ${label} ${style.size(kilobytes(before))} ${dim('→')} ${afterStyle(kilobytes(after))} ${style.size(percentage(before, after))}`;
}

function table(
  log: Log,
  title: string,
  note: string,
  lines: readonly Line[],
  count = lines.length,
) {
  if (lines.length === 0) return;
  const total = fileCount(count);
  const width = Math.max(...lines.map((line) => line.name.length), total.length);

  log.info(`\n${bold(title)}${note === '' ? '' : ` ${dim(note)}`}`);
  for (const line of lines) {
    const label = decorate(line.name, line.tint) + ' '.repeat(width - line.name.length);
    log.info(row(label, line.before, line.after, DATA));
  }
  const before = sum(lines, (line) => line.before);
  const after = sum(lines, (line) => line.after);
  log.info(row(bold(total.padEnd(width)), before, after, TOTAL));
}

function shrinkRaster(raw: Buffer, extension: string): Promise<Buffer> | null {
  const encoder = encode[extension];
  if (encoder === undefined) return null;
  return encoder(sharp(raw).autoOrient()).toBuffer();
}

async function shrinkImage(outDir: string, name: string): Promise<ImageRow | null> {
  const path = join(outDir, name);
  const raw = await readFile(path);
  const optimized = name.endsWith('.svg')
    ? Buffer.from(optimizeSvg(raw.toString('utf8'), { path: name, multipass: true }).data)
    : await shrinkRaster(raw, extname(name));

  if (optimized === null || optimized.byteLength >= raw.byteLength) return null;
  await writeFile(path, optimized);
  return { name, before: raw.byteLength, after: optimized.byteLength };
}

async function measureOutput(outDir: string, name: string): Promise<OutputRow | null> {
  const path = join(outDir, name);
  const info = await stat(path);
  if (!info.isFile()) return null;
  if (!PRECOMPRESS.test(name) || info.size < MIN_BYTES) {
    return { name, raw: info.size, br: null };
  }
  const compressed = await compress(await readFile(path));
  await writeFile(`${path}.br`, compressed);
  return { name, raw: info.size, br: compressed.byteLength };
}

function logImages(log: Log, outDir: string, rows: readonly ImageRow[]): void {
  const lines = rows
    .toSorted((a, b) => b.after - a.after)
    .map((item) => ({
      name: item.name,
      tint: tintOf(bucketOf(item.name)),
      before: item.before,
      after: item.after,
    }));
  table(log, 'images', `(${outDir}/)`, lines);
}

function logPrecompressed(log: Log, outDir: string, rows: readonly OutputRow[]): void {
  const lines = rows
    .filter((item): item is CompressedRow => item.br !== null)
    .toSorted((a, b) => b.br - a.br)
    .map((item) => ({
      name: item.name,
      tint: tintOf(bucketOf(item.name)),
      before: item.raw,
      after: item.br,
    }));
  table(log, 'brotli', `(${outDir}/, ${String(MIN_BYTES)} bytes and up)`, lines);
}

function logTotal(log: Log, outDir: string, rows: readonly OutputRow[]): void {
  const lines = [...Map.groupBy(rows, (item) => bucketOf(item.name))]
    .map(([bucket, group]) => ({
      name: bucket,
      tint: tintOf(bucket),
      before: sum(group, (item) => item.raw),
      after: sum(group, transfer),
    }))
    .toSorted((a, b) => b.after - a.after);
  table(log, `${outDir}/ total`, '', lines, rows.length);
}

export function output(): Plugin {
  let outDir = 'dist';
  let log: Log | undefined;
  let images: ImageRow[] = [];

  return {
    name: 'build-output',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir;
      log = config.logger;
    },
    async writeBundle() {
      const names = await readdir(outDir, { recursive: true });
      const rows = await Promise.all(
        names.filter((name) => IMAGES.test(name)).map((name) => shrinkImage(outDir, name)),
      );
      images = rows.filter((item) => item !== null);
    },
    async closeBundle() {
      const names = await readdir(outDir, { recursive: true });
      const measured = await Promise.all(
        names.filter((name) => !name.endsWith('.br')).map((name) => measureOutput(outDir, name)),
      );
      const rows = measured.filter((item) => item !== null);
      if (log === undefined) return;
      logImages(log, outDir, images);
      logPrecompressed(log, outDir, rows);
      logTotal(log, outDir, rows);
    },
  };
}
