import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { SegmentedField } from './segmented-field';

// Deliberately not a TodoFilter or a TodoPriority: the control knows nothing about todos, and
// priority-picker.test.tsx and todo-filters.test.tsx already cover the real call sites.
const sides = ['left', 'middle', 'right'] as const;

const noop = () => {};

describe('<SegmentedField />', () => {
  it('names the group after its legend and presses only the selected option', () => {
    renderWithProviders(
      <SegmentedField legend="Side" options={sides} value="middle" onChange={noop} />,
    );

    expect(screen.getByRole('group', { name: 'Side' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'middle', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'left', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'right', pressed: false })).toBeInTheDocument();
  });

  it('hands the clicked option back', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(next: string) => void>();
    renderWithProviders(
      <SegmentedField legend="Side" options={sides} value="middle" onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'right' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('right');
  });
});
