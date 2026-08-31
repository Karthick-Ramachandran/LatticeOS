# Acceptance Criteria: Phase 1 Reuse Benchmark

## Criteria

- **ACB-01 Pre-registration:** `reuse-v1` commits at least three tasks before results are recorded.
  Each task names its fixture revision/hash, allowed submission path, exact expected canonical
  component opportunities, task text, and review rubric.
- **ACB-02 Matched inputs:** every result pair records the same task and fixture, agent/config label,
  prompt revision, and randomized condition order. Control contains no LatticeOS output; treatment
  contains the exact saved JSON from `lattice context <task> --json`.
- **ACB-03 Audit trail:** each run records an allowed source diff or file hash, command/test outcome,
  reviewer annotations, duplicate-component count, raw-Tailwind count, correction-turn count, and
  explicit appropriate/inappropriate canonical reuse annotations with source locations.
- **ACB-04 Conservative scoring:** the evaluator counts reuse only when an annotation points to an
  expected canonical component and an inspected submission location. Missing, failed, unreviewed,
  out-of-scope, or ambiguous runs do not count as successful treatment evidence.
- **ACB-05 Gate result:** at least three qualified pairs exist for every pre-registered task. The
  treatment total is higher for appropriate canonical reuse and is no higher for inappropriate
  canonical reuse. The report includes the full task and treatment context for every qualified pair.
- **ACB-06 Harness safety:** the validator reads only committed benchmark records and
  fixture/submission text under its controlled root. The preparer may write only to a fresh
  OS-created temporary pair directory and never accepts an output path. Neither tool executes
  submitted code or configuration, makes a network call, collects secrets or personal data, adds a
  runtime dependency, or writes the committed fixture or a result record.
- **ACB-07 Documentation:** Fumadocs explains the protocol, limitations, and exact trial prompt.
  Repository memory, the parent feature, README, and `llms.txt` distinguish a working harness from a
  completed benchmark result.

## Out Of Scope

- Figma, browser, visual, semantic, Doctor, network, cloud, telemetry, MCP-runtime, or AI-runtime
  evaluation.
- Claims about arbitrary repositories, human correction quality, or product adoption beyond the
  recorded controlled fixture.
