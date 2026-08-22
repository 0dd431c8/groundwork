import { toast } from 'sonner';

// The one place that turns a thrown value into something a person can read. It lives here rather
// than inline in runtime.tsx so message normalization has its own test surface.
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') return error.message;
  return 'Something went wrong. Try again.';
}

export function notifyError(error: unknown): void {
  toast.error(errorMessage(error));
}
