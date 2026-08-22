import { beforeEach, describe, expect, it, vi } from 'vitest';

// The fake server keeps its rows in module state, so each case needs a fresh module.
function freshApi(): Promise<typeof import('./todos.api')> {
  vi.resetModules();
  return import('./todos.api');
}

describe('todos.api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the seeded todos newest first', async () => {
    const { fetchTodos } = await freshApi();

    const todos = await fetchTodos();

    expect(todos.map((todo) => todo.id)).toEqual(['1', '2', '3']);
  });

  it('hands out copies, so a caller cannot edit the server rows', async () => {
    const { fetchTodos } = await freshApi();

    const first = await fetchTodos();
    const second = await fetchTodos();

    expect(first).toEqual(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('prepends an added todo and gives it a fresh id', async () => {
    const { addTodo, fetchTodos } = await freshApi();

    const added = await addTodo({ title: 'Ship it', priority: 'high' });
    const todos = await fetchTodos();

    expect(added.id).toBe('4');
    expect(added.done).toBe(false);
    expect(todos.map((todo) => todo.title)).toContain('Ship it');
    expect(todos[0]?.id).toBe('4');
  });

  it('toggles a todo in place', async () => {
    const { fetchTodos, setTodoDone } = await freshApi();

    const updated = await setTodoDone({ id: '1', done: true });
    const todos = await fetchTodos();

    expect(updated.done).toBe(true);
    expect(todos.find((todo) => todo.id === '1')?.done).toBe(true);
    expect(todos).toHaveLength(3);
  });

  it('rejects a toggle for an id the server does not have', async () => {
    const { setTodoDone } = await freshApi();

    await expect(setTodoDone({ id: '404', done: true })).rejects.toThrow('No todo with id 404.');
  });

  it('fetches one todo by id', async () => {
    const { fetchTodo } = await freshApi();

    expect(await fetchTodo('1')).toMatchObject({ id: '1' });
  });

  // The route above tells this apart from a failed request to choose between a 404 and an error
  // page, which is why it is a named error rather than a null return.
  it('throws a TodoNotFoundError for an id the server does not have', async () => {
    const { fetchTodo, TodoNotFoundError } = await freshApi();

    await expect(fetchTodo('404')).rejects.toBeInstanceOf(TodoNotFoundError);
    await expect(fetchTodo('404')).rejects.toThrow('No todo with id 404.');
  });

  it('removes a todo and reports which one', async () => {
    const { fetchTodos, removeTodo } = await freshApi();

    const removed = await removeTodo('2');
    const todos = await fetchTodos();

    expect(removed).toEqual({ id: '2' });
    expect(todos.map((todo) => todo.id)).toEqual(['1', '3']);
  });
});
