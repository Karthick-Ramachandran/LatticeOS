# ADR-0019: Trusted Build Checkout Package Input

## Status

Accepted

## Context

The bundled npm CLI builder stages files from the current LatticeOS checkout after the repository
build completes. It never accepts a caller-selected source root. Static symlinks are rejected and
final source files are opened without following links where the platform supports that flag.

Node's public filesystem APIs do not provide portable descriptor-relative recursive directory reads.
A hostile concurrent process with the same operating-system authority could replace a source directory
between a containment check and directory enumeration. That process can already change this checkout's
package scripts, compiled output, and the builder itself. Treating this checkout as hostile would not
produce a meaningful packaged-artifact integrity boundary.

The Phase 1 analyzer has a different trust boundary: it receives a caller-selected repository and
must handle its files, symlinks, configuration, and source as untrusted data. The release builder must
not weaken that runtime guarantee or present its checkout-only staging checks as a general safe-copy
utility.

## Decision

Treat the current LatticeOS build checkout as a trusted developer input for package staging. The
builder may read only its fixed compiled closure after a local build. It accepts no source path, target
path, dependency list, registry setting, or publish instruction from a caller.

Keep the static protections that are meaningful at this boundary: fixed source locations, regular-file
checks, symlink rejection, real-path containment checks, final-file no-follow opens where supported,
bounded copy sizes, and process-owned temporary cleanup. Do not claim protection from a concurrent
same-user mutation of the LatticeOS checkout. A future build-isolation or signing workflow needs a
separate decision and implementation.

## Alternatives Considered

- Treat the release builder like the analyzed-repository reader. Rejected because its source is not a
  caller-supplied repository, and portable Node APIs cannot safely traverse a directory tree through
  stable directory descriptors. The same-user mutator could alter the builder before it starts.
- Add a native directory-descriptor addon or a new build-packaging dependency. Rejected for this
  pre-release path because it adds supply-chain and cross-platform maintenance work before a release
  integrity feature is actually scoped.
- Use a system archiver for recursive copying. Rejected because it would add an unpinned external tool
  and does not establish a stronger trust boundary for a mutable same-user checkout.
- Require an immutable checkout, isolated builder, or signed source artifact. Deferred. Those are
  reasonable future release-integrity controls but exceed local pre-release distribution.

## Consequences

The package builder has a narrow, honest source boundary and cannot be redirected to copy an evaluator's
repository. It keeps static symlink and path checks so accidental or committed unsafe inputs fail.

The builder does not defend against a malicious concurrent writer with the same authority over the
LatticeOS checkout. Do not use its output as a signed, reproducible, or high-assurance release
artifact. It remains an offline local pre-release path. The analyzer's untrusted repository and
source-read-only guarantees remain unchanged.

## Related Documents

- PRD: `docs/40-features/F-004-npm-cli-distribution/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`, `docs/20-security/THREAT_MODEL.md`
- Feature: `docs/40-features/F-004-npm-cli-distribution/`
- Related: `docs/adrs/ADR-0009-local-only-privacy-and-network-boundary.md`,
  `docs/adrs/ADR-0018-bundled-npm-cli-distribution.md`
