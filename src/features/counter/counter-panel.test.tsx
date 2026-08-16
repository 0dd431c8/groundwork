import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchScores, saveScore, type Score } from './counter.api';
import { CounterPanel } from './counter-panel';

vi.mock('./counter.api');

const score = (id: string, value: number): Score => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

// The one test that drives the assembled feature: real components, real useSaveScore,
// only the transport mocked. Everything narrower is covered by the sibling test files.
describe('<CounterPanel />', () => {
  beforeEach(() => {
    vi.mocked(fetchScores).mockReset().mockResolvedValue([]);
    vi.mocked(saveScore).mockReset().mockResolvedValue(score('9', 2));
  });

  it('renders the counter, the save button and the list', async () => {
    renderWithProviders(<CounterPanel />);

    expect(screen.getByRole('status', { name: 'Count' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save score' })).toBeInTheDocument();
    expect(await screen.findByText('No scores saved yet.')).toBeInTheDocument();
  });

  it('saves what the user counted to and shows it in the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CounterPanel />);
    await screen.findByText('No scores saved yet.');

    const increment = screen.getByRole('button', { name: 'Increment' });
    await user.click(increment);
    await user.click(increment);

    vi.mocked(fetchScores).mockResolvedValue([score('9', 2)]);
    await user.click(screen.getByRole('button', { name: 'Save score' }));

    expect(saveScore).toHaveBeenCalledExactlyOnceWith(2);
    expect(await screen.findByRole('list', { name: 'Saved scores' })).toHaveTextContent('2');
  });
});
