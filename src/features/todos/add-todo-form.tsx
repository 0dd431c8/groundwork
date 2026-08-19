import type { JSX } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAddTodo } from './todos.queries';
import { addTodoFormSchema, MAX_TITLE_LENGTH } from './todos.schema';
import { newTodoPriorityAtom } from './todos.state';

type FormApi = ReturnType<typeof useAddTodoForm>['form'];

type TitleRowProps = {
  form: FormApi;
  value: string;
  errors: ({ message?: string } | undefined)[];
  onChange: (raw: string) => void;
  onBlur: () => void;
};

// `form` is passed rather than the rendered button: react-perf bans JSX as a prop, and the
// subscription has to sit inside the row so the action lands beside the field it submits.
function SubmitButton({ form }: { form: FormApi }): JSX.Element {
  return (
    <form.Subscribe
      selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
    >
      {(state) => (
        <Button type="submit" size="sm" className="shrink-0" disabled={!state.canSubmit}>
          {state.isSubmitting ? 'Adding...' : 'Add todo'}
        </Button>
      )}
    </form.Subscribe>
  );
}

// The shape every field in this repo copies: a real <label>, aria-invalid, and an error
// element the input points at through aria-describedby.
function TitleRow({ form, value, errors, onChange, onBlur }: TitleRowProps): JSX.Element {
  const invalid = errors.length > 0;

  return (
    <Field data-invalid={invalid} className="gap-1.5">
      <FieldLabel htmlFor="todo-title">Title</FieldLabel>
      <div className="flex items-center gap-3">
        <Input
          id="todo-title"
          name="title"
          type="text"
          placeholder="Rewrite the README"
          value={value}
          maxLength={MAX_TITLE_LENGTH}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'todo-title-error' : undefined}
          className="flex-1"
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <SubmitButton form={form} />
      </div>
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
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="title">
        {(field) => (
          <TitleRow
            form={form}
            value={field.state.value}
            errors={field.state.meta.errors}
            onChange={(raw) => field.handleChange(raw)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not add that one.
        </p>
      )}
    </form>
  );
}
