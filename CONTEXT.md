# Domain context

## App Runtime

The App Runtime is the construction and provider assembly for the query client, router, and Jotai
store. Browser startup and tests are its two adapters. Tests use the production mutation-error
behavior through a test reporter adapter rather than disabling it.

## Feature Layer Policy

The Feature Layer Policy classifies production modules inside a feature and enforces the documented
dependency direction between schema, state, transport, query, rendering, and index modules. Test
files are outside this classification.

## Build Output

Build Output is the ordered processing applied after Vite emits files: classify output, rewrite
images, precompress final bytes, aggregate sizes, and report them. Vite is its adapter and the
ordered pipeline is one deep module.
