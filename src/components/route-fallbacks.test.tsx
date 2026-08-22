import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { NotFound, RouteError, RoutePending } from './route-fallbacks';

describe('<RoutePending />', () => {
  it('announces the wait', () => {
    renderWithProviders(<RoutePending />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });
});

describe('<RouteError />', () => {
  it('names what went wrong', () => {
    renderWithProviders(<RouteError error={new Error('No todo with id 9.')} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No todo with id 9.');
  });

  // Retrying re-runs the matched routes' loaders. A page reload would work too and would throw
  // away everything else on screen, which is why it is not what the button does.
  it('retries by invalidating the router', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<RouteError error={new Error('offline')} />);
    const invalidate = vi.spyOn(router, 'invalidate').mockResolvedValue();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(invalidate).toHaveBeenCalledOnce();
  });
});

describe('<NotFound />', () => {
  it('says so and offers a way back', () => {
    renderWithProviders(<NotFound />);

    expect(screen.getByRole('heading', { name: 'Not found.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });
});
