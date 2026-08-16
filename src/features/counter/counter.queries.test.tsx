import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchScores, saveScore, type Score } from './counter.api';
import { scoresQuery, useSaveScore } from './counter.queries';

// The transport is mocked, not the query config: the real queryOptions and the real
// useSaveScore still run, so what these tests exercise is the production wiring.
vi.mock('./counter.api');

const score = (id: string, value: number): Score => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

function withClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useSaveScore', () => {
  beforeEach(() => {
    vi.mocked(fetchScores).mockReset().mockResolvedValue([]);
    vi.mocked(saveScore).mockReset().mockResolvedValue(score('9', 3));
  });

  it('sends the value it is given to the transport', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => useSaveScore(), { wrapper });

    result.current.mutate(3);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(saveScore).toHaveBeenCalledExactlyOnceWith(3);
  });

  // The point of the whole example: a successful save does not push its response into
  // the cache, it invalidates the key and lets the query refetch from the server.
  it('invalidates the score list on success', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(scoresQuery), save: useSaveScore() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(fetchScores).toHaveBeenCalledOnce();

    vi.mocked(fetchScores).mockResolvedValue([score('9', 3)]);
    result.current.save.mutate(3);

    await waitFor(() => expect(fetchScores).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.list.data).toEqual([score('9', 3)]));
  });

  it('does not invalidate when the save fails', async () => {
    vi.mocked(saveScore).mockRejectedValue(new Error('offline'));
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(scoresQuery), save: useSaveScore() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.save.mutate(3);

    await waitFor(() => expect(result.current.save.isError).toBe(true));
    expect(fetchScores).toHaveBeenCalledOnce();
  });
});
