# Test Plan: Phase 1 Reuse Benchmark

## Unit Tests

- Task and result schema validation, path containment, required pairing fields, stable ordering, and
  deterministic summary serialization.
- Reject a missing or changed treatment context, a duplicate run ID, invalid annotation location,
  unsupported expected component, failed test run, missing review, and a synthetic result presented
  as a qualified trial.
- Confirm correct total comparisons: treatment must improve appropriate canonical reuse and must not
  increase inappropriate canonical reuse.

## Integration Tests

- Create treatment context from the existing CLI against a copied controlled fixture; save its exact
  JSON alongside the task record without executing the fixture.
- Validate seeded pass/fail record suites and produce a deterministic human and JSON summary.
- Run the full gate against recorded real results only when they exist. The harness must report
  insufficient evidence rather than passing an empty result set.

## Security Tests

- Reject traversal, absolute paths, symlinks, unsupported file extensions, oversized records, and
  records that point outside the benchmark root.
- Prove the harness never imports/executes a submission or fixture configuration, accesses a network,
  or copies source text and secrets into results or diagnostics.
- Confirm temporary trial workspaces and any generated report path are fixed, bounded, and cleaned or
  reviewed before release.
