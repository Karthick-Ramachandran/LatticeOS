# Module Test Plan: Benchmark

## Unit Tests

- Validate task, result, annotation, pairing, path, and metric contracts. Reject invalid or missing
  treatment evidence, including a prompt that does not end with its exact saved context or a raw
  delivery artifact that differs from the recorded prompt, and produce stable summaries.
- Test three frozen task manifests, synthetic-only results, insufficient qualified pairs, a treatment
  regression, changed context, control leakage, source-location annotations, and stable output.

## Integration Tests

- The local result checker validates only its fixed result location. With no recorded result it emits
  an insufficient summary and exits nonzero.
- The trial preparer makes two fresh fixture copies, randomizes their order, captures a real CLI
  treatment context, excludes generated cache/report directories, removes only the generated Reuse
  cache, preserves committed Lattice configuration, and leaves the committed fixture unchanged.
- T3 will validate audited agent-trial records without executing a fixture or submission. A qualifying
  run must retain a bounded raw delivery artifact that equals the saved prompt without wrapper
  summarization.

## Security Tests

- Reject paths outside the artifact root, symlinks, unsupported extensions, oversized data, changed
  hashes, control-context leakage, and source text in errors. The symlink assertion is conditional on
  Windows because creating a symlink can require local privileges.
- Prove by implementation review that the harness has no submission execution, network, telemetry,
  or child-process path. The validator has no write path; the preparer has only its bounded temporary
  pair-directory write path.
- The preparer accepts no output path. It writes only below an OS-created temporary directory and
  removes that directory if preparation fails.
