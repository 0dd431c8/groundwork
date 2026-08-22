import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';

/**
 * The one test that renders a real route, and the only place the URL is under test. What the panel
 * does with a view is covered against props in src/features/todos/; what only a router can prove is
 * that the view comes from the address bar and goes back to it.
 *
 * Nothing is mocked here, deliberately. The feature's transport is already a fake server with
 * three seeded rows, and a route test that stubs it would be testing the stub. Sibling tests inside
 * the feature are where `vi.mock('./todos.api')` belongs.
 */
describe('/todos', () => {
  it('renders the list the loader primed', async () => {
    renderRoute('/todos');

    expect(await screen.findByRole('list', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('opens already narrowed when the URL says so', async () => {
    renderRoute('/todos?filter=done&search=check');

    await screen.findByRole('list', { name: 'Todos' });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Run bun run check')).toBeInTheDocument();
  });

  // The reason todoViewSchema puts `.catch()` on every field: a hand-edited or truncated URL has
  // to render something rather than throw before the page exists.
  it('falls back to the default view rather than throwing on a mangled URL', async () => {
    const { router } = renderRoute('/todos?filter=nope');

    await screen.findByRole('list', { name: 'Todos' });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(router.state.location.searchStr).toBe('');
  });

  it('writes the picked filter to the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/todos');
    await screen.findByRole('list', { name: 'Todos' });

    await user.click(screen.getByRole('button', { name: 'done' }));

    await waitFor(() => expect(router.state.location.searchStr).toBe('?filter=done'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  // stripSearchParams keeps `/todos` as the address of the unfiltered list, so a link to it is not
  // three parameters long for no reason.
  it('leaves default values out of the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/todos?filter=done');
    await screen.findByRole('list', { name: 'Todos' });

    await user.click(screen.getByRole('button', { name: 'Clear view' }));

    await waitFor(() => expect(router.state.location.searchStr).toBe(''));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('reaches a todo through its own address', async () => {
    renderRoute('/todos/1');

    expect(await screen.findByRole('heading', { name: 'Read AGENTS.md' })).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
  });

  it('renders the not-found component for an id the server does not have', async () => {
    renderRoute('/todos/404');

    expect(await screen.findByRole('heading', { name: 'Not found.' })).toBeInTheDocument();
  });

  it('does not render a deleted todo from a stale detail cache', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/todos/2');
    await screen.findByRole('heading', { name: 'Delete the example feature' });

    await user.click(screen.getByRole('link', { name: 'All todos' }));
    await user.click(
      await screen.findByRole('button', { name: 'Delete Delete the example feature' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Delete Delete the example feature' }),
      ).not.toBeInTheDocument(),
    );

    await router.navigate({ to: '/todos/$todoId', params: { todoId: '2' } });

    expect(await screen.findByRole('heading', { name: 'Not found.' })).toBeInTheDocument();
    expect(screen.queryByText('Delete the example feature')).not.toBeInTheDocument();
  });
});
