---
name: lint-rules
description: Add or change an oxlint rule, work on the local plugins in lint/, or understand why a rule fired. Use when editing .oxlintrc.jsonc, writing or testing a plugin in lint/jotai.ts, lint/dry.ts or lint/ui.ts, adding an entry to the ui/no-raw-element allowlist, changing a per-layer import ban, or deciding whether a lint failure is the rule's fault or the code's.
---

# Lint rules

`AGENTS.md` lists what the linter rejects. This is how the rules are built, why each one is there,
and what to do when you add another.

`lint/` holds the local oxlint plugins `jotai.ts`, `dry.ts` and `ui.ts`, loaded through
`jsPlugins`, and the ESTree shapes they share in `types.ts`. Each has a colocated test that spawns
the real oxlint binary, so `bun run test:infra` proves a rule fires rather than assuming it.

## Per-layer import bans

Per-layer bans enforce the dependency arrows: `.schema.ts` imports no framework and nothing above
it, `.state.ts` imports no React and no React Query, `.api.ts` imports no React, Jotai or React
Query. An override **replaces** `no-restricted-imports` rather than merging it, so editing the
base rule means editing all four copies.

## Why each rule is on

- `react/react-compiler`, the React Compiler's own analysis: setState during render, reading a ref
  during render, mutating props or state, defining a component inside another component.
- `explicit-module-boundary-types`: exported functions declare their return type, components
  included (`import type { JSX } from 'react'`, then `: JSX.Element`).
- No `any`, no non-null `!`, no `console`, no `@ts-ignore`. `@ts-expect-error` needs a description
  and fails once the underlying problem is fixed.
- `max-lines` 400, `max-lines-per-function` 40, `complexity` 15; test files are exempt from the
  first two. Extract a hook or a sub-component rather than raising a limit.
- `react-perf` bans new objects, arrays and JSX as props. Hoist a constant out of the component.
  New functions as props are allowed.
- `import/no-cycle`, the backstop for direction mistakes the path patterns cannot name.
- `ui/no-raw-element`, from `lint/ui.ts`: every JSX element not in its structural allowlist is
  an error naming the component to use, or the `bunx shadcn@latest add` that would create it.
  `react/forbid-elements` does the same job from a list of banned elements and is not used,
  because that list is right only until a primitive lands that nobody remembered to add to it.
  `src/components/ui` is exempt through `ignorePatterns`.
- `dry/no-identical-functions`, from `lint/dry.ts`, because eslint-plugin-sonarjs cannot load
  under TypeScript 7: it pulls in ts-api-utils, which reads a `ts.TypeFlags` that no longer
  exists. Off in test files, where two cases that set up alike and assert differently are two
  cases rather than one copy.
- `no-deprecated` is type-aware, so a React, TanStack or Jotai deprecation fails the build on the
  version bump rather than surfacing in a changelog nobody read.

## Adding a rule

When adding a rule, first write a file that violates it and confirm it fires. A rule that fires
on nothing is not a guardrail.
