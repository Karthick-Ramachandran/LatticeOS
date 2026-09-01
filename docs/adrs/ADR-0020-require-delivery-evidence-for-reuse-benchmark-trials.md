# ADR-0020: Require Delivery Evidence For Reuse Benchmark Trials

## Status

Accepted

## Context

`reuse-v1` stores a hash-verified prompt and treatment context for every candidate run. That proves
what the repository intended to send. It does not prove what an external agent runner actually sent.
The first recorded candidate set disclosed that some wrappers shortened treatment JSON on screen.
The saved treatment prompts still end with the exact saved context, but the candidate set cannot meet
ADR-0017's exact-treatment-input requirement.

The result checker previously accepted a record when its prompt and context artifacts were valid,
even though no artifact represented the actual outbound message. A README warning would leave the
same gap for the next run.

## Decision

Every `reuse-v1` run must store a bounded, hash-verified `deliveredPrompt` text artifact copied from
the raw message sent to the agent. The validator must require that artifact and reject it unless its
bytes equal the recorded prompt. Treatment records must also continue to prove that the recorded
prompt ends with the saved `lattice context <task> --json` bytes.

The preparer still creates the expected prompt only. It does not create delivery evidence because it
does not run an agent. The person or runner that sends the prompt records the raw outbound message.
The artifact must contain only the controlled benchmark prompt, not personal data, private source, or
extra agent conversation.

This requirement applies to future qualified records. The existing nine-pair set remains a diagnostic
archive with its recorded 15 versus 14 score, but it is ineligible for AC-15 because it lacks delivery
evidence. Tasks, expected components, metrics, and scoring remain unchanged.

## Alternatives Considered

- Treat the stored prompt as proof of delivery. Rejected because the known wrapper-shortening event
  shows that the two can differ.
- Keep a manual warning in the result README. Rejected because the checker would still report a
  release-eligible pass for incomplete records.
- Capture a hosted-agent API log or add a telemetry service. Rejected because the benchmark stays
  local, developer-only, and outside the product runtime network boundary.

## Consequences

The checker now fails closed when a trial lacks an exact delivery artifact. Reviewers can compare the
raw outbound message with the prompt and saved treatment context without executing a submission.

Running a qualified trial takes one more local artifact per condition. The transcript is evidence of
what the runner claims it sent, not cryptographic proof of a third-party service's internal behavior.
It substantially reduces accidental wrapper summarization and makes that limitation explicit.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-003-phase-1-reuse-benchmark/`
- Parent feature: `docs/40-features/F-001-phase-1-reuse/`
- Prior protocol: `docs/adrs/ADR-0017-reproducible-phase-1-reuse-benchmark-protocol.md`
