import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addTodo, fetchTodo, fetchTodos, removeTodo, setTodoDone } from './todos.api';
import { todoQuery, todosQuery, useAddTodo, useRemoveTodo, useSetTodoDone } from './todos.queries';
import type { Todo } from './todos.schema';

// Only the transport is mocked, so the real query wiring is what gets exercised.
vi.mock('./todos.api');

const todo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  title: 'Read AGENTS.md',
  priority: 'high',
  done: false,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
  ...overrides,
});

function withClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('todos.queries', () => {
  beforeEach(() => {
    vi.mocked(fetchTodos).mockReset().mockResolvedValue([]);
    vi.mocked(addTodo)
      .mockReset()
      .mockResolvedValue(todo({ id: '9' }));
    vi.mocked(setTodoDone)
      .mockReset()
      .mockResolvedValue(todo({ done: true }));
    vi.mocked(removeTodo).mockReset().mockResolvedValue({ id: '1' });
    vi.mocked(fetchTodo).mockReset().mockResolvedValue(todo());
  });

  it('sends the input useAddTodo is given to the transport', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => useAddTodo(), { wrapper });

    result.current.mutate({ title: 'Ship it', priority: 'high' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addTodo).toHaveBeenCalledExactlyOnceWith({ title: 'Ship it', priority: 'high' });
  });

  it('refetches the list after an add', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(todosQuery), add: useAddTodo() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(fetchTodos).toHaveBeenCalledOnce();

    vi.mocked(fetchTodos).mockResolvedValue([todo({ id: '9' })]);
    result.current.add.mutate({ title: 'Ship it', priority: 'high' });

    await waitFor(() => expect(fetchTodos).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.list.data).toEqual([todo({ id: '9' })]));
  });

  it('refetches the list after a toggle', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(
      () => ({ list: useQuery(todosQuery), toggle: useSetTodoDone() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.toggle.mutate({ id: '1', done: true });

    await waitFor(() => expect(fetchTodos).toHaveBeenCalledTimes(2));
    expect(setTodoDone).toHaveBeenCalledExactlyOnceWith({ id: '1', done: true });
  });

  it('refetches the list after a removal', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(todosQuery), remove: useRemoveTodo() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.remove.mutate('1');

    await waitFor(() => expect(fetchTodos).toHaveBeenCalledTimes(2));
    expect(removeTodo).toHaveBeenCalledExactlyOnceWith('1');
  });

  it('does not refetch when the mutation fails', async () => {
    vi.mocked(addTodo).mockRejectedValue(new Error('offline'));
    const { wrapper } = withClient();
    const { result } = renderHook(() => ({ list: useQuery(todosQuery), add: useAddTodo() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.add.mutate({ title: 'Ship it', priority: 'high' });

    await waitFor(() => expect(result.current.add.isError).toBe(true));
    expect(fetchTodos).toHaveBeenCalledOnce();
  });

  // The detail key nests under the list key, so one invalidation reaches both. A sibling key would
  // leave the detail showing a row the list has already updated.
  it('keys a single todo under the list key', () => {
    expect(todoQuery('9').queryKey).toEqual(['todos', '9']);
  });

  it('fetches a single todo through the transport', async () => {
    const { wrapper } = withClient();
    const { result } = renderHook(() => useQuery(todoQuery('1')), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchTodo).toHaveBeenCalledExactlyOnceWith('1');
    expect(result.current.data).toMatchObject({ id: '1' });
  });
});
