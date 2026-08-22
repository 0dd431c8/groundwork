---
name: forms
description: Build or change a TanStack Form form in this repository, including zod validation, mutation submission, reset behavior, and accessible pending or error state.
---

# Forms

TanStack Form with zod, through Standard Schema. No adapter package is needed.

```tsx
const form = useForm({
  defaultValues: { title: '' },
  // On the hook, not on a <form.Field validators={{...}}> prop: that object would be new
  // every render and trip react-perf/jsx-no-new-object-as-prop.
  validators: { onChange: addTodoFormSchema },
  onSubmit: async ({ value, formApi }) => {
    await mutateAsync({ title: value.title, priority });
    formApi.reset();
  },
});

<form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
```

- The schema lives in `<feature>.schema.ts`. If the form collects a subset of what the API
  accepts, derive it (`addTodoSchema.pick({ title: true })`) so the two cannot drift.
- Submit through a mutation hook from `<feature>.queries.ts`.
- **Never mirror state that lives elsewhere into a form field.** Read an atom or a query at
  submit time. `defaultValues` snapshots at mount, so a field seeded from an atom goes stale the
  moment anything else changes it.
- `void form.handleSubmit()` is required: the type-aware `no-floating-promises` and
  `no-misused-promises` rules reject a bare call and an `async` handler on the element.
- Catch a rejecting mutation inside `onSubmit` and render the hook's `isError`. Letting it
  escape is an unhandled rejection.
- Read submit state through `<form.Subscribe selector={...}>`, so the whole form does not
  re-render on every keystroke.
