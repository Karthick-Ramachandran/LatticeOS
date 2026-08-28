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
  `detectProject`, `analyzeReactProject`, `analyzeTailwindProject`, `analyzeProject`, and
  `buildReuseIndex`, `readReuseIndex`, and `writeReuseIndex`.

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

`analyzeTailwindProject` is the analyzer bridge into the Tailwind adapter. It admits Tailwind config,
CSS, and supported JavaScript or TypeScript sources only after project detection reports Tailwind as
present or unknown. It applies the same repository exclusions and per-file reads as other analyzer
work, plus bounded aggregate file, byte, and diagnostic limits. It never imports configuration or
constructs a complete Reuse index.

`analyzeProject` discovers once, passes that result to both bridges, and returns a validated sorted
`ReuseIndex` plus a truncation flag. `buildReuseIndex` is the pure assembly operation. It accepts
only normalized discovery and adapter results, rejects conflicting evidence IDs, and does not write
cache or report state.

`writeReuseIndex` serializes a valid index and atomically replaces only
`.lattice/cache/reuse-index.json`. `readReuseIndex` returns a valid cache hit, a missing state, or an
invalid state that a caller must rebuild. Dedicated `RepositoryRoot` methods own the target and
reject symlinked cache directories and final files. Report writes remain unimplemented.
