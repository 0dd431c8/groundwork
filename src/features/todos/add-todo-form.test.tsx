import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { AddTodoForm } from './add-todo-form';
import { addTodo, fetchTodos } from './todos.api';
import type { Todo } from './todos.schema';
import { newTodoPriorityAtom } from './todos.state';

vi.mock('./todos.api');

const todo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '9',
  title: 'Ship it',
  priority: 'high',
  done: false,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
  ...overrides,
});

// What adding invalidates belongs to useAddTodo, covered in todos.queries.test.tsx.
describe('<AddTodoForm />', () => {
  beforeEach(() => {
    vi.mocked(fetchTodos).mockReset().mockResolvedValue([]);
    vi.mocked(addTodo).mockReset().mockResolvedValue(todo());
  });

  it('sends the typed title with the priority currently held in the atom', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(newTodoPriorityAtom, 'high');
    renderWithProviders(<AddTodoForm />, { store });

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(addTodo).toHaveBeenCalledExactlyOnceWith({ title: 'Ship it', priority: 'high' });
  });

  it('reads the priority at submit, not at mount', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(newTodoPriorityAtom, 'high');
    renderWithProviders(<AddTodoForm />, { store });

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Ship it');
    store.set(newTodoPriorityAtom, 'low');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(addTodo).toHaveBeenCalledExactlyOnceWith({ title: 'Ship it', priority: 'low' });
  });

  it('rejects an empty title without calling the transport', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTodoForm />);

    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Give the todo a title.');
    expect(addTodo).not.toHaveBeenCalled();
  });

  it('marks the field invalid and points it at the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTodoForm />);
    const field = screen.getByRole('textbox', { name: 'Title' });

    await user.type(field, 'a');
    await user.clear(field);

    const message = await screen.findByRole('alert');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Give the todo a title.');
    expect(message).toBeInTheDocument();
  });

  it('clears the field after a successful add', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTodoForm />);
    const field = screen.getByRole('textbox', { name: 'Title' });

    await user.type(field, 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('reports a failed add', async () => {
    const user = userEvent.setup();
    vi.mocked(addTodo).mockRejectedValue(new Error('offline'));
    renderWithProviders(<AddTodoForm />);

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add that one.');
  });
});
