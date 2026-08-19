import type { JSX } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAddTodo } from './todos.queries';
import { addTodoFormSchema, MAX_TITLE_LENGTH } from './todos.schema';
import { newTodoPriorityAtom } from './todos.state';

type TitleFieldProps = {
  value: string;
  errors: ({ message?: string } | undefined)[];
  onChange: (raw: string) => void;
  onBlur: () => void;
};

// The shape every field in this repo copies: a real <label>, aria-invalid, and an error
// element the input points at through aria-describedby.
function TitleField({ value, errors, onChange, onBlur }: TitleFieldProps): JSX.Element {
  const invalid = errors.length > 0;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor="todo-title">Title</FieldLabel>
      <Input
        id="todo-title"
        name="title"
        type="text"
        value={value}
        maxLength={MAX_TITLE_LENGTH}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'todo-title-error' : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <FieldError id="todo-title-error" errors={errors} />
    </Field>
  );
}

function useAddTodoForm() {
  const priority = useAtomValue(newTodoPriorityAtom);
  const { mutateAsync, isError } = useAddTodo();

  const form = useForm({
    defaultValues: { title: '' },
    // On the hook, not on a <form.Field validators={{...}}> prop: that would be a fresh
    // object every render and trip react-perf/jsx-no-new-object-as-prop.
    validators: { onChange: addTodoFormSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        // The priority is read here, so the form never mirrors state it does not own.
        await mutateAsync({ title: value.title, priority });
        formApi.reset();
      } catch {
        // `isError` below renders it; rethrowing would be an unhandled rejection.
      }
    },
  });

  return { form, isError };
}

export function AddTodoForm(): JSX.Element {
  const { form, isError } = useAddTodoForm();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="title">
        {(field) => (
          <TitleField
            value={field.state.value}
            errors={field.state.meta.errors}
            onChange={(raw) => field.handleChange(raw)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
      >
        {(state) => (
          <Button type="submit" size="sm" className="self-start" disabled={!state.canSubmit}>
            {state.isSubmitting ? 'Adding...' : 'Add todo'}
          </Button>
        )}
      </form.Subscribe>

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not add that one.
        </p>
      )}
    </form>
  );
}
