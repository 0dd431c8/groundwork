/** Enforces the feature dependency direction documented in AGENTS.md. */

import { basename } from 'node:path';
import type { BaseContext, Node, Rule } from './types.ts';

type Context = BaseContext;

type Role = 'schema' | 'state' | 'transport' | 'query' | 'rendering' | 'index';

const RANK: Record<Role, number> = {
  schema: 0,
  state: 1,
  transport: 2,
  query: 3,
  rendering: 4,
  index: 5,
};

const PACKAGE_BANS: Partial<Record<Role, ReadonlySet<string>>> = {
  schema: new Set(['react', 'jotai', '@tanstack/react-query', '@tanstack/react-form']),
  state: new Set(['react', '@tanstack/react-query']),
  transport: new Set(['react', 'jotai', '@tanstack/react-query']),
};

function roleOfFile(filename: string): Role | undefined {
  const name = basename(filename);
  if (name.includes('.test.') || !filename.replaceAll('\\', '/').includes('/src/features/')) {
    return undefined;
  }
  if (name === 'index.ts') return 'index';
  if (name.endsWith('.schema.ts')) return 'schema';
  if (name.endsWith('.state.ts')) return 'state';
  if (name.endsWith('.api.ts')) return 'transport';
  if (name.endsWith('.queries.ts')) return 'query';
  if (name.endsWith('.tsx')) return 'rendering';
  return undefined;
}

function roleOfImport(specifier: string): Role {
  if (/\.schema(?:\.ts)?$/u.test(specifier)) return 'schema';
  if (/\.state(?:\.ts)?$/u.test(specifier)) return 'state';
  if (/\.api(?:\.ts)?$/u.test(specifier)) return 'transport';
  if (/\.queries(?:\.ts)?$/u.test(specifier)) return 'query';
  if (/\/index(?:\.ts)?$/u.test(specifier)) return 'index';
  return 'rendering';
}

function importedNames(node: Node): Set<string> {
  const names = new Set<string>();
  for (const specifier of node.specifiers ?? []) {
    const name = specifier.imported?.name;
    if (name !== undefined) names.add(name);
  }
  return names;
}

function reportPackage(context: Context, node: Node, role: Role, specifier: string): void {
  context.report({
    node,
    message:
      `The ${role} module cannot import ${specifier}. Keep the feature dependency direction ` +
      'schema <- state <- transport <- query <- rendering <- index.',
  });
}

function reportDirection(context: Context, node: Node, from: Role, to: Role): void {
  context.report({
    node,
    message:
      `The ${from} module cannot import a ${to} module. Dependencies point one way: ` +
      'schema <- state <- transport <- query <- rendering <- index.',
  });
}

function checkImport(context: Context, node: Node, role: Role): void {
  const value = node.source?.value;
  if (typeof value !== 'string') return;

  if (PACKAGE_BANS[role]?.has(value) === true) {
    reportPackage(context, node, role, value);
    return;
  }

  if (
    role === 'rendering' &&
    value === '@tanstack/react-query' &&
    [...importedNames(node)].some((name) => name === 'useMutation' || name === 'useQueryClient')
  ) {
    context.report({
      node,
      message:
        'Rendering modules use named mutation hooks from the query module; they do not own ' +
        'mutations or query invalidation.',
    });
    return;
  }

  if (!value.startsWith('.')) return;
  const target = roleOfImport(value);
  if (RANK[target] > RANK[role]) reportDirection(context, node, role, target);
}

const dependencyDirection: Rule<Context> = {
  meta: { docs: { description: 'Enforce the dependency direction inside feature modules' } },
  create(context) {
    const role = roleOfFile(context.filename);
    if (role === undefined) return {};

    return {
      ImportDeclaration: (node) => {
        checkImport(context, node, role);
      },
    };
  },
};

export default {
  meta: { name: 'feature' },
  rules: { 'dependency-direction': dependencyDirection },
};
