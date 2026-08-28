# Architecture

## Status

Accepted Phase 1 architecture. Later-phase boundaries require additional ADRs before implementation.

## System Boundary

LatticeOS is local developer tooling. The `lattice` CLI reads repository-owned configuration and
source evidence, normalizes it into a framework-neutral model, ranks task-specific reuse candidates,
and emits human or versioned JSON output. It never becomes application production runtime code.

```text
CLI / future read-only agent interfaces
                 |
                 v
        Analyzer orchestration
          /      |       \
     React   Tailwind   optional evidence adapters
          \      |       /
                 v
      framework-neutral core index
                 |
                 v
       search / inspect / context
```

## Package Boundaries

- `packages/core` owns serializable normalized entities, stable identity, deterministic ranking, and
  context budgeting. It imports no framework or filesystem analyzer.
- `packages/analyzer` owns repository discovery, TypeScript project resolution, orchestration,
  diagnostics, generated-index lifecycle, and safe path boundaries.
- `packages/adapters/*` translate React, Tailwind, shadcn, and Storybook evidence into core entities.
- `packages/cli` owns argument parsing, presentation, exit behavior, and safe initialization.
- `apps/docs` owns the Fumadocs site and renders tracked user and agent guidance. It is not a runtime
  dependency of the `lattice` CLI.
- `fixtures/*` are controlled consumer repositories and benchmark inputs, never production packages.

Adapters depend inward on core contracts. Core never depends on React, Next.js, Tailwind, Storybook,
shadcn, the CLI, or generated file formats.

## Phase 1 Data Flow

1. Resolve and validate a repository root without following work outside it.
2. Detect workspace packages, project markers, tsconfig files, and optional tools without executing
   repository code.
3. Parse TypeScript/JavaScript through the pinned TypeScript Compiler API and collect React evidence.
4. Conservatively collect static Tailwind, shadcn, and bounded local Storybook manifest evidence.
5. Normalize repository-relative paths and stable IDs, sort output deterministically, and build the
   versioned Reuse index.
6. Serve `search`, `inspect`, and bounded task `context` from that index; refresh when requested or
   stale according to the documented cache contract.

## State

- Accepted project configuration is committed under `.lattice/`.
- Generated, reconstructable state is written only under `.lattice/cache/` or `.lattice/reports/`.
- Generated JSON uses explicit schema versions, repository-relative POSIX paths, stable ordering,
  atomic replacement, and no secrets.
- Application source is read-only. Existing files are skipped unless the user gives an explicit
  force option for a LatticeOS-owned path.
- `lattice init` owns only `.lattice/config.json`. It plans by default, creates only with `--write`,
  and replaces that file only with `--write --force`.

## Accepted Decisions

- [ADR-0001](../adrs/ADR-0001-ui-os-ownership-boundary.md)
- [ADR-0002](../adrs/ADR-0002-framework-neutral-core-with-adapters.md)
- [ADR-0003](../adrs/ADR-0003-react-next-typescript-tailwind-first-support.md)
- [ADR-0004](../adrs/ADR-0004-generated-reuse-index-format-and-lifecycle.md)
- [ADR-0005](../adrs/ADR-0005-stable-component-identity.md)
- [ADR-0011](../adrs/ADR-0011-typescript-6-compiler-api-for-phase-1-analysis.md) (supersedes ADR-0006)
- [ADR-0007](../adrs/ADR-0007-tailwind-static-analysis-boundary.md)
- [ADR-0008](../adrs/ADR-0008-support-evidence-policy.md)
- [ADR-0009](../adrs/ADR-0009-local-only-privacy-and-network-boundary.md)
- [ADR-0010](../adrs/ADR-0010-fumadocs-documentation-platform.md)
- [ADR-0012](../adrs/ADR-0012-static-source-evidence-extraction-method.md)
- [ADR-0013](../adrs/ADR-0013-tailwind-class-bundle-occurrence-representation.md)
- [ADR-0014](../adrs/ADR-0014-latticeos-initialization-configuration-floor.md)
- [ADR-0015](../adrs/ADR-0015-static-shadcn-configuration-evidence-mapping.md)
- [ADR-0016](../adrs/ADR-0016-bounded-storybook-manifest-evidence.md)
