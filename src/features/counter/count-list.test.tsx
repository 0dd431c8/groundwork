import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchCounts, type SavedCount } from './counter.api';
import { SavedCountList } from './count-list';

// Only the transport is mocked, so the real query wiring is what gets exercised.
vi.mock('./counter.api');

const savedCount = (id: string, value: number): SavedCount => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

describe('<SavedCountList />', () => {
  beforeEach(() => {
    vi.mocked(fetchCounts).mockReset();
  });

  it('shows the pending state before the request settles', () => {
    vi.mocked(fetchCounts).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<SavedCountList />);

    expect(screen.getByText('Loading counts...')).toBeInTheDocument();
  });

  it('renders the counts once loaded', async () => {
    vi.mocked(fetchCounts).mockResolvedValue([savedCount('1', 4), savedCount('2', 2)]);

    renderWithProviders(<SavedCountList />);

    const list = await screen.findByRole('list', { name: 'Saved counts' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(list).toHaveTextContent('4');
    expect(list).toHaveTextContent('2');
  });

  it('shows the empty state when the server has no counts', async () => {
    vi.mocked(fetchCounts).mockResolvedValue([]);

    renderWithProviders(<SavedCountList />);

    expect(await screen.findByText('No counts saved yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the error state when the request fails', async () => {
    vi.mocked(fetchCounts).mockRejectedValue(new Error('offline'));

    renderWithProviders(<SavedCountList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load counts.');
  });
});
