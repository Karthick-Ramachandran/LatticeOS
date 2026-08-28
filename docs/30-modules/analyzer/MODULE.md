# Module: Analyzer

## Purpose

Safely turn an untrusted repository into a deterministic Reuse index by discovering projects,
orchestrating adapters, recording diagnostics, and managing generated state.

## Owns

- Repository root and path validation, exclusions, size bounds, workspace/project discovery,
  adapter orchestration, index assembly, cache reads/writes, and analysis diagnostics.

## Does Not Own

- Framework-specific AST interpretation, ranking semantics, CLI presentation, or accepted knowledge.

## Public Interfaces

- Implemented: `RepositoryRoot.open`, confined `readText`, bounded `listFiles`, default exclusions,
  `detectProject`, and `analyzeReactProject`.
- Planned in later F-001 slices: `analyzeProject`, `buildReuseIndex`, `readReuseIndex`, and
  `writeReuseIndex`.

## Boundaries

Analyzer depends on core and adapter interfaces. CLI is its primary caller. All consumer files are
untrusted data; reads and LatticeOS-owned writes must stay inside the validated root.

Discovery never follows symlinks. Explicit reads may resolve an in-root file symlink. An escaping
target is rejected. Generated `.lattice/cache` and `.lattice/reports` state is excluded while
committed `.lattice` configuration remains readable. Incomplete scans report missing tool markers as
unknown rather than absent.

`analyzeReactProject` is the sole analyzer bridge into the React adapter. It admits a bounded source
set through `RepositoryRoot`, assigns nearest workspace ownership, reads direct root tsconfig aliases
as data, and never loads `extends`. The bridge does not yet support package-specific tsconfig files
or assemble a complete Reuse index.
