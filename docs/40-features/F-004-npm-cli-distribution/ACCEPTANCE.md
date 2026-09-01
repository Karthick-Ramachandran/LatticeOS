# Acceptance Criteria: Npm Cli Distribution

## Criteria

- **ACD-01 Single artifact:** the release builder produces exactly one `@latticeos/cli` pre-release
  tarball. Its staged manifest has no workspace specifier and carries all internal LatticeOS packages
  plus TypeScript 6.0.3 as bundled dependencies.
- **ACD-02 Offline consumer:** a clean minimal TypeScript/JSX fixture installs only that tarball with
  `npm --offline --ignore-scripts --no-audit --no-fund` and receives a working `lattice` binary.
- **ACD-03 Runtime behavior:** the installed binary reports the staged package version, serves help,
  and returns a schema-version-1 JSON search result containing the fixture's `Button` component.
- **ACD-04 Consumer safety:** analysis leaves fixture source unchanged and writes only the validated
  `.lattice/cache/reuse-index.json` generated cache.
- **ACD-05 Package safety:** the release builder uses a fresh OS temporary root, fixed package inputs,
  physical regular-file copies, a fixed staging manifest, and no caller-selected output path. It does
  not publish, authenticate, read secrets, contact a network service, or run consumer code/config.
- **ACD-06 Documentation:** Fumadocs and repository guidance distinguish a local pre-release tarball
  from a published npm package and include a complete copy-ready agent prompt.
- **ACD-07 Evidence:** focused release-package tests, all repository gates, `npm pack --dry-run`, and
  `persist doctor` pass before this delivery slice is complete.

## Out Of Scope

- Publication to npm, version promotion, registry credentials, automated releases, and package
  provenance submission.
- Any new Phase 2, Figma, browser, semantic, Doctor, or repair behavior.
