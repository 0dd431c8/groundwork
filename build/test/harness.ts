import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { onTestFinished, vi } from 'vitest';
import type { Plugin, ResolvedConfig } from 'vite';
import type { Log } from '../report.ts';

/** Stands in for Vite's logger and keeps what a table printed. */
export type Recorder = Log & { lines: string[] };

export function recorder(): Recorder {
  const lines: string[] = [];
  return {
    lines,
    info: (msg) => {
      lines.push(msg);
    },
  };
}

// `styleText` reads the environment on every call, so pinning it here is what keeps an
// assertion on a table the same under a TTY, a pipe and CI alike.
export function useColor(on: boolean): void {
  vi.stubEnv('NO_COLOR', on ? undefined : '1');
  vi.stubEnv('FORCE_COLOR', on ? '1' : undefined);
}

// Built rather than written as a literal: a raw escape byte in a regex is a control
// character, which `no-control-regex` rejects.
const ANSI = new RegExp(`${String.fromCodePoint(27)}\\[\\d+m`, 'gu');

export const stripAnsi = (s: string): string => s.replaceAll(ANSI, '');

// Vite types every hook as function-or-object, so the narrowing happens once, here.
type Hooks = {
  writeBundle: () => Promise<void>;
  closeBundle: () => Promise<void> | void;
};

/**
 * Runs `configResolved` with the only two fields these plugins read, and hands back the
 * hooks a test drives by hand. Both assertions are the point of the helper: Vite types a
 * hook as function-or-object and gives it a plugin context and bundle arguments none of
 * this needs, and a whole `ResolvedConfig` cannot be stood up for two fields.
 */
export function start(plugin: Plugin, dir: string, log: Log): Hooks {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const config = { build: { outDir: dir }, logger: log } as unknown as ResolvedConfig;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const hooks = plugin as unknown as Hooks & { configResolved: (c: ResolvedConfig) => void };
  hooks.configResolved(config);
  return hooks;
}

/** An empty stand-in for `dist/`, removed when the test ends. */
export async function distDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'build-'));
  onTestFinished(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

export async function put(dir: string, name: string, data: Buffer | string): Promise<string> {
  const path = join(dir, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  return path;
}
