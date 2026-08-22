/**
 * The shapes oxlint's JS bridge hands a local plugin, shared by jotai.ts and dry.ts. Names and
 * fields follow ESTree, which is what the bridge speaks. Every field is optional so that
 * reading one never needs a cast, and `Node` carries the union of what the plugins here touch
 * rather than the whole grammar.
 */

export type Node = {
  type: string;
  parent?: Node | null | undefined;
  body?: Node | undefined;
  callee?: Node | undefined;
  elements?: (Node | null)[] | undefined;
  id?: Node | null | undefined;
  init?: Node | null | undefined;
  imported?: Node | undefined;
  local?: Node | undefined;
  name?: string | undefined;
  source?: Node | undefined;
  specifiers?: Node[] | undefined;
  value?: unknown;
};

export type Token = { value: string };

export type Loc = { start: { line: number }; end: { line: number } };

export type SourceCode = {
  getLoc: (node: Node) => Loc;
  getTokens: (node: Node) => Token[];
};

/** Everything a rule gets except its own options, which each plugin types for itself. */
export type BaseContext = {
  filename: string;
  sourceCode: SourceCode;
  report: (descriptor: { message: string; node: Node }) => void;
};

export type Rule<Context> = {
  // `schema` is not decoration: oxlint rejects options outright for a rule without one.
  meta?: { docs?: { description: string }; schema?: unknown[] };
  create: (context: Context) => Record<string, (node: Node) => void>;
};
