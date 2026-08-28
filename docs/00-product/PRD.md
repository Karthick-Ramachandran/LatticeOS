# Product Requirements: LatticeOS

## Status

Approved product baseline. Phase 1 Reuse is active; later phases are intentionally gated.

## Product Definition

LatticeOS is a repository-native, local-first control plane for coding agents. It exposes four eventual
capabilities:

- **Reuse:** find existing UI before creating more.
- **Understand:** retrieve product meaning, patterns, and accepted design rules.
- **Doctor:** deterministically enforce objective UI requirements.
- **Converge:** diagnose differences between design intent and rendered UI.

The coding agent remains responsible for application implementation. LatticeOS does not generate or
ship application UI and requires no production runtime integration.

## Source Ownership

- Visual intent belongs to Figma.
- Executable behavior belongs to application source.
- Styling tokens belong to Tailwind, CSS, or the repository token source.
- Examples belong to Storybook and repository usage sites.
- Accepted product meaning and rules belong to committed LatticeOS knowledge.
- Machine inference is proposed evidence only; chat is never authoritative.

Conflicts are reported rather than silently resolved.

## Active MVP: Phase 1 Reuse

Phase 1 answers: **What UI already exists?** It must work in an ordinary React/Next.js/TypeScript/
Tailwind repository without Figma, Storybook, shadcn, or manual semantic metadata.

Required capabilities:

- project and package detection;
- exported React component inventory with stable IDs;
- TypeScript prop, import, export, JSX composition, usage, and call-site evidence;
- tsconfig path-alias and workspace boundary support;
- Tailwind presence, theme/token, static class, and exact repeated-bundle analysis;
- optional shadcn and Storybook evidence with graceful absence;
- deterministic `search`, `inspect`, and task-specific `context` commands;
- human-readable and versioned JSON output;
- compact, ranked context with explicit limits;
- safe, local generated state and no application-source rewrites;
- controlled benchmark evidence that the agent reuses more existing UI.

The public CLI command is `lattice`. The detailed requirements, acceptance criteria, plan, and tests live in
[`F-001 Phase 1 Reuse`](../40-features/F-001-phase-1-reuse/PRD.md).

Feature documentation ships during implementation. The Fumadocs site, agent-readable routes, and
copy-ready prompt contract are defined in
[`F-002 Agent Ready Documentation`](../40-features/F-002-agent-ready-documentation/PRD.md).

## Phase 1 Exit Gate

Phase 1 is not complete until a packed CLI works against realistic Next.js fixtures, inventory and
usage evidence match golden expectations, Tailwind repetition is found deterministically, optional
adapters degrade cleanly, context remains within its configured budget, and a documented control vs.
treatment benchmark shows better canonical reuse.

## Later Phases

- Phase 2 adds optional semantic component, pattern, rule, convention, lesson, proposal, and source
  relationships.
- Phase 3 turns accepted objective knowledge into a deterministic Doctor contract.
- Phase 4 adds Figma-derived design contracts and browser evidence for semantic, structural, and
  visual convergence.
- Phase 5 adds a bounded Build → Check → Repair loop with explicit escalation.

No Figma capture, node-to-DOM mapping, screenshot comparison, or autonomous repair loop belongs in
the active MVP.

## Overall Product Success

The long-term north-star metric is Human Correction Turns. Directional mature-repository targets are
greater than 80% reuse when an exact canonical component exists and a substantial reduction in
mechanical correction work, while preserving custom UI and human judgment.

## Normative Baselines

This document is the durable summary. The original approved baselines remain available as
[`prd.md`](../../prd.md) and [`requirement.md`](../../requirement.md); the active feature memory makes
Phase 1 requirements testable and implementation-ready.
