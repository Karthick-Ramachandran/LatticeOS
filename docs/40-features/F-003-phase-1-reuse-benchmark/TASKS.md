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

Status: Todo

Scope:

- Add versioned task/result schemas, three task definitions, synthetic verifier fixtures, and a
  deterministic local validator/summary.

Acceptance:

- A valid synthetic pass case and malformed, incomplete, unpaired, context-mismatched, and regressive
  treatment cases have focused tests. Synthetic output is visibly labeled as verifier evidence only.

Tests:

- Benchmark unit tests and root quality gates.

Do Not:

- Run submissions, create production data, fabricate agent trials, or change LatticeOS ranking.

## T3: Capture qualified agent trials

Status: Todo

Scope:

- Run each pre-registered task in randomized matched control/treatment pairs and have an independent
  reviewer fill the explicit annotations.

Acceptance:

- Three qualified pairs per task satisfy ADR-0017, or the published report clearly says the gate did
  not pass.

Tests:

- Deterministic evaluator, record validation, and all repository gates.

Do Not:

- Change task definitions, expected opportunities, or scoring rules after reviewing outcomes.

## T4: Complete Phase 1 evidence

Status: Todo

Scope:

- Reconcile F-001 AC-15/AC-16 status, review findings, completion report, docs, README, and LLM
  guidance after the real benchmark result exists.

Acceptance:

- Phase 1 is marked complete only when every acceptance criterion and final gate has evidence.
