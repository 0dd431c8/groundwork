import { describe, expect, it } from 'vitest';
import { type Finding, lintWithProjectConfig } from './test/harness.ts';

/**
 * Rules that live in .oxlintrc.jsonc rather than in a plugin. A fixture outside the tsconfig
 * program also trips the type-aware rules, so each case keeps only the codes it came for.
 */
function only(findings: Finding[], rule: string): number[] {
  return findings.filter((finding) => finding.rule === rule).map((finding) => finding.line);
}

const FORBID = 'react(forbid-elements)';

describe('react/forbid-elements', () => {
  it('rejects every raw control the design system covers', async () => {
    const found = await lintWithProjectConfig(
      `export function Widget(): null {
         return (
           <div>
             <button type="button">go</button>
             <input />
             <textarea />
             <select />
           </div>
         );
       }`,
    );

    expect(only(found, FORBID)).toEqual([4, 5, 6, 7]);
    expect(found.find((finding) => finding.rule === FORBID)?.help).toContain('`Button`');
  });

  it('leaves structural elements alone, since no component stands behind them', async () => {
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

    expect(only(found, FORBID)).toEqual([]);
  });
});
