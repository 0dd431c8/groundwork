---
name: styling-and-ui
description: Build or change JSX styling, shadcn primitives, Tailwind v4 theme tokens, dark mode, notifications, or accessible markup in this repository.
---

# Styling, UI and accessibility

## Styling and UI

- Tailwind v4 through `@tailwindcss/vite`. There is no `tailwind.config.js`; theme tokens live
  in `@theme inline` in `src/styles/index.css`.
- That file uses `@import 'tailwindcss' source(none)` and names its own sources. **Adding a
  directory of components outside `src` means adding an `@source` line for it**, or its classes
  are silently not emitted. Automatic detection is off on purpose: it scans every non-gitignored
  file, so English words in prose emit real utilities.
- Compose conditional classes with `cn()` from `@/lib/utils`. oxfmt sorts Tailwind classes,
  including inside `cn()` and `cva()`.
- Style with tokens (`bg-background`, `text-muted-foreground`), not raw colours, so both
  palettes stay live.
- Dark mode is a `.dark` class on `<html>`, set before first paint by an inline script in
  `index.html`. The contract is `localStorage['theme']` of `'light' | 'dark'`, absent meaning
  light whatever the OS prefers. `src/features/theme/` owns the validated raw-string storage,
  write-only toggle action, document class and `theme-color` synchronization. Use its public
  `ThemeToggle`; do not create another theme store or DOM effect.
- Notifications are `sonner`, mounted once as `<Toaster />` in `__root.tsx`. Never call `toast()`
  from a component: a failed mutation already reports itself through the `MutationCache` in
  `src/lib/runtime.tsx`, and a second toast for the same failure is the bug. The mount is
  hand-written rather than `bunx shadcn add sonner`, because that recipe pulls `next-themes` and
  dark mode here is a class; the palette comes from the `[data-sonner-toaster]` block in
  `src/styles/index.css`.
- **Never hand-roll a control `src/components/ui/` already provides.** `Button`, not `<button>`;
  `Input`, not `<input>`; the same for `Label`, `Checkbox`, `Separator` and the `Field` family.
  They carry the focus rings, disabled states and token colours, and a raw element drops all
  three without a word. If the primitive is missing, `bunx shadcn@latest add <name>`.
- `ui/no-raw-element` enforces this from the other side: structure is allowed and every other
  element is an error, so a control fails before its component exists and adding a primitive
  needs no config change. Layout, text, lists, `<form>`, `<fieldset>`, `<legend>`, `<output>`,
  media and SVG stay raw. Anything else is a control until `ALLOWED` in `lint/ui.ts` says
  otherwise, and the entry wants a reason next to it. `<iframe>`, `<embed>` and `<object>` are
  the exception that is not about components: nothing is coming to replace them, and the
  disable comment is there to make somebody say what is being embedded.
- `src/components/ui/` is shadcn CLI output. Add components with `bunx shadcn@latest add <name>`,
  and do not hand-edit them: a re-add overwrites the file. oxlint, oxfmt and coverage all skip
  that directory for exactly that reason, so check what the CLI installed and add anything new
  to `package.json` yourself if it only landed in `node_modules`.
  `src/components/` is for components shared across features; anything used by one feature
  belongs in that feature.

## Accessibility

`jsx-a11y` is on and tests query by role and name, so an accessibility regression fails the suite
rather than shipping.

- Reach for the semantic element first, through its component where one exists: `Button` over
  a clickable `<div>`, `Label` over a floating `<span>`, `<ul>` and `<output>` over neither.
- Every input needs a real `<label htmlFor>` and a matching `id`.
- Invalid fields get `aria-invalid` plus `aria-describedby` pointing at the message element.
- Error text gets `role="alert"`.
- Icon-only buttons need an `aria-label`.
- Give lists an accessible name (`aria-label="Todos"`) when the page could hold more
  than one.
- Every `Button` needs an explicit `type`. It renders a bare `<button>`, so inside a form an
  untyped one submits it.
