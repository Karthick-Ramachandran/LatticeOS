# Tasks: Agent Ready Documentation

## T1: Define scope and platform decision

Status: Done

Scope:

- Complete F-002 requirements, acceptance, plan, tests, documentation module memory, and ADR-0010.

Acceptance:

- `persist doctor` reports no F-002 or documentation module template warning.

Tests:

- `persist doctor`

Do Not:

- Start implementation before PRD, acceptance, architecture impact, and test plan are clear.

## T2: Build the docs foundation

Status: Done

Scope:

- Create the Fumadocs app, navigation, theme, MDX source, search, and production build.

Acceptance:

- DOC-01 and DOC-02 pass.

Tests:

- Typecheck and production build.

Evidence:

- `pnpm docs:check` typechecked the generated source and produced all static documentation routes.

## T3: Add agent-readable and copy surfaces

Status: In Progress

Scope:

- Add copy-enabled code blocks, `llms.txt`, `llms-full.txt`, per-page Markdown, and the Agent prompt
  template.

Acceptance:

- DOC-04, DOC-05, and DOC-10 pass.

Tests:

- Route integration and prompt copy rendering tests.

Evidence:

- The production build includes `/llms.txt`, `/llms-full.txt`, and per-page Markdown routes.
- Code blocks use the Fumadocs copy surface. A rendered interaction test is still required.

## T4: Publish the Phase 1 Reuse guide

Status: In Progress

Scope:

- Write the F-001 guide and Agent prompt. Add tested examples as implementation slices land.

Acceptance:

- DOC-03, DOC-06, and DOC-09 pass for F-001.

Tests:

- Example/schema checks and Humanizer fact-preservation review.

Evidence:

- The Phase 1 guide contains the accepted scope, evidence model, limits, proof gate, and one complete
  Agent implementation prompt.
- Command examples remain labeled as a target contract until the CLI tests prove them.

## T5: Enforce documentation coverage

Status: In Progress

Scope:

- Add feature-to-guide coverage, prompt-shape, and link validation gates.

Acceptance:

- DOC-07 and DOC-08 pass and run in repository quality gates.

Tests:

- Missing guide, missing prompt section, broken link, and valid-site cases.

Evidence:

- Feature-map, prompt-shape, prose-character, dependency-boundary, and internal-link validation run
  in `pnpm docs:check`.
- Missing-prompt and valid-site tests pass. Explicit missing-guide and broken-link test cases remain.
