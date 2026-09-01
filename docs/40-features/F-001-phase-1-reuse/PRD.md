# PRD: Phase 1 Reuse

## Status

Approved for implementation.

## Purpose

Give a coding agent accurate, compact evidence about UI that already exists before it creates new
frontend code. Reuse is the foundation for every later LatticeOS phase: if existing UI cannot be
found reliably, semantic guidance, Doctor rules, Figma convergence, and autonomy compound the wrong
decisions.

The active user outcome is simple: in an ordinary React/Next.js/TypeScript/Tailwind repository, a
developer can run `lattice search`, `lattice inspect`, or `lattice context` and immediately see the
components, usages, examples, and exact repeated styling structures relevant to a task.

## In Scope

- Detect repository, workspace, React/Next.js, TypeScript, Tailwind, shadcn, and Storybook markers.
- Index exported React components, default/named exports, props, imports, JSX composition, usages,
  call sites, and statically visible variants.
- Resolve tsconfig projects, path aliases, and workspace package ownership.
- Assign deterministic component IDs and emit a versioned, reconstructable Reuse index.
- Attach provenance to every recommendation: evidence kind, source location, extraction method,
  exact or heuristic classification, source fingerprint, limitations, and ranking explanation.
- Discover Tailwind theme/token evidence and exact repeated static class bundles without executing
  consumer configuration or inventing abstractions.
- Connect optional shadcn and Storybook evidence when present and degrade cleanly when absent.
- Rank components and usage sites for `search`, `inspect`, and bounded task `context` queries.
- Support deterministic human-readable output and mandatory JSON envelopes.
- Provide a safe `lattice init` instruction/config floor with dry-run, skip-existing, and explicit
  force behavior.
- Prove installation and behavior against realistic packed-consumer fixtures and a controlled reuse
  benchmark.

## Non-Goals

- Semantic component intent, `useWhen`/`avoidWhen`, patterns, rules, proposals, or acceptance flows.
- Doctor enforcement beyond the repository's existing Persist memory gate.
- Figma, Code Connect capture, design contracts, browser snapshots, visual comparison, or convergence.
- Similarity-based JSX/class matching, hosted embeddings, AI APIs, or network services.
- Automatic source rewrites, component creation, codemods, or production runtime integration.
- Vue, Svelte, non-TypeScript primary adapters, or claims not backed by fixtures.

## Product Constraint

Phase 2 or later implementation does not begin until every criterion in `ACCEPTANCE.md` passes and
the benchmark shows improved existing-component reuse. Research notes may be recorded without
entering implementation scope.

## Evidence contract

LatticeOS does not return a bare recommendation. A component result explains why it was selected and
links each claim to repository evidence. Phase 1 distinguishes exact facts, corroborating examples,
and heuristics. It never turns a ranking score into semantic certainty.

The structure follows patterns already used by current agent tooling: Storybook tells agents to check
documented props and stories before using a component; Figma Code Connect maps a design component to
the real code path and can attach usage instructions; shadcn registries expose installed and available
component records; Next.js gives agents version-matched local docs. LatticeOS combines local evidence
without requiring those tools.

## Source Requirements

- [`docs/00-product/PRD.md`](../../00-product/PRD.md)
- [`prd.md`](../../../prd.md)
- [`requirement.md`](../../../requirement.md), especially sections 8.1–8.8
