import type { JSX } from 'react';
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedField } from './segmented-field';
import { isViewNarrowed, todoFilters, todoViewDefaults, type TodoView } from './todos.schema';

// The view is owned by the URL and arrives as a prop, so this file has no idea whether it is
// driving a router, a test's spy, or something else. That is what keeps it renderable without one.
type ViewProps = { view: TodoView; onViewChange: (next: TodoView) => void };

// The label is hidden rather than dropped: the magnifier and the placeholder are enough for a
// sighted reader, but the field still needs a real name in the accessibility tree.
function SearchField({ view, onViewChange }: ViewProps): JSX.Element {
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
        value={view.search}
        placeholder="Filter by title"
        className="pl-6"
        onChange={(event) => onViewChange({ ...view, search: event.target.value })}
      />
    </div>
  );
}

function ClearViewButton({ view, onViewChange }: ViewProps): JSX.Element {
  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      className="ml-auto shrink-0"
      // Disabled until something is actually narrowed. The answer is derived from the view rather
      // than tracked beside it, so the button and the list cannot disagree about what is hidden.
      disabled={!isViewNarrowed(view)}
      onClick={() => onViewChange(todoViewDefaults)}
    >
      Clear view
    </Button>
  );
}

export function TodoFilters({ view, onViewChange }: ViewProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <SearchField view={view} onViewChange={onViewChange} />
      {/* Clear view sits with the controls it resets, not with the field above it. */}
      <div className="flex items-center gap-3">
        <SegmentedField
          legend="Show"
          options={todoFilters}
          value={view.filter}
          onChange={(filter) => onViewChange({ ...view, filter })}
        />
        <ClearViewButton view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
