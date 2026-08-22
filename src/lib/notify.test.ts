import { describe, expect, it, vi } from 'vitest';
import { errorMessage, notifyError } from './notify';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn<(message: string) => void>() }));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

describe('errorMessage', () => {
  it('uses the error message when there is one', () => {
    expect(errorMessage(new Error('No todo with id 9.'))).toBe('No todo with id 9.');
  });

  it('falls back when the message is blank', () => {
    expect(errorMessage(new Error('   '))).toBe('Something went wrong. Try again.');
  });

  it('falls back for a value that is not an Error', () => {
    expect(errorMessage('boom')).toBe('Something went wrong. Try again.');
  });
});

describe('notifyError', () => {
  it('raises a toast carrying the message', () => {
    notifyError(new Error('Could not save.'));
    expect(toastError).toHaveBeenCalledWith('Could not save.');
  });
});
