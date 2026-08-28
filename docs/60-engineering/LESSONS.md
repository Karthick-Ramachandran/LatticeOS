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
