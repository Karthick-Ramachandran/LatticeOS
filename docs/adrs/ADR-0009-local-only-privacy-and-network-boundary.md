# ADR-0009: Local-only privacy and network boundary

## Status

Accepted

## Context

LatticeOS reads source that may be confidential. Phase 1 search and ranking do not need a hosted
service, embeddings, telemetry, or an AI API.

## Decision

All Phase 1 analysis, indexing, search, and context generation run locally. Runtime code makes no
network requests and emits no telemetry. It does not read `.env` files or known secret stores. Index
and report paths are repository-relative and generated data stays under `.lattice/`.

Package installation and documentation builds may use the package registry as normal development
operations. They do not send analyzed repository evidence. Any future runtime network, MCP, cloud,
telemetry, or AI API behavior requires explicit review and a new or superseding ADR.

## Alternatives Considered

- Hosted semantic search. Rejected because it adds source transfer and operations before local
  ranking is measured.
- Opt-out telemetry. Rejected because Phase 1 can be evaluated with explicit local benchmarks.

## Consequences

The privacy story is simple and offline analysis works in restricted repositories. LatticeOS does
not learn from aggregate usage automatically, and local ranking may be less sophisticated than a
hosted embedding service. The Phase 1 benchmark decides whether the simpler approach is useful.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/PRD.md`
