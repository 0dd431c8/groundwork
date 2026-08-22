# React boilerplate

A production-shaped starter: Vite 8, React 19, TanStack Router (file-based), TanStack Query,
TanStack Form, Jotai, Tailwind v4, shadcn, zod. Linted by oxlint, formatted by oxfmt, tested by
Vitest. Bun is the package manager and script runner; it is not the server or the bundler.

The rules here are enforced by `.oxlintrc.jsonc` and `tsconfig.json`, so breaking one fails
`bun run check` rather than review.

## Guides

This file holds what is true on every task. Topic detail lives in one file per topic, loaded when
the work calls for it. Claude Code and opencode pick these up as skills automatically; every other
agent reads the path.

| Doing this                                     | Read                                          |
| ---------------------------------------------- | --------------------------------------------- |
| Adding or changing a feature, or a route       | `.agents/skills/feature-development/SKILL.md` |
| Building a form                                | `.agents/skills/forms/SKILL.md`               |
| Writing JSX, styles or accessible markup       | `.agents/skills/styling-and-ui/SKILL.md`      |
| Writing tests                                  | `.agents/skills/testing/SKILL.md`             |
| Adding an environment variable                 | `.agents/skills/configuration/SKILL.md`       |
| Adding a lint rule, or working out why one hit | `.agents/skills/lint-rules/SKILL.md`          |
| Starting a real project from this template     | `.agents/skills/template-setup/SKILL.md`      |
| Writing Jotai atoms                            | `.agents/skills/jotai/SKILL.md`               |

Read the guide before writing the code, not after the linter objects.

## Bun

`bun install`, `bun run <script>`, `bunx <package>`, `bun <file>` for one-off scripts. Bun loads
`.env` automatically, so do not add `dotenv`. Vite exposes only `VITE_`-prefixed vars, and app
code reads them through `src/lib/env.ts`.

## Commands

| Command                                              | What it does                                                |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `bun run dev`                                        | Vite dev server                                             |
| `bun run build`                                      | `tsc -b` then `vite build`                                  |
| `bun run check`                                      | `format:check` + `lint` + `dupes` + `typecheck` + all tests |
| `bun run dupes`                                      | jscpd, copy-paste across `src`, `build` and `lint`          |
| `bun run test`                                       | Vitest watch, `app` project only                            |
| `bun run test:infra`                                 | Vitest watch, `build` and `lint` projects                   |
| `bun run test:coverage`                              | All three projects, v8 report in `coverage/`                |
| `bun run lint` / `lint:fix` / `format` / `typecheck` | The individual steps                                        |

**Run `bun run check` before claiming anything is done.** `bun run lint` alone passes while
types or tests are broken. `.github/workflows/ci.yml` runs this same command plus `build` on every
push and pull request, so a local pass is the whole gate rather than a rehearsal for a different
one.

**Never work around a `check` failure.** Every rule here encodes a decision about how this
codebase is built, so a failure names a real problem in the code and the fix is to remove the
cause. Silencing the report is not the fix: no `oxlint-disable` to quiet a rule you find
inconvenient, no `any` or `as` to end a type error, no raised `max-lines` or `complexity` ceiling,
no jscpd ignore marker over duplication, no `skip` on a failing test, no assertion loosened until
it passes. Read the message, work out why the code triggered it, change the code. The documented
escape hatches (an inline disable with a comment saying why) exist for the case the rule cannot
express, not for the case you are in a hurry; if you reach for one, say so and explain what makes
this call the exception. When you believe the rule itself is wrong, say that too and propose the
change to `.oxlintrc.jsonc` instead of routing around it in a source file.

## Layout

| Path                   | Holds                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/routes/`          | File-based routes, nested by directory. `src/routeTree.gen.ts` is generated and committed; never hand-edit it.                       |
| `src/features/<name>/` | Everything belonging to one feature: schema, state, transport, queries, components, tests.                                           |
| `src/lib/`             | Infrastructure only: app runtime, validated env, notifications and utilities. A module that names a feature does not belong here.    |
| `src/components/ui/`   | Vendored shadcn output. Treat as generated.                                                                                          |
| `src/styles/index.css` | The single stylesheet: Tailwind import, theme tokens, `@layer base`.                                                                 |
| `src/test/`            | `render.tsx` (`renderWithProviders`, `renderRoute`) and `setup.ts`.                                                                  |
| `public/`              | Copied to `dist/` verbatim, for files needing an exact name at a known URL. Anything importable belongs in `src/` so it gets hashed. |
| `build/`               | Vite plugins `vite.config.ts` imports (brotli, image optimisation, size tables).                                                     |
| `lint/`                | Local oxlint plugins for feature direction, Jotai, duplication and UI, plus the ESTree shapes they share in `types.ts`.              |

`build/`, `lint/` and `*.config.ts` are a separate TypeScript project. They cannot import from
`src` or use the `@/*` alias.

## Reuse before writing

Grep before you write. Every new component, helper or file starts with a search for one that
already does the job, because two implementations of one idea drift and then neither is the
answer.

- Before building any UI pattern (a form field, an empty state, a filter bar, a segmented
  control), search `src/` for it. If something close exists, use it or widen it with a prop.
- **Never copy a component to change three lines.** Lift the difference into a prop, or pull the
  shared part out. `src/features/todos/segmented-field.tsx` is the worked example: the priority
  picker and the filter bar are one control given two sets of options.
- A pattern two features need moves to `src/components/`. A primitive everything needs is a
  shadcn component in `src/components/ui/`, added with the CLI rather than written by hand. The
  same rule outside the UI: a second caller for a helper moves it up to the layer both callers
  can import, it does not get pasted twice.
- Generalising is not guessing. Wait for the second real caller, then extract from the two you
  have, so the shape comes from use and not from a prediction.

Two of these are enforced. `dry/no-identical-functions` fails a second function in one file with
a body identical to an earlier one, from 30 tokens up; `bun run dupes` runs jscpd over `src`,
`build` and `lint` and fails on any span of 50 tokens repeated across them. Neither can see that
a new component does what an existing one already does, which is why the grep is step one.

## Feature layers

Dependencies point one way, and the linter enforces every arrow:

```
<feature>.schema.ts <- <feature>.state.ts <- <feature>.api.ts <- <feature>.queries.ts <- *.tsx <- index.ts
```

Nothing imports back up the chain, and no feature imports another feature's internals.
`@/features/<name>` is legal; `@/features/<name>/<file>` is a lint error. Inside a feature import
relatively (`./<feature>.state`), so the folder can be renamed without editing its own internals.

State has three owners, and which one a value gets is decided by one question: who else needs to
see it?

| Owner       | For                                                                               | Reached by                                 |
| ----------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| React Query | Anything that came from a server                                                  | `useQuery(<feature>Query)`                 |
| The URL     | A view worth sharing or worth surviving a reload: a filter, a search term, a page | `validateSearch` on the route, then a prop |
| Jotai       | Everything else this browser owns alone                                           | `useAtomValue` / `useSetAtom`              |

The rule that matters: **server data is never copied into an atom, and ephemeral UI state is never
parked in the query cache.** When a mutation changes server data, invalidate the key and let the
query refetch; do not hand the response to a `set(...)`. Do not reach for React Context to share
values, and do not lift state through props just to share it - the exception is state the URL owns,
which the route reads once and hands down, because a component that calls `useSearch` itself cannot
be rendered without a router.

Components are named function declarations with an explicit `: JSX.Element`. No default exports
anywhere.

**Never hand-roll a control `src/components/ui/` already provides.** `Button`, not `<button>`;
`Input`, not `<input>`; the same for `Label`, `Checkbox`, `Separator` and the `Field` family. If
the primitive is missing, `bunx shadcn@latest add <name>`.

## What the linter rejects

`.oxlintrc.jsonc` errors on the `correctness`, `suspicious`, `pedantic` and `perf` categories,
and runs type-aware rules against the real TypeScript program. Every rule reports a message
naming the fix.

**Banned imports.** Each has the same escape hatch: an inline
`// oxlint-disable-next-line no-restricted-imports` plus a comment saying why.

| Banned                                               | Instead                                              |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `useEffect` from `react`                             | Derive state with an atom, or use an event handler   |
| `forwardRef` from `react`                            | React 19 passes `ref` as an ordinary prop            |
| `createContext` / `useContext`                       | Jotai for client state, React Query for server state |
| `getDefaultStore` from `jotai`                       | The explicit store in `src/lib/runtime.tsx`          |
| `@/features/*/*`                                     | The feature's `index.ts`                             |
| `useMutation` / `useQueryClient` in a feature `.tsx` | A named hook in `<feature>.queries.ts`               |

Per-layer bans enforce the dependency arrows above, on top of that table.

**Also on:** `react/react-compiler`; `explicit-module-boundary-types`; `ui/no-raw-element`, which
errors on every JSX element outside its structural allowlist; `dry/no-identical-functions`;
`import/no-cycle`; `no-deprecated`. No `any`, no non-null `!`, no `console`, no `@ts-ignore`.
`react-perf` bans new objects, arrays and JSX as props, though new functions are fine. `max-lines`
400, `max-lines-per-function` 40, `complexity` 15, with test files exempt from the first two:
extract a hook or a sub-component rather than raising a limit.

`tsconfig.json` runs `strict` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature` and `noImplicitReturns`.
