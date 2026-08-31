# Review: Phase 1 Reuse Benchmark

## Status

In progress. The protocol, T2 validator, and T3 temporary-pair preparer are reviewed. Qualified
trials remain.

## Findings

- ADR-0017 keeps the benchmark local and source-only so it does not cross the accepted Phase 1
  Figma, browser, semantic, or runtime-network boundary.
- A passing synthetic verifier fixture is not AC-15 evidence. Qualified agent trials and independent
  review remain required before the parent feature can claim improved reuse.
- The validator admits only bounded regular files below its artifact root. It rejects traversal,
  backslash paths, symlinks, changed hashes, control-context leakage, malformed treatment context,
  invalid annotation locations, and pair mismatches. Focused tests confirm errors do not include
  supplied source markers or malformed identifiers.
- The validator uses Node filesystem and crypto APIs only. It has no dependency, network, telemetry,
  cloud, MCP, AI API, child-process, fixture execution, or committed application-source write
  behavior.
- The preparer accepts no destination path. It creates a single OS temporary root, admits only the
  controlled fixture after a regular-file and symlink preflight, rechecks each file before copying,
  excludes generated cache and report directories, and caps the copy at 500 files and 8 MiB. It
  removes only its generated `.lattice` cache, preserves committed configuration, and removes its
  exact temporary root on failure. It neither calls an agent nor creates a result record.
- Treatment context comes from the existing in-process CLI JSON interface after the treatment copy
  exists. The saved context is the treatment-only prompt difference; the cache used to generate it is
  removed before an agent can receive the workspace.
- `pnpm benchmark:check` reports an absent trial record as insufficient and exits nonzero. It does
  not turn a missing result into a pass.
- The module uses the existing CLI JSON context, controlled fixture, root package-script naming, and
  repository-memory locations. It does not add a ranking model, CLI command, cache, or runtime API.

## Remaining risks

- Windows may require local privileges to create the symlink used by one focused test. The validator
  rejects symlinks on every platform, while that assertion runs where symlink creation is available.
- T3 needs fresh randomized agent runs and an independent reviewer. The new preparer makes those
  inputs reproducible, but synthetic verifier data cannot replace either requirement.
