# Change Requests: Phase 1 Reuse Benchmark

Record accepted changes to the feature requirements here.

## 2026-08-31: Temporary trial-preparation directory

ADR-0017 already requires fresh fixture copies and the F-003 plan requires a trial runner. ACB-06 now
states the narrow write boundary for that runner: it may use only a fresh OS-created temporary pair
directory, never a caller-selected path, committed fixture, or result record. This does not change
the release gate, task definitions, scoring, or local-only product boundary.
