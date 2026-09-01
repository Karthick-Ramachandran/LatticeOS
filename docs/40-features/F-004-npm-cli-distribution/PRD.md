# PRD: Npm Cli Distribution

## Purpose

Turn the existing workspace-only CLI proof into one offline-installable `@latticeos/cli` pre-release
tarball. This lets a developer evaluate `lattice` in a small unfamiliar repository without publishing
packages or giving the CLI access to a registry, service, or application runtime.

## User outcome

A developer can create one local tarball, install it into a clean repository with `npm --offline`,
and run `lattice --help`, `lattice --version`, and a real static analysis command. The CLI remains
local-only and does not rewrite application source.

## In Scope

- A single `@latticeos/cli` pre-release descriptor and a developer-only staging/packing command.
- Bundled compiled LatticeOS core, analyzer, adapters, and TypeScript 6.0.3 runtime closure.
- A minimal external TypeScript/JSX consumer fixture that is not a workspace copy.
- Offline tarball installation with lifecycle scripts disabled, binary verification, real analysis,
  generated-cache validation, and source-preservation checks.
- Fumadocs, README, LLM guidance, CLI module memory, and copy-ready release-test instructions.

## Non-Goals

- `npm publish`, registry authentication, tokens, provenance upload, release automation, or version
  promotion.
- A LatticeOS production runtime, application source changes, new analysis commands, or network
  behavior.
- Replacing the controlled Phase 1 Reuse benchmark with outside-repository feedback.

## Security and quality notes

The package builder writes only inside an OS-created temporary root. It copies a fixed, reviewed
dependency closure as regular files and validates the staged manifest before packing. The test uses
`npm --offline --ignore-scripts`. It does not publish, contact a registry, or execute consumer
source or configuration. Packaging reads the compiled files from the current LatticeOS checkout after
the build; it is not an analyzer or copier for a caller-selected repository.

## Source requirements

- `docs/00-product/BRD.md`
- `docs/00-product/PRD.md`
- `docs/40-features/F-001-phase-1-reuse/PRD.md`
- `docs/adrs/ADR-0018-bundled-npm-cli-distribution.md`
- `docs/adrs/ADR-0019-trusted-build-checkout-package-input.md`
