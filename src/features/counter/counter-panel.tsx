import type { JSX } from 'react';
import { Counter } from './counter';
import { SaveCountButton } from './save-count-button';
import { SavedCountList } from './count-list';

export function CounterPanel(): JSX.Element {
  return (
    <section className="flex flex-col items-center gap-8">
      <Counter />
      <SaveCountButton />
      <SavedCountList />
    </section>
  );
}
