import type { SaveCountInput } from './counter.schema';

export type SavedCount = {
  id: string;
  value: number;
  label: string;
  savedAt: number;
};

// Stand-in for a server: state lives in this module, so it resets on every reload.
let counts: SavedCount[] = [
  { id: '1', value: 4, label: 'Morning', savedAt: Date.UTC(2026, 7, 16, 9, 0) },
  { id: '2', value: 2, label: 'Overnight', savedAt: Date.UTC(2026, 7, 16, 8, 30) },
];

// Sequential rather than crypto.randomUUID() so ids are predictable in tests.
let nextId = counts.length + 1;

// Braced on purpose: a shorthand arrow would return the timeout id out of the executor.
const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function fetchCounts(): Promise<SavedCount[]> {
  await delay(300);
  // Copies: a real client could not hand callers a reference to the server's rows.
  return counts.map((saved) => ({ ...saved }));
}

export async function saveCount(input: SaveCountInput): Promise<SavedCount> {
  await delay(300);
  const saved: SavedCount = { id: String(nextId++), ...input, savedAt: Date.now() };
  counts = [saved, ...counts];
  return saved;
}
