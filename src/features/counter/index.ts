// A feature's public surface. Everything else in this folder is internal, which
// `.oxlintrc.jsonc` enforces by restricting `@/features/*/*`.
//
// Export the few things the outside actually needs, never `export *`. The bundling
// objection to barrels is about re-exporting a whole folder; a named list of one or
// two entries costs nothing and keeps a feature free to rearrange its internals.
export { CounterPanel } from './counter-panel';
