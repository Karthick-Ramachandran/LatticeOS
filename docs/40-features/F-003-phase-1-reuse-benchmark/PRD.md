# PRD: Phase 1 Reuse Benchmark

## Purpose

Measure whether the implemented LatticeOS Reuse workflow helps a coding agent choose source-backed
canonical UI instead of adding a duplicate. This is the evidence required by F-001 AC-15 before
Phase 1 can be called complete.

The benchmark is not a marketing demonstration. It records matched control and treatment runs on
pre-registered local tasks, including the exact treatment context and an auditable review of each
submission.

## In Scope

- A local, versioned `reuse-v1` benchmark harness with JSON validation and a deterministic summary.
- At least three source-only tasks against `fixtures/next-workspace`, each with expected canonical
  component opportunities and an allowed submission path.
- Matched control and treatment prompts. Treatment receives an exact saved
  `lattice context <task> --json` result; control does not receive LatticeOS output.
- Recorded agent/config labels, fixture revision/hash, prompt/context artifacts, allowed diffs, test
  output, reviewer annotations, correction turns, appropriate and inappropriate canonical reuse,
  duplicate components, and raw Tailwind added.
- A release report that requires three qualified pairs per task, higher treatment appropriate reuse,
  and no higher treatment inappropriate reuse before it supports AC-15.
- Fumadocs instructions and a complete copy-ready prompt for agents or reviewers who run a trial.

## Non-Goals

- Claim that a seeded verifier fixture is an agent result. Verifier fixtures test the harness only.
- Run, import, or modify submitted application code; benchmark inspection is static.
- Measure Figma intent, browser output, visual convergence, Doctor errors, semantic correctness, or
  time to approval. Those need later-phase contracts.
- Collect personal data, repository secrets, production source, telemetry, or network data.
- Publish packages, add a LatticeOS runtime command, or change search/context ranking to improve a
  benchmark score.

## Source requirements

- `docs/00-product/PRD.md`
- `docs/40-features/F-001-phase-1-reuse/ACCEPTANCE.md` (AC-15)
- `docs/40-features/F-001-phase-1-reuse/TEST_PLAN.md`
- `docs/adrs/ADR-0008-support-evidence-policy.md`
- `docs/adrs/ADR-0009-local-only-privacy-and-network-boundary.md`
- `docs/adrs/ADR-0017-reproducible-phase-1-reuse-benchmark-protocol.md`
