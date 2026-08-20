/**
 * The duplication rule, loaded through oxlint's JS bridge as `dry`; see `jsPlugins` in
 * .oxlintrc.jsonc. eslint-plugin-sonarjs is the obvious source for it and cannot load here:
 * it pulls in ts-api-utils, which reads `ts.TypeFlags` at module scope, and TypeScript 7 has
 * no such export. The bridge hands over no type information either, so this compares tokens
 * rather than anything semantic.
 */

import type { BaseContext, Node, Rule, Token } from './types.ts';

type Options = { minTokens?: number } | undefined;

type Context = BaseContext & { options: readonly Options[] };

/**
 * Small enough to sit under this and a match is a coincidence rather than a copy: a body of
 * `return null;` comes out at four tokens and `setOpen(false);` at seven. The unit is tokens
 * and not lines so that one `return` of thirty lines of JSX counts, which is the duplicate a
 * statement count waves through. jscpd draws the same line at 50, because it matches any span
 * and not only a function body, and below that it starts reporting the shape of an interface
 * two files both implement.
 */
const DEFAULT_MIN_TOKENS = 30;

/**
 * Token values rather than source text, so a copy differing only in whitespace or comments
 * still matches. Names are part of the signature: two bodies that differ in what they operate
 * on are two implementations, and merging them is the refactor, not the finding.
 */
function signature(tokens: Token[]): string {
  return tokens.map((token) => token.value).join(' ');
}

const noIdenticalFunctions: Rule<Context> = {
  meta: {
    docs: { description: 'Disallow two functions in one file with identical bodies' },
    schema: [
      {
        type: 'object',
        properties: { minTokens: { type: 'number' } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const minTokens = context.options[0]?.minTokens ?? DEFAULT_MIN_TOKENS;
    const firstSeenAt = new Map<string, number>();

    function check(node: Node): void {
      const body = node.body;
      if (body === undefined) return;

      const tokens = context.sourceCode.getTokens(body);
      if (tokens.length < minTokens) return;

      const key = signature(tokens);
      const first = firstSeenAt.get(key);
      if (first === undefined) {
        firstSeenAt.set(key, context.sourceCode.getLoc(node).start.line);
        return;
      }

      context.report({
        message:
          `This body is identical to the one on line ${first}. Two copies of one implementation ` +
          'drift, and then neither is the answer: keep one and pass what differs as an argument.',
        node,
      });
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};

export default {
  meta: { name: 'dry' },
  rules: { 'no-identical-functions': noIdenticalFunctions },
};
