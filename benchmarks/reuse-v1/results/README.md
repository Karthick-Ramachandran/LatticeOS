# Recorded candidate results

`results.json` holds nine matched `agent-trials` records for `reuse-v1`. Before ADR-0020 hardened
the contract, the records scored treatment appropriate reuse 15 versus control 14, with 0
inappropriate reuse in both conditions. The current checker rejects every run because no
`deliveredPrompt` artifact exists.

These records are static candidate evidence, not qualified AC-15 evidence. The saved treatment
prompts end with the exact saved JSON, but the original run notes say some wrappers shortened the
on-screen JSON. They do not prove the unmodified prompt reached the agent. Re-run all nine pairs with
verbatim direct delivery and a hash-verified `deliveredPrompt` artifact before using a result for
Phase 1 release. The one observed difference is a `SecondaryButton` annotation on
`billing-settings-card`; do not treat it as evidence about arbitrary repositories.
