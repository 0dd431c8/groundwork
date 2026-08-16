import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Counter } from '@/components/counter';
import { MAX_COUNT, MIN_COUNT } from '@/lib/counter';

describe('<Counter />', () => {
  it('starts at the minimum with decrement disabled', () => {
    render(<Counter />);

    expect(screen.getByRole('status')).toHaveTextContent(String(MIN_COUNT));
    expect(screen.getByRole('button', { name: 'Decrement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increment' })).toBeEnabled();
  });

  it('counts up and back down', async () => {
    const user = userEvent.setup();
    render(<Counter />);

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
    render(<Counter />);

    const increment = screen.getByRole('button', { name: 'Increment' });
    for (let i = 0; i < MAX_COUNT; i++) await user.click(increment);

    expect(screen.getByRole('status')).toHaveTextContent(String(MAX_COUNT));
    expect(increment).toBeDisabled();
  });
});
