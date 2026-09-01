# ADR-0005: Stable component identity

## Status

Accepted

## Context

Usages, cache entries, search output, and later accepted knowledge need to refer to components across
repeat analyses. Display names alone collide, and absolute paths are host-specific.

## Decision

Phase 1 component IDs use this canonical form:

```text
react:<package-key>:<repository-relative-source>#<export-key>
```

`package-key` is the nearest workspace package name or `root`. `repository-relative-source` is a
normalized POSIX path. `export-key` is the named export or `default`; local non-exported components,
when retained as composition evidence, use `local:<declaration-name>` and are never recommended as a
public reuse candidate.

The ID changes when the source path, package ownership, or export slot changes. Unrelated source
edits, documentation changes, usage counts, and declaration implementation changes do not affect it.

## Alternatives Considered

- Display name only. It collides across packages and files.
- Content hash. It changes after harmless edits and breaks links.
- TypeScript symbol identity. It is not serializable or stable between compiler programs.

## Consequences

IDs are deterministic, explainable, and host-independent. Moving a source file or export is an
identity change and later accepted knowledge will need a migration mechanism. Phase 1 reports the new
identity rather than guessing that a move preserved meaning.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/ACCEPTANCE.md`
