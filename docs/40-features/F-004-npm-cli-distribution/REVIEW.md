# Review: Npm Cli Distribution

## Status

Reviewed. No unresolved F-004 blocker remains.

## Findings

- Resolved: the initial descriptor check allowed unrelated fields. The builder now compares the staged
  descriptor to its exact fixed package contract, including the bundled closure and the absence of
  lifecycle scripts or publish configuration.
- Resolved: a temporary-directory name was not enough to establish cleanup ownership. The builder now
  tracks only roots created in its process and rejects a release-shaped temporary directory it did not
  create.
- Resolved: final source files are opened without following links where the platform supports that
  protection. Static source links, root escape, changed file identity, unsupported entries, and copy
  bounds fail staging.
- Accepted limit: portable Node APIs cannot make recursive directory enumeration safe against a
  concurrent same-user writer of the LatticeOS checkout. ADR-0019 scopes staging to the fixed compiled
  closure in the current trusted build checkout. It does not apply to the untrusted repository that
  `lattice` analyzes, and the artifact is not a signed or high-assurance release.
- Resolved: ADR-0018 and ADR-0019 are in architecture and CLI decision memory. The direct-Node
  package-test naming exception is in engineering conventions.

## Evidence reviewed

- `git diff --check` passed.
- `pnpm --filter @latticeos/cli test:npm-package` passed three focused tests: regular file copying,
  static symlink rejection, and unowned temporary-root cleanup rejection.
- `pnpm --filter @latticeos/cli test:package` passed the legacy seven-tarball fixture and the bundled
  offline minimal-consumer proof.
- The external proof runs npm offline with lifecycle scripts disabled, verifies dry-run packaging,
  extracted package identity, bundled runtime paths, version/help/search behavior, generated cache,
  source preservation, and no package lock.
- Independent read-only review checked security, architecture drift, and conventions against the
  changed code and repository memory.

## Remaining product boundary

F-004 is ready for local pre-release evaluation only. It does not publish `@latticeos/cli`, establish
a general release pipeline, or satisfy the separate Phase 1 Reuse benchmark.
