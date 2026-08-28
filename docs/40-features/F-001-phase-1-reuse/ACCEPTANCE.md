# Acceptance Criteria: Phase 1 Reuse

## Criteria

- **AC-01 Install:** a packed LatticeOS artifact installs and `lattice --help` plus a real analysis
  command run successfully in a clean realistic Next.js consumer fixture.
- **AC-02 No rewrite:** analysis changes no application source; generated writes stay in validated
  `.lattice/cache/` or `.lattice/reports/` paths.
- **AC-03 Project detection:** JSON output identifies workspace packages and present/absent React,
  Next.js, TypeScript, Tailwind, shadcn, and Storybook evidence without executing repository code.
- **AC-04 Component inventory:** golden fixtures cover named/default/function/arrow/memo/forwardRef
  components and reject clear non-components with 100% expected precision and recall on the fixture.
- **AC-05 Type evidence:** interface, type-alias, inline, inherited, optional, defaulted, and visible
  variant props are represented accurately or carry an explicit unsupported diagnostic.
- **AC-06 Usage graph:** imports, aliases, JSX composition, call sites, and usage counts match golden
  expectations across Next.js App Router and workspace fixtures.
- **AC-07 Stable identity:** repeated analysis produces byte-stable IDs and sorted JSON; unrelated
  edits do not change component IDs.
- **AC-08 Tailwind evidence:** supported v3 configuration text and v4 `@theme` CSS tokens are found;
  exact repeated static bundles at the configured threshold include every expected location.
- **AC-09 Optional evidence:** shadcn and Storybook fixtures connect available evidence; their absence
  or malformed optional data produces bounded diagnostics without blocking core analysis.
- **AC-10 Search:** `lattice search <query>` returns deterministic ranked components and usage sites
  using exact repository evidence.
- **AC-11 Inspect:** `lattice inspect <id-or-name>` returns component props, exports, imports,
  composition, usages, source evidence, and diagnostics; ambiguity is explicit.
- **AC-12 Context:** `lattice context <task>` returns at most the configured item and character
  budgets, prioritizes exact component evidence, and identifies truncation.
- **AC-13 JSON contract:** detection, search, inspect, and context JSON use explicit schema versions,
  repository-relative POSIX paths, stable ordering, and golden snapshots.
- **AC-14 Safety:** traversal, escaping symlinks, secret/build/dependency paths, malformed source,
  oversized files, and overwrite behavior pass the security test suite.
- **AC-15 Reuse proof:** a documented control vs. treatment benchmark records higher appropriate
  canonical reuse with LatticeOS, no increase in inappropriate reuse, and the complete task context.
- **AC-16 Quality:** typecheck, unit/integration/security/golden tests, build, packed-consumer test,
  and `persist doctor` pass with no errors.
- **AC-17 Evidence:** every search/context candidate includes source-backed reason codes and evidence
  IDs; inspect resolves each evidence ID to its location, method, classification, fingerprint, and
  limitation. Golden tests reject unsupported props or untraceable recommendation claims.

## Out Of Scope

- Any Figma, design-contract, browser, screenshot, Converge, or autonomous repair implementation.
- Semantic equivalence claims based only on Tailwind or visual similarity.
- Automatic creation or replacement of application UI.
- Support claims beyond tested fixtures.
