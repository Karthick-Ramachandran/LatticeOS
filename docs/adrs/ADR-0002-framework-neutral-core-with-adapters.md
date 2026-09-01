# ADR-0002: Framework-neutral core with adapters

## Status

Accepted

## Context

Phase 1 targets React and Next.js, but component identity, evidence ranking, context budgets, and JSON
contracts are not React concepts. Coupling those rules to a parser would force a redesign for another
framework.

## Decision

`packages/core` owns serializable UI entities, stable identity, deterministic ranking, context
budgets, and shared schemas. It imports no framework, filesystem analyzer, or CLI module.

`packages/adapters/*` translate source-specific evidence into core contracts. `packages/analyzer`
orchestrates adapters and owns repository access. `packages/cli` depends on analyzer and core public
interfaces. Dependencies point inward toward core.

## Alternatives Considered

- One package with React-shaped entities. It is faster to start but makes the first adapter the domain
  model.
- A plugin framework before the first working adapter. It adds an extension contract before there is
  enough evidence to design one.

## Consequences

Framework support can grow without changing the core model. Package boundaries add build setup and
may expose awkward interfaces early. We will keep the adapter contract small and change it before
publishing a stable API if fixtures show that the model is wrong.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/ARCHITECTURE_IMPACT.md`
