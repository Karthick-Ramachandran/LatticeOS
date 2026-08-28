# Module Decisions: Cli

Record durable module decisions here.

## Current Decisions

- [ADR-0001](../../adrs/ADR-0001-ui-os-ownership-boundary.md)
- [ADR-0004](../../adrs/ADR-0004-generated-reuse-index-format-and-lifecycle.md)
- [ADR-0009](../../adrs/ADR-0009-local-only-privacy-and-network-boundary.md)
- [ADR-0014](../../adrs/ADR-0014-latticeos-initialization-configuration-floor.md)

## Implementation notes

- The packed-consumer proof is a developer test harness, not a public CLI interface or a publishing
  workflow. It packs known local package directories and installs their tarballs in a temporary
  fixture before it invokes the installed binary.
