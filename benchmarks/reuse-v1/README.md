# reuse-v1 benchmark

This developer-only benchmark measures source-backed canonical reuse on the controlled Next.js
fixture. Its task definitions are pre-registered in `tasks/`. The evaluator reads static result
artifacts and does not execute a submission, fixture configuration, or agent code.

Run the verifier tests with `pnpm test:benchmark`. Run `pnpm benchmark:check` after qualified trials
produce `results/results.json`. Until then the command reports insufficient evidence and exits with a
nonzero status. A missing result is better than a manufactured one.

Prepare one fresh randomized pair with:

```bash
pnpm benchmark:prepare \
  --task notification-settings \
  --pair notification-pair-1 \
  --agent-label <agent-label> \
  --agent-version <agent-version> \
  --agent-config-hash <sha256-of-the-agent-configuration>
```

The command creates an OS temporary directory with separate `control` and `treatment` workspaces,
the two prompts, the exact treatment context, and a `trial-plan.json`. It does not start an agent,
run a submission, create `results.json`, or change the committed fixture. Follow the order in the
prepared `README.md`, then have an independent reviewer create the audited result record.
