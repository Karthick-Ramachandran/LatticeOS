# Quality Gates

Do not claim completion without evidence.

Every implementation handoff must include:

- Files changed.
- Tests run.
- Results.
- Skipped checks.
- Documentation changes.
- Remaining risks.

## Required Gates

```text
pnpm test:run
pnpm typecheck
pnpm build
pnpm test:package
pnpm docs:check
persist doctor
```

Phase 1 completion additionally requires fixture goldens and a Reuse benchmark report. A build that
passes unit tests but lacks packed-consumer or benchmark evidence is not the Phase 1 MVP.
