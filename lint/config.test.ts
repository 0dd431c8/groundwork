import { describe, expect, it } from 'vitest';
import { type Finding, lintWithProjectConfig } from './test/harness.ts';

/**
 * That the shipped .oxlintrc.jsonc turns a rule on, which is the half a plugin's own tests
 * cannot cover: a rule nobody enables passes every case in lint/ui.test.ts and reports nothing
 * on the repo. A fixture outside the tsconfig program also trips the type-aware rules, so each
 * case keeps only the code it came for.
 */
function only(findings: Finding[], rule: string): number[] {
  return findings.filter((finding) => finding.rule === rule).map((finding) => finding.line);
}

const RAW = 'ui(no-raw-element)';

describe('ui/no-raw-element', () => {
  it('is on, and rejects a raw control', async () => {
    const found = await lintWithProjectConfig(
      `export function Widget(): null {
         return (
           <div>
             <button type="button">go</button>
             <input />
             <label htmlFor="x">name</label>
           </div>
         );
       }`,
    );

    expect(only(found, RAW)).toEqual([4, 5, 6]);
  });

  it('leaves the structure the repo already renders alone', async () => {
    const found = await lintWithProjectConfig(
      `export function Widget(): null {
         return (
           <form>
             <fieldset>
               <ul>
                 <li>one</li>
               </ul>
             </fieldset>
           </form>
         );
       }`,
    );

    expect(only(found, RAW)).toEqual([]);
  });
});
