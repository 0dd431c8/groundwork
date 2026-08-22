import { useState, type JSX } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { addTodo, fetchTodos, removeTodo, setTodoDone } from './todos.api';
import { todoViewDefaults, type Todo, type TodoView } from './todos.schema';
import { TodosPanel } from './todos-panel';

vi.mock('./todos.api');

const todo = (id: string, title: string, done = false): Todo => ({
  id,
  title,
  priority: 'high',
  done,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
});

// The panel is controlled, so something has to hold the view for it. In the app that is the URL
// via src/routes/todos/index.tsx; here it is one useState, which keeps these cases about the
// feature rather than about the router.
function ControlledPanel(): JSX.Element {
  const [view, setView] = useState<TodoView>(todoViewDefaults);

  return <TodosPanel view={view} onViewChange={setView} />;
}

// The assembled feature, only the transport mocked. Sibling files cover the parts.
describe('<TodosPanel />', () => {
  beforeEach(() => {
    vi.mocked(fetchTodos).mockReset().mockResolvedValue([]);
    vi.mocked(addTodo).mockReset().mockResolvedValue(todo('9', 'Ship it'));
    vi.mocked(setTodoDone)
      .mockReset()
      .mockResolvedValue(todo('9', 'Ship it', true));
    vi.mocked(removeTodo).mockReset().mockResolvedValue({ id: '9' });
  });

  it('renders the form, the picker, the filters and the list', async () => {
    renderWithProviders(<ControlledPanel />);

    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
  });

  it('adds a todo at the picked priority and shows it in the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ControlledPanel />);
    await screen.findByText('Nothing to do yet.');

    await user.click(screen.getByRole('button', { name: 'high' }));
    vi.mocked(fetchTodos).mockResolvedValue([todo('9', 'Ship it')]);
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(addTodo).toHaveBeenCalledExactlyOnceWith({ title: 'Ship it', priority: 'high' });
    expect(await screen.findByRole('list', { name: 'Todos' })).toHaveTextContent('Ship it');
  });

  it('ticks a todo off, then filters it out of view and back', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchTodos).mockResolvedValue([todo('9', 'Ship it')]);
    renderWithProviders(<ControlledPanel />);

    const checkbox = await screen.findByRole('checkbox', { name: 'Ship it' });
    // Queued before the click: the invalidation refetches as soon as the toggle resolves.
    vi.mocked(fetchTodos).mockResolvedValue([todo('9', 'Ship it', true)]);
    await user.click(checkbox);

    expect(setTodoDone).toHaveBeenCalledExactlyOnceWith({ id: '9', done: true });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Ship it' })).toBeChecked());

    await user.click(screen.getByRole('button', { name: 'active' }));
    expect(await screen.findByText('No todo matches this view.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all todos' }));
    expect(await screen.findByRole('list', { name: 'Todos' })).toHaveTextContent('Ship it');
  });

  it('deletes a todo', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchTodos).mockResolvedValue([todo('9', 'Ship it')]);
    renderWithProviders(<ControlledPanel />);

    const remove = await screen.findByRole('button', { name: 'Delete Ship it' });
    vi.mocked(fetchTodos).mockResolvedValue([]);
    await user.click(remove);

    expect(removeTodo).toHaveBeenCalledExactlyOnceWith('9');
    expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
  });
});
