import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchTodo } from './todos.api';
import { TodoDetail } from './todo-detail';
import type { Todo } from './todos.schema';

vi.mock('./todos.api');

const seeded: Todo = {
  id: '9',
  title: 'Ship it',
  priority: 'high',
  done: false,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
};

describe('<TodoDetail />', () => {
  beforeEach(() => {
    vi.mocked(fetchTodo).mockReset().mockResolvedValue(seeded);
  });

  it('shows the todo the loader primed', async () => {
    renderWithProviders(<TodoDetail todoId="9" />, { path: '/todos/9' });

    expect(await screen.findByRole('heading', { name: 'Ship it' })).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('links back to the list', async () => {
    renderWithProviders(<TodoDetail todoId="9" />, { path: '/todos/9' });

    const backlink = await screen.findByRole('link', { name: 'All todos' });

    expect(backlink).toHaveAttribute('href', '/todos');
    expect(backlink).not.toHaveAttribute('aria-current');
  });

  it('reads the todo the list already fetched, rather than fetching again', async () => {
    const { queryClient } = renderWithProviders(<TodoDetail todoId="9" />, { path: '/todos/9' });
    await screen.findByRole('heading', { name: 'Ship it' });

    // The detail is keyed under the list's key, so invalidating the list re-runs this too and the
    // two views cannot end up showing different copies of one row.
    await queryClient.invalidateQueries({ queryKey: ['todos'] });

    await waitFor(() => expect(fetchTodo).toHaveBeenCalledTimes(2));
  });

  it('shows a todo that is done', async () => {
    vi.mocked(fetchTodo).mockResolvedValue({ ...seeded, done: true });

    renderWithProviders(<TodoDetail todoId="9" />, { path: '/todos/9' });

    expect(await screen.findByText('Done')).toBeInTheDocument();
  });
});
