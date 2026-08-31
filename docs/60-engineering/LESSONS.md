# Lessons

Durable, hard-won lessons for this repository, so agents and humans do not repeat the same mistakes.
Add a lesson when something broke in a non-obvious way, or when a tempting approach turned out to be
wrong. Keep each entry short: what happened, why, and what to do instead. Repository rules override
model preferences.

## Lessons

- Fumadocs generated server collections are imported from `.source/server`, not `.source`; keep docs
  typechecking in the gate so a version-specific generated API mismatch fails before deployment.
- Do not run `pnpm build` and `pnpm docs:check` concurrently because both invoke `next build` against
  the same `.next` lock; run those two repository gates sequentially.
- Keep golden snapshots outside the consumer fixture root they describe; an inventory golden inside
  that root includes itself and changes the inventory after it is written.
- TypeScript 7's package root no longer exposes the classic JavaScript Compiler API; tools that need
  `Program`, `SourceFile`, and `TypeChecker` must stay on the maintained TypeScript 6.x line until
  LatticeOS deliberately adopts TypeScript 7's curated IPC API.
- With `exactOptionalPropertyTypes`, omit an optional field when it has no value. Passing
  `property: undefined` breaks assignment to a contract where `property?: string` means an omitted
  string only.
- npm can still read workspace members that use `workspace:*` when the root declares workspaces; the
  packed-consumer test removes that field only in its temporary install copy and restores it before analysis.
- Synthetic paired records must clone nested control and treatment values. Shared in-memory fixtures
  can hide a mismatch that separate JSON records would expose.
- When preparing a treatment workspace, remove only generated cache paths. Removing `.lattice` as a
  whole can make the control and treatment inputs differ by deleting committed configuration.
- If a Next build is idle while holding `apps/docs/.next/lock` after a tooling interruption, stop that
  exact build before retrying. Do not start another docs build while the lock exists.
# 2026-08-29 — Node-backed adapter packages need the established local test boundary

When a placeholder adapter starts using Node APIs, copy the React/Tailwind adapter's `types: ["node"]`,
core prebuild hooks, and test compile configuration before adding tests. The root dependency alone does
not place Node declarations in a strict package's TypeScript program.
