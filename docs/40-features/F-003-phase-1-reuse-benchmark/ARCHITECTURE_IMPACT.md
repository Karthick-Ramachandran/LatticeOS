# Architecture Impact: Phase 1 Reuse Benchmark

## Affected Modules

- `benchmark` is a new developer-only module. It owns task manifests, temporary pair preparation,
  result validation, a fixed result checker, deterministic summary, reviewer-record format, and
  benchmark documentation.
- `fixtures/next-workspace` remains the controlled consumer input. The benchmark never makes it a
  runtime dependency or rewrites the committed fixture.
- `packages/cli` supplies the treatment context through its existing `lattice context --json`
  contract. The benchmark does not change CLI behavior, core ranking, or analyzer evidence.

## ADR Impact

ADR-0017 defines the fairness, audit, safety, and release-gate rules. No accepted ADR changes.

## Security Impact

The harness is local and developer-only. It accepts only bounded, hash-verified repository-relative
artifact paths, reads submissions as text, and does not execute them. The preparer creates fresh
fixture copies only below an OS-created temporary root, with no caller-selected output path. It omits
generated cache and report directories but retains committed Lattice configuration. Recorded data
contains task and context output from the controlled fixture only; it excludes credentials, private
source, and participant identity.
There is no auth, server, network, telemetry, cloud, MCP runtime, AI API, runtime dependency, or
committed application-source write. A generated summary, if added, stays in the benchmark-owned path
and gets an explicit path/overwrite review. The preparer removes its exact temporary directory on
failure.

## Documentation impact

The benchmark guide, agent prompt, F-003 delivery memory, benchmark module memory, F-001 task status,
review, completion report, README, and `llms.txt` must state whether the harness works and whether
qualified results exist. A verifier fixture must never be described as a real agent trial.
