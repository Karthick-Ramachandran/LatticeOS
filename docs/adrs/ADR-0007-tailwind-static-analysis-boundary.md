# ADR-0007: Tailwind static analysis boundary

## Status

Accepted

## Context

Phase 1 needs Tailwind token and repetition evidence without pretending that arbitrary runtime class
construction can be resolved or executing the consumer's configuration.

## Decision

Read Tailwind version and marker evidence from manifests, CSS, and configuration text. Parse Tailwind
v4 `@theme` variables from CSS. Parse only statically recognizable v3 theme keys and values from
configuration text. Never import or evaluate configuration.

Extract literal `className` strings, no-substitution templates, and statically visible arguments in
known class-merging calls such as `cn`, `clsx`, and `classnames`. Preserve original text and normalize
token whitespace/order into a separate comparison key. Report exact repeated token bundles at a
configurable threshold, including every source location. Dynamic expressions produce no invented
classes and may emit a diagnostic.

## Alternatives Considered

- Execute Tailwind configuration. Rejected because consumer configuration is untrusted code.
- Use only raw string equality. It misses harmless whitespace and token-order differences.
- Add similarity matching now. Rejected because Phase 1 promises exact evidence, not semantic or
  visual equivalence.

## Consequences

Results are deterministic and safe enough for advisory reuse evidence. Dynamic classes and plugin
generated tokens reduce recall. Normalized token equality does not prove that two UI structures have
the same meaning, so repetition remains informational and never creates a component automatically.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/ACCEPTANCE.md`
