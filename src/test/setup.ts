import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-registers cleanup under Vitest globals, which are off here.
afterEach(() => {
  cleanup();
  // A fresh store is not enough: atomWithStorage atoms re-read storage in onMount.
  localStorage.clear();
});
