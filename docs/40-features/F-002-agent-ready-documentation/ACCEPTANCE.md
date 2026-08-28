# Acceptance Criteria: Agent Ready Documentation

## Criteria

- **DOC-01 Build:** `apps/docs` installs and completes a production Next.js build on Node 22 or newer.
- **DOC-02 Navigation:** the site has clear Getting started, Features, CLI, Reference, and Contributing
  groups, with Phase 1 Reuse visible from the first page.
- **DOC-03 Feature contract:** every feature marked complete in `docs/40-features` has one public guide
  with outcome, prerequisites, workflow, examples, output, limits, errors, security, test evidence,
  and source links.
- **DOC-04 Copy-ready prompt:** every feature guide has one self-contained Agent implementation prompt
  in a code block with a working copy control. The prompt includes all fields listed in the PRD.
- **DOC-05 Agent access:** `llms.txt`, `llms-full.txt`, and per-page Markdown return the tracked docs
  content without calling an AI model.
- **DOC-06 Accuracy:** code examples and CLI commands are tested or imported from tested fixtures;
  versioned JSON examples validate against the current schema.
- **DOC-07 Links:** internal links and source-of-truth references pass automated validation.
- **DOC-08 Coverage:** a deterministic check fails when a completed feature lacks a guide or Agent
  prompt.
- **DOC-09 Prose:** explanatory prose passes a Humanizer review and keeps facts, code, frontmatter,
  link targets, requirements, and acceptance criteria unchanged.
- **DOC-10 Privacy:** the docs app contains no AI chat, runtime model call, telemetry, analytics, or
  secret-dependent build path.

## Out Of Scope

- A hosted deployment, CMS, AI assistant, or search service.
- Documentation for Phase 2 or later behavior that has not been implemented.
- Generated claims that are not backed by repository memory or tests.
