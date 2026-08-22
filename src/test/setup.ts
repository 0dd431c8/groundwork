import '@testing-library/jest-dom/vitest';
// The rule assumes the auto-registration below is in effect; with globals off it is not.
// oxlint-disable-next-line testing-library/no-manual-cleanup
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The router restores scroll position on navigation and jsdom has no scrollTo, which otherwise
// prints "Not implemented" over every route test. Stubbed rather than turning the feature off:
// what the router does here is right, jsdom just cannot do it.
vi.stubGlobal('scrollTo', vi.fn());

// Testing Library only auto-registers cleanup under Vitest globals, which are off here.
afterEach(() => {
  cleanup();
  // A fresh store is not enough: atomWithStorage atoms re-read storage in onMount.
  localStorage.clear();
  // Theme is synchronized onto the document root outside React's rendered subtree.
  document.documentElement.classList.remove('dark');
});
