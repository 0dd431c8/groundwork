import { describe, expect, it } from 'vitest';
import { oppositeTheme, themeSchema } from './theme.schema';

describe('themeSchema', () => {
  it.each(['light', 'dark'] as const)('accepts %s', (theme) => {
    expect(themeSchema.parse(theme)).toBe(theme);
  });

  it('rejects any value outside the persisted theme contract', () => {
    expect(themeSchema.safeParse('system').success).toBe(false);
  });
});

describe('oppositeTheme', () => {
  it('switches in both directions', () => {
    expect(oppositeTheme('light')).toBe('dark');
    expect(oppositeTheme('dark')).toBe('light');
  });
});
