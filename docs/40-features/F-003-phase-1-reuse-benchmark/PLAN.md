# Plan: Phase 1 Reuse Benchmark

## Approach

1. Define the versioned task, result, reviewer-annotation, and summary contracts under ADR-0017.
2. Pre-register three source-only tasks against the controlled Next.js fixture. Do not add outcomes
   while defining their expected canonical opportunities and review rubric.
3. Implement a local validator and deterministic summary. Add seeded verifier fixtures that prove
   malformed, incomplete, biased, and passing synthetic record handling without calling the latter a
   real benchmark result.
4. Add a trial runner that captures the exact control or treatment prompt and the treatment JSON
   context without executing a submission.
5. Collect at least three randomized, matched real-agent pairs per task. Preserve their inputs,
   output hashes, test outcome, and reviewer annotations.
6. Run the evaluator. Only if the ADR-0017 gate passes may F-001 AC-15 be marked complete.
7. Complete security/conventions review, all quality gates, Persist validation, and final release
   evidence.

## Boundaries

- The benchmark measures Phase 1 source reuse only. It does not measure Figma, visual output,
  semantic intent, Doctor, browser behavior, or a repair loop.
- The harness cannot generate an agent result or silently score a seeded fixture as one.
- No benchmark code belongs in the shipped `lattice` runtime. It uses no network or secrets and never
  executes submissions or consumer configuration.
- The parent F-001 task remains incomplete until qualified results, not merely a passing harness,
  satisfy AC-15.
