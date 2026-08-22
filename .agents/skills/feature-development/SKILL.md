---
name: feature-development
description: Build or change a feature or route using this repository's schema, state, API, query, and component layers, including server-data states, loaders, and URL search state.
---

# Feature development

Build features within the dependency direction and state ownership rules in `AGENTS.md`. Create
only the layers the feature needs, keep its public surface deliberate, and make every server-data
state reachable.

## Read the relevant detail

- For a schema, predicate, atom, transport, query, mutation hook, component, or barrel, read
  [feature layers](references/feature-layers.md).
- For pending, error, empty, filtered-empty, route, loader, 404, metadata, link, or search-param
  behavior, read [routing and data states](references/routing-and-data-states.md).
- Read both references when the change spans both areas. Do not load a reference when its concern
  is absent from the task.

Forms, UI, tests, environment configuration, lint rules, and Jotai modeling have their own skills;
use those when the task reaches that concern instead of duplicating their general guidance here.

## Workflow

1. Search `src/` for an existing component, helper, schema, query, or pattern that can be reused or
   widened.
2. Decide who owns every new value: React Query for server data, the URL for a shareable or
   reload-persistent view, and Jotai for the remaining browser-only state.
3. Add or change only the required feature layers. Keep feature-internal imports relative and use
   `@/...` across feature boundaries.
4. Export only the surface other modules need from the feature's `index.ts`.
5. Compose the feature from a route when it needs an address, loader, search state, or route-level
   failure behavior.
6. Colocate tests with the changed source and run `bun run check`.

## Shape and boundaries

- Keep a feature flat until roughly 15 to 20 source files. Then split by sub-domain, such as
  `checkout/{cart,payment}/`, not by technical folders such as `components/` or `hooks/`.
- A route imports a feature through `@/features/<name>` and composes its public API. It does not
  reach into feature internals.
- Pass URL-owned state from the route into a controlled feature component. Do not make the feature
  call `useSearch`, because that would require a router in every component test.
- Never hand-edit `src/routeTree.gen.ts`; the router plugin regenerates it during `dev` and `build`.
