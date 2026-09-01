# ADR-0011: TypeScript 6 Compiler API For Phase 1 Analysis

## Status

Accepted

## Supersedes

- ADR-0006-typescript-compiler-api-analysis

## Context

ADR-0006 assumed that `typescript@7.0.2` continued to expose the classic JavaScript Compiler API
from the package root. It does not. TypeScript 7 is the native Go implementation and its package
root exports version metadata; its integration surface is a new curated, message-based API.

The Phase 1 React adapter needs the established `Program`, `SourceFile`, and `TypeChecker` API over
an LatticeOS-owned virtual compiler host. That host is how the adapter type-checks collected source
without executing consumer code or reading arbitrary files outside the analyzer's validated root.
Using a private TypeScript 7 path would create an unsupported dependency, and changing the adapter
to its new IPC API would be a distinct architecture project.

## Decision

Pin `typescript` to 6.0.3 in the analyzer and React adapter, where LatticeOS imports the Compiler
API. The adapter uses only the public classic API behind LatticeOS-owned interfaces. The pinned
compiler version is part of the fixture and golden-test matrix.

The TypeScript version declared by a consumer repository is evidence about that repository, not a
requirement for the analyzer to load or execute that version. LatticeOS reads consumer tsconfig
files as data and builds a bounded virtual program from sources already admitted by `RepositoryRoot`.

## Alternatives Considered

- Adopt TypeScript 7's `unstable` API now. It has a different process and integration model and
  cannot replace the bounded in-process virtual host without new design, security review, and
  fixtures.
- Import a private TypeScript 7 build path. It evades the export contract and can break in a patch
  release.
- Use a syntax-only parser. It cannot provide the alias, inherited-prop, and symbol-resolution
  evidence required by AC-05 and AC-06.

## Consequences

The React adapter can use the documented API required for reliable component, prop, import, and JSX
evidence while preserving the no-execution boundary. LatticeOS carries a second TypeScript version
where workspace tooling still uses TypeScript 7, so lockfile and package tests must prove the
adapter resolves its own exact dependency.

A future move to TypeScript 7 requires a new ADR, a compatibility/security assessment of its public
integration API, and refreshed golden fixtures. It must not happen as a transitive upgrade.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/`
- External: `https://github.com/microsoft/typescript-go/discussions/454`
