# ADR-0013: Tailwind Class Bundle Occurrence Representation

## Status

Accepted

## Context

ADR-0007 requires LatticeOS to preserve literal class text while grouping equivalent static bundles
by normalized whitespace and token order. The original `TailwindClassBundle` contract had only one
class list plus locations. It could group reordered literals, but it could not say which literal
occurred at which location.

This evidence is advisory. A reviewer needs to inspect the exact source spelling before deciding
whether repeated utilities indicate a reusable structure.

## Decision

Each repeated class bundle stores:

- `classes`: the deterministic normalized token sequence used as the exact comparison key;
- `originals`: the unmodified literal class strings in the same order as `locations`;
- `locations`, `count`, and evidence IDs for every occurrence.

Occurrences sort by repository-relative location. `count`, `locations.length`, and `originals.length`
must agree. The adapter never turns a normalized match into a semantic-equivalence claim or a new
component.

## Alternatives Considered

- Keep only one representative literal. This loses different whitespace or token order from other
  occurrences.
- Store only normalized tokens. This hides the text a developer needs to inspect.
- Treat token order as a different bundle. That would contradict ADR-0007 and miss harmless ordering
  differences.

## Consequences

The Reuse index is slightly larger, but it remains bounded by static source selection and provides
enough provenance for human review. Validation and serialization must keep the three occurrence
collections aligned.

LatticeOS still cannot know whether two class lists are semantically equivalent when Tailwind
variants, dynamic values, generated utilities, or application meaning differ. The evidence remains
informational.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/`
