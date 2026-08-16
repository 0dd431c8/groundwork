import { describe, expect, it } from 'vitest';
import { clamp, MAX_COUNT, MIN_COUNT } from '@/lib/counter';

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
