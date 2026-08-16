/**
 * Pre-commit hook: formats and lint-fixes staged JS/TS/CSS files, re-stages the
 * fixes, then typechecks the project. Installed via `core.hooksPath`, which the
 * `prepare` script in package.json points at `.githooks/`.
 *
 * Bypass with `git commit --no-verify`.
 */

// CSS is included because oxfmt formats it too; oxlint ignores it and exits 0.
const SOURCE_FILE = /\.([cm]?[jt]sx?|css)$/;

function fail(message: string): never {
  console.error(`pre-commit: ${message}`);
  process.exit(1);
}

async function gitPaths(...args: string[]): Promise<string[]> {
  const proc = Bun.spawn(['git', ...args, '-z'], { stdout: 'pipe', stderr: 'inherit' });
  const stdout = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) fail(`\`git ${args.join(' ')}\` failed`);
  return stdout.split('\0').filter(Boolean);
}

/** Runs a command, streaming its output. Returns its exit code. */
async function run(cmd: string[]): Promise<number> {
  const proc = Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit' });
  return await proc.exited;
}

/**
 * A file staged with only some of its changes would have the rest swept into
 * the commit by the `git add` below, so refuse rather than silently widen it.
 */
async function assertFullyStaged(files: string[]): Promise<void> {
  const unstaged = new Set(await gitPaths('diff', '--name-only'));
  const partial = files.filter((file) => unstaged.has(file));
  if (partial.length === 0) return;
  fail(
    `these files are only partially staged, so auto-fixing them would pull in unstaged changes:\n` +
      partial.map((file) => `  ${file}`).join('\n') +
      `\nStage or stash the rest, or commit with --no-verify.`,
  );
}

async function fixStaged(files: string[]): Promise<void> {
  // Format first: the line-counting rules in .oxlintrc.jsonc (max-lines,
  // max-lines-per-function) only mean anything against formatted source.
  if ((await run(['bunx', 'oxfmt', '--no-error-on-unmatched-pattern', ...files])) !== 0) {
    fail('formatting failed');
  }
  // `--no-error-on-unmatched-pattern`: every staged file may be covered by
  // ignorePatterns (e.g. src/routeTree.gen.ts), which is not a lint failure.
  if ((await run(['bunx', 'oxlint', '--fix', '--no-error-on-unmatched-pattern', ...files])) !== 0) {
    fail('lint errors remain after --fix');
  }
  // Format again: oxlint's fixer rewrites source without reformatting it, so
  // this pass is what guarantees the committed bytes are formatted.
  if ((await run(['bunx', 'oxfmt', '--no-error-on-unmatched-pattern', ...files])) !== 0) {
    fail('formatting failed');
  }
  if ((await run(['git', 'add', '--', ...files])) !== 0) fail('could not re-stage fixed files');
}

const staged = (await gitPaths('diff', '--cached', '--name-only', '--diff-filter=ACMR')).filter(
  (file) => SOURCE_FILE.test(file),
);

if (staged.length > 0) {
  await assertFullyStaged(staged);
  await fixStaged(staged);
}

// `-b`, not `--noEmit`: the app and the tooling (vite.config.ts, this file) are
// separate tsconfig projects, and only build mode checks both.
if ((await run(['bunx', 'tsc', '-b'])) !== 0) fail('typecheck failed');
