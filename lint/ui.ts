/**
 * The design-system rule, loaded through oxlint's JS bridge as `ui`; see `jsPlugins` in
 * .oxlintrc.jsonc.
 *
 * react/forbid-elements does the same job from a list of banned elements, and a banned list is
 * the wrong direction: it is correct only until src/components/ui grows a component nobody
 * remembered to ban the element for. This rule allows structure and rejects everything else,
 * so a new primitive needs no config change and a raw control fails on the day it is written,
 * whether or not a component for it exists yet.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BaseContext, Node, Rule } from './types.ts';

type Options = { allow?: string[] } | undefined;

type Context = BaseContext & { options: readonly Options[] };

/**
 * Elements the design system will never own, because they carry no behaviour and no styling
 * decision: layout, text, lists, the parts of a form that are not controls, media, and SVG,
 * whose children are listed so that one hand-written illustration does not need twelve disable
 * comments. Everything absent from here is a control until someone decides otherwise.
 *
 * `iframe`, `embed` and `object` are absent on purpose rather than by oversight. No component
 * is coming for them either, but embedding third-party content should be a decision somebody
 * made, so reaching for one costs a disable comment saying what it loads and why.
 */
const ALLOWED = new Set([
  'div',
  'span',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'nav',
  'aside',
  'address',
  'hgroup',
  'search',
  'figure',
  'figcaption',

  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'small',
  'code',
  'pre',
  'samp',
  'kbd',
  'var',
  'blockquote',
  'q',
  'cite',
  'abbr',
  'dfn',
  'data',
  'time',
  'mark',
  'sub',
  'sup',
  'del',
  'ins',
  'br',
  'wbr',
  // Bidirectional text and ruby annotations: typography the browser owns outright.
  'bdi',
  'bdo',
  'ruby',
  'rp',
  'rt',

  'ul',
  'ol',
  'li',
  'menu',
  'dl',
  'dt',
  'dd',

  // A <form> is a submit boundary, a <fieldset> and its <legend> are the only way to name a
  // group of controls, and an <output> is a live region. None of them is a control itself.
  'form',
  'fieldset',
  'legend',
  'output',

  // The browser's own player chrome is not something a design system replaces; a component
  // that wraps one still renders one of these underneath.
  'img',
  'picture',
  'source',
  'audio',
  'video',
  'track',
  'canvas',
  'area',
  'map',
  'math',

  'svg',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'g',
  'defs',
  'use',
  'symbol',
  'title',
  'desc',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'stop',
  'filter',
  'text',
  'tspan',
]);

/**
 * Elements whose component is not named after them, or whose component shares a file with
 * several others. Only the wording of a message reads this, never the decision to report one,
 * so an entry going stale costs a component name rather than a missed finding.
 */
const OWNERS = new Map([
  ['hr', { file: 'separator', name: 'Separator' }],
  ['tr', { file: 'table', name: 'TableRow' }],
  ['td', { file: 'table', name: 'TableCell' }],
  ['th', { file: 'table', name: 'TableHead' }],
  ['thead', { file: 'table', name: 'TableHeader' }],
  ['tbody', { file: 'table', name: 'TableBody' }],
  ['tfoot', { file: 'table', name: 'TableFooter' }],
  ['caption', { file: 'table', name: 'TableCaption' }],
]);

/** The ones no design system supplies, because something else already owns them. */
const ELSEWHERE = new Map([
  ['a', '`Link` from @tanstack/react-router, which keeps navigation client-side'],
]);

/**
 * What src/components/ui holds, read once, from this file's own location rather than the
 * working directory so that a lint run started anywhere resolves it. Only the wording of the
 * message depends on this: a directory that cannot be read costs a component name, never a
 * missed finding.
 */
function readPrimitives(): Set<string> {
  try {
    const files = readdirSync(join(import.meta.dirname, '..', 'src', 'components', 'ui'));
    return new Set(files.filter((file) => file.endsWith('.tsx')).map((file) => file.slice(0, -4)));
  } catch {
    return new Set();
  }
}

const PRIMITIVES = readPrimitives();

function advise(tag: string): string {
  const elsewhere = ELSEWHERE.get(tag);
  if (elsewhere !== undefined) return `Use ${elsewhere}.`;

  const owner = OWNERS.get(tag) ?? {
    file: tag,
    name: `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`,
  };
  if (PRIMITIVES.has(owner.file)) {
    return `Use \`${owner.name}\` from @/components/ui/${owner.file}.`;
  }

  return (
    'Nothing in src/components/ui renders one yet: add the primitive with ' +
    `\`bunx shadcn@latest add ${owner.file}\`, or if it is structure the design system will ` +
    'never own, add it to ALLOWED in lint/ui.ts with a reason.'
  );
}

const noRawElement: Rule<Context> = {
  meta: {
    docs: { description: 'Disallow raw HTML controls in favour of the design system' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const allowed = new Set([...ALLOWED, ...(context.options[0]?.allow ?? [])]);

    return {
      // The element's own name only. An attribute's identifier has a JSXAttribute parent, a
      // closing tag a JSXClosingElement, and `<form.Field>` a JSXMemberExpression, so all
      // three arrive here already excluded.
      JSXIdentifier: (node: Node) => {
        if (node.parent?.type !== 'JSXOpeningElement') return;

        const tag = node.name;
        // A capital says it is a component, which is the whole point of the rule.
        if (tag === undefined || !/^[a-z]/u.test(tag) || allowed.has(tag)) return;

        context.report({ message: `<${tag}> is a raw element. ${advise(tag)}`, node });
      },
    };
  },
};

export default {
  meta: { name: 'ui' },
  rules: { 'no-raw-element': noRawElement },
};
