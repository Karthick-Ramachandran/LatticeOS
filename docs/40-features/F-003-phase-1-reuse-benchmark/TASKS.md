# Tasks: Phase 1 Reuse Benchmark

## T1: Define benchmark protocol and memory

Status: Done

Scope:

- Create the F-003 and benchmark-module memory and ADR-0017.
- Define the protocol, safety boundary, acceptance gate, and documentation contract before code.

Acceptance:

- The parent feature, active product boundary, ADR-0008, and ADR-0009 are reconciled without adding
  Figma or runtime network behavior.

Tests:

- `persist doctor` after the delivery docs are complete.

Do Not:

- Start a harness or record a result before PRD, acceptance, architecture impact, test plan, and
  ADR-0017 are complete.

## T2: Implement pre-registered tasks and validator

Status: Done

Scope:

- Add versioned task/result schemas, three task definitions, synthetic verifier fixtures, and a
  deterministic local validator/summary.

Acceptance:

- A valid synthetic pass case and malformed, incomplete, unpaired, context-mismatched,
  delivery-mismatched, and regressive treatment cases have focused tests. Synthetic output is visibly
  labeled as verifier evidence only.

Tests:

- `pnpm test:benchmark` covers synthetic verifier data, task manifests, insufficient pairs, metric
  regression, changed context, missing or mismatched delivery artifacts, control leakage, symlinks,
  annotation locations, and stable summaries.
- Root quality gates are recorded in the completion report after this implementation slice.

Do Not:

- Run submissions, create production data, fabricate agent trials, or change LatticeOS ranking.

## T3: Capture qualified agent trials

Status: In Progress

Scope:

- Prepare and run each pre-registered task in randomized matched control/treatment pairs, then have
  an independent reviewer fill the explicit annotations.

Acceptance:

- Three qualified pairs per task satisfy ADR-0017 and ADR-0020, or the published report clearly says
  the gate did not pass. A saved prompt is not qualified without a raw `deliveredPrompt` whose bytes
  equal it. The 2026-08-31 archive does not pass: it lacks delivery evidence, and 8 of 9 pairs tied
  because control already reused the tidy fixture UI.

Tests:

- The pair preparer tests real CLI context capture, isolated fresh fixtures, randomized order,
  treatment-cache removal, fixture preservation, and metadata validation. The validator tests that a
  saved treatment prompt ends with the exact saved context bytes and that raw delivery evidence
  equals the prompt.
- Deterministic evaluator, record validation, and all repository gates.

Do Not:

- Change task definitions, expected opportunities, or scoring rules after reviewing outcomes.

## T4: Complete Phase 1 evidence

Status: In progress

Scope:

- Reconcile F-001 AC-15/AC-16 status, review findings, completion report, docs, README, and LLM
  guidance after the real benchmark result exists.

Acceptance:

- Phase 1 is marked complete only when every acceptance criterion and final gate has evidence.
