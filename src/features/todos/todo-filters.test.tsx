import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { TodoFilters } from './todo-filters';
import { filterAtom, searchAtom } from './todos.state';

describe('<TodoFilters />', () => {
  it('starts on all with nothing to clear', () => {
    renderWithProviders(<TodoFilters />);

    expect(screen.getByRole('button', { name: 'all', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Clear view' })).toBeDisabled();
  });

  it('writes the picked filter to the atom', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<TodoFilters />);

    await user.click(screen.getByRole('button', { name: 'done' }));

    expect(store.get(filterAtom)).toBe('done');
    expect(screen.getByRole('button', { name: 'done', pressed: true })).toBeInTheDocument();
  });

  it('writes what is typed to the search atom', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<TodoFilters />);

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'agents');

    expect(store.get(searchAtom)).toBe('agents');
  });

  it('enables the clear button once either half narrows the view', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoFilters />);

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'agents');

    expect(screen.getByRole('button', { name: 'Clear view' })).toBeEnabled();
  });

  it('clears the filter and the search in one click', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(filterAtom, 'active');
    store.set(searchAtom, 'agents');
    renderWithProviders(<TodoFilters />, { store });

    await user.click(screen.getByRole('button', { name: 'Clear view' }));

    expect(store.get(filterAtom)).toBe('all');
    expect(store.get(searchAtom)).toBe('');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'all', pressed: true })).toBeInTheDocument();
  });

  it('restores the persisted filter', () => {
    localStorage.setItem('todos:filter', '"done"');

    renderWithProviders(<TodoFilters />);

    expect(screen.getByRole('button', { name: 'done', pressed: true })).toBeInTheDocument();
  });
});
