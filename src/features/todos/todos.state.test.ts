import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { newTodoPriorityAtom } from './todos.state';

// The filter and the search term used to live here too. They are search params now, so what is
// left is the one piece of state that belongs to this browser rather than to the address bar.
describe('newTodoPriorityAtom', () => {
  // Each case seeds the atom: its initial value is read from localStorage.
  function freshStore() {
    const store = createStore();
    store.set(newTodoPriorityAtom, 'normal');
    return store;
  }

  it('starts on normal', () => {
    expect(freshStore().get(newTodoPriorityAtom)).toBe('normal');
  });

  it('persists what was picked', () => {
    const store = freshStore();

    store.set(newTodoPriorityAtom, 'high');

    expect(store.get(newTodoPriorityAtom)).toBe('high');
    expect(localStorage.getItem('todos:priority')).toBe('"high"');
  });

  it('keeps stores independent', () => {
    const a = freshStore();
    const b = freshStore();

    a.set(newTodoPriorityAtom, 'low');

    expect(a.get(newTodoPriorityAtom)).toBe('low');
    expect(b.get(newTodoPriorityAtom)).toBe('normal');
  });
});
