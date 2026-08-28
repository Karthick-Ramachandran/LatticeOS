# Module Test Plan: Analyzer

## Unit Tests

- Root resolution, path normalization, exclusions, bounds, stale/corrupt cache, atomic writes, project
  detection, workspace ownership, direct root tsconfig aliases, aggregate source limits, and
  diagnostics.

## Integration Tests

- React bridge and direct-adapter goldens cover the named consumer fixture. Full core-index and every
  adapter integration remains later Phase 1 work.

## Security Tests

- Traversal, absolute paths, escaping symlinks, secret/generated paths, config non-execution,
  oversized files, aggregate source limits, malformed input, and overwrite rules.
