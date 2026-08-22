---
name: configuration
description: Add or change build-time environment configuration through src/lib/env.ts and .env.example, including zod parsing, defaults, and deciding when a value needs runtime configuration.
---

# Configuration

Decide first whether the value may be baked into a build. Vite replaces environment values at
build time, so anything that must change after deployment needs a runtime mechanism such as a
`/config.json` fetched at startup.

- `src/lib/env.ts` is the only module that reads custom `VITE_*` values. Everything else imports
  the parsed `env` object. Vite's built-in compile-time constants, such as `import.meta.env.DEV`,
  may stay at the branch they eliminate.
- Add every custom variable to `envSchema` and `.env.example`. Both, always.
- Every variable needs a `.default()`. A fresh clone with no `.env` has to run, so validation
  catches a wrong value, not a missing one.
- Raw values are always strings: `z.stringbool()` for booleans, `z.coerce.number()` for numbers.
- `.default()` takes the **output** type, so `z.stringbool().default(false)`, not
  `.default('false')`. `.prefault()` is the one that takes the input type.
- Consume the validated value through `env`; do not read the custom key from `import.meta.env` at
  its call site.
- Test the missing/default, valid, and invalid cases. A bad value must throw at module load with
  the key named instead of becoming `undefined` downstream.
