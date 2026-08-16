import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import {
  canDecrementAtom,
  canIncrementAtom,
  clamp,
  countAtom,
  MAX_COUNT,
  MIN_COUNT,
  stepAtom,
} from '@/lib/counter';

describe('clamp', () => {
  it('passes through a value inside the range', () => {
    expect(clamp(3, 0, 5)).toBe(3);
  });

  it('raises a value below the minimum', () => {
    expect(clamp(-4, 0, 5)).toBe(0);
  });

  it('lowers a value above the maximum', () => {
    expect(clamp(9, 0, 5)).toBe(5);
  });

  it('treats the bounds as inclusive', () => {
    expect(clamp(MIN_COUNT, MIN_COUNT, MAX_COUNT)).toBe(MIN_COUNT);
    expect(clamp(MAX_COUNT, MIN_COUNT, MAX_COUNT)).toBe(MAX_COUNT);
  });
});

// Atom logic is exercised through the vanilla store, no React involved. Each case
// seeds countAtom explicitly rather than trusting its initial value, which
// atomWithStorage reads from localStorage when this module is first evaluated.
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
