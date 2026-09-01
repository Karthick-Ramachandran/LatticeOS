# Change Requests: Phase 1 Reuse Benchmark

Record accepted changes to the feature requirements here.

## 2026-09-01: Raw prompt-delivery evidence

ADR-0020 requires every future `reuse-v1` run to store a hash-verified `deliveredPrompt` whose bytes
equal the saved prompt. The checker fails closed without it. This does not change task text, expected
components, or scoring. The archived 15 versus 14 candidate set stays as diagnostic evidence and is
not AC-15.

The same archive showed a capable agent already reusing the tidy fixture UI in 8 of 9 pairs. That is
an interpretation limit, not a reason to edit the frozen tasks. A messier-repository protocol is
governed by [ADR-0021](../../adrs/ADR-0021-keep-a-messier-reuse-benchmark-separate-from-reuse-v1.md).
Do not start Figma or Phase 2 until qualified exact-delivery trials exist.

## 2026-08-31: Temporary trial-preparation directory

ADR-0017 already requires fresh fixture copies and the F-003 plan requires a trial runner. ACB-06 now
states the narrow write boundary for that runner: it may use only a fresh OS-created temporary pair
directory, never a caller-selected path, committed fixture, or result record. This does not change
the release gate, task definitions, scoring, or local-only product boundary.
