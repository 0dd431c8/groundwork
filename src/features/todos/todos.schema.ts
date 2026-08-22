import { z } from 'zod';

// Domain rules: constants, schemas and pure helpers. The bottom layer, so every layer
// above can share one definition of what a valid todo is.

export const MAX_TITLE_LENGTH = 80;

export const todoFilters = ['all', 'active', 'done'] as const;
export const todoPriorities = ['low', 'normal', 'high'] as const;

export const todoFilterSchema = z.enum(todoFilters);
export const todoPrioritySchema = z.enum(todoPriorities);

// The contract the transport accepts.
export const addTodoSchema = z.object({
  title: z.string().trim().min(1, 'Give the todo a title.').max(MAX_TITLE_LENGTH),
  priority: todoPrioritySchema,
});

// What the server sends back is a separate schema from what it accepts.
export const todoSchema = addTodoSchema.extend({
  id: z.string(),
  done: z.boolean(),
  addedAt: z.number(),
});

export const setTodoDoneSchema = todoSchema.pick({ id: true, done: true });

// What the form collects. `priority` is not a field: it is read from newTodoPriorityAtom at
// submit, so the form never holds a stale copy of state that lives somewhere else.
export const addTodoFormSchema = addTodoSchema.pick({ title: true });

// What the list route keeps in the URL. A view is worth sharing and worth surviving a reload,
// which is what puts it here rather than in an atom.
export const todoViewDefaults = { filter: 'all', search: '' } as const;

// `.catch()` on both fields is the point: a hand-edited or truncated URL degrades to the default
// view instead of throwing before anything renders.
export const todoViewSchema = z.object({
  filter: todoFilterSchema.default(todoViewDefaults.filter).catch(todoViewDefaults.filter),
  search: z.string().default(todoViewDefaults.search).catch(todoViewDefaults.search),
});

export type TodoFilter = z.infer<typeof todoFilterSchema>;
export type TodoView = z.infer<typeof todoViewSchema>;
export type TodoPriority = z.infer<typeof todoPrioritySchema>;
export type AddTodoInput = z.infer<typeof addTodoSchema>;
export type AddTodoFormValues = z.infer<typeof addTodoFormSchema>;
export type SetTodoDoneInput = z.infer<typeof setTodoDoneSchema>;
export type Todo = z.infer<typeof todoSchema>;

// Both predicates live here rather than in the list that calls them, so the filter buttons
// and the rows below them cannot drift apart about what "active" means.
export function matchesFilter(todo: Todo, filter: TodoFilter): boolean {
  if (filter === 'active') return !todo.done;
  if (filter === 'done') return todo.done;
  return true;
}

export function matchesSearch(todo: Todo, search: string): boolean {
  const term = search.trim().toLowerCase();
  return term === '' || todo.title.toLowerCase().includes(term);
}

// Whether the view is hiding anything, which is what decides if "Clear view" has work to do.
// Derived from the view rather than tracked beside it, so the two cannot disagree.
export function isViewNarrowed(view: TodoView): boolean {
  return view.filter !== todoViewDefaults.filter || view.search.trim() !== '';
}
