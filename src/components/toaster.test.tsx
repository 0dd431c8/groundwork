import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toaster } from './toaster';

// Rendered bare rather than through renderWithProviders: the mount takes no context, and the
// point of the case is that __root.tsx can drop it in with no wiring.
describe('<Toaster />', () => {
  it('mounts a live region for notifications', () => {
    render(<Toaster />);

    expect(screen.getByRole('region')).toBeInTheDocument();
  });
});
