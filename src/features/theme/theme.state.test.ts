import { createStore } from 'jotai';
import { RESET } from 'jotai/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { themeAtom, toggleThemeAtom } from './theme.state';

function themeMeta(): HTMLMetaElement {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#ffffff';
  meta.dataset['themeLight'] = '#ffffff';
  meta.dataset['themeDark'] = '#0c0a09';
  document.head.append(meta);
  return meta;
}

afterEach(() => {
  document.querySelector('meta[name="theme-color"]')?.remove();
  vi.restoreAllMocks();
});

describe('toggleThemeAtom', () => {
  it('persists raw values and synchronizes the document theme', () => {
    const meta = themeMeta();
    const store = createStore();
    store.set(themeAtom, 'light');

    store.set(toggleThemeAtom);

    expect(store.get(themeAtom)).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(meta.content).toBe('#0c0a09');

    store.set(toggleThemeAtom);

    expect(store.get(themeAtom)).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(meta.content).toBe('#ffffff');
  });

  it('still changes the session theme when persistence is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const store = createStore();
    store.set(themeAtom, 'light');

    store.set(toggleThemeAtom);

    expect(store.get(themeAtom)).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('resets persistence and the document to light', () => {
    const meta = themeMeta();
    const store = createStore();
    store.set(themeAtom, 'dark');

    store.set(themeAtom, RESET);

    expect(store.get(themeAtom)).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(meta.content).toBe('#ffffff');
  });
});
