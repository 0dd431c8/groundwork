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

export type TodoFilter = z.infer<typeof todoFilterSchema>;
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
