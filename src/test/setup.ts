import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only registers its own auto-cleanup when Vitest's globals are
// enabled. They are off here so test files import describe/it/expect explicitly,
// which means the teardown has to be wired by hand.
afterEach(cleanup);
