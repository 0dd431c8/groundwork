import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('switches the theme through an accessible action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('reads a stored theme when it mounts', async () => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');

    renderWithProviders(<ThemeToggle />);

    expect(
      await screen.findByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
  });

  it('falls back to light for an invalid stored value', async () => {
    localStorage.setItem('theme', 'system');

    renderWithProviders(<ThemeToggle />);

    expect(await screen.findByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('synchronizes a theme changed in another tab', async () => {
    renderWithProviders(<ThemeToggle />);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));
    });

    expect(
      await screen.findByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });
});
