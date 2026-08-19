import type { JSX } from 'react';
import { Separator } from '@/components/ui/separator';
import { AddTodoForm } from './add-todo-form';
import { PriorityPicker } from './priority-picker';
import { TodoFilters } from './todo-filters';
import { TodoList } from './todo-list';

export function TodosPanel(): JSX.Element {
  return (
    <section className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl">Todos</h1>
      <AddTodoForm />
      <PriorityPicker />
      <Separator />
      <TodoFilters />
      <TodoList />
    </section>
  );
}
