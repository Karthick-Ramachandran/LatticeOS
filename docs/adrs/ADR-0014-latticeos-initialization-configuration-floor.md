# ADR-0014: LatticeOS Initialization Configuration Floor

## Status

Accepted

## Context

Phase 1 needs a committed, LatticeOS-owned configuration location before later analysis limits or
selection settings can be shared by developers and agents. The cache is reconstructable and belongs
under `.lattice/cache/`; configuration is different state and must never be replaced as a side effect
of a query.

`lattice init` is the first command that writes tracked repository state. A generic "write a file"
helper would make it easier for future code to write arbitrary paths, which conflicts with the file
write policy and security model.

## Decision

`lattice init` owns one fixed file: `.lattice/config.json`. Its initial, versioned content is:

```json
{
  "schemaVersion": 1
}
```

This is a configuration floor, not a promise that every later setting already has behavior. Future
analysis roots, excludes, thresholds, and output limits need a separate documented schema decision
before they are read.

`lattice init` plans the write by default and makes no filesystem change. `--write` creates the
missing file. An existing regular config file is skipped, and `--write --force` is the only form that
may replace it. `--force` without `--write` is a usage error. JSON and human output describe the same
plan or result.

`RepositoryRoot` remains the only file-write authority. It exposes fixed configuration inspection
and write operations, rejects symlinks and non-regular paths, creates `.lattice` only for an actual
write, and writes fixed content through a synced temporary sibling. Normal creation commits with an
exclusive link; explicit force uses atomic rename. It does not offer a generic arbitrary-path write
API.

## Alternatives Considered

- Make `init` write by default. Rejected because a first-run command should show the committed file
  before changing a repository.
- Start with a rich configuration schema. Rejected because unimplemented settings would create a
  misleading contract.
- Keep configuration with the cache. Rejected because cache files are reconstructable and normally
  ignored, while configuration is intentionally committed.
- Add a general `writeText` method to `RepositoryRoot`. Rejected because a fixed owned path is easier
  to audit and keeps application source out of reach.

## Consequences

Initialization is explicit, reviewable, and safe to run in a repository that already has a
`.lattice` directory. The initial config is intentionally small, so it does not configure analysis
yet. Future configuration parsing needs validation, a schema ADR, and tests before it can affect
output.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/`
