import '@testing-library/jest-dom/vitest';
// The rule assumes the auto-registration below is in effect; with globals off it is not.
// oxlint-disable-next-line testing-library/no-manual-cleanup
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-registers cleanup under Vitest globals, which are off here.
afterEach(() => {
  cleanup();
  // A fresh store is not enough: atomWithStorage atoms re-read storage in onMount.
  localStorage.clear();
});
