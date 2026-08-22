import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';

describe('/', () => {
  it('redirects to the worked example', async () => {
    const { router } = renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Todos' })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/todos'));
  });
});
