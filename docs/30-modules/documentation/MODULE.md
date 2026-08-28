# Module: Documentation

## Purpose

Keep human and agent documentation current as each feature is built. It renders tracked content with
Fumadocs and makes each feature implementation prompt easy to copy and consume as Markdown.

## Owns

- `apps/docs`, Fumadocs MDX content, navigation, search, copy-enabled code blocks, LLM-readable routes,
  guide/prompt templates, content checks, and docs build configuration.

## Does Not Own

- Product decisions, acceptance authority, implementation behavior, hosted AI, analytics, or public
  deployment infrastructure.

## Public Interfaces

- The docs website, `llms.txt`, `llms-full.txt`, per-page Markdown, and the feature Agent prompt
  contract.

## Boundaries

The module depends on tracked feature memory and tested public behavior. Fumadocs is isolated from the
CLI runtime. Pages may explain accepted memory but cannot replace or contradict it.
