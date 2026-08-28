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
- Todo: Extend TypeScript project support beyond direct root compiler options only when fixtures and
  a security review prove the additional configuration boundary.
- Todo: Implement deterministic atomic index lifecycle.
