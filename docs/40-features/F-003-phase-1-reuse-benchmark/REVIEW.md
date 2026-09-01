# Review: Phase 1 Reuse Benchmark

## Status

The recorded archive has a historical one-annotation treatment margin on the controlled fixture, but
T3 is not complete. ADR-0020 requires raw delivery artifacts, and the current checker rejects all
nine candidates because those artifacts are absent.

## Findings

- Nine matched pairs used the same declared agent, frozen tasks, and randomized condition order from
  `pnpm benchmark:prepare`.
- Control workspaces had no recorded LatticeOS output. Every saved treatment prompt ends with the
  exact saved `lattice context --json` bytes, and generated `.lattice/cache` was removed before the
  agent ran.
- Independent static review counted appropriate reuse only for expected canonical components that
  were imported and rendered in the permitted submission file.
- `notification-settings` and `team-settings-section` tied. `billing-settings-card` supplied the
  only treatment gain: `SecondaryButton` instead of `Button variant="secondary"` on one control run.
- Before ADR-0020, the archived annotations scored treatment 15 vs control 14 appropriate reuse and
  0 inappropriate reuse. The current checker rejects the incomplete archive as intended.
- Synthetic verifier data was not used as an agent result.
- The validator rejects a treatment prompt that does not end with its saved context bytes. It also
  requires a raw delivery artifact that matches the saved prompt byte for byte.

## Remaining risks

- A stronger or weaker agent, or a larger repository, could reverse the one-annotation margin.
- The runner needs a fresh set of exact-delivery trials before AC-15 can pass. Send each saved
  treatment prompt verbatim in a direct agent message and retain an auditable raw-message transcript
  or equivalent delivery record.
- Parent-session review is not a second human. Locations and classifications are in `results.json`.
- AC-16 passed on 2026-09-01, but it cannot cure the AC-15 delivery-evidence gap.
