# Module Test Plan: Analyzer

## Unit Tests

- Root resolution, path normalization, exclusions, bounds, stale/corrupt cache, atomic writes, project
  detection, workspace ownership, direct root tsconfig aliases, React and Tailwind aggregate source
  limits, and diagnostics.

## Integration Tests

- React, Tailwind, shadcn, and Storybook bridges plus their direct-adapter goldens cover the named
  consumer fixture. Full in-memory index assembly also has a named consumer golden.

## Security Tests

- Traversal, absolute paths, escaping symlinks, secret/generated paths, config non-execution,
  oversized files, aggregate source limits, malformed input, and overwrite rules. Tailwind bridge
  tests also prove that a configuration file which throws when imported is parsed only as text.
- Full-index tests prove that conflicting evidence IDs are rejected and a truncated adapter result
  still produces a valid partial index with a diagnostic.
- Cache tests prove regular-directory and final-file checks, missing, valid, malformed, incompatible,
  atomic replacement, source preservation, and symlink refusal at the only generated cache target.
- Config tests prove the committed fixed path is inspectable without creating directories, normal
  creation is exclusive, existing content skips, force replaces it, and a symlinked config cannot
  alter an outside file.
- shadcn bridge tests prove a valid static alias attaches registry evidence, absent or malformed config
  leaves a valid React-backed index, config byte limits leave React components usable, and the shared
  Reuse index keeps evidence links deterministic.
- Storybook bridge tests prove the fixed generated-manifest read, normal discovery exclusion, resolved
  import mapping, absent and malformed optional evidence, byte limits, no content leaks, and a valid
  combined index.
