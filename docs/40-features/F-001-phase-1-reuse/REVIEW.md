# Review: Phase 1 Reuse

## Status

In progress. The T2 core and T3 safe-discovery checkpoints were reviewed on 2026-08-29. React
analysis, generated writes, CLI behavior, packaging, and the benchmark still require review.

## Findings

### Blockers

- None remain in the reviewed core and discovery checkpoints.

### Resolved during review

- Missing tools after skipped files, symlinks, malformed manifests, or scan limits now report
  `unknown` rather than unsupported `absent` certainty.
- File reads allocate only the configured byte limit plus one byte and enforce a 16 MiB hard cap.
- Directory traversal streams entries, caps per-directory fanout, bounds total visited files, and
  does not follow symlinks.
- `.lattice/cache` and `.lattice/reports` are excluded without blocking committed `.lattice`
  configuration.
- Repository paths reject control characters, traversal, absolute child paths, and escaping
  symlinks before evidence is built.
- An arbitrary `components.json` no longer proves shadcn presence; the marker must parse and match a
  supported shadcn shape.
- pnpm workspace list parsing is confined to the `packages` section and honors basic negated globs.
- Golden output moved outside its consumer fixture root to avoid self-referential inventory.

### Dependency and network review

- TypeScript 7.0.2 is the only runtime dependency added to analyzer and React adapter boundaries. It
  was already pinned by ADR-0006 and the lockfile gained no new resolution.
- Runtime source contains no network, telemetry, cloud, MCP, AI API, child-process, dynamic code
  evaluation, or consumer configuration execution path.
- This checkpoint has no production file-write behavior.

### Remaining risks

- `O_NOFOLLOW` hardens the final open on platforms that provide it. Real-path containment remains
  the cross-platform control. A concurrent replacement of an ancestor directory is a residual local
  filesystem race and needs platform-specific packed tests before release.
- Discovery supports a documented conservative workspace glob subset. Unsupported workspace syntax
  can reduce package recall and must produce broader diagnostics as TypeScript project resolution is
  added.
- Unreadable-path behavior is implemented but permission-specific CI coverage remains pending.
- Cache and report write safety is not implemented yet and receives a separate security review in
  F-001 T5.
