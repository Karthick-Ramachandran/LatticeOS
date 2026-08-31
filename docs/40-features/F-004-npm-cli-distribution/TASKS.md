# Tasks: Npm Cli Distribution

## T1: Define distribution scope

Status: Done

Scope:

- Create F-004 delivery memory and ADR-0018.
- Define a single offline-installable pre-release tarball without publication.

Acceptance:

- ACD-01 through ACD-07 are measurable, and the plan preserves the Phase 1 benchmark gate.

Tests:

- `persist doctor` validates F-004 and ADR-0018 after its acceptance.

Do Not:

- Start implementation before PRD, acceptance, architecture impact, and test plan are clear.

## T2: Build the self-contained package

Status: Done

Scope:

- Create the fixed temporary staging builder, package descriptor, bundled compiled closure, and
  developer-only local tarball command.

Acceptance:

- The staged tarball contains the one executable package and no workspace dependency specifier.

Tests:

- `pnpm --filter @latticeos/cli test:npm-package` checks regular-file copying, symlink rejection, and
  cleanup confinement. The package proof checks manifest, closure, dry-run, and tarball contents by
  installing the generated artifact.

Do Not:

- Publish, read registry credentials, add a runtime network path, or accept an output path.

## T3: Prove a minimal external consumer

Status: Done

Scope:

- Add the clean TypeScript/JSX fixture and install the one tarball offline with lifecycle scripts disabled.

Acceptance:

- Help, version, JSON search, source preservation, and generated cache all pass from the installed
  package, with no workspace link or registry download.

Tests:

- `pnpm test:package`, `npm pack --dry-run`, and full repository gates.

Do Not:

- Call this package published or replace the controlled Reuse benchmark.

## T4: Review and hand off

Status: Done

Scope:

- Update docs, module memory, review, completion evidence, and release-test prompt.

Acceptance:

- External evaluators can follow one clear local-tarball path without secret, registry, or publish
  instructions.

Evidence:

- Independent review found and drove fixes for descriptor validation, temporary cleanup ownership,
  architecture-memory drift, and test naming. ADR-0019 records the remaining trusted-checkout limit.
