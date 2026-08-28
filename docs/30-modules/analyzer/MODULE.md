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

- `RepositoryRoot`, `detectProject`, `analyzeProject`, `buildReuseIndex`, `readReuseIndex`, and
  `writeReuseIndex`.

## Boundaries

Analyzer depends on core and adapter interfaces. CLI is its primary caller. All consumer files are
untrusted data; reads and LatticeOS-owned writes must stay inside the validated root.
