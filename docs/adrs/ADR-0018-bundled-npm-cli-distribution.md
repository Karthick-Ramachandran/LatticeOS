# ADR-0018: Bundled Npm Cli Distribution

## Status

Accepted

## Context

The current packed-consumer proof installs seven local tarballs. It proves that the extracted
`lattice` binary works, but it does not give an evaluator one artifact they can install in a separate
repository. `@latticeos/cli` is also private, at version `0.0.0`, and relies on workspace dependency
specifiers that cannot resolve from the npm registry.

LatticeOS needs a small, local-first distribution path before outside evaluation. Publishing now
would require registry authority and a release decision that the repository does not have. The
distribution work must not add runtime network access, telemetry, configuration execution, or a
source-write path.

## Decision

Build a single pre-release `@latticeos/cli` tarball from a temporary staging directory. The staging
package bundles the compiled LatticeOS core, analyzer, adapters, and pinned TypeScript compiler as
npm bundled dependencies. A consumer installs one tarball and receives the public `lattice` binary;
it does not need a workspace link, a private `@latticeos/*` registry package, or a registry download
at install time.

Keep the source workspace package private. The release-preparation command may create only an
OS-temporary staging directory and tarball, validates its fixed package layout, and never invokes
`npm publish`, reads registry credentials, or accepts a caller-selected output path. The package
test installs the generated tarball with `npm --offline --ignore-scripts` into a minimal external
fixture and proves help, version, analysis, generated-cache behavior, and source preservation.

## Alternatives Considered

- Publish all seven `@latticeos/*` packages. Rejected for the pre-release path because it creates a
  registry-versioning and publication workflow before outside product evaluation, and makes a normal
  install depend on several public internal packages.
- Bundle source into a new general-purpose runtime package. Rejected because LatticeOS is CLI
  tooling, not application runtime code, and the existing compiled package boundaries are enough.
- Add a third-party bundler. Rejected because the staged dependency closure can be copied with Node
  platform APIs. This avoids a new build supply-chain dependency and its install lifecycle.
- Publish the current workspace package directly. Rejected because its workspace dependencies do not
  resolve from a clean npm consumer.

## Consequences

Outside evaluators get one offline-installable artifact and a minimal-repository proof without
changing the local-only runtime boundary. The staging script adds developer-only filesystem and
package-manager work, so it must use a fixed temporary root, physical copies rather than symlinks,
bounded expected package inputs, disabled install lifecycle scripts, and exact cleanup.

The tarball is larger because it includes the TypeScript compiler. It remains a pre-release artifact:
no npm publication, provenance attestation, registry access, automated release, or support claim for
arbitrary repositories is introduced. A later publish workflow requires separate human approval and
release review.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-004-npm-cli-distribution/PRD.md`
- Related: `docs/adrs/ADR-0001-ui-os-ownership-boundary.md`,
  `docs/adrs/ADR-0009-local-only-privacy-and-network-boundary.md`
