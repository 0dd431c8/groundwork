import {
  queryOptions,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { addTodo, fetchTodos, removeTodo, setTodoDone } from './todos.api';
import type { AddTodoInput, SetTodoDoneInput, Todo } from './todos.schema';

export const todosKey = ['todos'] as const;

export const todosQuery = queryOptions({
  queryKey: todosKey,
  // Wrapped, not `queryFn: fetchTodos`: React Query would pass its context object in.
  queryFn: () => fetchTodos(),
});

/**
 * All three hooks below invalidate the same key, which is the argument for them existing:
 * what a mutation invalidates is a fact about the data, not about the checkbox or the button
 * that triggered it, so no component ever has to name `todosKey`.
 *
 * `onSuccess` belongs on these options rather than on the `mutate()` call: callbacks passed
 * to `mutate()` are dropped if the caller unmounts before the request settles, so a row that
 * disappears mid-request would skip the invalidation.
 */
export function useAddTodo(): UseMutationResult<Todo, Error, AddTodoInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddTodoInput) => addTodo(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}

export function useSetTodoDone(): UseMutationResult<Todo, Error, SetTodoDoneInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetTodoDoneInput) => setTodoDone(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}

export function useRemoveTodo(): UseMutationResult<{ id: string }, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeTodo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}
