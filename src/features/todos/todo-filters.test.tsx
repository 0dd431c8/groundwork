import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { TodoFilters } from './todo-filters';
import { todoViewDefaults, type TodoView } from './todos.schema';

// The view arrives as a prop, so these cases assert on the view handed back rather than on a
// store. The route is what turns that call into a URL; src/routes/todos/index.test.tsx covers it.
function renderFilters(view: TodoView = todoViewDefaults) {
  const onViewChange = vi.fn<(next: TodoView) => void>();
  renderWithProviders(<TodoFilters view={view} onViewChange={onViewChange} />);
  return { onViewChange };
}

describe('<TodoFilters />', () => {
  it('starts on all with nothing to clear', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'all', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Clear view' })).toBeDisabled();
  });

  it('hands back the picked filter', async () => {
    const user = userEvent.setup();
    const { onViewChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'done' }));

    expect(onViewChange).toHaveBeenCalledWith({ filter: 'done', search: '' });
  });

  it('hands back what is typed', async () => {
    const user = userEvent.setup();
    const { onViewChange } = renderFilters();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'a');

    expect(onViewChange).toHaveBeenCalledWith({ filter: 'all', search: 'a' });
  });

  it('renders the view it is given', () => {
    renderFilters({ filter: 'active', search: 'agents' });

    expect(screen.getByRole('button', { name: 'active', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('agents');
  });

  it('enables the clear button once either half narrows the view', () => {
    renderFilters({ filter: 'all', search: 'agents' });

    expect(screen.getByRole('button', { name: 'Clear view' })).toBeEnabled();
  });

  it('clears the filter and the search in one call', async () => {
    const user = userEvent.setup();
    const { onViewChange } = renderFilters({ filter: 'active', search: 'agents' });

    await user.click(screen.getByRole('button', { name: 'Clear view' }));

    expect(onViewChange).toHaveBeenCalledWith(todoViewDefaults);
  });
});
