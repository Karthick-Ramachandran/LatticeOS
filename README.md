# LatticeOS

LatticeOS is a repository-native UI control plane for coding agents. It gives agents a reliable way
to understand a product's existing UI, work within its rules, and check whether implementation still
matches intent.

It is not another UI kit, CSS framework, component generator, or design system. LatticeOS works with
the tools a repository already chose. Phase 1 reads React components, props, imports, usages,
configured shadcn source trees, and Tailwind patterns, then returns a small source-backed answer an
agent can use. It also connects a bounded local Storybook components manifest when its story import
resolves to an indexed React component.

> Status: Phase 1 Reuse is under active development. The analyzer, `lattice` commands, and packed
> consumer proof work in this workspace. The Reuse benchmark can also prepare fresh randomized agent
> pairs from its pre-registered tasks, but no qualified trials are recorded. The package is not
> published, and the benchmark still blocks Phase 1 completion.

[Why](#why-latticeos-exists) · [Phase 1](#phase-1-reuse) · [Evidence](#evidence-before-confidence) ·
[CLI](#current-cli) · [Docs](#documentation) · [Roadmap](#roadmap) · [Feedback](#feedback-wanted)

## Why LatticeOS exists

Coding agents usually see a task and a narrow slice of the repository. They can write a plausible
new component without noticing that the codebase already has the right primitive, composition, or
token. The result compiles, but the product picks up another button, card, modal, or spacing rule.

File search helps only when the agent already knows what to search for. LatticeOS builds a compact
map of the UI and answers questions closer to the work:

- What existing component fits this task?
- Which props and variants does source code prove?
- Where is it already used, and what is composed around it?
- Are the examples exact facts, supporting examples, or heuristics?
- What could the analyzer not prove?

That map is the first layer of the product. It makes Reuse possible now and gives later checks a
shared account of what the repository contains. LatticeOS does not replace the repository's frontend
choices. It gives agents a dependable interface to them.

## Phase 1 Reuse

Reuse comes first because every later feature depends on it. A Figma loop that cannot find the
right existing component will generate cleaner duplicates faster. LatticeOS will not move to that
work until Reuse passes its acceptance criteria and controlled benchmark.

The Phase 1 contract covers:

| Area | What LatticeOS finds |
| --- | --- |
| Project | Workspaces, packages, React, Next.js, TypeScript, Tailwind, shadcn, and Storybook |
| Components | Named and default exports, props, static variants, imports, JSX composition, and usages |
| Styling | Tailwind theme values, static classes, known merge calls, and exact repeated class bundles |
| Supporting examples | Configured shadcn source records and import-backed local Storybook manifest records |
| Agent context | Ranked, budgeted results with stable IDs and source evidence |

Phase 1 analysis is static and read-only. It does not run application code or consumer
configuration, and it never edits source files. `lattice init` can create its own committed config
only when the user asks for `--write`.

## Evidence before confidence

A recommendation is useful only when an agent can inspect why it appeared. Each LatticeOS reason
points to an evidence record:

| Field | Question it answers |
| --- | --- |
| `kind` | Was this found in an export, prop, import, usage, story, registry, token, or class bundle? |
| `location` | Which repository-relative source location supports it? |
| `method` | Did it come from the AST, type checker, CSS, static config, or a manifest? |
| `classification` | Is it an exact fact, a supporting example, or a heuristic? |
| `fingerprint` | Is the evidence still tied to the same source? |
| `limitations` | What could static analysis not establish? |

Ranking decides which results fit into the context budget. A high score does not pretend that two
components mean the same thing.

## Current CLI

The public CLI name is `lattice`.

```bash
lattice init
lattice search "team settings"
lattice inspect SettingsSection
lattice context "build a team settings page" --json
```

`lattice init` plans the committed `.lattice/config.json` file without writing by default. Run
`lattice init --write` to create it. Existing config is preserved unless the user supplies both
`--write` and `--force`.

Query output is compact and inspectable:

```text
SettingsSection                  packages/ui/settings-section.tsx:18
Why: used by 4 settings routes; props match title, description, and actions
Evidence: component:export:exact, usage:jsx:exact, story:example:corroborating
Limit: product meaning is not inferred from the score
```

Human output is for quick reading. JSON has an explicit schema version, deterministic order,
stable component IDs, evidence links, and limitations.

## Documentation

Documentation is built alongside each feature with [Fumadocs](https://www.fumadocs.dev/). Every
feature guide must include one complete implementation prompt that a coding agent can copy without
needing this chat or hidden context.

Start with:

- [Phase 1 Reuse guide and agent prompt](apps/docs/content/docs/features/phase-1-reuse.mdx)
- [Evidence model](apps/docs/content/docs/reference/evidence-model.mdx)
- [Agent-ready documentation contract](apps/docs/content/docs/contributing/agent-ready-documentation.mdx)
- [Packed consumer proof](apps/docs/content/docs/cli/packed-consumer.mdx)
- [Reuse benchmark protocol](apps/docs/content/docs/features/reuse-benchmark.mdx)
- [Repository guide for language models](llms.txt)
- [Phase 1 acceptance criteria](docs/40-features/F-001-phase-1-reuse/ACCEPTANCE.md)
- [Repository memory](docs/)

Run the docs locally:

```bash
pnpm install
pnpm docs:dev
```

Then open `http://localhost:3000`.

Agent-readable routes are part of the docs app:

```text
/llms.txt
/llms-full.txt
/docs/<path>.md
```

## Roadmap

| Phase | Purpose | Status |
| --- | --- | --- |
| 1. Reuse | Find and explain the UI that already exists | Active |
| 2. Understand | Add explicit product and component meaning | Blocked on Phase 1 proof |
| 3. Doctor | Detect drift and policy violations | Blocked on Phase 1 proof |
| 4. Converge | Compare intent, implementation, and rendered UI | Blocked on Phase 1 proof |
| 5. Closed loop | Propose and verify bounded repairs | Blocked on earlier phases |

## Local-first boundary

Repository analysis stays local. The Phase 1 runtime has no telemetry and no required network path.
Generated state is kept inside the repository boundary, uses explicit schemas, and must not contain
source text or secrets unless a documented contract calls for it.

See the [security model](docs/20-security/SECURITY_MODEL.md) and accepted
[local-only decision](docs/adrs/ADR-0009-local-only-privacy-and-network-boundary.md).

## Development

Requirements, decisions, module boundaries, risks, and test evidence live under `docs/`. That memory
is the source of truth for contributors and coding agents.

```bash
pnpm install
pnpm test:run
pnpm typecheck
pnpm build
pnpm test:package
pnpm docs:check
persist doctor
```

Node.js 22 or newer and pnpm 10.12.3 are required. The repository is currently on the
`feat/phase-1-reuse` workstream.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Report security problems through
the private process in [SECURITY.md](SECURITY.md). LatticeOS is available under the
[MIT License](LICENSE).

## Feedback wanted

This branch has a contained packed-consumer test and is ready for product and documentation feedback.
The most useful questions are:

- Does the opening make the product distinct from a UI framework or component library?
- Would the proposed evidence be enough for you to trust an agent's reuse choice?
- Can you copy the Phase 1 prompt into an agent and understand what it will build?
- Which repository pattern would prevent LatticeOS from finding your real components?

Open an [issue](https://github.com/Karthick-Ramachandran/LatticeOS/issues) with a concrete repository
shape or failed expectation. Those examples will become fixtures, acceptance cases, or explicit
limits before Phase 1 is called complete.
