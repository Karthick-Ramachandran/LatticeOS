# Completion Report: Phase 1 Reuse

## Status

Phase 1 is not complete. T2 core, T3 safe project and React analysis, the Tailwind project bridge,
direct Tailwind analysis, deterministic in-memory Reuse index assembly, generated cache, and CLI
initialization/query surface are implemented. Static shadcn configured-source evidence and bounded
local Storybook manifest evidence are implemented. The packed-consumer proof passes. AC-16 passed
on 2026-09-01. F-003 archives nine candidate pairs with a historical 15 versus 14 result, but they
lack the required raw delivery artifacts and the current checker rejects them. AC-15 remains open
until fresh trials prove the agent received the exact saved treatment context.

## Files Changed

- `packages/core`: schema version 1, identity, validation, stable JSON, ranking, resolution, context,
  generated schema, and tests.
- `packages/analyzer`: repository boundary, project discovery, shared bridge orchestration,
  in-memory index assembly, generated cache lifecycle, fixed initialization-config lifecycle, golden
  generation, and security tests.
- `packages/adapters/react`: virtual TypeScript 6.0.3 program, direct component/prop/import/usage
  extraction, diagnostics, fixture golden, and tests.
- `packages/adapters/tailwind`: static CSS-theme, configuration-text, and class-bundle extraction,
  diagnostics, fixture golden, and tests. It does not read a consumer repository or execute config.
- `packages/adapters/shadcn`: static `components.json` alias parsing, configured source-tree mapping,
  corroborating registry evidence, direct golden generation, and tests. It does not read consumer
  paths or call a registry.
- `packages/adapters/storybook`: bounded local components-manifest parsing, import-backed component
  mapping, corroborating story evidence, direct golden generation, and tests. It does not read
  consumer paths, start Storybook, or copy snippets into the index.
- `packages/analyzer`: `analyzeTailwindProject` admits bounded Tailwind configuration, CSS, and
  source text through `RepositoryRoot`, then calls the direct adapter without executing config.
- `packages/analyzer`: `analyzeShadcnProjectFromDiscovery` admits bounded `components.json` text,
  passes direct root aliases plus normalized React components to the direct adapter, and merges its
  evidence into the Reuse index.
- `packages/analyzer`: `analyzeStorybookProjectFromDiscovery` reads only the fixed built-manifest
  path after Storybook detection. General discovery excludes generated Storybook output, and the
  dedicated reader rejects symlinks in the fixed path.
- `packages/cli`: the package gate builds the CLI dependency closure, packs known local package
  directories, installs their tarballs in a temporary controlled consumer, and runs the extracted
  binary. The script disables install lifecycle scripts, restores temporary workspace metadata before
  analysis, verifies cache output and source preservation, and removes only the temporary directory
  it created.
- `fixtures/next-workspace` and `fixtures/goldens`: named project-detection, React, Tailwind, and
  shadcn and Storybook evidence.
- `apps/docs`: Reuse index, safe project-discovery, React-analysis, Tailwind-analysis, and shadcn
  static-evidence guides, plus the Storybook manifest guide, with copy-ready prompts.
- Root contributor, security, license, README, and LLM guidance.
- Feature, module, engineering, review, and lesson memory under `docs/`.

## Tests Run

- `pnpm test:run`: 3 docs tests, 17 core tests, 2 React adapter tests, 2 Tailwind adapter tests,
  3 shadcn adapter tests, 2 Storybook adapter tests, 35 analyzer tests, 4 CLI tests, and 16 benchmark
  tests passed on 2026-09-01.
- `pnpm typecheck`: all eight implementation workspaces passed.
- `pnpm build`: all implementation packages built and the docs app generated 40 routes.
- `pnpm test:package`: passed. The CLI package gate built seven local packages, installed their
  tarballs in the temporary Next.js workspace fixture, ran `lattice --help` and `lattice search Button
  --json`, confirmed the generated schema-version-1 cache, and verified Button source preservation.
- `pnpm docs:check`: content validation, docs tests, typecheck, and the 40-route production build
  passed.
- `persist doctor`: passed; Persist OS found four feature folders, six module folders, and 19 ADRs.

## Skipped checks

No required check was skipped. AC-16 is complete. The F-003 agent-trial artifacts remain diagnostic
only because the wrapper-delivery record does not prove that treatment received the exact saved JSON.

## Engineering standards

The package proof reuses the existing CLI, cache, fixture, and workspace package boundaries. It adds
no runtime dependency, consumer-source execution, published-package workflow, or new product write
location. Its Fumadocs guide, feature memory, module memory, review notes, README, and `llms.txt`
were updated with the same change.

## Results

- Stable component identity and byte-deterministic core JSON are proven.
- Workspace and six-tool project detection match the named golden.
- Traversal, absolute paths, escaping and internal symlinks, exclusions, bounds, malformed input,
  configuration non-execution, and incomplete-scan status are covered.
- Direct React evidence matches its named workspace golden. The adapter indexes the tested component,
  prop, import, alias, JSX, composition, and call forms without executing consumer code.
- The analyzer bridge matches its named project golden. It applies direct root aliases, marks
  aggregate source limits incomplete, and ignores tsconfig `extends` without loading it.
- Direct Tailwind analysis matches its named fixture golden. It reads v4 CSS theme variables, direct
  static v3 theme values, literal class attributes, and fully static merge calls. It reports dynamic
  inputs without copying them into evidence, and preserves original class strings alongside
  normalized repeated bundles.
- The Tailwind project bridge matches its named fixture golden. It applies the repository exclusion,
  per-file, aggregate byte, file-count, and diagnostic boundaries before direct analysis. A fixture
  config that throws when imported is read only as text.
- Static shadcn analysis matches its named fixture golden. It maps a supported `aliases.ui` value to
  configured React component source with corroborating registry evidence and stated limits. It covers
  repository-relative, exact, and single-wildcard direct root aliases without reading a consumer path
  or calling a registry.
- The shadcn bridge admits no more than 20 config files or 1 MiB by default. A config-byte limit
  leaves React components usable and returns a bounded diagnostic. The Reuse index golden resolves
  each new registry evidence ID to its `components.json` source location and limitation.
- Static Storybook analysis matches its named fixture golden. It reads the current tested subset of
  the local built components manifest and attaches a story only through a matching non-type-only
  resolved React import. It does not retain snippets, documentation text, props, imports, or absolute
  paths from the manifest.
- The Storybook bridge reads only `storybook-static/manifests/components.json` and caps it at 1 MiB
  by default. General discovery excludes the generated static directory. The fixed reader rejects
  symlinks at every segment, including a symlink to an in-root excluded secret. Missing, malformed,
  unmapped, and oversized optional evidence leaves React and shadcn output usable with diagnostics.
- `analyzeProject` builds one validated deterministic Reuse index from a shared discovery pass and
  the React, Tailwind, shadcn, and Storybook bridges. Its named golden proves evidence links, repeat
  serialization, and valid partial output after a configured source cap.
- Cache reads return only a valid index hit, a missing state, or an invalid state that callers rebuild.
  Cache writes atomically replace only `.lattice/cache/reuse-index.json` after core validation.
  Tests prove source preservation and refusal of symlinked cache paths.
- `lattice init` plans a fixed committed config without writing by default. `--write` creates it,
  existing content skips, and only `--write --force` replaces it. Dedicated root and CLI tests prove
  source preservation and symlink refusal.
- `lattice search`, `inspect`, and `context` run fresh bounded analysis, refresh only the generated
  cache, and return deterministic human or schema-versioned JSON output.
- The packed artifact is proven in the controlled Next.js fixture. npm extracts the CLI outside the
  worktree, exposes the `lattice` binary, runs help and a real JSON search, writes the valid generated
  cache, and leaves Button source unchanged. The test does not publish packages or execute fixture
  application code.
- The local benchmark harness commits three source-only tasks, prepares randomized temporary matched
  pairs, and validates bounded hash-verified trial records. Nine `agent-trials` pairs are archived
  with a historical 15 versus 14 score, but `pnpm benchmark:check` rejects them because raw delivery
  artifacts are absent. Sixteen focused tests cover the frozen contract, including exact saved
  prompt/context matching and raw delivery equality. Synthetic verifier data remains ineligible.

## Remaining Risks

- AC-15 remains blocked. The recorded `reuse-v1` set has a historical one-annotation margin on
  `fixtures/next-workspace` and `grok-4-6-general-purpose`, but lacks the raw delivery artifacts
  ADR-0020 requires. Rerun all nine pairs with exact verbatim delivery and retain a hash-verified
  `deliveredPrompt` artifact before treating a result as qualified evidence.
- Package-local tsconfig, tsconfig `extends`, multi-step aliases, and more than one shadcn wildcard
  remain unsupported until fixtures and security review define a wider boundary.
- Storybook's rich components manifest is a preview API. Custom output directories, development
  server access, ref formats, and wider fields remain unsupported until fixtures and review define a
  wider boundary.
- The current packed test has a Windows fallback that runs the packed Node entry after it verifies the
  npm shim. A broader platform matrix and the documented filesystem-race assessment remain for final
  release review.
- Phase 1 cannot be released until AC-01 through AC-17 and every quality gate pass together.
