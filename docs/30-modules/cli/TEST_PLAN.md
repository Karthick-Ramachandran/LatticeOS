# Module Test Plan: Cli

## Unit Tests

- Command parsing, help, version, root selection, JSON envelopes, ambiguity, formatter snapshots,
  exit mapping, cache refresh, and init plans.

## Integration Tests

- Run the packed `lattice` binary in the controlled Next.js consumer fixture. The package gate packs
  its dependency closure, installs local tarballs without lifecycle scripts, confirms the installed
  package is not a workspace link, runs help plus JSON search, verifies the generated cache, and
  compares the fixture Button source before and after analysis. The same gate stages and installs a
  single bundled CLI tarball offline in a minimal non-workspace TypeScript/JSX fixture, then proves
  version, help, JSON search, generated cache, and source preservation. Source-level tests cover
  copied-fixture init, search, inspect, and context.

## Security Tests

- Traversal, symlink, dry-run, skip-existing, explicit force, stdout redaction, and write
  confinement. Init tests prove a plan creates nothing, and query tests prove only the generated
  Reuse cache changes in a copied consumer fixture. The staging tests reject symlinked inputs and a
  cleanup path not created for staging. The package gate cleans only temporary paths it created and
  restores workspace metadata before it calls the installed legacy binary.
