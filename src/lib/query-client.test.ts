import { describe, expect, it, vi } from 'vitest';
import { notifyError } from './notify';
import { queryClient } from './query-client';

vi.mock('./notify');

describe('queryClient', () => {
  it('holds server data long enough that a second visit does not refetch', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  // The reason this wiring exists: a failed mutation reports itself, so no feature has to
  // remember to. Read failures deliberately do not come through here.
  it('reports a failed mutation centrally', async () => {
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: (title: string) => Promise.reject(new Error(`Could not save ${title}.`)),
      retry: false,
    });

    await expect(mutation.execute('Ship it')).rejects.toThrow('Could not save Ship it.');

    expect(notifyError).toHaveBeenCalledExactlyOnceWith(new Error('Could not save Ship it.'));
  });
});
