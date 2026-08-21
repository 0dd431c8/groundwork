---
name: configuration
description: Add or change an environment variable. Use when editing src/lib/env.ts or envSchema, adding a key to .env.example, choosing a zod type for a raw string value, setting a default, reading import.meta.env, or working out what needs to change at runtime rather than at build time.
---

# Configuration

`src/lib/env.ts` is the only module that reads `import.meta.env`; everything else imports the
parsed `env` object. A bad value throws at module load with the key named, so it fails the first
paint instead of becoming `undefined` three layers down.

- Adding a variable is one line in `envSchema` and one in `.env.example`. Both, always.
- Every variable needs a `.default()`. A fresh clone with no `.env` has to run, so validation
  catches a wrong value, not a missing one.
- Raw values are always strings: `z.stringbool()` for booleans, `z.coerce.number()` for numbers.
- `.default()` takes the **output** type, so `z.stringbool().default(false)`, not
  `.default('false')`. `.prefault()` is the one that takes the input type.
- `.env` is read at build time, so `dist/` is baked per environment. Anything that must change
  without a rebuild needs a runtime mechanism, such as a `/config.json` fetched at startup.
