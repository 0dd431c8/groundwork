import { render, type RenderOptions } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactElement, ReactNode } from 'react';

// Jotai exports the store type from 'jotai/vanilla/store' but does not re-export it
// from the package root, so derive it rather than importing through a deep path.
type Store = ReturnType<typeof createStore>;

type Options = Omit<RenderOptions, 'wrapper'> & { store?: Store };

/**
 * Renders `ui` inside a Jotai `Provider`, defaulting to a store created for this call
 * so atom state never leaks between test cases.
 *
 * To start a case from a specific state, build the store yourself and seed it with
 * `store.set(...)` before rendering - that is the same write path production code uses,
 * and it avoids `useHydrateAtoms`, which only earns its keep when you cannot reach the
 * store before the first render (SSR).
 *
 *     const store = createStore();
 *     store.set(countAtom, MAX_COUNT);
 *     renderWithStore(<Counter />, { store });
 */
export function renderWithStore(
  ui: ReactElement,
  { store = createStore(), ...options }: Options = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, ...render(ui, { wrapper, ...options }) };
}
