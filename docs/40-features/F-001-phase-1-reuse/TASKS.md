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
- Fourteen core tests, the dependency-boundary check, generated-schema freshness check, repository
  typecheck, build, package gate, documentation gate, and Persist validation pass.

## T3: Implement Safe Project And React Analysis

Status: In Progress

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
- Package-specific tsconfig projects, index assembly, and the other adapters remain in progress.

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
- Analyzer admission for Tailwind CSS, config, and source files plus shadcn and Storybook evidence
  remain in progress.

## T5: Deliver Reuse CLI Workflows

Status: Todo

Scope:

- Generated index lifecycle and `lattice init`, `search`, `inspect`, and `context` with human/JSON
  output.

Acceptance:

- AC-10 through AC-14 pass; output is compact and deterministic.

Tests:

- CLI integration, JSON golden, cache atomicity, overwrite, external working-directory, and failure
  exit tests.

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
