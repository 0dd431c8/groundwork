import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { fetchCounts, saveCount, type SavedCount } from './counter.api';
import { countAtom } from './counter.state';
import { SaveCountForm } from './save-count-form';

vi.mock('./counter.api');

const savedCount = (id: string, value: number, label = 'Morning'): SavedCount => ({
  id,
  value,
  label,
  savedAt: Date.UTC(2026, 7, 16, 9, 0),
});

// What saving invalidates belongs to useSaveCount, covered in counter.queries.test.tsx.
describe('<SaveCountForm />', () => {
  beforeEach(() => {
    vi.mocked(fetchCounts).mockReset().mockResolvedValue([]);
    vi.mocked(saveCount).mockReset().mockResolvedValue(savedCount('9', 3));
  });

  it('sends the typed label with the count currently held in the atom', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(countAtom, 3);
    renderWithProviders(<SaveCountForm />, { store });

    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Morning');
    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(saveCount).toHaveBeenCalledExactlyOnceWith({ value: 3, label: 'Morning' });
  });

  it('rejects an empty label without calling the transport', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SaveCountForm />);

    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Give the count a name.');
    expect(saveCount).not.toHaveBeenCalled();
  });

  it('marks the field invalid and points it at the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SaveCountForm />);
    const field = screen.getByRole('textbox', { name: 'Label' });

    await user.type(field, 'a');
    await user.clear(field);

    const message = await screen.findByRole('alert');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Give the count a name.');
    expect(message).toBeInTheDocument();
  });

  it('clears the field after a successful save', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SaveCountForm />);
    const field = screen.getByRole('textbox', { name: 'Label' });

    await user.type(field, 'Morning');
    await user.click(screen.getByRole('button', { name: 'Save count' }));

    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('reports a failed save', async () => {
    const user = userEvent.setup();
    vi.mocked(saveCount).mockRejectedValue(new Error('offline'));
    renderWithProviders(<SaveCountForm />);

    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Morning');
    await user.click(screen.getByRole('button', { name: 'Save count' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save that one.');
  });
});
