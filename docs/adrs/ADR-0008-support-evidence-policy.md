# ADR-0008: Support evidence policy

## Status

Accepted

## Context

Framework and tool support claims can easily outrun the fixtures. False confidence is especially
harmful for Reuse because a missed component encourages duplicate UI.

## Decision

A Phase 1 syntax or integration is supported only when it has:

1. a named golden fixture with expected normalized evidence;
2. a regression test for malformed or absent input where applicable;
3. a packed-consumer test when package resolution affects the behavior; and
4. user documentation that states the supported form and its limits.

Untested or partial behavior is labeled experimental or unsupported. Diagnostics name evidence gaps.
The completion report lists skipped environments and remaining risks. Marketing copy cannot broaden
the support matrix beyond test evidence.

## Alternatives Considered

- Claim broad React/Next.js compatibility from parser capability. Rejected because parsing a file is
  not the same as finding components accurately.
- Keep a manual support list without fixture links. Rejected because it drifts from behavior.

## Consequences

Claims stay reviewable and tied to reproducible proof. New syntax takes longer to advertise because
it needs a fixture and docs. Fixtures still cannot represent every real repository, so issue reports
and benchmark repositories remain necessary.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/TEST_PLAN.md`
