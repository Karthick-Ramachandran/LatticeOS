# ADR-0006: TypeScript Compiler API analysis

## Status

Accepted

## Context

React discovery needs syntax trees, project configuration, aliases, module resolution, and type
information. Regex cannot cover the accepted component and prop patterns safely.

## Decision

Use the public TypeScript Compiler API, pinned initially to 7.0.2, to parse tsconfig files, create
programs, resolve modules, traverse source, and inspect types. The adapter uses `Program`,
`SourceFile`, and `TypeChecker` behind LatticeOS-owned interfaces.

The analyzer never imports, requires, transpiles for execution, or evaluates consumer source or
configuration. Compiler diagnostics become bounded `AnalysisDiagnostic` records. Fixture tests pin
the behavior LatticeOS relies on because the Compiler API can change between TypeScript releases.

## Alternatives Considered

- Regex and text scanning. It misses aliases, re-exports, nested syntax, and type relationships.
- `ts-morph`. Its wrapper is useful but adds another compatibility layer and dependency before the
  required queries are known.
- Babel or SWC. They parse syntax well but do not use the consumer's TypeScript project/type model.

## Consequences

The analyzer shares TypeScript's understanding of modern syntax and resolution. Compiler startup and
type checking can be expensive, and the API is not guaranteed stable. Adapters, bounded inputs,
golden fixtures, and an exact tested version contain that risk.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/TEST_PLAN.md`
- External: `https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API`
