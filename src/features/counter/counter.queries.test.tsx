import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCounts, saveCount, type SavedCount } from './counter.api';
import { countsQuery, useSaveCount } from './counter.queries';

// Only the transport is mocked, so the real query wiring is what gets exercised.
vi.mock('./counter.api');

const savedCount = (id: string, value: number, label = 'Morning'): SavedCount => ({
  id,
  value,
  label,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

function withClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useSaveCount', () => {
  beforeEach(() => {
    vi.mocked(fetchCounts).mockReset().mockResolvedValue([]);
    vi.mocked(saveCount).mockReset().mockResolvedValue(savedCount('9', 3));
  });

  it('sends the input it is given to the transport', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => useSaveCount(), { wrapper });

    result.current.mutate({ value: 3, label: 'Morning' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(saveCount).toHaveBeenCalledExactlyOnceWith({ value: 3, label: 'Morning' });
  });

  it('invalidates the count list on success', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(countsQuery), save: useSaveCount() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(fetchCounts).toHaveBeenCalledOnce();

    vi.mocked(fetchCounts).mockResolvedValue([savedCount('9', 3)]);
    result.current.save.mutate({ value: 3, label: 'Morning' });

    await waitFor(() => expect(fetchCounts).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.list.data).toEqual([savedCount('9', 3)]));
  });

  it('does not invalidate when the save fails', async () => {
    vi.mocked(saveCount).mockRejectedValue(new Error('offline'));
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(countsQuery), save: useSaveCount() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.save.mutate({ value: 3, label: 'Morning' });

    await waitFor(() => expect(result.current.save.isError).toBe(true));
    expect(fetchCounts).toHaveBeenCalledOnce();
  });
});
