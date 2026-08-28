# Tasks: Phase 1 Reuse

## T1: Establish Durable Scope And Decisions

Status: Done

Scope:

- Reconcile the approved root baselines into product/feature memory.
- Define acceptance, architecture impact, security, tests, conventions, and module boundaries.
- Complete and accept ADR-0001 through ADR-0009.

Acceptance:

- `persist doctor` has no template warnings or ADR-reference errors.
- Product and feature docs explicitly block later phases until the Reuse benchmark passes.
- Product is named LatticeOS and the public CLI command is `lattice` everywhere current memory names
  the executable.

Tests:

- `persist doctor`
- Link/reference inspection.

Do Not:

- Start implementation before PRD, acceptance, architecture impact, and test plan are clear.

## T2: Scaffold Workspace And Core Contracts

Status: Done

Scope:

- Create the strict pnpm/TypeScript workspace, package boundaries, build/test scripts, core domain
  contracts, stable component IDs, deterministic JSON, and tests.

Acceptance:

- Core has no framework/filesystem adapter dependency; IDs and serialization satisfy AC-07/AC-13.

Tests:

- Core unit tests, dependency-boundary check, typecheck, and build.

Evidence:

- The pnpm workspace contains core, analyzer, React, Tailwind, shadcn, Storybook, CLI, and docs
  package boundaries with inward dependencies.
- `@latticeos/core` implements schema version 1, canonical identity, validation, deterministic JSON,
  evidence-backed lexical ranking, explicit resolution, and context budgets.
- Seventeen core tests, the dependency-boundary check, generated-schema freshness check, repository
  typecheck, build, package gate, documentation gate, and Persist validation pass.

## T3: Implement Safe Project And React Analysis

Status: Done

Scope:

- Repository root validation, project/workspace detection, tsconfig/alias resolution, and React
  component/prop/import/export/JSX usage analysis.

Acceptance:

- AC-02 through AC-07 pass on golden fixtures.

Tests:

- Unit, golden fixture, malformed input, traversal, symlink, exclusion, and large-file tests.

Evidence to date:

- `RepositoryRoot` confines reads, rejects traversal and escaping symlinks, excludes secret and
  generated paths, skips discovery symlinks, and bounds files, depth, and bytes.
- `detectProject` returns root and workspace packages plus source-backed React, Next.js, TypeScript,
  Tailwind, shadcn, and Storybook presence without executing configuration.
- The named Next.js workspace discovery golden and ten analyzer tests pass.
- `@latticeos/adapter-react` has a named workspace golden covering named/default/function/arrow/memo/
  forwardRef components, inherited and defaulted literal props, aliases, imports, JSX, composition,
  call sites, deterministic evidence, malformed syntax, and virtual-root traversal rejection.
- `analyzeReactProject` admits a bounded source set through `RepositoryRoot`, assigns nearest package
  ownership, parses direct root tsconfig aliases without loading `extends`, calls the React adapter,
  and marks aggregate source limits as incomplete. Its named project golden and config non-execution
  test pass.
- Complete index assembly and the other adapters remain in progress. Package-specific tsconfig
  inheritance is a later extension to the direct-root configuration boundary.

## T4: Implement Reuse Evidence Adapters

Status: In Progress

Scope:

- Tailwind token/static bundle analysis plus optional shadcn and Storybook evidence.

Acceptance:

- AC-08 and AC-09 pass without executing consumer configuration.

Tests:

- v3/v4 Tailwind, class-merger, dynamic-syntax diagnostic, shadcn, Storybook, absent, and malformed
  fixtures.

Evidence to date:

- `@latticeos/adapter-tailwind` has a named workspace golden for v4 `@theme` variables, direct static
  v3 theme values, className values, fully static `cn` calls, exact reordered repetition, aligned
  source literals, and dynamic-expression diagnostics. It never executes fixture configuration.
- `analyzeTailwindProject` selects Tailwind configuration, CSS, and source files only through
  `RepositoryRoot`. It applies explicit aggregate file, byte, and diagnostic limits, preserves
  incomplete-scan state, and matches its named project golden without executing fixture config.
- `@latticeos/adapter-shadcn` maps a supported `components.json` `aliases.ui` value to normalized
  React components through repository-relative, exact, or one-wildcard direct root aliases. It adds
  corroborating registry evidence, never executes config, and has a named adapter golden.
- `analyzeShadcnProjectFromDiscovery` admits at most 20 config files and 1 MiB of total config text
  by default, then merges matching registry evidence into the Reuse index. It has bridge bounds and
  named index-golden coverage.
- `@latticeos/adapter-storybook` reads the current fixture subset of the built local components
  manifest. It maps a story only through a resolved non-type-only React import and a matching display
  name, then adds corroborating story evidence.
- `analyzeStorybookProjectFromDiscovery` reads only the fixed local manifest path with a 1 MiB
  default bound. Generated Storybook output stays excluded from normal discovery, malformed or
  unmappable input stays bounded, and the combined Reuse index golden proves the evidence link.

## T5: Deliver Reuse CLI Workflows

Status: In Progress

Scope:

- Generated index lifecycle and `lattice init`, `search`, `inspect`, and `context` with human/JSON
  output.

Acceptance:

- AC-10 through AC-14 pass; output is compact and deterministic.

Tests:

- CLI integration, JSON golden, cache atomicity, overwrite, external working-directory, and failure
  exit tests.

Evidence to date:

- `analyzeProject` calls project detection once, combines bounded React, Tailwind, shadcn, and
  Storybook bridge evidence, validates the schema-versioned Reuse index, rejects conflicting
  evidence IDs, and reports a valid partial index when an adapter cap is reached.
- `readReuseIndex` and `writeReuseIndex` safely rebuild the exact generated cache path when state is
  missing, malformed, oversized, or incompatible. Atomic replacement and symlink refusal have
  focused tests.
- `lattice search`, `inspect`, and `context` support `--root` and `--json`, run fresh static
  analysis, safely refresh the generated cache, and use deterministic human or JSON output.
- `lattice init` plans the fixed committed config without creating a directory. `--write` creates it,
  existing config skips, and only `--write --force` replaces it. Focused tests cover human and JSON
  output, root confinement, symlink refusal, and source preservation.
- Packed binary proof remains in progress.

## T6: Prove Consumer Installation And Reuse Improvement

Status: Todo

Scope:

- Pack/install in clean Next.js fixtures and run the documented control vs. treatment benchmark.

Acceptance:

- AC-01, AC-15, and AC-16 pass with committed evidence.

Tests:

- Package smoke/integration, production consumer type/build checks where applicable, benchmark
  assertions, and all repository gates.

## T7: Review And Release Phase 1

Status: Todo

Scope:

- Architecture/conventions/security review, documentation reconciliation, completion report, and
  final Persist validation.

Acceptance:

- No unresolved high-severity finding; all skipped checks and residual risks are explicit.

Tests:

- Full required-gate run from a clean install.
