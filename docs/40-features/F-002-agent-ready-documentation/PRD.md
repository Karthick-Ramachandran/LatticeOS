# PRD: Agent Ready Documentation

## Status

Approved for implementation as a Phase 1 supporting feature.

## Purpose

Documentation written after implementation tends to miss the decisions and failure cases discovered
while the feature was built. LatticeOS will document each feature in the same delivery sequence as
its code. A developer should be able to learn the workflow, while an agent should be able to copy one
prompt and implement or extend the feature without relying on chat history.

## In Scope

- A Fumadocs site in `apps/docs` using Next.js, Tailwind CSS, and Fumadocs MDX.
- Tracked feature guides with prerequisites, workflows, examples, outputs, limits, errors, security,
  test evidence, and source-of-truth links.
- One copy-ready Agent implementation prompt for each feature.
- A prompt contract that includes required reading, outcome, scope, ordered work, files/boundaries,
  acceptance criteria, tests, documentation, stop conditions, and completion report format.
- Search, `llms.txt`, `llms-full.txt`, and per-page Markdown output.
- Link validation, production docs build, prompt completeness tests, and feature-to-guide coverage.
- Humanizer review for explanatory prose without changing technical facts or code.

## Non-Goals

- Hosted AI chat, embeddings, analytics, telemetry, user accounts, or documentation CMS.
- Copying every engineering memory file into public prose.
- Replacing accepted ADRs, feature memory, tests, or generated CLI help as sources of truth.
- Publishing or deploying the site before local content and build gates pass.

## Documentation rule

A feature is not complete until its guide and Agent implementation prompt describe the behavior that
passed tests. Documentation changes ship with the feature task that changed the behavior.
