# Module Tasks: Analyzer

## Active Work

- F-001 T3: repository safety, discovery, TypeScript projects, workspaces, aliases, and orchestration.

## Tasks

- Done: Scaffold the analyzer package with inward core and adapter dependencies.
- Done: Implement root validation, confined reads, default exclusions, symlink handling, and bounds.
- Done: Implement static project, workspace, package, and frontend tool discovery with a named golden.
- Done: Implement bounded React source selection, nearest workspace ownership, direct root tsconfig
  alias parsing, and analyzer-to-adapter orchestration. The bridge has a named golden, aggregate
  source limits, and a no-execution tsconfig test.
- Done: Implement bounded Tailwind config, CSS, and source selection through `RepositoryRoot`. The
  bridge has a named golden, aggregate source limits, and a no-execution configuration test.
- Done: Assemble one deterministic, validated in-memory Reuse index from a shared discovery result
  and the React and Tailwind bridges. A named golden covers exact evidence links and partial indexes.
- Done: Read and atomically replace the single generated Reuse index cache path. Missing, malformed,
  oversized, and incompatible state rebuilds rather than becoming evidence. Symlink controls and
  application-source preservation have focused tests.
- Done: Inspect and create the fixed committed `.lattice/config.json` floor for CLI initialization.
  The normal creation path skips existing content; only an explicit force may replace it. Tests cover
  missing, existing, forced, and symlinked config paths without external writes.
- Done: Admit bounded shadcn configuration through `RepositoryRoot`, map supported static UI aliases
  to existing React components, and merge corroborating registry evidence into the Reuse index. The
  bridge has config-byte and file limits plus direct and index goldens.
- Todo: Extend TypeScript project support beyond direct root compiler options only when fixtures and
  a security review prove the additional configuration boundary.
