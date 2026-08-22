import { z } from 'zod';

export const DEFAULT_THEME = 'light';

export const themeSchema = z.enum(['light', 'dark']);

export type Theme = z.infer<typeof themeSchema>;

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light';
}
