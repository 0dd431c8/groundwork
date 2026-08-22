---
name: lint-rules
description: Add, change, test, or debug oxlint configuration or the local plugins under lint/, including feature-direction and raw-element rules.
---

# Lint rules

Treat a lint report as a repository constraint with an owner and a reason. Fix the code unless a
minimal reproduction shows that the rule rejects behavior the repository intends to allow.

## Diagnose a finding

1. Reproduce the exact finding with `bun run lint` and read its rule id and full message.
2. Locate its owner:
   - `.oxlintrc.jsonc` enables native, bridged, and local rules.
   - `lint/feature.ts`, `lint/jotai.ts`, `lint/dry.ts`, and `lint/ui.ts` implement local rules.
   - Colocated `lint/*.test.ts` files exercise the plugin through the real oxlint binary.
   - `lint/config.test.ts` proves that the shipped project configuration enables critical rules.
3. Compare the reported code with the rule's documented invariant and existing valid cases.
4. Fix the source when the invariant applies. Change the rule only when the reproduction proves
   that its implementation or configured boundary is wrong.

Do not silence a correct finding. If the rule cannot express a justified exception, use only the
documented inline escape hatch and explain why that call is exceptional.

## Add or change a rule

1. Add an invalid case that reports the intended rule id, line, and useful message through
   `lint/test/harness.ts`.
2. Add a nearby valid case that must remain silent. Include boundary cases that determine the
   rule's scope, not snapshots of incidental wording.
3. Implement the smallest AST or configuration change that satisfies those cases.
4. For a new local rule, register it in `.oxlintrc.jsonc` and add a project-config case proving it
   is actually enabled. A plugin test alone cannot catch a forgotten registration.
5. Run `bun run test:infra`, then `bun run lint`, then `bun run check`.

Use temporary fixtures through the harness rather than adding a deliberately invalid production
file. The harness writes an isolated file, runs the repository's oxlint binary, and cleans it up.

## Local rule map

- `feature/dependency-direction` classifies production feature modules by filename, enforces the
  schema-to-index dependency direction, and keeps mutation/cache ownership in query modules.
- `jotai/*` enforces module-scope atoms, narrow hooks, and the `Atom` suffix.
- `dry/no-identical-functions` catches identical function bodies within one production file;
  `bun run dupes` handles repeated spans across files.
- `ui/no-raw-element` allows structural markup and requires design-system components for controls.
  Add an element to `ALLOWED` only when it is structure the design system will never own, with the
  reason beside it.

## Non-obvious configuration

- Type-aware rules use the real TypeScript program; do not replace a type failure with `any`, a
  cast, or a disabled rule.
- `react/react-compiler` checks React semantics beyond the ordinary Rules of Hooks tier.
- `react-perf` rejects fresh objects, arrays, and JSX passed as props. Hoist stable values; fresh
  functions remain allowed.
- Test files are exempt from line limits and identical-function checks because repeated setup can
  make separate cases clearer.
- `src/components/ui` is ignored because shadcn rewrites it; change the recipe or surrounding code
  instead of hand-editing generated output to satisfy lint.
