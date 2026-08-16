import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only registers its own auto-cleanup when Vitest's globals are
// enabled. They are off here so test files import describe/it/expect explicitly,
// which means the teardown has to be wired by hand.
afterEach(() => {
  cleanup();
  // A fresh store per test is not enough to isolate atomWithStorage atoms: they
  // re-read storage in onMount, so whatever the last test persisted would come
  // back on the next render.
  localStorage.clear();
});
