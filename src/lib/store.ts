import { createStore } from 'jotai';

// Explicit rather than Jotai's implicit default store, so tests can swap in a fresh one.
export const store = createStore();
