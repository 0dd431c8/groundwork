import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PriorityPicker } from './priority-picker';
import { newTodoPriorityAtom } from './todos.state';

describe('<PriorityPicker />', () => {
  it('starts on normal with that option pressed', () => {
    renderWithProviders(<PriorityPicker />);

    expect(screen.getByRole('group', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'normal', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'high', pressed: false })).toBeInTheDocument();
  });

  it('moves the pressed state when another option is picked', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<PriorityPicker />);

    await user.click(screen.getByRole('button', { name: 'high' }));

    expect(store.get(newTodoPriorityAtom)).toBe('high');
    expect(screen.getByRole('button', { name: 'high', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'normal', pressed: false })).toBeInTheDocument();
  });

  it('renders the priority the store already holds', () => {
    const store = createStore();
    store.set(newTodoPriorityAtom, 'low');

    renderWithProviders(<PriorityPicker />, { store });

    expect(screen.getByRole('button', { name: 'low', pressed: true })).toBeInTheDocument();
  });

  it('persists the pick', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PriorityPicker />);

    await user.click(screen.getByRole('button', { name: 'low' }));

    expect(localStorage.getItem('todos:priority')).toBe('"low"');
  });
});
