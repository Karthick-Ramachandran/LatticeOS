# Contributing to LatticeOS

LatticeOS is in active Phase 1 development. Contributions should make Reuse more accurate,
traceable, safe, or easier for an agent to consume. Later phases stay out of implementation until the
Phase 1 benchmark passes.

## Start with repository memory

Read `AGENTS.md` and every file it lists before non-trivial work. Durable requirements and decisions
live under `docs/`; chat history is not a source of truth.

For the active feature, also read:

- `docs/40-features/F-001-phase-1-reuse/`
- the affected module under `docs/30-modules/`
- accepted decisions under `docs/adrs/`
- `llms.txt` for the short repository map

## Match the process to the change

A focused fix inside an accepted feature needs implementation, tests, and matching docs. A new
feature, module, dependency boundary, security rule, or data contract needs Persist memory and an ADR
when repository rules call for one.

Run the Persist CLI yourself. Do not leave product or architecture reasoning only in a pull request
description.

## Build one documented slice at a time

Before starting the next substantial task:

1. Update the feature task and affected module memory.
2. Update the Fumadocs behavior, examples, and current limits.
3. Tie claims and examples to tests.
4. Run the documentation gate.

Every feature guide has one complete Agent implementation prompt. Keep the prompt usable without
private chat context.

## Development setup

Use Node.js 22 or newer and pnpm 10.12.3.

```bash
pnpm install
pnpm docs:dev
```

The workspace package boundaries are:

- `packages/core` for framework-neutral contracts;
- `packages/analyzer` for confined repository access and orchestration;
- `packages/adapters/*` for source-specific evidence;
- `packages/cli` for the public `lattice` command;
- `apps/docs` for user and agent documentation.

Dependencies point inward toward core. Application repositories are untrusted input. Do not execute
their source or configuration, read secret paths, write application files, add telemetry, or send
repository evidence over the network.

## Required checks

Run these commands before requesting review:

```bash
pnpm test:run
pnpm typecheck
pnpm build
pnpm test:package
pnpm docs:check
persist doctor
```

Run `pnpm build` and `pnpm docs:check` sequentially because both build the same Next.js docs app.

Phase 1 support claims also need named fixtures. The MVP additionally needs a packed-consumer test
and the documented control versus treatment Reuse benchmark.

## Pull requests

Keep a pull request scoped to one understandable slice. Include:

- behavior changed;
- files and repository memory updated;
- exact checks and results;
- skipped checks and why;
- remaining risks or unsupported forms.

Do not describe planned behavior as shipped. If a command or example is not implemented, label it as
a target contract.
