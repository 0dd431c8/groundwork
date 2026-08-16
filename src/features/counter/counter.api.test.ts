import { beforeEach, describe, expect, it, vi } from 'vitest';

// The fake server keeps its rows in module state, so each case needs a fresh module.
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
