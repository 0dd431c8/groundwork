import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { onTestFinished } from 'vitest';

const repo = resolve(import.meta.dirname, '..', '..');
const oxlint = join(repo, 'node_modules', '.bin', 'oxlint');
const projectConfig = join(repo, '.oxlintrc.jsonc');
const plugins = [
  { name: 'jotai', specifier: join(repo, 'lint', 'jotai.ts') },
  { name: 'dry', specifier: join(repo, 'lint', 'dry.ts') },
  { name: 'ui', specifier: join(repo, 'lint', 'ui.ts') },
];

export type Finding = { rule: string; message: string; help: string; line: number };

type Diagnostic = {
  code?: string;
  message?: string;
  // Where a rule's configured message lands. `message` is the rule's own fixed wording.
  help?: string;
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
    jsPlugins: plugins,
    // Only the rules under test: inheriting the repo's own config would mix its findings in.
    // Registering every local plugin costs nothing: a rule `rules` does not name never runs.
    plugins: [],
    categories: {},
    rules,
  };
  const path = join(dir, 'config.json');
  await writeFile(path, JSON.stringify(config));
  await writeFile(join(dir, name), source);

  return parse(await capture(dir, name, path));
}

/**
 * The same, against the repo's own .oxlintrc.jsonc. Rules that live in config rather than in a
 * plugin have nothing else to assert against, and what is worth proving about them is that the
 * shipped file rejects the case, not that oxlint can. Type-aware rules report on a fixture
 * outside the tsconfig program, so callers filter to the rule they came for.
 */
export async function lintWithProjectConfig(source: string, name = 'case.tsx'): Promise<Finding[]> {
  const dir = await mkdtemp(join(tmpdir(), 'lint-'));
  onTestFinished(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  await writeFile(join(dir, name), source);

  return parse(await capture(dir, name, projectConfig));
}

function capture(dir: string, name: string, config: string): Promise<string> {
  const args = ['-f', 'json', '--no-ignore', '-c', config, join(dir, name)];

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
    help: entry.help ?? '',
    line: entry.labels?.[0]?.span?.line ?? -1,
  }));
}
