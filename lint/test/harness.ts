import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { onTestFinished } from 'vitest';

const repo = resolve(import.meta.dirname, '..', '..');
const oxlint = join(repo, 'node_modules', '.bin', 'oxlint');
const plugin = join(repo, 'lint', 'jotai.ts');

export type Finding = { rule: string; message: string; line: number };

type Diagnostic = {
  code?: string;
  message?: string;
  labels?: { span?: { line?: number } }[];
};

/**
 * There is no RuleTester for an oxlint JS plugin, so a case is a real file linted by the real
 * binary. That also means these rules are never asserted against a parser other than the one
 * that will run them.
 */
export async function lint(
  source: string,
  rules: Record<string, unknown>,
  name = 'case.tsx',
): Promise<Finding[]> {
  const dir = await mkdtemp(join(tmpdir(), 'lint-'));
  onTestFinished(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const config = {
    jsPlugins: [{ name: 'jotai', specifier: plugin }],
    // Only the rules under test: inheriting the repo's own config would mix its findings in.
    plugins: [],
    categories: {},
    rules,
  };
  await writeFile(join(dir, 'config.json'), JSON.stringify(config));
  await writeFile(join(dir, name), source);

  return parse(await capture(dir, name));
}

function capture(dir: string, name: string): Promise<string> {
  const args = ['-f', 'json', '--no-ignore', '-c', join(dir, 'config.json'), join(dir, name)];

  return new Promise((settle, fail) => {
    execFile(oxlint, args, { cwd: dir }, (error, stdout) => {
      // oxlint exits non-zero whenever it reports anything, which is most of these cases, so
      // output is the success signal rather than the exit code.
      if (stdout === '') fail(error ?? new Error('oxlint produced no output'));
      else settle(stdout);
    });
  });
}

function parse(stdout: string): Finding[] {
  // The shape is oxlint's `-f json` reporter, pinned by every assertion in jotai.test.ts: a
  // change to it fails those rather than passing something malformed through untyped.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const { diagnostics } = JSON.parse(stdout) as { diagnostics: Diagnostic[] };

  return diagnostics.map((entry) => ({
    rule: entry.code ?? '',
    message: entry.message ?? '',
    line: entry.labels?.[0]?.span?.line ?? -1,
  }));
}
