# ADR-0001: LatticeOS ownership boundary

## Status

Accepted

## Context

The product could drift into a UI generator, a component library, or application runtime. Phase 1
needs a firm boundary before packages and public commands are created.

## Decision

LatticeOS is repository-native developer tooling. It reads application and tool evidence, builds a
normalized reuse index, and gives coding agents and developers targeted guidance. The coding agent
still writes application UI.

LatticeOS does not own visual design, application behavior, CSS primitives, component distribution,
browser rendering, or production runtime code. Phase 1 may write its own config, cache, reports, and
small agent instruction block. It never rewrites application source.

## Alternatives Considered

- Generate application UI directly. Rejected because it duplicates the coding agent and widens the
  safety boundary.
- Ship a runtime design-system library. Rejected because the product must work with the consumer's
  existing design system.
- Build a hosted control plane first. Rejected because local evidence is enough for Phase 1 and
  source privacy is easier to protect locally.

## Consequences

The boundary keeps adoption light and makes source ownership clear. Some workflows need explicit
handoff to external tools, and LatticeOS cannot guarantee that an agent follows its advice. Later
phases need separate ADRs before they add Figma, browser, MCP, or repair behavior.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/PRD.md`
