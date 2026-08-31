# Completion Report: Phase 1 Reuse Benchmark

## Status

In progress. The protocol, three pre-registered task manifests, local validator, fixed result checker,
and synthetic verifier fixtures are implemented. Qualified agent trials are still pending.

## Files Changed

- `benchmarks/reuse-v1`: task manifests, bounded artifact contract, result validator, fixed checker,
  synthetic verifier fixtures, and focused tests.
- Root package scripts, Fumadocs guidance, F-003 and benchmark module memory, F-001 status, README,
  and `llms.txt`.

## Tests Run

- `pnpm test:benchmark` passes with nine focused tests.
- `pnpm benchmark:check` intentionally reports `insufficient` and exits with status 1 while no real
  result record exists.
- `pnpm test:run` passes: 3 docs, 17 core, 2 React adapter, 2 Tailwind adapter, 3 shadcn adapter,
  2 Storybook adapter, 35 analyzer, 4 CLI, and 9 benchmark tests.
- `pnpm typecheck` passes across all eight implementation workspaces.
- `pnpm build` passes and generates 40 documentation routes.
- `pnpm test:package` passes the packed CLI consumer proof.
- `pnpm docs:check` passes content validation, docs tests, typecheck, and the 40-route production
  build.
- `persist doctor` passes with 3 feature folders, 6 module folders, and 17 ADRs.

## Skipped checks

No required quality gate was skipped. Real-agent trials are not a skipped check. They are the next
delivery task and the evidence F-001 AC-15 still requires.

## Results

- The validator accepts only records that follow the frozen contract, and synthetic records always
  receive `not-eligible` status.
- No qualified benchmark result exists. F-001 AC-15 remains unmet.
- The current checker has no `results.json`, so it correctly returns `insufficient` rather than a
  passing summary.

## Remaining Risks

- The controlled fixture cannot establish behavior on arbitrary repositories.
- Qualified agent trials require fresh matched runs and an independent reviewer. The harness must not
  substitute seeded verifier data for those runs.
- The Windows symlink assertion needs local symlink privileges. The validator still rejects symlinks
  on every platform.
