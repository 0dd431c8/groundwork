import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brotli, measure, MIN_BYTES } from './brotli.ts';
import { distDir, put, recorder, start, useColor } from './test/harness.ts';

beforeEach(() => {
  useColor(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const js = (bytes: number): string => 'const a = 1;\n'.repeat(bytes).slice(0, bytes);

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

describe('measure', () => {
  it('writes the .br beside the file and reports both sizes', async () => {
    const dir = await distDir();
    await put(dir, 'assets/app.js', js(4000));

    const row = await measure(dir, 'assets/app.js');

    expect(row?.name).toBe('assets/app.js');
    expect(row?.raw).toBe(4000);
    const br = await readFile(join(dir, 'assets/app.js.br'));
    expect(row?.br).toBe(br.byteLength);
    expect(br.byteLength).toBeLessThan(4000);
  });

  it('compresses a file of exactly one MTU', async () => {
    const dir = await distDir();
    await put(dir, 'edge.js', js(MIN_BYTES));

    expect((await measure(dir, 'edge.js'))?.br).not.toBeNull();
    expect(await exists(join(dir, 'edge.js.br'))).toBe(true);
  });

  it('leaves a file under one MTU uncompressed, since it costs the same round trip', async () => {
    const dir = await distDir();
    await put(dir, 'under.js', js(MIN_BYTES - 1));

    expect(await measure(dir, 'under.js')).toEqual({
      name: 'under.js',
      raw: MIN_BYTES - 1,
      br: null,
    });
    expect(await exists(join(dir, 'under.js.br'))).toBe(false);
  });

  it.each(['font.woff2', 'photo.png', 'icon.ico'])(
    'leaves %s alone however big it is, since it would come back larger',
    async (name) => {
      const dir = await distDir();
      await put(dir, name, js(20_000));

      expect(await measure(dir, name)).toEqual({ name, raw: 20_000, br: null });
      expect(await exists(join(dir, `${name}.br`))).toBe(false);
    },
  );

  it('ignores a directory, which a recursive walk hands it too', async () => {
    const dir = await distDir();
    await put(dir, 'assets/app.js', js(4000));

    expect(await measure(dir, 'assets')).toBeNull();
  });
});

describe('brotli plugin', () => {
  const populate = async (dir: string): Promise<void> => {
    await put(dir, 'assets/app.js', js(4000));
    await put(dir, 'assets/font.woff2', js(20_000));
    await put(dir, 'index.html', js(2000));
    await put(dir, 'robots.txt', 'User-agent: *\n');
    // Left over from a previous build under `emptyOutDir: false`.
    await put(dir, 'assets/gone.js.br', js(500));
  };

  const run = async (dir: string): Promise<string> => {
    const log = recorder();
    const { closeBundle } = start(brotli(), dir, log);
    await closeBundle();
    return log.lines.join('\n');
  };

  it('precompresses only the files worth precompressing', async () => {
    const dir = await distDir();
    await populate(dir);

    await run(dir);

    const written = (await readdir(dir, { recursive: true })).filter((n) => n.endsWith('.br'));
    expect(written.toSorted()).toEqual([
      join('assets', 'app.js.br'),
      join('assets', 'gone.js.br'),
      'index.html.br',
    ]);
  });

  it('lists what it compressed, largest first, under a title naming the directory', async () => {
    const dir = await distDir();
    await populate(dir);

    const out = await run(dir);
    const rows = out.split('\n').filter((l) => /^ {2}(?:assets|index)/u.test(l));

    expect(out).toContain(`brotli (${dir}/, 1400 bytes and up)`);
    expect(rows.map((l) => l.trim().split(' ')[0])).toEqual([
      join('assets', 'app.js'),
      'index.html',
    ]);
    expect(out).not.toContain('robots.txt');
  });

  it('counts every file once in the total, and a stale .br not at all', async () => {
    const dir = await distDir();
    await populate(dir);

    const out = await run(dir);

    expect(out).toContain(`${dir}/ total`);
    // app.js, font.woff2, index.html, robots.txt. Not `assets/`, not the stale `.br`.
    expect(out).toMatch(/^ {2}4 files/mu);
    expect(out).toMatch(/^ {2}fonts /mu);
    expect(out).toMatch(/^ {2}js /mu);
    expect(out).toMatch(/^ {2}other /mu);
  });

  it('bills a compressed file at what a server sends and an uncompressed one at its own size', async () => {
    const dir = await distDir();
    await put(dir, 'assets/app.js', js(4000));
    await put(dir, 'assets/font.woff2', js(20_000));

    const out = await run(dir);
    const fonts = /^ {2}fonts +(?<raw>[\d.]+) kB → +(?<sent>[\d.]+) kB/mu.exec(out)?.groups;
    const scripts = /^ {2}js +(?<raw>[\d.]+) kB → +(?<sent>[\d.]+) kB/mu.exec(out)?.groups;

    expect(fonts?.['sent']).toBe(fonts?.['raw']);
    expect(Number(scripts?.['sent'])).toBeLessThan(Number(scripts?.['raw']));
  });
});
