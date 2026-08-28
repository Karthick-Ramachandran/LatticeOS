# Architecture Impact: Phase 1 Reuse Benchmark

## Affected Modules

- `benchmark` is a new developer-only module. It owns task manifests, result validation, summary,
  reviewer-record format, and benchmark documentation.
- `fixtures/next-workspace` remains the controlled consumer input. The benchmark never makes it a
  runtime dependency or rewrites the committed fixture.
- `packages/cli` supplies the treatment context through its existing `lattice context --json`
  contract. The benchmark does not change CLI behavior, core ranking, or analyzer evidence.

## ADR Impact

ADR-0017 defines the fairness, audit, safety, and release-gate rules. No accepted ADR changes.

## Security Impact

The harness is local and developer-only. It accepts only repository-relative declared record paths,
reads submissions as text, and must not execute them. Recorded data contains task and context output
from the controlled fixture only; it excludes credentials, private source, and participant identity.
There is no auth, server, network, telemetry, cloud, MCP runtime, AI API, runtime dependency, or
application-source write. A generated summary, if added, stays in the benchmark-owned path and gets
an explicit path/overwrite review.

## Documentation impact

The benchmark guide, agent prompt, F-003 delivery memory, benchmark module memory, F-001 task status,
review, completion report, README, and `llms.txt` must state whether the harness works and whether
qualified results exist. A verifier fixture must never be described as a real agent trial.
