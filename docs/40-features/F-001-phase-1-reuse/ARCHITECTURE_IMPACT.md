# Architecture Impact: Phase 1 Reuse

## Affected Modules

- `core`: normalized entities, stable IDs, search ranking, context budgets, and JSON schemas.
- `analyzer`: repository boundary, project discovery, orchestration, diagnostics, and cache lifecycle.
- `adapters`: React/TypeScript, Tailwind, shadcn, and Storybook evidence translation.
- `cli`: the public `lattice` command, safe initialization, formatting, and exit behavior.

## ADR Impact

The feature introduces the repository's initial architecture. Implementation depends on accepted
ADR-0001 through ADR-0013 in `docs/adrs/`; ADR-0011 replaces the incompatible TypeScript 7
assumption. Later-phase ADRs listed in the product baseline are not pulled forward.

## Security Impact

There is no auth, server, networking, telemetry, MCP runtime, AI API, or production runtime. The CLI
reads untrusted repository data and writes reconstructable state only under validated `.lattice/`
paths. The TypeScript compiler is a pinned analyzer dependency. Security tests cover root confinement,
symlink escape, secret/generated exclusions, non-execution, bounded inputs, and overwrite safety.

## Data And Compatibility Impact

The generated Reuse index and CLI JSON envelopes start at schema version 1. They are not accepted
product knowledge and may be regenerated. Schema changes require migration or an explicit major
schema version. Repository paths are relative POSIX paths so output is portable across hosts.

## Documentation Impact

The product, architecture, security, quality, engineering conventions, module memory, README, CLI
help, JSON schema, benchmark method, and completion evidence must agree before release.
