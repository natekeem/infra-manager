# NextAdmin baseline notes

This starter is structured and styled to fit the current NextAdmin v2 development model, but the execution environment used to create this package could not clone GitHub directly. Therefore this package does **not** claim to be a byte-for-byte fork of the upstream repository.

It intentionally mirrors the relevant current conventions:

- Next.js 16 App Router
- `src/app/(with-layouts)` route-group shell
- modular feature components
- compact neutral admin styling
- Recharts for charts
- design-system-style reusable primitives
- `AGENTS.md` to keep coding agents consistent

If an exact upstream NextAdmin checkout is later available internally, keep this application's domain/services/feature components and transplant them into the matching upstream shell rather than asking an agent to redesign them.
