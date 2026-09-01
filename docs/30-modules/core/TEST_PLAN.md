# Module Test Plan: Core

## Unit Tests

- Entity validation, identity round trips, deterministic sorting, ranking ties, ambiguity, budgets,
  schema versions, and invalid input.

## Integration Tests

- Analyzer output validates as `ReuseIndex`; CLI JSON uses the shared envelope.

## Security Tests

- Untrusted strings remain data, paths are repository-relative, and JSON output does not expose
  arbitrary source contents.
