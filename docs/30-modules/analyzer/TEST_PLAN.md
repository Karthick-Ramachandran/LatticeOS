# Module Test Plan: Analyzer

## Unit Tests

- Root resolution, path normalization, exclusions, bounds, stale/corrupt cache, atomic writes, project
  detection, workspace ownership, direct root tsconfig aliases, React and Tailwind aggregate source
  limits, and diagnostics.

## Integration Tests

- React and Tailwind bridges plus their direct-adapter goldens cover the named consumer fixture. Full
  in-memory index assembly also has a named consumer golden. Optional-adapter integration remains
  later Phase 1 work.

## Security Tests

- Traversal, absolute paths, escaping symlinks, secret/generated paths, config non-execution,
  oversized files, aggregate source limits, malformed input, and overwrite rules. Tailwind bridge
  tests also prove that a configuration file which throws when imported is parsed only as text.
- Full-index tests prove that conflicting evidence IDs are rejected and a truncated adapter result
  still produces a valid partial index with a diagnostic.
