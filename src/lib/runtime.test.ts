import { describe, expect, it, vi } from 'vitest';
import { notifyError } from './notify';
import { createAppRuntime } from './runtime';

vi.mock('./notify');

describe('createAppRuntime', () => {
  it('holds server data long enough that a second visit does not refetch', () => {
    const runtime = createAppRuntime();

    expect(runtime.queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it('reports a failed mutation through its reporter adapter', async () => {
    const runtime = createAppRuntime();
    const mutation = runtime.queryClient.getMutationCache().build(runtime.queryClient, {
      mutationFn: (title: string) => Promise.reject(new Error(`Could not save ${title}.`)),
      retry: false,
    });

    await expect(mutation.execute('Ship it')).rejects.toThrow('Could not save Ship it.');

    expect(notifyError).toHaveBeenCalledExactlyOnceWith(new Error('Could not save Ship it.'));
  });
});
