# Module Test Plan: Cli

## Unit Tests

- Command parsing, help, version, root selection, JSON envelopes, ambiguity, formatter snapshots,
  exit mapping, cache refresh, and init plans.

## Integration Tests

- Run the built and packed `lattice` binary in clean consumer fixtures from multiple working
  directories. Source-level tests currently cover copied-fixture search, inspect, and context.

## Security Tests

- Traversal, symlink, skip-existing, explicit force, stdout redaction, and write confinement. Query
  tests prove only the generated Reuse cache changes in a copied consumer fixture.
