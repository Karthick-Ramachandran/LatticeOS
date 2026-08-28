# Test Plan: Phase 1 Reuse

## Unit Tests

- Core entity validation, stable ID construction/parsing, sorting, schema versions, query scoring,
  ambiguity handling, and context item/character budgets.
- Root/path validation, relative POSIX normalization, exclusions, file-size bounds, atomic writes,
  and diagnostics.
- React component/export/prop/import/JSX/usage extraction and unsupported-syntax diagnostics.
- Tailwind token/class extraction and normalization; shadcn/Storybook manifest mapping.

## Integration Tests

- Golden Next.js App Router and workspace fixtures covering AC-03 through AC-09.
- CLI human and JSON workflows for initialization, detection, search, inspect, and context.
- Cache regeneration, stale/corrupt cache recovery, invocation outside the consumer root, optional
  adapter absence, and malformed input.
- Packed artifact installed into a clean consumer fixture; `lattice --help` and analysis run there.
- Controlled benchmark records inputs, control/treatment context, output code, appropriate reuse,
  inappropriate reuse, duplicate UI, raw Tailwind, and correction turns.

## Security Tests

- Traversal and absolute-path rejection.
- Symlinks inside the root and symlinks escaping the root.
- `.env`, secret, VCS, dependency, build, coverage, cache, and report exclusions.
- Proof that JavaScript/TypeScript config is parsed as data and never imported/evaluated.
- Oversized/malformed file containment, output/source redaction, init dry-run, skip-existing,
  explicit force, symlink refusal, and interrupted atomic-write behavior.

## Determinism And Performance Tests

- Repeat analysis and compare byte-for-byte JSON/goldens.
- Run fixtures in different absolute root directories and verify identical repository-relative data.
- Track analysis time, files visited, peak memory where practical, index size, and context size.

## Acceptance Mapping

- AC-01: packed-consumer integration.
- AC-02/AC-14: file-write and security suite.
- AC-03–AC-09: analyzer/adapter golden fixtures.
- AC-10–AC-13: CLI and JSON integration/goldens.
- AC-15: benchmark harness/report.
- AC-16: full repository gates and Persist doctor.
