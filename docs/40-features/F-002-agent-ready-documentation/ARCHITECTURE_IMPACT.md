# Architecture Impact: Agent Ready Documentation

## Affected Modules

- `documentation`: Fumadocs app, MDX content, LLM-readable routes, prompt template, and docs tests.
- `cli`, `core`, `analyzer`, and `adapters`: each module owns the accuracy of examples and reference
  text for its public behavior.

## ADR Impact

[ADR-0010](../../adrs/ADR-0010-fumadocs-documentation-platform.md) accepts Fumadocs, the docs app
boundary, agent-readable routes, and the no-AI-chat decision.

## Security Impact

The docs app adds build dependencies for Next.js 16, React 19, Tailwind CSS 4, Fumadocs Core/UI/MDX,
and their type/build support. It has no auth, secret, runtime model call, telemetry, analytics, or
repository analysis. Content is tracked source. Build output is generated and ignored.

## Source-of-truth boundary

Accepted ADRs and feature memory remain authoritative for engineering decisions and acceptance.
Fumadocs pages explain tested behavior and link to that memory. A docs coverage check connects each
completed feature to its guide so missing documentation fails before release.
