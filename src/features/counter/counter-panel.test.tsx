import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchCounts, saveCount, type SavedCount } from './counter.api';
import { CounterPanel } from './counter-panel';

vi.mock('./counter.api');

const savedCount = (id: string, value: number): SavedCount => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

// The assembled feature, only the transport mocked. Sibling files cover the parts.
describe('<CounterPanel />', () => {
  beforeEach(() => {
    vi.mocked(fetchCounts).mockReset().mockResolvedValue([]);
    vi.mocked(saveCount).mockReset().mockResolvedValue(savedCount('9', 2));
  });

  it('renders the counter, the save button and the list', async () => {
    renderWithProviders(<CounterPanel />);

    expect(screen.getByRole('status', { name: 'Count' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save count' })).toBeInTheDocument();
    expect(await screen.findByText('No counts saved yet.')).toBeInTheDocument();
  });

  it('saves what the user counted to and shows it in the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CounterPanel />);
    await screen.findByText('No counts saved yet.');

    const increment = screen.getByRole('button', { name: 'Increment' });
    await user.click(increment);
    await user.click(increment);

    vi.mocked(fetchCounts).mockResolvedValue([savedCount('9', 2)]);
    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(saveCount).toHaveBeenCalledExactlyOnceWith(2);
    expect(await screen.findByRole('list', { name: 'Saved counts' })).toHaveTextContent('2');
  });
});
