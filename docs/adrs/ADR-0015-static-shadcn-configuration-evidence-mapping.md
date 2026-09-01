# ADR-0015: Static Shadcn Configuration Evidence Mapping

## Status

Accepted

## Context

Phase 1 already detects a valid `components.json`, but detection alone does not help an agent decide
which existing source components belong to the configured shadcn UI area. The product requirements
call for installed, source-owned component evidence while keeping shadcn optional and avoiding any
registry network call or configuration execution.

The `aliases.ui` value can be a repository-relative directory or a TypeScript path alias. The React
bridge already parses direct root compiler aliases as static data, so the optional adapter can use
that limited information without re-reading or executing tsconfig files.

## Decision

The shadcn adapter accepts bounded `components.json` text, normalized React components, and direct
root static compiler aliases supplied by the analyzer. It supports a valid shadcn config with a
string `aliases.ui` value that resolves to one or more in-root component directories through either:

- a repository-relative UI directory; or
- an exact or single-wildcard direct root TypeScript `paths` mapping.

For each React component under a resolved directory, the adapter creates a `registry` evidence record
at the `components.json` alias location and attaches that record to the component. This is
`corroborating` evidence: the config proves the source tree is configured as the shadcn UI location,
but it does not prove a component came from a particular registry, is unmodified, or is appropriate
for every product task.

Malformed config, a missing or unsafe UI alias, unsupported alias patterns, and an alias that maps no
known React components return bounded diagnostics. They do not block normal React analysis. The
adapter reads no filesystem path and executes no configuration. The analyzer alone reads the bounded
config file through `RepositoryRoot` and passes normalized inputs to the adapter.

## Alternatives Considered

- Treat every component next to `components.json` as shadcn. Rejected because projects often keep
  application components beside the config.
- Call the shadcn registry or MCP service. Rejected because Phase 1 is local-only and needs evidence
  about installed source, not remote availability.
- Infer shadcn origin from filenames or Tailwind classes. Rejected because both are weak signals and
  could mislabel custom components.
- Require a full TypeScript configuration resolver. Rejected because ADR-0011 deliberately limits
  current support to direct root compiler options and does not load `extends`.

## Consequences

The Reuse index can identify configured shadcn UI source components with a concrete config location
and a clear limitation. Real configurations that use package-local tsconfig files, multi-step alias
chains, unsupported wildcard patterns, or no `aliases.ui` mapping will degrade to diagnostics until a
fixture and new decision extend the boundary.

Storybook remains separate work. It will consume a stable local manifest rather than parse or execute
Storybook configuration.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/`
