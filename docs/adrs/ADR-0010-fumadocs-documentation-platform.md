# ADR-0010: Fumadocs documentation platform

## Status

Accepted

## Context

Documentation must ship with each feature rather than being reconstructed after implementation. The
same pages need to work for people browsing examples and agents that need a complete implementation
prompt.

## Decision

Build `apps/docs` with Next.js 16, React 19, Tailwind CSS 4, Fumadocs Core/UI, and Fumadocs MDX. Node
22 is the minimum docs build runtime. Dependency versions are pinned by the workspace lockfile and
validated by a production build.

Each feature guide contains the outcome, prerequisites, concepts, commands, examples, output,
failure cases, security notes, acceptance evidence, and one self-contained Agent implementation
prompt in a copy-enabled code block. The prompt names repository reading, scope, ordered work, tests,
docs, stop conditions, and completion evidence.

The site provides search, `llms.txt`, `llms-full.txt`, and per-page Markdown. These are static docs
representations, not an AI chat service. Fumadocs page actions may expose copy/view controls. An AI
model, hosted search, analytics, and telemetry are not included.

Technical contracts remain precise. Explanatory prose is reviewed with the Humanizer rules supplied
for this project, without changing facts, commands, code, frontmatter, link targets, or requirements.

## Alternatives Considered

- Plain Markdown only. It remains readable in Git, but it does not provide the requested navigation,
  search, copy controls, or LLM routes as a tested product surface.
- Generate docs after the MVP. Rejected because examples and edge cases would drift or be missed.
- Add an AI chat widget. Rejected because it adds network, credentials, privacy, and cost without
  helping the copy-ready prompt requirement.

## Consequences

Users and agents read the same tracked content, and documentation completeness becomes testable in
each feature. The docs app adds Next.js, React, Tailwind, and Fumadocs build dependencies and needs
upgrades over time. A content checklist and link/build tests reduce drift, but they cannot prove that
every example is understandable; review still matters.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-002-agent-ready-documentation/PRD.md`
- External: `https://www.fumadocs.dev/docs`
- External: `https://www.fumadocs.dev/docs/integrations/llms`
