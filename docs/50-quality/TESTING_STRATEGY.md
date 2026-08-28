# Testing Strategy

Tests derive from feature acceptance criteria, untrusted-repository risk, adapter boundaries, and
support claims.

- Unit tests cover normalized entities, stable IDs, deterministic ordering/ranking, context budgets,
  static extraction, and path validation.
- Golden fixture tests cover React/Next.js patterns, TypeScript props, imports/usages, path aliases,
  workspaces, Tailwind v3/v4 evidence, shadcn, Storybook, and malformed/absent optional inputs.
- CLI integration tests cover human and JSON contracts, exit behavior, safe initialization, cache
  writes, and running from outside the consumer root.
- Security tests cover traversal, symlink escape, secret/generated exclusions, non-execution of
  repository configuration, file-size limits, and overwrite rules.
- Packaging tests run the packed CLI in a clean realistic consumer fixture.
- Benchmark tests compare control and LatticeOS-assisted tasks and record canonical reuse, duplicate
  UI, raw Tailwind added, context size, and correction turns.

Support is claimed only for behavior represented by fixtures and a passing packed-consumer test.
