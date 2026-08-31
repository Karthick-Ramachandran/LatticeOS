# Module Test Plan: Benchmark

## Unit Tests

- Validate task, result, annotation, pairing, path, and metric contracts. Reject invalid or missing
  treatment evidence and produce stable summaries.
- Test three frozen task manifests, synthetic-only results, insufficient qualified pairs, a treatment
  regression, changed context, control leakage, source-location annotations, and stable output.

## Integration Tests

- The local result checker validates only its fixed result location. With no recorded result it emits
  an insufficient summary and exits nonzero.
- T3 will generate treatment context from the CLI in copied fixtures and validate audited agent-trial
  records without executing a fixture or submission.

## Security Tests

- Reject paths outside the artifact root, symlinks, unsupported extensions, oversized data, changed
  hashes, control-context leakage, and source text in errors. The symlink assertion is conditional on
  Windows because creating a symlink can require local privileges.
- Prove by implementation review that the harness has no submission execution, network, telemetry,
  child-process, or runtime write path.
