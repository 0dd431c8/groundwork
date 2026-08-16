import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const MIN_COUNT = 0;
export const MAX_COUNT = 5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Without `getOnInit` the first render shows MIN_COUNT and corrects itself on mount.
export const countAtom = atomWithStorage('counter:count', MIN_COUNT, undefined, {
  getOnInit: true,
});

export const canDecrementAtom = atom((get) => get(countAtom) > MIN_COUNT);
export const canIncrementAtom = atom((get) => get(countAtom) < MAX_COUNT);

export const stepAtom = atom(null, (get, set, delta: number) => {
  set(countAtom, clamp(get(countAtom) + delta, MIN_COUNT, MAX_COUNT));
});
