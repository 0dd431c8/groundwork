import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchTodos, removeTodo, setTodoDone } from './todos.api';
import { TodoList } from './todo-list';
import { todoViewDefaults, type Todo, type TodoView } from './todos.schema';

// Only the transport is mocked, so the real query wiring is what gets exercised.
vi.mock('./todos.api');

const todo = (id: string, title: string, done = false): Todo => ({
  id,
  title,
  priority: 'normal',
  done,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
});

const seeded = [todo('1', 'Read AGENTS.md'), todo('2', 'Run bun run check', true)];

// The view arrives as a prop, so a narrowed list is set up by passing one rather than by seeding
// a store. src/routes/todos/index.test.tsx is where that prop meets a real URL.
function renderList(view: TodoView = todoViewDefaults) {
  const onViewChange = vi.fn<(next: TodoView) => void>();
  renderWithProviders(<TodoList view={view} onViewChange={onViewChange} />);
  return { onViewChange };
}

describe('<TodoList />', () => {
  beforeEach(() => {
    vi.mocked(fetchTodos).mockReset();
    vi.mocked(setTodoDone)
      .mockReset()
      .mockResolvedValue(todo('1', 'Read AGENTS.md', true));
    vi.mocked(removeTodo).mockReset().mockResolvedValue({ id: '1' });
  });

  it('shows the pending state before the request settles', () => {
    vi.mocked(fetchTodos).mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
  });

  it('shows the error state when the request fails', async () => {
    vi.mocked(fetchTodos).mockRejectedValue(new Error('offline'));

    renderList();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load todos.');
  });

  it('shows the empty state when the server has no todos', async () => {
    vi.mocked(fetchTodos).mockResolvedValue([]);

    renderList();

    expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders the todos once loaded', async () => {
    vi.mocked(fetchTodos).mockResolvedValue(seeded);

    renderList();

    const list = await screen.findByRole('list', { name: 'Todos' });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(list).toHaveTextContent('Read AGENTS.md');
    expect(list).toHaveTextContent('Run bun run check');
  });

  // The point of the whole layout: the view narrows what renders without the server being asked
  // again, because the filter never entered the query key and the rows never entered the view.
  it('narrows by filter without refetching', async () => {
    vi.mocked(fetchTodos).mockResolvedValue(seeded);

    renderList({ filter: 'done', search: '' });

    await screen.findByRole('list', { name: 'Todos' });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Run bun run check')).toBeInTheDocument();
    expect(screen.queryByText('Read AGENTS.md')).not.toBeInTheDocument();
    expect(fetchTodos).toHaveBeenCalledOnce();
  });

  it('narrows by search term without refetching', async () => {
    vi.mocked(fetchTodos).mockResolvedValue(seeded);

    renderList({ filter: 'all', search: 'agents' });

    await screen.findByRole('list', { name: 'Todos' });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Read AGENTS.md')).toBeInTheDocument();
    expect(fetchTodos).toHaveBeenCalledOnce();
  });

  it('tells an empty view apart from an empty server, and offers a way out', async () => {
    vi.mocked(fetchTodos).mockResolvedValue(seeded);

    const user = userEvent.setup();
    const { onViewChange } = renderList({ filter: 'all', search: 'groceries' });

    expect(await screen.findByText('No todo matches this view.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing to do yet.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all todos' }));

    expect(onViewChange).toHaveBeenCalledWith(todoViewDefaults);
  });
});
