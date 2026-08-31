# Review: Phase 1 Reuse Benchmark

## Status

In progress. The protocol and T2 harness are reviewed. Qualified trials remain.

## Findings

- ADR-0017 keeps the benchmark local and source-only so it does not cross the accepted Phase 1
  Figma, browser, semantic, or runtime-network boundary.
- A passing synthetic verifier fixture is not AC-15 evidence. Qualified agent trials and independent
  review remain required before the parent feature can claim improved reuse.
- The validator admits only bounded regular files below its artifact root. It rejects traversal,
  backslash paths, symlinks, changed hashes, control-context leakage, malformed treatment context,
  invalid annotation locations, and pair mismatches. Focused tests confirm errors do not include
  supplied source markers or malformed identifiers.
- The harness uses Node filesystem and crypto APIs only. It has no dependency, network, telemetry,
  cloud, MCP, AI API, child-process, fixture execution, or application-source write behavior.
- `pnpm benchmark:check` reports an absent trial record as insufficient and exits nonzero. It does
  not turn a missing result into a pass.
- The module uses the existing CLI JSON context, controlled fixture, root package-script naming, and
  repository-memory locations. It does not add a ranking model, CLI command, cache, or runtime API.

## Remaining risks

- Windows may require local privileges to create the symlink used by one focused test. The validator
  rejects symlinks on every platform, while that assertion runs where symlink creation is available.
- T3 needs fresh randomized agent runs and an independent reviewer. Synthetic verifier data cannot
  replace either requirement.
