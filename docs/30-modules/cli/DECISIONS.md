# Module Decisions: Cli

Record durable module decisions here.

## Current Decisions

- [ADR-0001](../../adrs/ADR-0001-ui-os-ownership-boundary.md)
- [ADR-0004](../../adrs/ADR-0004-generated-reuse-index-format-and-lifecycle.md)
- [ADR-0009](../../adrs/ADR-0009-local-only-privacy-and-network-boundary.md)
- [ADR-0014](../../adrs/ADR-0014-latticeos-initialization-configuration-floor.md)
- [ADR-0018](../../adrs/ADR-0018-bundled-npm-cli-distribution.md)
- [ADR-0019](../../adrs/ADR-0019-trusted-build-checkout-package-input.md)

## Implementation notes

- The packed-consumer proof is a developer test harness, not a public CLI interface or a publishing
  workflow. The legacy check packs known local packages into seven tarballs. The external check
  stages one bundled `@latticeos/cli` tarball, installs it offline into a temporary minimal fixture,
  and then invokes the installed binary.
