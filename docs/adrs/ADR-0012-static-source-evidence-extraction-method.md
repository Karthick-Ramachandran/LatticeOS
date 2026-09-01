# ADR-0012: Static Source Evidence Extraction Method

## Status

Accepted

## Context

The Reuse index records how each fact was extracted. Existing methods distinguish manifests, CSS,
static configuration, AST traversal, and type checking. Tailwind class literals come from source
text, but Phase 1 deliberately does not parse every supported language with an AST or claim CSS
semantics for a JSX attribute.

Calling this extraction `ast` would overstate the implementation. Calling it `static-config` or
`css` would describe the wrong input. The index needs a stable method name before class-bundle
evidence becomes part of its public schema.

## Decision

Add the `static-source` evidence method. It means a bounded, deterministic scanner matched literal
text directly in an admitted repository source file. The evidence must retain its exact source
location, fingerprint, and limitations. It does not prove an expression's runtime value, component
meaning, or a language-level AST relationship.

Use `static-source` for literal Tailwind class attributes and static arguments to known class-merging
helpers. Keep `ast` for actual syntax-tree traversal, `type-checker` for compiler-derived facts,
`css` for CSS declarations, `static-config` for configuration text, and `manifest` for package data.

## Alternatives Considered

- Use `ast` for all source-derived evidence. This would make a regular-expression or token scanner
  look more precise than it is.
- Use `static-config`. A JSX or TSX source file is not configuration.
- Add a framework-specific Tailwind method. The core contract should describe the extraction method,
  not the adapter that happened to use it.

## Consequences

Consumers can distinguish a literal source match from an AST or type-checker result without guessing
from the evidence kind. The new method extends schema version 1, so validation, generated schema,
fixtures, docs, and any future JSON consumer must use the exact string.

`static-source` has narrower guarantees than an AST. Dynamic expressions, interpolated templates,
and unfamiliar merge helpers remain unsupported or diagnostic cases. A future parser-backed adapter
may emit `ast` evidence for a supported form, but it must not relabel existing evidence without a
documented migration.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/`
