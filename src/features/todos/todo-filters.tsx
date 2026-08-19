import type { JSX } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todoFilters } from './todos.schema';
import { clearViewAtom, filterAtom, isViewNarrowedAtom, searchAtom } from './todos.state';

function SearchField(): JSX.Element {
  const [search, setSearch] = useAtom(searchAtom);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="todo-search">Search</Label>
      <Input
        id="todo-search"
        type="search"
        value={search}
        placeholder="Filter by title"
        onChange={(event) => setSearch(event.target.value)}
      />
    </div>
  );
}

function ClearViewButton(): JSX.Element {
  // Disabled until something is actually narrowed, which is what isViewNarrowedAtom is for:
  // the answer is derived from the two atoms rather than tracked alongside them.
  const isNarrowed = useAtomValue(isViewNarrowedAtom);
  const clearView = useSetAtom(clearViewAtom);

  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      className="ml-auto"
      disabled={!isNarrowed}
      onClick={() => clearView()}
    >
      Clear view
    </Button>
  );
}

export function TodoFilters(): JSX.Element {
  const [filter, setFilter] = useAtom(filterAtom);

  return (
    <div className="flex flex-col gap-3">
      <SearchField />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold tracking-wide uppercase">Show</legend>
        <div className="flex items-center gap-2">
          {todoFilters.map((option) => (
            <Button
              key={option}
              type="button"
              size="xs"
              variant={option === filter ? 'default' : 'outline'}
              aria-pressed={option === filter}
              onClick={() => setFilter(option)}
            >
              {option}
            </Button>
          ))}
          <ClearViewButton />
        </div>
      </fieldset>
    </div>
  );
}
