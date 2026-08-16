import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchScores, type Score } from './counter.api';
import { ScoreList } from './score-list';

// The transport is mocked, not the query config: counter.queries.ts still builds the
// real queryOptions, so what these tests exercise is the production wiring.
vi.mock('./counter.api');

const score = (id: string, value: number): Score => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

describe('<ScoreList />', () => {
  beforeEach(() => {
    vi.mocked(fetchScores).mockReset();
  });

  it('shows the pending state before the request settles', () => {
    vi.mocked(fetchScores).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ScoreList />);

    expect(screen.getByText('Loading scores...')).toBeInTheDocument();
  });

  it('renders the scores once loaded', async () => {
    vi.mocked(fetchScores).mockResolvedValue([score('1', 4), score('2', 2)]);

    renderWithProviders(<ScoreList />);

    const list = await screen.findByRole('list', { name: 'Saved scores' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(list).toHaveTextContent('4');
    expect(list).toHaveTextContent('2');
  });

  it('shows the empty state when the server has no scores', async () => {
    vi.mocked(fetchScores).mockResolvedValue([]);

    renderWithProviders(<ScoreList />);

    expect(await screen.findByText('No scores saved yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the error state when the request fails', async () => {
    vi.mocked(fetchScores).mockRejectedValue(new Error('offline'));

    renderWithProviders(<ScoreList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load scores.');
  });
});
