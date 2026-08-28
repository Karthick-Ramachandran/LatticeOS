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
  `detectProject`, `analyzeReactProject`, `analyzeTailwindProject`,
  `analyzeShadcnProjectFromDiscovery`, `analyzeStorybookProjectFromDiscovery`, `analyzeProject`,
  `buildReuseIndex`, `readReuseIndex`, `writeReuseIndex`, `inspectLatticeConfig`, and
  `writeInitialLatticeConfig`.

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

`analyzeShadcnProjectFromDiscovery` admits only bounded `components.json` text through
`RepositoryRoot`, passes direct root compiler aliases and existing React components to the shadcn
adapter, and returns corroborating registry evidence. It does not execute configuration, read a
registry, or block React output when optional config is absent, malformed, or unsupported.

`analyzeStorybookProjectFromDiscovery` reads only the fixed
`storybook-static/manifests/components.json` path through a dedicated bounded root method.
`storybook-static` remains excluded from ordinary discovery. The bridge passes the text, normalized
components, and React imports to the adapter. It does not start Storybook, access a development
server, execute configuration, or let an arbitrary manifest path become analyzer input.

`analyzeProject` discovers once, passes that result to all implemented bridges, and returns a
validated, sorted `ReuseIndex` plus a truncation flag. `buildReuseIndex` is the pure assembly
operation. It accepts
only normalized discovery and adapter results, rejects conflicting evidence IDs, and does not write
cache or report state.

`writeReuseIndex` serializes a valid index and atomically replaces only
`.lattice/cache/reuse-index.json`. `readReuseIndex` returns a valid cache hit, a missing state, or an
invalid state that a caller must rebuild. Dedicated `RepositoryRoot` methods own the target and
reject symlinked cache directories and final files. Report writes remain unimplemented.

`inspectLatticeConfig` and `writeInitialLatticeConfig` implement ADR-0014's separate committed
configuration floor. They know only `.lattice/config.json`, not an arbitrary output path. Inspection
does not create `.lattice`; ordinary creation is opt-in, skips an existing regular file, and uses an
exclusive link so a concurrent config is not overwritten. Explicit force may replace the fixed file.
