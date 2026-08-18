import { describe, expect, it } from 'vitest';
import { lint } from './test/harness.ts';

const inRender = { 'jotai/no-atom-in-render': 'error' };
const narrowHook = { 'jotai/prefer-narrow-hook': 'error' };
const suffix = { 'jotai/atom-suffix': 'error' };

describe('no-atom-in-render', () => {
  it('reports an atom created in a component', async () => {
    const found = await lint(
      `import { atom } from 'jotai';
       export function Item() {
         const itemAtom = atom(0);
         return itemAtom;
       }`,
      inRender,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe('jotai(no-atom-in-render)');
    expect(found[0]?.message).toContain('every render of Item');
    expect(found[0]?.line).toBe(3);
  });

  it('reports an atom created in a hook', async () => {
    const found = await lint(
      `import { atomWithStorage } from 'jotai/utils';
       export function useThing() {
         return atomWithStorage('k', 0);
       }`,
      inRender,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('every render of useThing');
  });

  it('allows a memoized atom, module scope, and a plain factory function', async () => {
    const found = await lint(
      `import { atom } from 'jotai';
       import { useMemo } from 'react';
       export const countAtom = atom(0);
       export function makeAtom(value: number) {
         return atom(value);
       }
       export function Item({ id }: { id: number }) {
         return useMemo(() => atom(id), [id]);
       }`,
      inRender,
    );

    expect(found).toEqual([]);
  });

  it('ignores an `atom` that did not come from jotai', async () => {
    const found = await lint(
      `function atom(value: number) {
         return value;
       }
       export function Item() {
         return atom(0);
       }`,
      inRender,
    );

    expect(found).toEqual([]);
  });

  it('follows a renamed import', async () => {
    const found = await lint(
      `import { atom as makeAtom } from 'jotai';
       export function Item() {
         return makeAtom(0);
       }`,
      inRender,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('`atom()` runs on every render');
  });
});

describe('prefer-narrow-hook', () => {
  it('reports a read-only useAtom', async () => {
    const found = await lint(
      `import { useAtom } from 'jotai';
       import { countAtom } from './atoms.ts';
       export function Read() {
         const [count] = useAtom(countAtom);
         return count;
       }`,
      narrowHook,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe('jotai(prefer-narrow-hook)');
    expect(found[0]?.message).toContain('only reads, so use `useAtomValue`');
  });

  it('reports a write-only useAtom', async () => {
    const found = await lint(
      `import { useAtom } from 'jotai';
       import { countAtom } from './atoms.ts';
       export function Write() {
         const [, setCount] = useAtom(countAtom);
         return setCount;
       }`,
      narrowHook,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('only writes, so use `useSetAtom`');
  });

  it('allows useAtom when both halves are used', async () => {
    const found = await lint(
      `import { useAtom, useAtomValue, useSetAtom } from 'jotai';
       import { countAtom } from './atoms.ts';
       export function Both() {
         const [count, setCount] = useAtom(countAtom);
         const value = useAtomValue(countAtom);
         const set = useSetAtom(countAtom);
         return [count, setCount, value, set];
       }`,
      narrowHook,
    );

    expect(found).toEqual([]);
  });
});

describe('atom-suffix', () => {
  it('reports a module-scope atom without the suffix', async () => {
    const found = await lint(
      `import { atom } from 'jotai';
       export const total = atom(0);`,
      suffix,
      'atoms.ts',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe('jotai(atom-suffix)');
    expect(found[0]?.message).toContain('name it `totalAtom`');
  });

  it('allows a suffixed atom and leaves atomFamily alone', async () => {
    const found = await lint(
      `import { atom } from 'jotai';
       import { atomFamily } from 'jotai/utils';
       export const totalAtom = atom(0);
       export const itemFamily = atomFamily((id: number) => atom(id));`,
      suffix,
      'atoms.ts',
    );

    expect(found).toEqual([]);
  });

  it('leaves a local atom to no-atom-in-render', async () => {
    const found = await lint(
      `import { atom } from 'jotai';
       export function makeAtom(value: number) {
         const inner = atom(value);
         return inner;
       }`,
      suffix,
      'atoms.ts',
    );

    expect(found).toEqual([]);
  });

  it('honours a configured suffix list', async () => {
    const found = await lint(
      `import { atom } from 'jotai';
       export const totalState = atom(0);`,
      { 'jotai/atom-suffix': ['error', { suffixes: ['State'] }] },
      'atoms.ts',
    );

    expect(found).toEqual([]);
  });
});
