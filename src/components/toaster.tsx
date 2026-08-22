import type { JSX } from 'react';
import { Toaster as Sonner } from 'sonner';

/**
 * The app's one notification surface. Mounted once in `__root.tsx`; everything else reaches it
 * through `notifyError` in `src/lib/notify.ts`.
 *
 * Written by hand rather than added with `bunx shadcn add sonner`: that recipe pulls `next-themes`
 * to pick a `theme` prop, and dark mode here is a `.dark` class set before first paint. The palette
 * comes from the `[data-sonner-toaster]` block in `src/styles/index.css` instead, so the toast
 * follows the same tokens as everything else and needs no theme prop at all.
 */
export function Toaster(): JSX.Element {
  return <Sonner position="bottom-right" />;
}
