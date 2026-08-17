import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { images, shrink } from './images.ts';
import { distDir, put, recorder, start, useColor } from './test/harness.ts';

beforeEach(() => {
  useColor(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// Noise rather than a flat colour: a compressible fixture would shrink under any encoder,
// including one that quietly did nothing.
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

describe('shrink', () => {
  // Each source is encoded above the plugin's own quality, so the re-encode has work to do.
  it.each([
    ['photo.png', (): Promise<Buffer> => noise().png({ compressionLevel: 0 }).toBuffer()],
    ['photo.jpg', (): Promise<Buffer> => noise().jpeg({ quality: 100 }).toBuffer()],
    ['photo.jpeg', (): Promise<Buffer> => noise().jpeg({ quality: 100 }).toBuffer()],
    ['photo.webp', (): Promise<Buffer> => noise().webp({ quality: 100 }).toBuffer()],
    ['photo.avif', (): Promise<Buffer> => noise().avif({ quality: 90 }).toBuffer()],
  ])('re-encodes %s in place', async (name, encode) => {
    const dir = await distDir();
    const raw = await encode();
    await put(dir, name, raw);

    const row = await shrink(dir, name);
    const out = await readFile(join(dir, name));

    expect(row).toEqual({ name, before: raw.byteLength, after: out.byteLength });
    expect(out.byteLength).toBeLessThan(raw.byteLength);
  });

  it('minifies an svg, keeping the viewBox svgo v4 no longer strips', async () => {
    const dir = await distDir();
    await put(dir, 'icon.svg', SVG);

    const row = await shrink(dir, 'icon.svg');
    const out = await readFile(join(dir, 'icon.svg'), 'utf8');

    expect(row?.after).toBeLessThan(SVG.length);
    expect(out).toContain('viewBox="0 0 24 24"');
    expect(out).not.toContain('<!--');
  });

  it('bakes EXIF orientation into the pixels, so a phone photo does not ship sideways', async () => {
    const dir = await distDir();
    const raw = await sharp({
      create: { width: 160, height: 120, channels: 3, background: { r: 200, g: 30, b: 40 } },
    })
      .jpeg({ quality: 100 })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await put(dir, 'photo.jpg', raw);

    await shrink(dir, 'photo.jpg');
    const out = await sharp(await readFile(join(dir, 'photo.jpg'))).metadata();

    expect((await sharp(raw).metadata()).orientation).toBe(6);
    expect([out.width, out.height]).toEqual([120, 160]);
    expect(out.orientation).toBeUndefined();
  });

  it('rewrites only downwards, so a second pass is a no-op', async () => {
    const dir = await distDir();
    await put(dir, 'icon.svg', SVG);
    await shrink(dir, 'icon.svg');
    const once = await readFile(join(dir, 'icon.svg'));

    expect(await shrink(dir, 'icon.svg')).toBeNull();
    expect(await readFile(join(dir, 'icon.svg'))).toEqual(once);
  });

  it.each(['anim.gif', 'favicon.ico'])('will not touch %s', async (name) => {
    const dir = await distDir();
    const raw = await noise().gif().toBuffer();
    await put(dir, name, raw);

    expect(await shrink(dir, name)).toBeNull();
    expect(await readFile(join(dir, name))).toEqual(raw);
  });
});

describe('images plugin', () => {
  it('walks the output directory and reports what it saved, biggest first', async () => {
    const dir = await distDir();
    const png = await noise().png({ compressionLevel: 0 }).toBuffer();
    const gif = await noise().gif().toBuffer();
    await put(dir, 'assets/photo-A1b2C3d4.png', png);
    await put(dir, 'icon.svg', SVG);
    await put(dir, 'assets/anim.gif', gif);
    await put(dir, 'assets/app.js', 'const a = 1;\n');
    const log = recorder();

    const { writeBundle, closeBundle } = start(images(), dir, log);
    await writeBundle();
    await closeBundle();
    const out = log.lines.join('\n');

    expect(out).toContain(`images (${dir}/)`);
    expect(
      out
        .split('\n')
        .slice(2)
        .map((l) => l.trim().split(' ')[0]),
    ).toEqual([join('assets', 'photo-A1b2C3d4.png'), 'icon.svg', '2']);
    expect(await readFile(join(dir, 'assets/anim.gif'))).toEqual(gif);
    expect((await readFile(join(dir, 'assets/photo-A1b2C3d4.png'))).byteLength).toBeLessThan(
      png.byteLength,
    );
  });

  it('prints nothing when there was nothing to re-encode', async () => {
    const dir = await distDir();
    await put(dir, 'app.js', 'const a = 1;\n');
    const log = recorder();

    const { writeBundle, closeBundle } = start(images(), dir, log);
    await writeBundle();
    await closeBundle();

    expect(log.lines).toEqual([]);
  });
});
