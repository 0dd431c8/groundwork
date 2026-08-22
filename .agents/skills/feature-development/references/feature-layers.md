# Feature layers

Use only the layers the feature needs. Dependencies follow the chain in `AGENTS.md`; these are the
responsibilities and boundary decisions within each layer.

## `<feature>.schema.ts`: domain rules

Put constants, zod schemas, inferred types, and pure predicates here. This bottom layer imports zod
and nothing from a higher feature layer.

```ts
export const MAX_TITLE_LENGTH = 80;

export const addTodoSchema = z.object({
  title: z.string().trim().min(1, 'Give the todo a title.').max(MAX_TITLE_LENGTH),
  priority: z.enum(['low', 'normal', 'high']),
});

export const todoSchema = addTodoSchema.extend({
  id: z.string(),
  done: z.boolean(),
  addedAt: z.number(),
});

export type AddTodoInput = z.infer<typeof addTodoSchema>;
export type Todo = z.infer<typeof todoSchema>;
```

Keep the response schema separate from the input schema when the server returns fields the caller
does not supply. Put a shared predicate here rather than letting components disagree about a domain
rule.

## `<feature>.state.ts`: browser-owned state

First confirm the value belongs to Jotai: server data belongs to React Query, while a shareable or
reload-persistent view belongs to the URL. Use the Jotai skill for general atom modeling.

In this repository, atoms live at module scope in the feature that owns them, use an `Atom` suffix,
and import no React. `atomWithStorage` uses `{ getOnInit: true }` so its first render reads storage
instead of correcting the initial value after mount.

```ts
export const newTodoPriorityAtom = atomWithStorage<TodoPriority>(
  'todos:priority',
  'normal',
  undefined,
  { getOnInit: true },
);
```

## `<feature>.api.ts`: transport

Keep fetch calls and their transport-facing types here, without React, Jotai, or React Query. Parse
responses with the domain schema at this boundary so higher layers receive validated data instead
of relying on a cast.

```ts
export async function addTodo(input: AddTodoInput): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Could not add.');
  return todoSchema.parse(await response.json());
}
```

Use a named error when a route must distinguish a missing record from a transport failure.

## `<feature>.queries.ts`: server state

Define reads with `queryOptions`, export stable keys separately, and pass the complete options object
to `useQuery`. Wrap transport calls so React Query's context object is never passed as an accidental
argument.

```ts
export const todosKey = ['todos'] as const;

export const todosQuery = queryOptions({
  queryKey: todosKey,
  queryFn: () => fetchTodos(),
});
```

Give each mutation a named hook in this layer. Put invalidation on the hook's `onSuccess`, not on an
individual `mutate()` call, because caller callbacks can be dropped when that caller unmounts.

```ts
export function useAddTodo(): UseMutationResult<Todo, Error, AddTodoInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTodoInput) => addTodo(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}
```

## Components and `index.ts`

Components consume the lower layers, own rendering decisions, and stay independent of feature
internals outside their folder. Export only the pieces another feature or route actually needs:

```ts
export { TodosPanel } from './todos-panel';
```

Use named function declarations with an explicit `: JSX.Element`, as required by `AGENTS.md`. A
feature may export one component, several components, a query option, a hook, a type, or nothing.
