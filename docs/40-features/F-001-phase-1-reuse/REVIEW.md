# Review: Phase 1 Reuse

## Status

In progress. The T2 core, T3 discovery and React bridge, direct and bridged Tailwind analysis,
static shadcn and Storybook evidence, generated writes, CLI behavior, and the packed-consumer proof
were reviewed on 2026-08-29. ADR-0017 defines the benchmark protocol; its harness and qualified agent
trials still require review.

## Findings

### Blockers

- None remain in the reviewed core and discovery checkpoints.

### Resolved during review

- Missing tools after skipped files, symlinks, malformed manifests, or scan limits now report
  `unknown` rather than unsupported `absent` certainty.
- File reads allocate only the configured byte limit plus one byte and enforce a 16 MiB hard cap.
- Directory traversal streams entries, caps per-directory fanout, bounds total visited files, and
  does not follow symlinks.
- `.lattice/cache` and `.lattice/reports` are excluded without blocking committed `.lattice`
  configuration.
- Repository paths reject control characters, traversal, absolute child paths, and escaping
  symlinks before evidence is built.
- An arbitrary `components.json` no longer proves shadcn presence; the marker must parse and match a
  supported shadcn shape.
- pnpm workspace list parsing is confined to the `packages` section and honors basic negated globs.
- Golden output moved outside its consumer fixture root to avoid self-referential inventory.
- Default prop expressions are reduced to a boolean `defaulted` marker. The React tests prove a
  default string does not enter adapter output.

### React adapter security review

No blocker was found in the direct React analysis slice.

- `analyzeReact` receives source text and compiler settings only. It imports no Node filesystem,
  child-process, network, MCP, cloud, telemetry, dynamic-evaluation, or consumer-configuration API.
- Its TypeScript host resolves from an in-memory map of validated relative paths. It uses no default
  library, has no emit path, and cannot read a module that the caller did not supply.
- Traversal and duplicate virtual paths are rejected. Malformed syntax becomes bounded diagnostics
  with relative locations. Tests assert that malformed source and default expressions do not appear
  in output.
- TypeScript 6.0.3 is exact in the lockfile, uses Apache-2.0, and has no install lifecycle script.
  ADR-0011 records why the package is confined to the analyzer-facing dependency boundary.
- The golden-update script writes one fixed test snapshot only when a developer explicitly runs the
  `golden:update` command. It is not shipped as analyzer or CLI behavior and cannot receive a
  consumer-controlled path.

The adapter has not yet read consumer files itself. `RepositoryRoot` remains the required authority
for exclusions, symlink handling, per-file bounds, and source admission.

### React project bridge security review

No blocker was found in the bridge from repository discovery into React analysis.

- The bridge lists and reads every consumer path through `RepositoryRoot`. Its selected source set
  inherits the repository's exclusion, symlink, and per-file controls.
- It stops before TypeScript receives more than 5,000 files or 20 MiB by default. A selection limit
  marks the result truncated and emits a bounded diagnostic instead of presenting partial evidence
  as complete.
- The root tsconfig parser reads text only. It accepts comments, inspects direct `baseUrl` and
  `paths`, ignores `extends`, rejects unsafe base URLs and alias targets, and does not execute or
  merge another configuration file.
- Compiler-path aliases are bounded. The bridge handles prototype-sensitive alias keys without
  placing them in the returned map. Tests cover an escaping target and `__proto__` input.
- Runtime analysis has no write, network, telemetry, cloud, MCP, AI API, child-process, or dynamic
  evaluation path. The only new write is the explicit developer golden-update command, which has a
  fixed fixture output path.

The root-only configuration boundary is intentional and documented. Package-specific tsconfig files
and inherited configuration need a new fixture and security review before they are added.

### Tailwind adapter security review

No blocker was found in the direct Tailwind analysis slice.

- `analyzeTailwind` receives caller-supplied text only. Runtime adapter code imports `node:crypto`
  for stable fingerprints and has no filesystem, child-process, network, telemetry, MCP, cloud,
  dynamic-evaluation, or consumer-configuration execution path.
- CSS and configuration input are parsed as text. The fixture configuration throws when loaded, and
  the passing test proves analysis does not load it. Imported values, variables, functions, plugins,
  interpolated templates, and other dynamic values are not evaluated or copied into tokens.
- Source scanning ignores ordinary strings and comments. Dynamic class expressions and mixed merge
  calls return bounded diagnostics without copying their contents into evidence. Tests prove a
  dynamic value named `not-for-output` is absent from the full result.
- Direct literal `className` evidence is exact static-source evidence. Bare `cn`, `clsx`, and
  `classnames` matches are heuristic because the adapter does not resolve their imports; the
  evidence record includes that limitation.
- The golden-update script is an explicit developer command. It writes only the fixed repository
  fixture snapshot and is outside the runtime adapter and future CLI paths.

The adapter deliberately has no repository read authority. `analyzeTailwindProject` selects CSS,
configuration, and source files through `RepositoryRoot`, enforces aggregate limits before it calls
the adapter, and has its own review below.

### Tailwind project bridge security review

No blocker was found in the bridge from repository discovery into Tailwind analysis.

- The bridge calls `detectProject` and reads candidate files only through `RepositoryRoot`. It keeps
  discovery exclusions, root containment, symlink handling, and per-file limits intact.
- It stops before Tailwind analysis receives more than 5,000 files or 20 MiB by default. A file,
  byte, unreadable-source, or discovery limit makes the result truncated and reports a bounded
  diagnostic instead of presenting partial evidence as complete.
- Only recognized Tailwind config filenames, CSS files, and supported JavaScript or TypeScript
  sources are admitted. A confident Tailwind absence produces no adapter input.
- The bridge passes text to the direct adapter and has no import, plugin, network, telemetry, cloud,
  MCP, child-process, dynamic-evaluation, or write path. The fixture config throws if imported, and
  the bridge golden test proves that its throw text does not enter the result.

Complete index assembly must avoid bypassing either existing bridge. It needs a separate security
review when it combines discovery and adapter evidence into a generated Reuse index.

### shadcn static evidence security review

No blocker was found in the ADR-0015 shadcn slice.

- The adapter receives text and normalized data only. It imports Node crypto for stable fingerprints
  and path operations for repository-relative strings. It has no filesystem read, child-process,
  registry, package-install, network, telemetry, cloud, MCP, AI API, or dynamic-evaluation path.
- `components.json` is parsed as JSON data. The adapter supports only a string `aliases.ui` value
  mapped through a repository-relative directory, exact direct root path alias, or one-wildcard
  direct root path alias. Unsafe or unsupported forms return diagnostics, not inferred components.
- Mapped components receive corroborating `registry` evidence whose location and fingerprint point to
  the config. The record says only that the source tree is configured as a shadcn UI location. It
  does not claim upstream origin, freshness, semantic role, or general suitability.
- The analyzer reads candidate config only through `RepositoryRoot`, with 20-file and 1 MiB aggregate
  defaults. A byte limit leaves the React component list unchanged. Tests cover absent, malformed,
  and unresolved input without copying config text into output, direct and wildcard alias forms,
  shared index validation, deterministic goldens, and bounded config admission.

Package-local tsconfig, `extends`, multi-step aliases, and more than one wildcard remain unsupported
until fixtures and review define a wider boundary.

### shadcn conventions review

No convention finding was raised in the final pass.

- `analyzeShadcn` and `analyzeShadcnProjectFromDiscovery` follow the adapter and analyzer naming
  rules. They reuse `UiComponent`, `EvidenceRecord`, `AnalysisDiagnostic`, `RepositoryPath`, and
  `RepositoryRoot` rather than adding parallel models or read authorities.
- The bridge retains the established analyzer-to-adapter separation. Repository admission stays in
  `RepositoryRoot`; the adapter receives normalized text and data only.
- `registry` evidence remains corroborating and each collection is sorted before it enters the
  validated `ReuseIndex`. The source-evidence boundary is recorded in `CONVENTIONS.md` because it is
  now the canonical shadcn mapping path.

### Storybook manifest security review

No blocker remains in the ADR-0016 Storybook slice.

- The adapter receives bounded manifest text, normalized components, and normalized imports only. It
  parses JSON data with no filesystem, network, dev-server, registry, MCP, telemetry, cloud, AI API,
  child-process, dynamic-evaluation, or source-execution path. It adds no dependency.
- General discovery excludes `storybook-static`, so generated assets cannot enter React or Tailwind
  analysis. `RepositoryRoot` permits one explicit read of
  `storybook-static/manifests/components.json`, validates containment and size, and rejects symlinks
  on every segment of that fixed path. It cannot receive a caller-controlled manifest location.
- The adapter ignores arbitrary manifest descriptions, snippets, imports, props, and absolute paths.
  A story attaches only when its repository-relative CSF path has a non-type-only resolved React
  import whose component display name matches the manifest entry. The record is corroborating, not a
  rendered-output or semantic claim.
- Tests cover generated-directory exclusion, fixed-path-only admission, an in-root secret symlink,
  byte bounds, absence, malformed and unmapped data, type-only imports, no content leaks, stable
  goldens, and valid combined Reuse output.

Storybook marks its current rich components manifest as preview. LatticeOS supports the documented
fixture subset only. Custom output directories, dev-server access, ref formats, and wider manifest
fields require a new fixture and review.

### Storybook conventions review

No convention finding was raised in the final pass.

- `STORYBOOK_COMPONENTS_MANIFEST_PATH` and its dedicated `RepositoryRoot` reader are the only
  generated-output exception. They do not create a generic excluded-file reader.
- `analyzeStorybook` and `analyzeStorybookProjectFromDiscovery` follow the adapter and analyzer
  naming rules and reuse normalized `UiComponent`, `UiImport`, `EvidenceRecord`, and
  `AnalysisDiagnostic` contracts.
- The mapping retains established evidence policy: it uses corroborating `story` records, requires
  an inspectable source link, sorts output, and does not introduce a separate Storybook component
  model. `CONVENTIONS.md` records the canonical boundary.

### In-memory Reuse index assembly security review

No blocker was found in the read-only index assembly slice.

- `analyzeProject` performs discovery once and passes that same bounded result to the React,
  Tailwind, shadcn, and Storybook bridges. It does not add a filesystem write, network, telemetry,
  cloud, MCP, child-process, or dynamic-evaluation path.
- `buildReuseIndex` accepts normalized discovery and adapter outputs only. It sorts and validates the
  complete core contract before return. A conflicting evidence ID stops assembly rather than allowing
  one adapter to overwrite another record.
- The optional generator version is constrained before it enters serializable output. Empty, padded,
  control-character, and oversized values are rejected.
- The assembly result keeps an explicit truncation flag. Existing adapter and discovery diagnostics
  stay in the index, so callers can see why partial evidence is incomplete.

The cache lifecycle review required by ADR-0004 and F-001 T5 is recorded below.

### Generated Reuse index cache security review

No blocker was found in the ADR-0004 cache lifecycle slice.

- The only writable target is the fixed `.lattice/cache/reuse-index.json` path. The public write API
  accepts an index, not a path. Application source, reports, and arbitrary repository files are not
  writable through this path.
- `RepositoryRoot` creates and checks `.lattice` and `.lattice/cache` one level at a time. It rejects
  non-directories and symlinks, resolves the final directory inside the selected root, and uses a
  unique temporary sibling with owner-only mode and `O_NOFOLLOW` where available.
- A write syncs the temporary file and renames it over only a regular cache file. Failure cleanup
  removes the exact temporary path. A final cache symlink and a symlinked `.lattice` directory both
  fail without following or creating an outside path.
- Cache reads remain bounded to 16 MiB and accept only regular in-root files. Malformed,
  incompatible, or oversized contents return a rebuild state rather than source evidence. Errors do
  not include cache contents.

The remaining ancestor-directory replacement race is documented below. Packed cross-platform tests
must exercise platform differences before Phase 1 release.

### CLI query security review

No blocker was found in the implemented query commands.

- `search`, `inspect`, and `context` accept only a validated repository root and use analyzer and core
  public interfaces. They do not parse consumer configuration, execute source, access the network, or
  write application files.
- Query commands always analyze current source before replacing the fixed generated cache path. A
  cache-path safety error fails the command rather than emitting a result from unsafe state.
- JSON results are serialized deterministically with an explicit schema version. Human results go to
  stdout; parse and analysis failures go to stderr with stable nonzero exit behavior.
- Copied-fixture tests prove the command does not modify component source. The packed binary proof
  is recorded separately below; the benchmark remains a release gate.

### CLI initialization security review

No blocker was found in the ADR-0014 initialization slice.

- The CLI accepts no configuration destination. It asks `RepositoryRoot` to inspect or write only
  `.lattice/config.json` under the validated root.
- `lattice init` is a no-write plan. `--write` is required to create the file; an existing regular
  file skips; `--write --force` is the only replacement form. `--force` alone is rejected as usage.
- The root authority does not create `.lattice` during inspection. It rejects a symlinked or
  non-regular `.lattice` directory or final config, checks real-path containment, writes a
  temporary owner-only sibling, syncs it, and uses an exclusive link for ordinary creation so a
  concurrent regular config is skipped instead of overwritten.
- Tests cover dry-run source preservation, normal creation, existing-content skip, forced
  replacement, config-file symlink refusal, and an outside target remaining unchanged. There is no
  source execution, environment access, network, telemetry, cloud, AI API, MCP runtime, or new
  dependency.

### Packed consumer proof security review

No blocker was found in the developer-only package proof.

- The script has fixed LatticeOS package directories and fixture paths. It creates one temporary
  directory through `mkdtemp` and removes that exact directory in `finally`; it does not accept a
  caller-supplied deletion target or alter the committed fixture.
- It packs local artifacts and installs them as local tarballs. `npm install` uses
  `--ignore-scripts`, `--omit=dev`, and `--workspaces=false`. npm may access its registry to resolve
  the existing pinned TypeScript dependency during this developer check, but no shipped CLI path has
  network behavior.
- npm does not support the fixture's `workspace:*` members in this tarball installation form. The
  script removes only the root workspace declaration in the temporary copy during installation and
  restores it before analysis. It never runs fixture source or configuration.
- The test rejects a CLI installation that resolves into this worktree, confirms the npm binary shim,
  runs help and JSON search from the installed artifact, verifies the generated cache schema, and
  compares the Button source before and after analysis. It adds no runtime dependency or production
  write path.

The current Windows branch verifies the generated npm shim, then invokes the packed Node entry because
Windows command shims are not directly executable with `execFile`. A Windows matrix remains a release
review item.

### Packed consumer proof conventions review

No convention finding was raised in the final pass.

- The package proof reuses the existing CLI binary, package names, controlled fixture, root package
  gate, and generated-cache contract. It does not add a second CLI, a second consumer fixture, a
  runtime package manager, or an alternate cache writer.
- The script is developer-only and stays under `packages/cli/scripts`, which keeps package artifact
  verification out of the shipped CLI contract. Its only new package script follows the existing
  `test:<scope>` gate naming.

### Reuse benchmark harness review

No blocker was found in the T2 benchmark harness.

- The benchmark keeps its task manifests, artifacts, and result checker under the developer-only
  `benchmarks/reuse-v1` boundary. It reuses the existing `lattice context --json` contract and does
  not add a second ranking system, public CLI command, cache, or runtime API.
- The validator reads bounded regular files below its artifact root and rejects path traversal,
  symlinks, changed hashes, control-context leakage, invalid annotations, mismatched pairs, and
  malformed identifiers without echoing submitted text in errors.
- No network, telemetry, cloud, MCP, AI API, child-process, fixture execution, or application-source
  write path was added. Nine focused tests and the full repository gate set pass.
- Synthetic verifier records are rejected for release evidence. F-001 AC-15 remains blocked until
  T3 records qualified randomized agent trials with independent review.

### Dependency and network review

- TypeScript 6.0.3 is the compiler dependency added to the analyzer and React adapter boundaries.
  ADR-0011 pins its public classic API; the workspace can retain TypeScript 7 where no Compiler API
  import is required.
- Runtime source contains no network, telemetry, cloud, MCP, AI API, child-process, dynamic code
  evaluation, or consumer configuration execution path.
- This checkpoint has no production file-write behavior.

### Remaining risks

- `O_NOFOLLOW` hardens the final open on platforms that provide it. Real-path containment remains
  the cross-platform control. A concurrent replacement of an ancestor directory is a residual local
  filesystem race and needs platform-specific packed tests before release.
- Discovery supports a documented conservative workspace glob subset. Unsupported workspace syntax
  can reduce package recall and must produce broader diagnostics as TypeScript project resolution is
  added.
- Unreadable-path behavior is implemented but permission-specific CI coverage remains pending.
- Report-write safety is not implemented yet and needs a separate review before report output exists.
- TypeScript parsing can still consume meaningful CPU and memory for a large admitted source set.
  The React bridge applies aggregate limits, but a dedicated denial-of-service fixture and performance
  evidence remain necessary before release.
- Tailwind's project bridge applies inventory exclusions and aggregate byte and file limits. A
  dedicated denial-of-service fixture and performance evidence remain necessary before release.
