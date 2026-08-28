# ADR-0003: React, Next.js, TypeScript, and Tailwind first support

## Status

Accepted

## Context

The product needs a narrow ecosystem where component discovery and reuse can be measured. Claiming
general frontend support before fixtures exist would hide gaps and weaken the Reuse benchmark.

## Decision

Phase 1 supports React and Next.js repositories written primarily in TypeScript and styled with
Tailwind CSS. JavaScript syntax that the TypeScript parser can read may appear in fixtures, but it is
not a separate support promise.

shadcn and Storybook are optional evidence sources. Their absence never blocks React analysis. Vue,
Svelte, and other frameworks stay outside Phase 1 until a separate adapter has fixtures, consumer
installation tests, and an accepted support decision.

## Alternatives Considered

- Support React, Vue, and Svelte together. Rejected because it spreads benchmark and parser work
  before one ecosystem is useful.
- Require Storybook or shadcn. Rejected because Phase 1 must help ordinary repositories without tool
  migration.

## Consequences

The first benchmark is specific and testable. Repositories outside the chosen stack get limited or no
value until new adapters exist. Next.js and TypeScript syntax change over time, so every claimed
pattern needs a maintained fixture.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/ACCEPTANCE.md`
