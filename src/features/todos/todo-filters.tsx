import type { JSX } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedField } from './segmented-field';
import { todoFilters } from './todos.schema';
import { clearViewAtom, filterAtom, isViewNarrowedAtom, searchAtom } from './todos.state';

// The label is hidden rather than dropped: the magnifier and the placeholder are enough for a
// sighted reader, but the field still needs a real name in the accessibility tree.
function SearchField(): JSX.Element {
  const [search, setSearch] = useAtom(searchAtom);

  return (
    <div className="relative">
      <Label htmlFor="todo-search" className="sr-only">
        Search
      </Label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-0 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="todo-search"
        type="search"
        value={search}
        placeholder="Filter by title"
        className="pl-6"
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
      className="ml-auto shrink-0"
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
      {/* Clear view sits with the controls it resets, not with the field above it. */}
      <div className="flex items-center gap-3">
        <SegmentedField legend="Show" options={todoFilters} value={filter} onChange={setFilter} />
        <ClearViewButton />
      </div>
    </div>
  );
}
