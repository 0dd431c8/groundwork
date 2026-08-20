import { describe, expect, it } from 'vitest';
import { lint } from './test/harness.ts';

const raw = { 'ui/no-raw-element': 'error' };

describe('no-raw-element', () => {
  it('names the component when src/components/ui already holds one', async () => {
    const found = await lint(
      `export function W() {
         return <button type="button">go</button>;
       }`,
      raw,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe('ui(no-raw-element)');
    expect(found[0]?.message).toContain('Use `Button` from @/components/ui/button');
  });

  it('names the command when the primitive is missing', async () => {
    const found = await lint(
      `export function W() {
         return <textarea />;
       }`,
      raw,
    );

    expect(found[0]?.message).toContain('bunx shadcn@latest add textarea');
  });

  it('sends the elements a shadcn primitive never covers somewhere else', async () => {
    const found = await lint(
      `export function W() {
         return <a href="/x">x</a>;
       }`,
      raw,
    );

    expect(found[0]?.message).toContain('@tanstack/react-router');
  });

  it('points every part of a table at the one primitive that owns it', async () => {
    const found = await lint(
      `export function W() {
         return <tbody><tr><td>1</td></tr></tbody>;
       }`,
      raw,
    );

    expect(found).toHaveLength(3);
    for (const finding of found) expect(finding.message).toContain('add table');
  });

  it('allows structure, since no component is coming for it', async () => {
    const found = await lint(
      `export function W() {
         return (
           <section>
             <form>
               <fieldset>
                 <legend>x</legend>
                 <output>1</output>
               </fieldset>
             </form>
             <ul>
               <li>
                 <svg viewBox="0 0 1 1">
                   <path d="M0 0" />
                 </svg>
               </li>
             </ul>
           </section>
         );
       }`,
      raw,
    );

    expect(found).toEqual([]);
  });

  it('reads element names only, not components, members or attributes', async () => {
    const found = await lint(
      `export function W({ form }: { form: { Field: () => null } }) {
         return (
           <Panel input={1} select={2}>
             <form.Field />
           </Panel>
         );
       }`,
      raw,
    );

    expect(found).toEqual([]);
  });

  it('takes additions from the allow option', async () => {
    const found = await lint(
      `export function W() {
         return <marquee />;
       }`,
      { 'ui/no-raw-element': ['error', { allow: ['marquee'] }] },
    );

    expect(found).toEqual([]);
  });
});
