import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { clamp, MAX_COUNT, MIN_COUNT } from './counter.schema';

// Without `getOnInit` the first render shows MIN_COUNT and corrects itself on mount.
export const countAtom = atomWithStorage('counter:count', MIN_COUNT, undefined, {
  getOnInit: true,
});

export const canDecrementAtom = atom((get) => get(countAtom) > MIN_COUNT);
export const canIncrementAtom = atom((get) => get(countAtom) < MAX_COUNT);

export const stepAtom = atom(null, (get, set, delta: number) => {
  set(countAtom, clamp(get(countAtom) + delta, MIN_COUNT, MAX_COUNT));
});
