import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { MAX_COUNT, MIN_COUNT } from './counter.schema';
import { canDecrementAtom, canIncrementAtom, countAtom, stepAtom } from './counter.state';

// Each case seeds countAtom: its initial value is read from localStorage at module load.
describe('counter atoms', () => {
  function storeAt(count: number) {
    const store = createStore();
    store.set(countAtom, count);
    return store;
  }

  it('steps up and down', () => {
    const store = storeAt(MIN_COUNT);

    store.set(stepAtom, 1);
    store.set(stepAtom, 1);
    expect(store.get(countAtom)).toBe(2);

    store.set(stepAtom, -1);
    expect(store.get(countAtom)).toBe(1);
  });

  it('clamps at both bounds', () => {
    const store = storeAt(MAX_COUNT);
    store.set(stepAtom, 1);
    expect(store.get(countAtom)).toBe(MAX_COUNT);

    store.set(countAtom, MIN_COUNT);
    store.set(stepAtom, -1);
    expect(store.get(countAtom)).toBe(MIN_COUNT);
  });

  it('derives whether each direction is available', () => {
    const store = storeAt(MIN_COUNT);
    expect(store.get(canDecrementAtom)).toBe(false);
    expect(store.get(canIncrementAtom)).toBe(true);

    store.set(countAtom, MAX_COUNT);
    expect(store.get(canDecrementAtom)).toBe(true);
    expect(store.get(canIncrementAtom)).toBe(false);
  });

  it('keeps stores independent', () => {
    const a = storeAt(MIN_COUNT);
    const b = storeAt(MIN_COUNT);

    a.set(stepAtom, 1);

    expect(a.get(countAtom)).toBe(1);
    expect(b.get(countAtom)).toBe(MIN_COUNT);
  });
});
