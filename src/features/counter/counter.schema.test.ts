import { describe, expect, it } from 'vitest';
import {
  clamp,
  MAX_COUNT,
  MIN_COUNT,
  saveCountFormSchema,
  saveCountSchema,
} from './counter.schema';

describe('clamp', () => {
  it('passes through a value inside the range', () => {
    expect(clamp(3, 0, 5)).toBe(3);
  });

  it('raises a value below the minimum', () => {
    expect(clamp(-4, 0, 5)).toBe(0);
  });

  it('lowers a value above the maximum', () => {
    expect(clamp(9, 0, 5)).toBe(5);
  });

  it('treats the bounds as inclusive', () => {
    expect(clamp(MIN_COUNT, MIN_COUNT, MAX_COUNT)).toBe(MIN_COUNT);
    expect(clamp(MAX_COUNT, MIN_COUNT, MAX_COUNT)).toBe(MAX_COUNT);
  });
});

describe('saveCountSchema', () => {
  it('accepts a count inside the bounds with a label', () => {
    expect(saveCountSchema.parse({ value: 3, label: 'Morning' })).toEqual({
      value: 3,
      label: 'Morning',
    });
  });

  it('trims the label before checking it', () => {
    expect(saveCountSchema.parse({ value: 3, label: '  Morning  ' }).label).toBe('Morning');
  });

  it('rejects a label that is only whitespace', () => {
    const result = saveCountSchema.safeParse({ value: 3, label: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Give the count a name.');
  });

  it('rejects a value outside the bounds', () => {
    expect(saveCountSchema.safeParse({ value: MAX_COUNT + 1, label: 'Too big' }).success).toBe(
      false,
    );
    expect(saveCountSchema.safeParse({ value: MIN_COUNT - 1, label: 'Too small' }).success).toBe(
      false,
    );
  });

  it('rejects a fractional value', () => {
    expect(saveCountSchema.safeParse({ value: 1.5, label: 'Half' }).success).toBe(false);
  });
});

describe('saveCountFormSchema', () => {
  it('collects the label only, since the value comes from the atom', () => {
    expect(saveCountFormSchema.parse({ label: 'Morning' })).toEqual({ label: 'Morning' });
  });

  it('rejects an empty label', () => {
    expect(saveCountFormSchema.safeParse({ label: '' }).success).toBe(false);
  });
});
