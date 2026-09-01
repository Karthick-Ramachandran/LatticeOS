# Completion Report: Phase 1 Reuse Benchmark

## Status

Nine recorded candidate pairs have a historical 15 versus 14 score on the controlled Next.js fixture,
with 0 inappropriate reuses in both conditions. They do not qualify for F-001 AC-15. ADR-0020 now
requires raw `deliveredPrompt` artifacts, so `pnpm benchmark:check` rejects all nine candidates. The
full AC-16 quality suite passed on 2026-09-01; AC-15 and Phase 1 remain open pending fresh
exact-delivery trials.

## Files Changed

- `benchmarks/reuse-v1/results/results.json` and hashed prompt, context, and submission artifacts.
- F-003, F-001, benchmark module memory, README, `llms.txt`, Fumadocs benchmark guide, and lessons.

## Tests Run

- 18 isolated `general-purpose` subagent runs (nine randomized control/treatment pairs) against
  workspaces created by `pnpm benchmark:prepare`.
- Static text review of each permitted submission file. No fixture source or configuration was
  executed.
- Static file checks recorded in each run passed (18/18).
- `pnpm test:benchmark` passed 16 focused harness tests, including rejection of a treatment prompt
  that does not end with the saved context bytes and a raw delivery artifact that differs from its
  prompt.
- `pnpm benchmark:check` rejects the archived candidate set with 18 `missing-delivered-prompt`
  errors. That is the expected outcome under ADR-0020.
- `pnpm test:run`, `pnpm typecheck`, `pnpm build`, `pnpm test:package`, `pnpm docs:check`, and
  `persist doctor` all passed on 2026-09-01.

## Results

Agent: `grok-4-6-general-purpose` / `grok-4.6` /
`configurationHash 49ea145c69f4df99a3eb410e1455e64c6fd907666915238f0f6be4d28311f3b4`.
Prompt revision: `reuse-v1.0`. Fixture tree: `474f8c8841997b2105d1cfcaf9226f23b08a2e7a`.
Reviewer: `parent-static-reviewer` (did not author the submissions). Correction turns: 0.
Duplicate components: 0. Raw Tailwind class counts: 0.

| Task | Recorded pairs | Control appropriate | Treatment appropriate | Inappropriate (both) |
| --- | ---: | ---: | ---: | ---: |
| billing-settings-card | 3 | 5 | 6 | 0 |
| notification-settings | 3 | 6 | 6 | 0 |
| team-settings-section | 3 | 3 | 3 | 0 |
| **totals** | **9** | **14** | **15** | **0** |

The only scored difference is `billing-pair-2`: control rendered `SettingsCard` plus
`Button variant="secondary"`; treatment rendered `SettingsCard` plus `SecondaryButton`. The other
eight pairs tied because both conditions imported the expected `@fixture/ui` components after
inspecting the small fixture.

Saved treatment context remains the exact `lattice context <task> --json` files under
`benchmarks/reuse-v1/results/artifacts/contexts/`; every saved treatment prompt ends with its saved
context bytes. No candidate has the required raw `deliveredPrompt` artifact.

## Skipped checks

No required check was skipped. The AC-16 gate suite passed on 2026-09-01. It does not replace the
missing exact-delivery evidence required for AC-15.

## Engineering standards

Tasks, expected components, and scoring were not edited after outcomes were seen. Synthetic
verifier records were not copied into `results/`. The harness did not execute submissions. Ranking
was not changed to improve the score.

## Remaining Risks

- Reuse may help, but this run does not prove it strongly. A capable agent already reused the fixture
  UI without LatticeOS in 8 of 9 pairs. The only observed lift was one `SecondaryButton` choice.
- Saved prompt and JSON hashes prove what we prepared, not what a wrapper sent. ADR-0020 now fails
  closed on that gap.
- The reviewer is the parent session, not a separate human. Annotations cite source locations in
  the permitted files.
- External validity is limited to `fixtures/next-workspace` and this agent configuration. LatticeOS
  needs to show value in messier repository structure. Do not rewrite the frozen tasks to chase a
  larger delta, and do not start Figma or Phase 2 until qualified exact-delivery trials exist.
- The next release-evidence run needs nine fresh matched pairs: send each saved prompt verbatim,
  store the raw outbound message as `deliveredPrompt`, and keep an independent review.

## Definition of done

F-003 T3 remains open. The recorded artifact set is useful diagnostic evidence, but the current
checker rejects it because delivery artifacts are missing. It is not a qualified trial set. F-003 T4
and Phase 1 completion remain open.
