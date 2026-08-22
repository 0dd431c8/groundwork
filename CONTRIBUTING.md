# Contributing

Thanks for helping improve groundwork. Changes should preserve the starter's central promise: a
fresh clone runs immediately, and one local command reproduces the complete CI gate.

## Set up the repository

Install the Bun version in `.bun-version`, then install dependencies and start Vite:

```sh
bun install
bun run dev
```

`bun install` also enables the repository's pre-commit hook. Read `AGENTS.md` before changing code;
its guides describe the enforced feature layers, state ownership, UI conventions, tests, and
tooling.

## Make a change

- Search `src/` before adding a component or helper. Reuse or widen an existing implementation
  when it already owns the pattern.
- Keep feature code under `src/features/<name>/` and import a feature through its `index.ts` barrel.
  Colocate tests with the source they cover.
- Add routes under `src/routes/`, but never edit the generated `src/routeTree.gen.ts` by hand.
- Add shadcn primitives with `bunx shadcn@latest add <name>` rather than hand-writing or manually
  editing files under `src/components/ui/`.
- Update `AGENTS.md` or its linked skill when a change alters a repository-wide convention.
- Keep pull requests focused. Explain the user-visible behavior, important implementation choices,
  and the tests that establish the result. The project does not require a particular commit-message
  format.

## Verify the result

Run the complete local gate before opening a pull request:

```sh
bun run check
```

It checks formatting, lint rules, duplication, TypeScript, coverage thresholds, every test suite,
and the production Vite build. Do not silence or bypass a failure; fix the cause described by the
tool. CI runs the same command with the frozen lockfile.

## Report security issues privately

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md) to send
a private report through GitHub's security advisory flow.
