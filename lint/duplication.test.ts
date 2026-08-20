import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';

const repo = resolve(import.meta.dirname, '..');
const jscpd = join(repo, 'node_modules', '.bin', 'jscpd');
const config = join(repo, '.jscpd.json');

/**
 * jscpd is the cross-file half of the duplication check, and its only assertion is an exit
 * code, so that is what these cases read. A path argument overrides the `path` in the config
 * while every other setting, the 50-token floor included, still comes from the real file.
 */
async function run(files: Record<string, string>): Promise<number> {
  const dir = await mkdtemp(join(tmpdir(), 'jscpd-'));
  onTestFinished(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  await Promise.all(
    Object.entries(files).map(([name, source]) => writeFile(join(dir, name), source)),
  );

  return new Promise((settle, fail) => {
    execFile(jscpd, ['--config', config, dir], { cwd: repo }, (error) => {
      if (error === null) {
        settle(0);
        return;
      }
      // An exit code is the finding; anything else means jscpd never ran.
      if (typeof error.code === 'number') settle(error.code);
      else fail(new Error('jscpd did not run', { cause: error }));
    });
  });
}

// Sixty-odd tokens, so the pair clears the floor without either file being long.
const label = `  const rounded = Math.round(value * 100) / 100;
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toFixed(2);
  const grouped = digits.replace(/\\B(?=(\\d{3})+(?!\\d))/gu, ',');
  return sign + '$' + grouped;`;

describe('jscpd', () => {
  it('fails on one implementation living in two files', async () => {
    const code = await run({
      'a.ts': `export function priceLabel(value: number): string {\n${label}\n}\n`,
      'b.ts': `export function costLabel(value: number): string {\n${label}\n}\n`,
    });

    expect(code).toBe(1);
  });

  it('passes when the shared span sits under the floor', async () => {
    const code = await run({
      'a.ts': 'export function open(id: string): void {\n  setOpen(id);\n}\n',
      'b.ts': 'export function reopen(id: string): void {\n  setOpen(id);\n}\n',
    });

    expect(code).toBe(0);
  });
});
