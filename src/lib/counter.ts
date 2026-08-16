import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const MIN_COUNT = 0;
export const MAX_COUNT = 5;

/** Clamps `value` into the inclusive range [`min`, `max`]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Primitive state, persisted to localStorage. `getOnInit` makes the very first read
 * come from storage; without it the atom renders MIN_COUNT and corrects itself on
 * mount, which shows up as a flash of the wrong count.
 */
export const countAtom = atomWithStorage('counter:count', MIN_COUNT, undefined, {
  getOnInit: true,
});

// Read-only derived atoms. Recomputed from countAtom on demand, never stored and
// never synced by hand - this is what the useEffect ban means by "derive state".
export const canDecrementAtom = atom((get) => get(countAtom) > MIN_COUNT);
export const canIncrementAtom = atom((get) => get(countAtom) < MAX_COUNT);

/** Write-only action atom, so the clamping rule lives here and not in the component. */
export const stepAtom = atom(null, (get, set, delta: number) => {
  set(countAtom, clamp(get(countAtom) + delta, MIN_COUNT, MAX_COUNT));
});
