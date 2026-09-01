# Plan: Agent Ready Documentation

## Approach

Build the smallest complete docs surface before analyzer implementation, then extend it with every
feature task. The first slice provides layout, MDX content, search, LLM-readable routes, copy-enabled
code blocks, and the Agent prompt template. The Phase 1 Reuse guide then becomes the working example
and grows with the CLI.

1. Accept the documentation platform decision and module boundary.
2. Scaffold the Fumadocs app with exact workspace dependencies and production build scripts.
3. Add navigation, styling, MDX components, search, link checks, and LLM-readable routes.
4. Define the feature guide and Agent implementation prompt templates.
5. Write the first Reuse guide and prompt from F-001 memory.
6. Add coverage, link, prompt-shape, and build tests.
7. Humanize explanatory prose, verify no facts changed, and record evidence.

## Boundaries

- Public docs explain tested behavior; they do not accept architecture or product decisions.
- No AI chat, model API, hosted search, telemetry, analytics, or secret is added.
- No feature is documented as available before its implementation evidence exists.
- Code blocks, commands, JSON, frontmatter, links, requirements, and acceptance text are excluded from
  stylistic rewriting.
