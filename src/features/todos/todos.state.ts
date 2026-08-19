import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { TodoFilter, TodoPriority } from './todos.schema';

// Client state only. Not one todo lives here: the list belongs to the server, and copying it
// into an atom is the mistake this whole layout exists to prevent.

// Without `getOnInit` the first render shows 'all' and corrects itself on mount.
export const filterAtom = atomWithStorage<TodoFilter>('todos:filter', 'all', undefined, {
  getOnInit: true,
});

// The priority the next todo gets. It sits here rather than in the form so the picker beside
// the form can change it, and add-todo-form.tsx reads it at submit instead of mirroring it.
export const newTodoPriorityAtom = atomWithStorage<TodoPriority>(
  'todos:priority',
  'normal',
  undefined,
  { getOnInit: true },
);

// Deliberately not persisted: a search term is worth nothing after a reload.
export const searchAtom = atom('');

export const isViewNarrowedAtom = atom(
  (get) => get(filterAtom) !== 'all' || get(searchAtom).trim() !== '',
);

// Write-only, so the two call sites cannot clear half the view between them and disagree.
export const clearViewAtom = atom(null, (_get, set) => {
  set(filterAtom, 'all');
  set(searchAtom, '');
});
