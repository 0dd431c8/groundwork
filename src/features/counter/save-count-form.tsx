import type { JSX } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { useSaveCount } from './counter.queries';
import { saveCountFormSchema } from './counter.schema';
import { countAtom } from './counter.state';

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  error: string | undefined;
  onChange: (raw: string) => void;
  onBlur: () => void;
};

// The shape every field in this repo copies: a real <label>, aria-invalid, and an error
// paragraph the input points at through aria-describedby.
function TextField({ label, name, value, error, onChange, onBlur }: TextFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : `${name}-error`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="rounded-md border border-input px-2 py-1 text-sm aria-invalid:border-destructive"
      />
      {error !== undefined && (
        <p id={`${name}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function useSaveCountForm() {
  const count = useAtomValue(countAtom);
  const { mutateAsync, isError } = useSaveCount();

  const form = useForm({
    defaultValues: { label: '' },
    // On the hook, not on a <form.Field validators={{...}}> prop: that would be a fresh
    // object every render and trip react-perf/jsx-no-new-object-as-prop.
    validators: { onChange: saveCountFormSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        // The count is read from the atom here, so the form never mirrors it.
        await mutateAsync({ value: count, label: value.label });
        formApi.reset();
      } catch {
        // `isError` below renders it; rethrowing would be an unhandled rejection.
      }
    },
  });

  return { form, isError };
}

export function SaveCountForm(): JSX.Element {
  const { form, isError } = useSaveCountForm();

  return (
    <form
      className="flex w-56 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="label">
        {(field) => (
          <TextField
            label="Label"
            name={field.name}
            value={field.state.value}
            error={field.state.meta.errors[0]?.message}
            onChange={(raw) => field.handleChange(raw)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
      >
        {(state) => (
          <Button type="submit" disabled={!state.canSubmit}>
            {state.isSubmitting ? 'Saving...' : 'Save count'}
          </Button>
        )}
      </form.Subscribe>

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not save that one.
        </p>
      )}
    </form>
  );
}
