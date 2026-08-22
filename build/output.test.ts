import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import sharp, { type Sharp } from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build as viteBuild } from 'vite';
import { output } from './output.ts';
import { distDir, put, recorder, start, useColor } from './test/harness.ts';

beforeEach(() => {
  useColor(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const text = (bytes: number): string => 'const value = 1;\n'.repeat(bytes).slice(0, bytes);

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

const noise = (): Sharp =>
  sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
      noise: { type: 'gaussian', mean: 128, sigma: 40 },
    },
  });

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- drawn by hand -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M 1.0 2.0 L 3.0 4.0" fill="#ff0000"/>
</svg>
`;

async function run(dir: string): Promise<string> {
  const log = recorder();
  const hooks = start(output(), dir, log);
  await hooks.writeBundle();
  await hooks.closeBundle();
  return log.lines.join('\n');
}

describe('build output Vite interface', () => {
  it('runs image rewriting before precompressing the final bytes in a real Vite build', async () => {
    const root = await distDir();
    const circles = Array.from(
      { length: 240 },
      (_, index) => `<circle cx="${String(index)}" cy="${String(index % 24)}" r="1"/>`,
    ).join('');
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 24">${circles}</svg>`;
    await put(root, 'index.html', '<main>ready</main>');
    await put(root, 'public/icon.svg', rawSvg);

    await viteBuild({
      root,
      logLevel: 'silent',
      plugins: [output()],
      build: { outDir: join(root, 'dist') },
    });

    const optimized = await readFile(join(root, 'dist', 'icon.svg'));
    const compressed = await readFile(join(root, 'dist', 'icon.svg.br'));
    expect(brotliDecompressSync(compressed)).toEqual(optimized);
    expect(optimized.byteLength).toBeLessThan(Buffer.byteLength(rawSvg));
  });

  it.each([
    ['photo.png', (): Promise<Buffer> => noise().png({ compressionLevel: 0 }).toBuffer()],
    ['photo.jpg', (): Promise<Buffer> => noise().jpeg({ quality: 100 }).toBuffer()],
    ['photo.jpeg', (): Promise<Buffer> => noise().jpeg({ quality: 100 }).toBuffer()],
    ['photo.webp', (): Promise<Buffer> => noise().webp({ quality: 100 }).toBuffer()],
    ['photo.avif', (): Promise<Buffer> => noise().avif({ quality: 90 }).toBuffer()],
  ])('re-encodes %s downwards', async (name, encode) => {
    const dir = await distDir();
    const raw = await encode();
    await put(dir, name, raw);

    await run(dir);

    expect((await readFile(join(dir, name))).byteLength).toBeLessThan(raw.byteLength);
  });

  it('minifies SVG without stripping its viewBox', async () => {
    const dir = await distDir();
    await put(dir, 'icon.svg', SVG);

    await run(dir);
    const optimized = await readFile(join(dir, 'icon.svg'), 'utf8');

    expect(optimized.length).toBeLessThan(SVG.length);
    expect(optimized).toContain('viewBox="0 0 24 24"');
    expect(optimized).not.toContain('<!--');
  });

  it('bakes EXIF orientation into image pixels', async () => {
    const dir = await distDir();
    const raw = await sharp({
      create: { width: 160, height: 120, channels: 3, background: { r: 200, g: 30, b: 40 } },
    })
      .jpeg({ quality: 100 })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await put(dir, 'photo.jpg', raw);

    await run(dir);
    const metadata = await sharp(await readFile(join(dir, 'photo.jpg'))).metadata();

    expect([metadata.width, metadata.height]).toEqual([120, 160]);
    expect(metadata.orientation).toBeUndefined();
  });

  it.each(['anim.gif', 'favicon.ico'])('leaves %s untouched', async (name) => {
    const dir = await distDir();
    const raw = await noise().gif().toBuffer();
    await put(dir, name, raw);

    await run(dir);

    expect(await readFile(join(dir, name))).toEqual(raw);
  });

  it('precompresses text at one MTU and leaves smaller text alone', async () => {
    const dir = await distDir();
    await put(dir, 'edge.js', text(1400));
    await put(dir, 'under.js', text(1399));

    await run(dir);

    expect(await exists(join(dir, 'edge.js.br'))).toBe(true);
    expect(await exists(join(dir, 'under.js.br'))).toBe(false);
  });

  it('reports images, Brotli output, and total transfer weight', async () => {
    const dir = await distDir();
    await put(dir, 'assets/app-A1b2C3d4.js', text(4000));
    await put(dir, 'icon.svg', SVG);
    await put(dir, 'font.woff2', text(20_000));

    const report = await run(dir);

    expect(report).toContain(`images (${dir}/)`);
    expect(report).toContain(`brotli (${dir}/, 1400 bytes and up)`);
    expect(report).toContain(`${dir}/ total`);
    expect(report).toMatch(/^ {2}3 files/mu);
    expect(report).toMatch(/^ {2}fonts /mu);
    expect(report).toMatch(/^ {2}js /mu);
  });

  it('does not count a stale Brotli file as output of its own', async () => {
    const dir = await distDir();
    await put(dir, 'app.js', text(4000));
    await put(dir, 'app.js.br', text(500));

    const report = await run(dir);

    expect(report).toMatch(/^ {2}1 file /mu);
  });
});
