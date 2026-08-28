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
