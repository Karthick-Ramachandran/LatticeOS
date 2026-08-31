# reuse-v1 benchmark

This developer-only benchmark measures source-backed canonical reuse on the controlled Next.js
fixture. Its task definitions are pre-registered in `tasks/`. The evaluator reads static result
artifacts and does not execute a submission, fixture configuration, or agent code.

Run the verifier tests with `pnpm test:benchmark`. Run `pnpm benchmark:check` after qualified trials
produce `results/results.json`. Until then the command reports insufficient evidence and exits with a
nonzero status. A missing result is better than a manufactured one.
