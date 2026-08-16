import { createStore } from 'jotai';

// An explicit store rather than Jotai's implicit default one, for the same reason
// query-client.ts exports an explicit QueryClient: the app's state lives in a module
// you can import, and tests get a seam to render each case against a fresh store.
export const store = createStore();
