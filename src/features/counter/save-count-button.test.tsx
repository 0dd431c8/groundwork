import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchCounts, saveCount, type SavedCount } from './counter.api';
import { countAtom } from './counter.state';
import { SaveCountButton } from './save-count-button';

vi.mock('./counter.api');

const savedCount = (id: string, value: number): SavedCount => ({
  id,
  value,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

// What saving invalidates belongs to useSaveCount, covered in counter.queries.test.tsx.
describe('<SaveCountButton />', () => {
  beforeEach(() => {
    vi.mocked(fetchCounts).mockReset().mockResolvedValue([]);
    vi.mocked(saveCount).mockReset().mockResolvedValue(savedCount('9', 3));
  });

  it('sends the count currently held in the atom', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(countAtom, 3);
    renderWithProviders(<SaveCountButton />, { store });

    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(saveCount).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('disables itself while the save is in flight', async () => {
    const user = userEvent.setup();
    vi.mocked(saveCount).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SaveCountButton />);

    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('reports a failed save', async () => {
    const user = userEvent.setup();
    vi.mocked(saveCount).mockRejectedValue(new Error('offline'));
    renderWithProviders(<SaveCountButton />);

    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save that one.');
  });
});
