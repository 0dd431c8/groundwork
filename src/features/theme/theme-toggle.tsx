import { useAtomValue, useSetAtom } from 'jotai';
import { MoonIcon, SunIcon } from 'lucide-react';
import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { themeAtom, toggleThemeAtom } from './theme.state';

export function ThemeToggle(): JSX.Element {
  const theme = useAtomValue(themeAtom);
  const toggleTheme = useSetAtom(toggleThemeAtom);
  const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {theme === 'light' ? <MoonIcon aria-hidden="true" /> : <SunIcon aria-hidden="true" />}
    </Button>
  );
}
