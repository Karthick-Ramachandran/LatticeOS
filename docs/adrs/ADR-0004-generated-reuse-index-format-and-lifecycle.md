# ADR-0004: Generated Reuse index format and lifecycle

## Status

Accepted

## Context

Search, inspect, context, tests, and future read-only agent interfaces need one deterministic index.
The index contains derived evidence and must not be confused with accepted product knowledge.

## Decision

The Reuse index is versioned JSON at `.lattice/cache/reuse-index.json`. Schema version 1 contains
normalized project, package, component, usage, Tailwind, optional source, and diagnostic evidence.

All paths are POSIX-style and relative to the analyzed root. Collections are sorted before writing.
The file is reconstructable and normally ignored by version control. Writes use a temporary sibling
file and atomic rename. A corrupt, missing, or incompatible cache is rebuilt. `lattice init` creates
committed configuration separately and skips existing files unless `--force` is explicit.

## Alternatives Considered

- SQLite. It supports richer queries but creates a heavier lifecycle before index scale is known.
- One file per component. It produces noisy generated trees and complicates atomic snapshots.
- Commit the generated index. Rejected because source is authoritative and generated churn obscures
  accepted knowledge.

## Consequences

JSON is inspectable, portable, easy to snapshot, and sufficient for the first benchmark. Large
repositories may outgrow whole-file reads and writes. Measurements will decide whether a later
storage ADR is needed.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/ARCHITECTURE_IMPACT.md`
