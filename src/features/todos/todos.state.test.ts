import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import {
  clearViewAtom,
  filterAtom,
  isViewNarrowedAtom,
  newTodoPriorityAtom,
  searchAtom,
} from './todos.state';

// Each case seeds the persisted atoms: their initial value is read from localStorage.
describe('todos atoms', () => {
  function freshStore() {
    const store = createStore();
    store.set(filterAtom, 'all');
    store.set(searchAtom, '');
    store.set(newTodoPriorityAtom, 'normal');
    return store;
  }

  it('starts wide open', () => {
    const store = freshStore();

    expect(store.get(filterAtom)).toBe('all');
    expect(store.get(isViewNarrowedAtom)).toBe(false);
  });

  it('derives narrowness from the filter', () => {
    const store = freshStore();

    store.set(filterAtom, 'done');

    expect(store.get(isViewNarrowedAtom)).toBe(true);
  });

  it('derives narrowness from the search term, ignoring padding', () => {
    const store = freshStore();

    store.set(searchAtom, '   ');
    expect(store.get(isViewNarrowedAtom)).toBe(false);

    store.set(searchAtom, 'agents');
    expect(store.get(isViewNarrowedAtom)).toBe(true);
  });

  it('clears the filter and the search together', () => {
    const store = freshStore();
    store.set(filterAtom, 'active');
    store.set(searchAtom, 'agents');

    store.set(clearViewAtom);

    expect(store.get(filterAtom)).toBe('all');
    expect(store.get(searchAtom)).toBe('');
    expect(store.get(isViewNarrowedAtom)).toBe(false);
  });

  it('leaves the new-todo priority alone when the view is cleared', () => {
    const store = freshStore();
    store.set(newTodoPriorityAtom, 'high');

    store.set(clearViewAtom);

    expect(store.get(newTodoPriorityAtom)).toBe('high');
  });

  it('keeps stores independent', () => {
    const a = freshStore();
    const b = freshStore();

    a.set(filterAtom, 'done');

    expect(a.get(filterAtom)).toBe('done');
    expect(b.get(filterAtom)).toBe('all');
  });
});
