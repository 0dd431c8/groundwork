import { atomWithStorage } from 'jotai/utils';
import type { TodoPriority } from './todos.schema';

// Client state only, and only what belongs to this browser. The list is server data and lives in
// the query cache; the filter and the search term describe a view worth sharing, so they live in
// the URL (see src/routes/todos/index.tsx). What is left is a preference: nobody wants to share a
// link to someone else's default priority.

// The priority the next todo gets. It sits here rather than in the form so the picker beside the
// form can change it, and add-todo-form.tsx reads it at submit instead of mirroring it. Without
// `getOnInit` the first render shows 'normal' and corrects itself on mount.
export const newTodoPriorityAtom = atomWithStorage<TodoPriority>(
  'todos:priority',
  'normal',
  undefined,
  { getOnInit: true },
);
