import { describe, expect, it } from 'vitest';
import { lint } from './test/harness.ts';

const dependency = { 'feature/dependency-direction': 'error' };
const feature = (name: string): string => `src/features/example/${name}`;

describe('feature dependency direction', () => {
  it.each([
    ['example.schema.ts', "import './example.state';", 'schema', 'state'],
    ['example.state.ts', "import './example.api';", 'state', 'transport'],
    ['example.api.ts', "import './example.queries';", 'transport', 'query'],
    ['example.queries.ts', "import './example-panel';", 'query', 'rendering'],
  ])('rejects an upward import from %s', async (name, source, from, to) => {
    const found = await lint(source, dependency, feature(name));

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain(`The ${from} module cannot import a ${to} module`);
  });

  it.each([
    ['example.state.ts', "import './example.schema';"],
    ['example.api.ts', "import './example.state';"],
    ['example.queries.ts', "import './example.api';"],
    ['example-panel.tsx', "import './example.queries';"],
    ['index.ts', "import './example-panel';"],
  ])('allows a downward import from %s', async (name, source) => {
    expect(await lint(source, dependency, feature(name))).toEqual([]);
  });

  it.each([
    ['example.schema.ts', "import 'react';", 'schema'],
    ['example.state.ts', "import '@tanstack/react-query';", 'state'],
    ['example.api.ts', "import 'jotai';", 'transport'],
  ])('rejects a framework import from %s', async (name, source, role) => {
    const found = await lint(source, dependency, feature(name));

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain(`The ${role} module cannot import`);
  });

  it('keeps mutations behind the query seam', async () => {
    const found = await lint(
      "import { useMutation, useQuery } from '@tanstack/react-query';\nexport { useMutation, useQuery };",
      dependency,
      feature('example-panel.tsx'),
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('named mutation hooks');
  });

  it('ignores test files', async () => {
    const found = await lint(
      "import './example-panel';",
      dependency,
      feature('example.schema.test.ts'),
    );

    expect(found).toEqual([]);
  });
});
