# Conventions

The canonical reusable vocabulary for this repository. Agents reuse these names and locations rather
than inventing parallel models or helpers.

## Canonical Primitives

- `UiProject`, `UiPackage`, `UiComponent`, `UiProp`, `UiUsage`, `UiImport`, `EvidenceRecord`,
  `RecommendationReason`, `AnalysisDiagnostic`, and `ReuseIndex` are framework-neutral domain
  contracts in `packages/core`.
- `ComponentId` and its constructor/parser in `packages/core` are the only component identity
  implementation.
- `RepositoryRoot` validation in `packages/analyzer` is the only authority for repository reads and
  LatticeOS-owned writes.
- `LATTICE_CONFIG_PATH`, `INITIAL_LATTICE_CONFIG_CONTENT`, and the dedicated `RepositoryRoot` config
  methods are the only initialization-config path and writer. They do not accept an output path.
- Adapter outputs implement `packages/core` contracts; adapters do not publish parallel component or
  diagnostic shapes.
- `analyzeShadcn` and `analyzeShadcnProjectFromDiscovery` are the only configured shadcn source-tree
  mapper. They reuse normalized React components and attach corroborating `registry` evidence rather
  than inventing a registry component model.
- `STORYBOOK_COMPONENTS_MANIFEST_PATH`, `RepositoryRoot.readStorybookComponentsManifest`,
  `analyzeStorybook`, and `analyzeStorybookProjectFromDiscovery` are the only Storybook manifest
  path and mapper. They require a resolved React story import and matching display name before they
  attach corroborating `story` evidence.
- CLI JSON envelopes use the schema/version helpers in `packages/core`.
- Test repositories live under `fixtures/`; reusable fixture builders live with analyzer tests.
- Feature guides and copy-ready Agent prompts use the shared templates in `apps/docs/content/templates`.
- Workspace packages extend `tsconfig.package.json`; package builds emit from `src/` to `dist/`.

## Naming Conventions

- Published packages use the `@latticeos/*` scope; the public binary is `lattice`; folders use
  lowercase kebab-case.
- Core entities use `Ui*`; analyzer operations use verbs such as `analyzeProject` and
  `buildReuseIndex`; adapters use `analyze<Source>`.
- Repository paths in data and snapshots are POSIX-style and relative to the analyzed root.
- Diagnostics and JSON schemas carry explicit stable codes or versions.
- Source-package tests use `*.test.ts`. Developer-only package boundary tests that Node runs directly
  may use `*.test.mjs`; golden data uses `*.golden.json`.

## Rules

- Core imports no framework, parser adapter, CLI, or filesystem implementation.
- Never execute an analyzed repository's source or configuration.
- Never write application source; write only validated LatticeOS-owned paths.
- Preserve exact evidence and label heuristics or unsupported dynamic syntax explicitly.
- Every recommendation reason references one or more `EvidenceRecord` IDs; never emit an unsupported
  prop, variant, or semantic claim from a ranking score.
- Sort serialized collections deterministically before snapshots or cache writes.
- Keep task context bounded; do not send the full index when ranked evidence suffices.
- Reuse Node platform APIs before adding a general-purpose runtime dependency.

## Anti-Patterns

- Do not infer semantic equivalence from visual or class similarity in Phase 1.
- Do not auto-create components from repeated Tailwind bundles; report evidence only.
- Do not hide Tailwind behind a LatticeOS styling language.
- Do not silently accept inferred knowledge or resolve source conflicts.
- Do not claim Figma, Storybook, shadcn, monorepo, or framework support without fixtures.
- Do not begin Converge/Figma implementation before the Phase 1 benchmark gate passes.
