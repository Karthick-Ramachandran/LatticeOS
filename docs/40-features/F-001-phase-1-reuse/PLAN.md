# Plan: Phase 1 Reuse

## Approach

Deliver Reuse as vertical, independently testable slices. Every slice keeps core framework-neutral,
treats consumer repositories as untrusted data, emits deterministic evidence, and updates durable
memory. The CLI is introduced early enough to exercise real user workflows, but Phase 1 release
claims wait for the packed-consumer proof and benchmark to pass.

1. Approve product scope, measurable acceptance, module boundaries, security posture, and the nine
   Reuse-critical ADRs.
2. Scaffold a strict TypeScript/pnpm workspace with `core`, `analyzer`, adapters, CLI, and fixtures.
3. Implement core entities, stable IDs, deterministic JSON, ranking, and bounded context.
4. Implement safe repository discovery and TypeScript project/workspace resolution.
5. Implement React component, prop, export, import, JSX composition, usage, alias, and variant
   evidence with golden fixtures.
6. Implement conservative Tailwind, shadcn, and Storybook adapters with diagnostics and fixtures.
7. Implement generated-index lifecycle and `lattice init/search/inspect/context` human and JSON
   workflows.
8. Harden path/file-write security, malformed input, deterministic output, and performance bounds.
9. Keep the passing packed-artifact test in the clean Next.js fixture and run the controlled Reuse
   benchmark.
10. Complete cross-boundary review, quality gates, Persist validation, and release evidence.

## Boundaries

- No application-source writes or production runtime package.
- No repository code/config execution; static evidence only.
- No semantic acceptance, Doctor engine, Figma, browser, Converge, or closed-loop implementation.
- No similarity recommendation presented as exact reuse.
- No untested support claim.
- No later phase begins until the Phase 1 exit gate passes.

## Delivery Order Rationale

Stable normalized evidence comes before ranking, and ranking comes before agent context. Optional
adapters follow accurate React/TypeScript inventory. Packaging and benchmark evidence are part of the
MVP, not post-MVP polish.
