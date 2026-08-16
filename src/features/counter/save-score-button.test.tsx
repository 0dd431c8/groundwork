import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchScores, saveScore, type Score } from './counter.api';
import { countAtom } from './counter.state';
import { SaveScoreButton } from './save-score-button';
import { ScoreList } from './score-list';

vi.mock('./counter.api');

const score = (id: string, value: number): Score => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

describe('<SaveScoreButton />', () => {
  beforeEach(() => {
    vi.mocked(fetchScores).mockReset().mockResolvedValue([]);
    vi.mocked(saveScore).mockReset().mockResolvedValue(score('9', 3));
  });

  it('saves the count currently held in the atom', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(countAtom, 3);
    renderWithProviders(<SaveScoreButton />, { store });

    await user.click(screen.getByRole('button', { name: 'Save score' }));

    expect(saveScore).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('reports a failed save', async () => {
    const user = userEvent.setup();
    vi.mocked(saveScore).mockRejectedValue(new Error('offline'));
    renderWithProviders(<SaveScoreButton />);

    await user.click(screen.getByRole('button', { name: 'Save score' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save that one.');
  });

  // The point of the whole example: the mutation does not push the new score into the
  // list, it invalidates the key and lets the query refetch it from the server.
  it('refetches the list after a successful save', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(countAtom, 3);

    renderWithProviders(
      <>
        <SaveScoreButton />
        <ScoreList />
      </>,
      { store },
    );

    expect(await screen.findByText('No scores saved yet.')).toBeInTheDocument();
    expect(fetchScores).toHaveBeenCalledOnce();

    vi.mocked(fetchScores).mockResolvedValue([score('9', 3)]);
    await user.click(screen.getByRole('button', { name: 'Save score' }));

    await waitFor(() => expect(fetchScores).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('list', { name: 'Saved scores' })).toHaveTextContent('3');
  });
});
