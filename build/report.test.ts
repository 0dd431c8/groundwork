import { afterEach, describe, expect, it, vi } from 'vitest';
import { bucketOf, type Line, sum, table, tintOf } from './report.ts';
import { recorder, stripAnsi, useColor } from './test/harness.ts';

afterEach(() => {
  vi.unstubAllEnvs();
});

// Written out rather than pasted in, so no invisible escape byte ends up in this file.
const ESC = String.fromCodePoint(27);
const dim = (s: string): string => `${ESC}[2m${s}${ESC}[22m`;
const cyan = (s: string): string => `${ESC}[36m${s}${ESC}[39m`;
const GREEN = `${ESC}[32m`;

const line = (name: string, before: number, after: number): Line => ({
  name,
  tint: tintOf(bucketOf(name)),
  before,
  after,
});

const print = (lines: readonly Line[], count?: number): string => {
  const log = recorder();
  table(log, 'brotli', '(dist/, 1400 bytes and up)', lines, count);
  return log.lines.join('\n');
};

describe('bucketOf', () => {
  it.each([
    ['assets/index-Bu49lod9.js', 'js'],
    ['assets/index-DyvEzv04.css', 'css'],
    ['assets/noto-sans-latin-wght-normal-BYSzYMf3.woff2', 'fonts'],
    ['assets/logo.ttf', 'fonts'],
    ['icon.svg', 'images'],
    ['photo.jpeg', 'images'],
    ['favicon.ico', 'images'],
    ['index.html', 'other'],
    ['robots.txt', 'other'],
  ])('puts %s in %s', (name, bucket) => {
    expect(bucketOf(name)).toBe(bucket);
  });
});

describe('sum', () => {
  it('adds the picked field', () => {
    expect(sum([{ n: 1 }, { n: 2 }, { n: 4 }], (r) => r.n)).toBe(7);
  });

  it('is 0 for nothing', () => {
    expect(sum([], (r: { n: number }) => r.n)).toBe(0);
  });
});

describe('table', () => {
  it('prints nothing at all when there are no rows', () => {
    useColor(false);
    const log = recorder();
    table(log, 'brotli', '(dist/)', []);

    expect(log.lines).toEqual([]);
  });

  it('lays every column out against the longest name', () => {
    useColor(false);
    const out = print([
      line('assets/app-A1b2C3d4.js', 100_000, 25_000),
      line('index.html', 2000, 1000),
    ]);

    expect(out).toBe(
      [
        '',
        'brotli (dist/, 1400 bytes and up)',
        '  assets/app-A1b2C3d4.js 100.00 kB →  25.00 kB  -75%',
        '  index.html               2.00 kB →   1.00 kB  -50%',
        '  2 files                102.00 kB →  26.00 kB  -75%',
      ].join('\n'),
    );
  });

  it('widens to the total label when every name is shorter', () => {
    useColor(false);

    expect(print([line('a.js', 2000, 1000)])).toContain('  a.js     2.00 kB →   1.00 kB  -50%');
  });

  it('counts one file per row unless told otherwise', () => {
    useColor(false);

    expect(print([line('a.js', 2000, 1000)])).toContain('1 file ');
    expect(print([line('a.js', 2000, 1000), line('b.js', 10, 10)])).toContain('2 files');
    // `dist/ total` prints a handful of bucket rows standing for every file in the build.
    expect(print([line('a.js', 2000, 1000), line('b.js', 10, 10)], 22)).toContain('22 files');
  });

  it('drops the note when there is none', () => {
    useColor(false);
    const log = recorder();
    table(log, 'dist/ total', '', [line('a.js', 2000, 1000)]);

    expect(log.lines[0]).toBe('\ndist/ total');
  });

  it('reports 0% rather than dividing by zero', () => {
    useColor(false);

    expect(print([line('empty.js', 0, 0)])).toContain('0.00 kB →   0.00 kB    0%');
  });

  it('measures widths on the plain name, not on the escapes around it', () => {
    const lines = [line('assets/app-A1b2C3d4.js', 100_000, 25_000), line('index.html', 2000, 1000)];

    useColor(false);
    const plain = print(lines);
    useColor(true);
    const painted = print(lines);

    expect(painted).not.toBe(plain);
    expect(stripAnsi(painted)).toBe(plain);
  });

  it('tints the stem by bucket and dims the directory and the hash', () => {
    useColor(true);

    expect(print([line('assets/app-A1b2C3d4.js', 2000, 1000)])).toContain(
      `${dim('assets/')}${cyan('app')}${dim('-A1b2C3d4')}${cyan('.js')}`,
    );
  });

  it('leaves an unhashed name in one piece, and an unknown bucket unpainted', () => {
    useColor(true);

    expect(print([line('robots.txt', 2000, 1000)])).toContain('  robots.txt ');
    expect(print([line('a.js', 2000, 1000)])).toContain(cyan('a.js'));
  });

  it('greens the output column only where a row got smaller', () => {
    useColor(true);

    expect(print([line('a.js', 2000, 1000)])).toContain(GREEN);
    expect(print([line('a.woff2', 2000, 2000)])).not.toContain(GREEN);
  });
});
