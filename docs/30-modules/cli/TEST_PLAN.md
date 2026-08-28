# Module Test Plan: Cli

## Unit Tests

- Command parsing, help, version, root selection, JSON envelopes, ambiguity, formatter snapshots,
  exit mapping, cache refresh, and init plans.

## Integration Tests

- Run the built and packed `lattice` binary in clean consumer fixtures from multiple working
  directories. Source-level tests cover copied-fixture init, search, inspect, and context.

## Security Tests

- Traversal, symlink, dry-run, skip-existing, explicit force, stdout redaction, and write
  confinement. Init tests prove a plan creates nothing, and query tests prove only the generated
  Reuse cache changes in a copied consumer fixture.
