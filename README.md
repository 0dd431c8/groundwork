# react-boilerplate

A single-page React starter wired for production from the first commit.

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Build        | [Vite 8](https://vite.dev) (Rolldown), TypeScript 7                                                          |
| UI           | React 19, [Tailwind v4](https://tailwindcss.com), [shadcn](https://ui.shadcn.com) on Base UI                 |
| Routing      | [TanStack Router](https://tanstack.com/router), file-based with auto code splitting                          |
| Server state | [TanStack Query](https://tanstack.com/query)                                                                 |
| Client state | [Jotai](https://jotai.org)                                                                                   |
| Forms        | [TanStack Form](https://tanstack.com/form) with [zod](https://zod.dev)                                       |
| Quality      | [oxlint](https://oxc.rs) (type-aware, React Compiler), oxfmt, [Vitest](https://vitest.dev) + Testing Library |

Also included: validated environment variables, brotli precompression and image optimisation at
build time, a bundle size report, and a pre-commit hook that formats, lints and typechecks.

## Requirements

[Bun](https://bun.com) 1.3 or newer. It is the package manager and script runner; the dev server
and bundler are still Vite.

## Quick start

```sh
bun install
bun run dev
```

Then open the URL Vite prints. `bun install` also points `core.hooksPath` at `.githooks/`.

## Scripts

| Command                           | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `bun run dev`                     | Start the dev server                                             |
| `bun run build`                   | Typecheck, then build to `dist/`                                 |
| `bun run check`                   | Format check, lint, typecheck and tests. Run this before pushing |
| `bun run test`                    | Vitest in watch mode                                             |
| `bun run test:coverage`           | Coverage report in `coverage/`                                   |
| `bun run test:ui`                 | Vitest dashboard                                                 |
| `bun run lint` / `lint:fix`       | oxlint                                                           |
| `bun run format` / `format:check` | oxfmt                                                            |
| `bun run typecheck`               | `tsc -b`                                                         |

## Layout

```
src/
  routes/            file-based routes; routeTree.gen.ts is generated
  features/<name>/   one folder per feature: schema, state, api, queries, components, tests
  lib/               router, query client, jotai store, validated env, utils
  components/ui/     vendored shadcn components
  styles/index.css   Tailwind import, theme tokens, base layer
  test/              render helper and Vitest setup
build/               Vite plugins: brotli, image optimisation, size tables
lint/                local oxlint plugin for Jotai
```

## Configuration

Copy `.env.example` to `.env`. Every variable is declared in `src/lib/env.ts`, validated by zod
at startup, and must be prefixed `VITE_` to reach the browser. A fresh clone runs with no `.env`
at all, since every variable has a default.

## Using this as a starter

`src/features/counter/` is a worked example of the whole stack: atoms, a query, a mutation, a
validated form, and tests for each layer. Delete it and replace the body of `src/routes/index.tsx`
when you start your own feature. Nothing else imports it.

`AGENTS.md` (symlinked as `CLAUDE.md`) is the conventions document, aimed at both people and
coding agents. Read it before adding a feature.
