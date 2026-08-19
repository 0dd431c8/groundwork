import type { JSX } from 'react';
import { Button } from '@/components/ui/button';

type SegmentedFieldProps<T extends string> = {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
};

// One control behind both the priority picker and the filter bar. Two copies of these class
// strings would drift, and then "selected" would mean two different things on one screen.
export function SegmentedField<T extends string>({
  legend,
  options,
  value,
  onChange,
}: SegmentedFieldProps<T>): JSX.Element {
  return (
    <fieldset className="flex items-center gap-3">
      {/* The <legend> names the group, and `sr-only` takes it out of the flow so the label can
          sit inline instead of eating a line of its own. A <legend> is the only element that
          can name a <fieldset>, which is why this is not one visible element doing both. */}
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden="true" className="text-xs font-semibold tracking-widest uppercase">
        {legend}
      </span>
      {/* The track colour shows through 1px gaps as the dividers, so the segments read as one
          control without two border widths meeting between them. */}
      <div className="flex gap-px bg-border p-px">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="xs"
            variant="ghost"
            aria-pressed={option === value}
            className={
              option === value
                ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            }
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
