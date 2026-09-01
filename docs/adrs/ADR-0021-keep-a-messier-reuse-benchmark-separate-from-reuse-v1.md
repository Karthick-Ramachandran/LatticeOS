# ADR-0021: Keep a messier Reuse benchmark separate from reuse-v1

## Status

Accepted

## Context

The frozen `reuse-v1` fixture is intentionally small and tidy. Its archived candidate result differed
by one annotation: treatment used `SecondaryButton` once where control used a generic secondary
`Button`. In the other eight pairs, the agent found the canonical UI without LatticeOS context.

That result does not justify changing `reuse-v1` after outcomes are known. It also does not make a
second run on the same fixture a useful measure of Reuse on repositories where components are spread
across packages, wrapped, or named less directly. Phase 1 still needs qualified exact-delivery trials
on its frozen protocol before it can complete.

## Decision

Keep `reuse-v1` immutable. Do not edit its three task manifests, expected components, fixture hash,
scoring, or gate after seeing candidate outcomes.

If LatticeOS evaluates Reuse beyond this fixture, create a separate versioned benchmark and fixture
through a new feature delivery record. It must have its own pre-registered tasks, source-backed
expected canonical components, task/fixture hashes, scoring record, and copied delivery-evidence
contract from ADR-0020. It remains local, static, and source-only. It does not execute fixture code
or configuration, access a network, collect private source or personal data, add a runtime dependency,
or introduce Figma, browser, semantic, Doctor, or repair behavior.

The future fixture should test source organization that makes canonical reuse harder to discover while
keeping the expected component choices inspectable. Exact fixture contents, tasks, and metrics are
not decided in this ADR. They need a new feature PRD, acceptance criteria, security review, and test
plan before implementation or trial collection.

## Alternatives Considered

- Alter the frozen `reuse-v1` tasks or expected components to create a bigger measured difference.
  Rejected because it invalidates pre-registration and turns the benchmark into outcome chasing.
- Re-run only the current nine pairs. Kept as the path to satisfy the current Phase 1 exit gate, but
  it does not answer whether Reuse helps on harder repository structures.
- Start Figma, Phase 2, or semantic matching to make the tasks harder. Rejected because those areas
  remain outside the Phase 1 boundary.

## Consequences

The repository preserves the integrity of `reuse-v1` and gains a safe route to test a harder source
structure later. A future result can be compared honestly with the first fixture without relabeling
or mutating old records.

There is more planning and fixture work before a broader claim can be made. A harder fixture can still
be unrepresentative, and it cannot turn a local source-only benchmark into proof for arbitrary
repositories. The immediate Phase 1 blocker remains fresh `reuse-v1` trials with exact delivery
evidence.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Parent feature: `docs/40-features/F-001-phase-1-reuse/`
- Current protocol: `docs/adrs/ADR-0017-reproducible-phase-1-reuse-benchmark-protocol.md`
- Delivery evidence: `docs/adrs/ADR-0020-require-delivery-evidence-for-reuse-benchmark-trials.md`
