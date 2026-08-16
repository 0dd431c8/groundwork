import { beforeEach, describe, expect, it, vi } from 'vitest';

// The fake server keeps its rows in module state, so each case gets a fresh copy of the
// module rather than inheriting whatever the previous one saved.
function freshApi(): Promise<typeof import('./counter.api')> {
  vi.resetModules();
  return import('./counter.api');
}

describe('counter.api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the seeded scores newest first', async () => {
    const { fetchScores } = await freshApi();

    const scores = await fetchScores();

    expect(scores.map((score) => score.value)).toEqual([4, 2]);
  });

  it('hands out copies, so a caller cannot edit the server rows', async () => {
    const { fetchScores } = await freshApi();

    const first = await fetchScores();
    const second = await fetchScores();

    // Equal data, different objects: whatever a caller does to one row cannot reach
    // the stored row or another caller's copy.
    expect(first).toEqual(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('prepends a saved score and gives it a fresh id', async () => {
    const { fetchScores, saveScore } = await freshApi();

    const saved = await saveScore(3);
    const scores = await fetchScores();

    expect(saved.value).toBe(3);
    expect(saved.id).toBe('3');
    expect(scores.map((score) => score.value)).toEqual([3, 4, 2]);
  });
});
