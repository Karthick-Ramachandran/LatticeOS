# Review: Phase 1 Reuse

## Status

In progress. The T2 core and T3 safe-discovery checkpoints were reviewed on 2026-08-29. React
analysis, generated writes, CLI behavior, packaging, and the benchmark still require review.

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
- Cache and report write safety is not implemented yet and receives a separate security review in
  F-001 T5.
- TypeScript parsing can still consume meaningful CPU and memory for a large admitted source set.
  The future analyzer bridge must enforce an aggregate source and project limit before it invokes the
  adapter, then add a denial-of-service fixture and performance evidence.
