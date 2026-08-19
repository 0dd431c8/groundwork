import { describe, expect, it } from 'vitest';
import {
  addTodoFormSchema,
  addTodoSchema,
  MAX_TITLE_LENGTH,
  matchesFilter,
  matchesSearch,
  setTodoDoneSchema,
  type Todo,
  todoSchema,
} from './todos.schema';

const todo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  title: 'Read AGENTS.md',
  priority: 'high',
  done: false,
  addedAt: Date.UTC(2026, 7, 16, 9, 0),
  ...overrides,
});

describe('addTodoSchema', () => {
  it('accepts a title and a priority', () => {
    expect(addTodoSchema.parse({ title: 'Read AGENTS.md', priority: 'high' })).toEqual({
      title: 'Read AGENTS.md',
      priority: 'high',
    });
  });

  it('trims the title before checking it', () => {
    expect(addTodoSchema.parse({ title: '  Read  ', priority: 'low' }).title).toBe('Read');
  });

  it('rejects a title that is only whitespace', () => {
    const result = addTodoSchema.safeParse({ title: '   ', priority: 'low' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Give the todo a title.');
  });

  it('rejects a title past the maximum length', () => {
    const title = 'x'.repeat(MAX_TITLE_LENGTH + 1);

    expect(addTodoSchema.safeParse({ title, priority: 'low' }).success).toBe(false);
  });

  it('rejects a priority outside the three it knows', () => {
    expect(addTodoSchema.safeParse({ title: 'Read', priority: 'urgent' }).success).toBe(false);
  });
});

describe('todoSchema', () => {
  it('adds what the server owns on top of what it accepts', () => {
    expect(todoSchema.parse(todo())).toEqual(todo());
  });

  it('drops a key the server did not promise', () => {
    expect(todoSchema.parse({ ...todo(), sneaked: true })).not.toHaveProperty('sneaked');
  });

  it('rejects a row missing the server-side fields', () => {
    expect(todoSchema.safeParse({ title: 'Read', priority: 'high' }).success).toBe(false);
  });
});

describe('setTodoDoneSchema', () => {
  it('narrows to the two fields a toggle sends', () => {
    expect(setTodoDoneSchema.parse({ id: '1', done: true })).toEqual({ id: '1', done: true });
  });
});

describe('addTodoFormSchema', () => {
  it('collects the title only, since the priority comes from the atom', () => {
    expect(addTodoFormSchema.parse({ title: 'Read' })).toEqual({ title: 'Read' });
  });

  it('rejects an empty title', () => {
    expect(addTodoFormSchema.safeParse({ title: '' }).success).toBe(false);
  });
});

describe('matchesFilter', () => {
  it('keeps everything under all', () => {
    expect(matchesFilter(todo({ done: false }), 'all')).toBe(true);
    expect(matchesFilter(todo({ done: true }), 'all')).toBe(true);
  });

  it('splits active from done', () => {
    expect(matchesFilter(todo({ done: false }), 'active')).toBe(true);
    expect(matchesFilter(todo({ done: true }), 'active')).toBe(false);
    expect(matchesFilter(todo({ done: true }), 'done')).toBe(true);
    expect(matchesFilter(todo({ done: false }), 'done')).toBe(false);
  });
});

describe('matchesSearch', () => {
  it('keeps everything when the term is blank', () => {
    expect(matchesSearch(todo(), '')).toBe(true);
    expect(matchesSearch(todo(), '   ')).toBe(true);
  });

  it('matches a substring of the title, ignoring case and padding', () => {
    expect(matchesSearch(todo({ title: 'Read AGENTS.md' }), '  agents ')).toBe(true);
  });

  it('rejects a term the title does not contain', () => {
    expect(matchesSearch(todo({ title: 'Read AGENTS.md' }), 'groceries')).toBe(false);
  });
});
