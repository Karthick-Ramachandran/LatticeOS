# ADR-0017: Reproducible Phase 1 Reuse Benchmark Protocol

## Status

Accepted

## Context

Phase 1 cannot claim that LatticeOS improves reuse from parser, package, or query tests alone.
AC-15 requires a documented control-versus-treatment result with higher appropriate canonical reuse,
no increase in inappropriate reuse, and the complete task context. A hand-picked before-and-after
example would not supply that evidence.

The original product baseline describes a later broad benchmark with Figma MCP. The active Phase 1
product boundary excludes Figma, browser work, semantic knowledge, Doctor, and runtime network
behavior. The first benchmark therefore needs a local, source-only protocol that can evaluate the
implemented Reuse command without pretending to measure later phases.

## Decision

Create the developer-only `benchmark` module and a versioned local `reuse-v1` benchmark harness.
It will use pre-registered tasks against the controlled Next.js workspace fixture.

Each task names source-backed canonical reuse opportunities and a permitted submission location.
For every matched pair, control receives the task and fixture instructions. Treatment receives the
same material plus the exact saved output of `lattice context <task> --json`. Both conditions use a
fresh copy of the same fixture, the same declared agent build and configuration, and randomized
condition order.

The recorded result stores task, fixture commit/hash, agent/config label, prompt files, treatment
context, allowed source diff, test output, reviewer annotations, and metrics. The evaluator counts
appropriate and inappropriate canonical reuse only from annotations that name an expected canonical
component and a submission location. It records duplicate components, raw Tailwind added, and human
correction turns separately. It does not infer semantic correctness from LatticeOS ranking.

The release gate requires at least three paired runs for each pre-registered task. Across qualified
pairs, treatment must have a higher total of appropriate canonical reuse and no higher total of
inappropriate canonical reuse. Missing, failed, or unreviewed runs are reported but do not count.

The harness is local and developer-only. It parses result files and inspects declared submission
files as text. It does not execute submissions, fixture configuration, or agent code; it makes no
network request and adds no runtime dependency. Recorded artifacts must not include credentials,
private source text outside the controlled fixture, or a participant's personal identity.

## Alternatives Considered

- A scripted before-and-after example. Rejected because it would demonstrate the harness rather than
  an agent's behavior and could manufacture the desired outcome.
- A free-form narrative report. Rejected because task, prompt, model configuration, context, and
  review criteria would be too easy to omit or change after seeing results.
- A Figma- and browser-based benchmark now. Rejected because it crosses the accepted Phase 1
  boundary and would conflate Reuse with later Converge behavior.
- A hosted evaluation service. Rejected because the active product has no source-transfer or network
  path, and the controlled fixture does not need one.

## Consequences

The project gets an auditable method for testing whether `lattice context` changes reuse choices.
The fixture and minimum trial count limit external validity, and reviewer annotations still require
judgment. Results cannot support claims about Figma, visual fidelity, product semantics, arbitrary
repositories, or later phases. A future broader benchmark requires a new decision and fixtures.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-003-phase-1-reuse-benchmark/PRD.md`
- Parent feature: `docs/40-features/F-001-phase-1-reuse/PRD.md`
