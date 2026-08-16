export const MIN_COUNT = 0;
export const MAX_COUNT = 5;

/** Clamps `value` into the inclusive range [`min`, `max`]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
