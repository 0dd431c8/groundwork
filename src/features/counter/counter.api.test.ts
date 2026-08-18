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

  it('returns the seeded counts newest first', async () => {
    const { fetchCounts } = await freshApi();

    const counts = await fetchCounts();

    expect(counts.map((saved) => saved.value)).toEqual([4, 2]);
  });

  it('hands out copies, so a caller cannot edit the server rows', async () => {
    const { fetchCounts } = await freshApi();

    const first = await fetchCounts();
    const second = await fetchCounts();

    expect(first).toEqual(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('prepends a saved count and gives it a fresh id', async () => {
    const { fetchCounts, saveCount } = await freshApi();

    const saved = await saveCount({ value: 3, label: 'Afternoon' });
    const counts = await fetchCounts();

    expect(saved.value).toBe(3);
    expect(saved.label).toBe('Afternoon');
    expect(saved.id).toBe('3');
    expect(counts.map((row) => row.value)).toEqual([3, 4, 2]);
  });
});
