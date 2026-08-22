import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { DEFAULT_THEME, oppositeTheme, type Theme, themeSchema } from './theme.schema';

const STORAGE_KEY = 'theme';

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const color = theme === 'dark' ? meta?.dataset['themeDark'] : meta?.dataset['themeLight'];
  if (meta !== null && color !== undefined) meta.content = color;
}

function readTheme(key: string, initialValue: Theme): Theme {
  if (typeof window === 'undefined') return initialValue;
  try {
    const parsed = themeSchema.safeParse(window.localStorage.getItem(key));
    return parsed.success ? parsed.data : initialValue;
  } catch {
    return initialValue;
  }
}

function writeTheme(key: string, theme: Theme): void {
  applyTheme(theme);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, theme);
  } catch {
    // The in-memory atom and document theme still work when storage is unavailable.
  }
}

function removeTheme(key: string): void {
  applyTheme(DEFAULT_THEME);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Removing persistence is best-effort for the same reason as writing it.
  }
}

function subscribeToTheme(
  key: string,
  callback: (theme: Theme) => void,
  initialValue: Theme,
): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined;
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== key) return;
    const parsed = themeSchema.safeParse(event.newValue);
    const theme = parsed.success ? parsed.data : initialValue;
    applyTheme(theme);
    callback(theme);
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

const themeStorage = {
  getItem: readTheme,
  setItem: writeTheme,
  removeItem: removeTheme,
  subscribe: subscribeToTheme,
};

export const themeAtom = atomWithStorage<Theme>(STORAGE_KEY, DEFAULT_THEME, themeStorage, {
  getOnInit: true,
});

export const toggleThemeAtom = atom(null, (get, set) => {
  set(themeAtom, oppositeTheme(get(themeAtom)));
});
