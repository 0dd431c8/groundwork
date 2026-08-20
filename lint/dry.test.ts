import { describe, expect, it } from 'vitest';
import { lint } from './test/harness.ts';

const identical = { 'dry/no-identical-functions': 'error' };

// Forty-odd tokens, so every case here clears the thirty-token floor on its own.
const body = `const rounded = Math.round(value * 100) / 100;
     const sign = rounded < 0 ? '-' : '';
     return sign + '$' + Math.abs(rounded).toFixed(2);`;

describe('no-identical-functions', () => {
  it('reports the second of two identical declarations', async () => {
    const found = await lint(
      `export function priceLabel(value: number) {
         ${body}
       }
       export function costLabel(value: number) {
         ${body}
       }`,
      identical,
      'case.ts',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe('dry(no-identical-functions)');
    expect(found[0]?.message).toContain('identical to the one on line 1');
    expect(found[0]?.line).toBe(6);
  });

  it('reports an arrow body copied from a declaration', async () => {
    const found = await lint(
      `export function priceLabel(value: number) {
         ${body}
       }
       export const costLabel = (value: number) => {
         ${body}
       };`,
      identical,
      'case.ts',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.line).toBe(6);
  });

  it('ignores a body under the token floor', async () => {
    const found = await lint(
      `export function open(id: string) {
         setOpen(id);
         return null;
       }
       export function reopen(id: string) {
         setOpen(id);
         return null;
       }`,
      identical,
      'case.ts',
    );

    expect(found).toEqual([]);
  });

  it('ignores two bodies that differ only in a name, because that is the refactor', async () => {
    const found = await lint(
      `export function priceLabel(value: number) {
         ${body}
       }
       export function costLabel(amount: number) {
         ${body.replaceAll('value', 'amount')}
       }`,
      identical,
      'case.ts',
    );

    expect(found).toEqual([]);
  });

  it('takes the floor from minTokens', async () => {
    const found = await lint(
      `export function open(id: string) {
         setOpen(id);
         return null;
       }
       export function reopen(id: string) {
         setOpen(id);
         return null;
       }`,
      { 'dry/no-identical-functions': ['error', { minTokens: 5 }] },
      'case.ts',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.line).toBe(5);
  });
});
