export type Score = {
  id: string;
  value: number;
  savedAt: number;
};

/**
 * Stand-in for a server. State lives in this module, so it resets on every reload -
 * it is a fake, not a database. Swap these two functions for real `fetch` calls and
 * nothing above this file has to change, which is the point of keeping the transport
 * in its own module.
 */
let scores: Score[] = [
  { id: '1', value: 4, savedAt: Date.UTC(2026, 7, 16, 9, 0) },
  { id: '2', value: 2, savedAt: Date.UTC(2026, 7, 16, 8, 30) },
];

// Sequential rather than crypto.randomUUID() so ids are predictable in tests.
let nextId = scores.length + 1;

// Braced on purpose: an arrow shorthand here would return the timeout id out of the
// Promise executor, where the return value is meaningless and silently ignored.
const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function fetchScores(): Promise<Score[]> {
  await delay(300);
  // A copy: a real client could not hand callers a reference to the server's rows.
  return scores.map((score) => ({ ...score }));
}

export async function saveScore(value: number): Promise<Score> {
  await delay(300);
  const score: Score = { id: String(nextId++), value, savedAt: Date.now() };
  scores = [score, ...scores];
  return score;
}
