import { type AddTodoInput, type SetTodoDoneInput, type Todo, todoSchema } from './todos.schema';

// Stand-in for a server: state lives in this module, so it resets on every reload.
let todos: Todo[] = [
  {
    id: '1',
    title: 'Read AGENTS.md',
    priority: 'high',
    done: false,
    addedAt: Date.UTC(2026, 7, 16, 9, 0),
  },
  {
    id: '2',
    title: 'Delete the example feature',
    priority: 'normal',
    done: false,
    addedAt: Date.UTC(2026, 7, 16, 8, 30),
  },
  {
    id: '3',
    title: 'Run bun run check',
    priority: 'low',
    done: true,
    addedAt: Date.UTC(2026, 7, 16, 8, 0),
  },
];

// Sequential rather than crypto.randomUUID() so ids are predictable in tests.
let nextId = todos.length + 1;

// Braced on purpose: a shorthand arrow would return the timeout id out of the executor.
const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// Parsing at this boundary is what makes everything above work with a real `Todo` rather
// than a hopeful cast. It also hands back a fresh object, so no caller holds a reference to
// a row this module owns.
export async function fetchTodos(): Promise<Todo[]> {
  await delay(300);
  return todos.map((todo) => todoSchema.parse(todo));
}

export async function addTodo(input: AddTodoInput): Promise<Todo> {
  await delay(300);
  const added: Todo = { id: String(nextId++), ...input, done: false, addedAt: Date.now() };
  todos = [added, ...todos];
  return todoSchema.parse(added);
}

export async function setTodoDone({ id, done }: SetTodoDoneInput): Promise<Todo> {
  await delay(300);
  const current = todos.find((todo) => todo.id === id);
  if (current === undefined) throw new Error(`No todo with id ${id}.`);

  const updated: Todo = { ...current, done };
  todos = todos.map((todo) => (todo.id === id ? updated : todo));
  return todoSchema.parse(updated);
}

export async function removeTodo(id: string): Promise<{ id: string }> {
  await delay(300);
  todos = todos.filter((todo) => todo.id !== id);
  return { id };
}
