import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { Counter } from './counter';
import { countAtom, MAX_COUNT, MIN_COUNT } from './counter.state';

describe('<Counter />', () => {
  it('starts at the minimum with decrement disabled', () => {
    renderWithProviders(<Counter />);

    expect(screen.getByRole('status')).toHaveTextContent(String(MIN_COUNT));
    expect(screen.getByRole('button', { name: 'Decrement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increment' })).toBeEnabled();
  });

  it('counts up and back down', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Counter />);

    const increment = screen.getByRole('button', { name: 'Increment' });
    await user.click(increment);
    await user.click(increment);
    await user.click(increment);
    expect(screen.getByRole('status')).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: 'Decrement' }));
    expect(screen.getByRole('status')).toHaveTextContent('2');
  });

  it('clamps at the maximum', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(countAtom, MAX_COUNT - 1);
    renderWithProviders(<Counter />, { store });

    const increment = screen.getByRole('button', { name: 'Increment' });
    await user.click(increment);
    await user.click(increment);

    expect(screen.getByRole('status')).toHaveTextContent(String(MAX_COUNT));
    expect(increment).toBeDisabled();
  });

  it('restores the persisted count', () => {
    localStorage.setItem('counter:count', '3');

    renderWithProviders(<Counter />);

    expect(screen.getByRole('status')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Decrement' })).toBeEnabled();
  });

  it('persists what the user counted to', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Counter />);

    await user.click(screen.getByRole('button', { name: 'Increment' }));

    expect(localStorage.getItem('counter:count')).toBe('1');
  });
});
