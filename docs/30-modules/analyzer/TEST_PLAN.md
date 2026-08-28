# Module Test Plan: Analyzer

## Unit Tests

- Root resolution, path normalization, exclusions, bounds, stale/corrupt cache, atomic writes, project
  detection, workspace ownership, and diagnostics.

## Integration Tests

- Golden consumer fixtures combine core and every adapter; repeated runs are byte-stable.

## Security Tests

- Traversal, absolute paths, escaping symlinks, secret/generated paths, config non-execution,
  oversized files, malformed input, and overwrite rules.
