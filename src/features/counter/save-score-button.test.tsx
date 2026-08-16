import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchScores, saveScore, type Score } from './counter.api';
import { countAtom } from './counter.state';
import { SaveScoreButton } from './save-score-button';

vi.mock('./counter.api');

const score = (id: string, value: number): Score => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

// What saving invalidates belongs to useSaveScore, covered in counter.queries.test.tsx.
describe('<SaveScoreButton />', () => {
  beforeEach(() => {
    vi.mocked(fetchScores).mockReset().mockResolvedValue([]);
    vi.mocked(saveScore).mockReset().mockResolvedValue(score('9', 3));
  });

  it('sends the count currently held in the atom', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(countAtom, 3);
    renderWithProviders(<SaveScoreButton />, { store });

    await user.click(screen.getByRole('button', { name: 'Save score' }));

    expect(saveScore).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('disables itself while the save is in flight', async () => {
    const user = userEvent.setup();
    vi.mocked(saveScore).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SaveScoreButton />);

    await user.click(screen.getByRole('button', { name: 'Save score' }));

    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('reports a failed save', async () => {
    const user = userEvent.setup();
    vi.mocked(saveScore).mockRejectedValue(new Error('offline'));
    renderWithProviders(<SaveScoreButton />);

    await user.click(screen.getByRole('button', { name: 'Save score' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save that one.');
  });
});
