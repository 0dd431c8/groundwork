import { z } from 'zod';

// Domain rules: constants, schemas and pure helpers. The bottom layer, so every layer
// above can share one definition of what a valid count is.

export const MIN_COUNT = 0;
export const MAX_COUNT = 5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// The contract the transport accepts.
export const saveCountSchema = z.object({
  value: z.number().int().min(MIN_COUNT).max(MAX_COUNT),
  label: z.string().trim().min(1, 'Give the count a name.').max(40),
});

// What the form collects. `value` is not a field: it is read from countAtom at submit,
// so the form never holds a stale copy of state that lives somewhere else.
export const saveCountFormSchema = saveCountSchema.pick({ label: true });

export type SaveCountInput = z.infer<typeof saveCountSchema>;
export type SaveCountFormValues = z.infer<typeof saveCountFormSchema>;
