# Module: Benchmark

## Purpose

Provide local, auditable evidence about whether LatticeOS Reuse changes canonical component choices
on pre-registered coding-agent tasks.

## Owns

- Versioned task manifests, temporary control/treatment pair preparation, result records, reviewer
  annotations, schema validation, deterministic summary, synthetic verifier fixtures, and benchmark
  documentation.
- The control/treatment prompt contract and capture of exact treatment context.

## Does Not Own

- LatticeOS CLI commands, analyzer discovery, core ranking, component semantics, Figma, browser
  evaluation, Doctor, source rewrites, package publishing, or production runtime behavior.

## Public Interfaces

- `pnpm test:benchmark` runs the local `reuse-v1` manifest and validator tests.
- `pnpm benchmark:prepare` creates one fresh randomized control/treatment pair in an OS temporary
  directory. It captures the exact treatment context through the existing CLI and writes no result.
- `pnpm benchmark:check` reads only `benchmarks/reuse-v1/results/results.json`, validates it, and
  prints a deterministic local summary. The current archive contains a historical 15 versus 14 score,
  but the checker rejects it because raw delivery artifacts are missing. The command exits nonzero on
  invalid or insufficient records.
- Each future run records `deliveredPrompt`: a bounded, hash-verified raw outbound-message artifact
  whose bytes equal its saved prompt. The preparer cannot create this artifact because it never sends
  an agent message.
- Task and result JSON contracts are documented under F-003. They are not LatticeOS runtime APIs.

## Boundaries

The module consumes the existing `lattice context --json` output as treatment evidence and only reads
bounded, hash-verified records under its artifact root. Its preparer writes only a fresh OS-created
temporary pair directory, never a caller-supplied path, the committed fixture, or a result record. It
never executes a submission or consumer configuration. It uses no network, secrets, telemetry, cloud,
MCP runtime, AI API, or new runtime dependency.
