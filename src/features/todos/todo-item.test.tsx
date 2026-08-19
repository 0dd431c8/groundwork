import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchTodos, removeTodo, setTodoDone } from './todos.api';
import { TodoItem } from './todo-item';
import type { Todo } from './todos.schema';

vi.mock('./todos.api');

const todo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  title: 'Read AGENTS.md',
  priority: 'high',
  done: false,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
  ...overrides,
});

// What toggling invalidates belongs to the query hooks, covered in todos.queries.test.tsx.
describe('<TodoItem />', () => {
  beforeEach(() => {
    vi.mocked(fetchTodos).mockReset().mockResolvedValue([]);
    vi.mocked(setTodoDone)
      .mockReset()
      .mockResolvedValue(todo({ done: true }));
    vi.mocked(removeTodo).mockReset().mockResolvedValue({ id: '1' });
  });

  it('names the checkbox after the todo it ticks', () => {
    renderWithProviders(<TodoItem todo={todo()} />);

    expect(screen.getByRole('checkbox', { name: 'Read AGENTS.md' })).not.toBeChecked();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('reflects a todo the server already has done', () => {
    renderWithProviders(<TodoItem todo={todo({ done: true })} />);

    expect(screen.getByRole('checkbox', { name: 'Read AGENTS.md' })).toBeChecked();
  });

  it('sends the toggle to the transport', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoItem todo={todo()} />);

    await user.click(screen.getByRole('checkbox', { name: 'Read AGENTS.md' }));

    expect(setTodoDone).toHaveBeenCalledExactlyOnceWith({ id: '1', done: true });
  });

  it('unticks a todo that is already done', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoItem todo={todo({ done: true })} />);

    await user.click(screen.getByRole('checkbox', { name: 'Read AGENTS.md' }));

    expect(setTodoDone).toHaveBeenCalledExactlyOnceWith({ id: '1', done: false });
  });

  it('deletes through an icon button that says what it deletes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoItem todo={todo()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Read AGENTS.md' }));

    expect(removeTodo).toHaveBeenCalledExactlyOnceWith('1');
  });

  it('locks both controls while a request is in flight', async () => {
    const user = userEvent.setup();
    vi.mocked(removeTodo).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TodoItem todo={todo()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Read AGENTS.md' }));

    // base-ui renders the checkbox as a span, so it carries aria-disabled, not `disabled`.
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Read AGENTS.md' })).toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
    expect(screen.getByRole('button', { name: 'Delete Read AGENTS.md' })).toBeDisabled();
  });
});
