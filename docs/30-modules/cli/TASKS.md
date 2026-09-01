# Module Tasks: Cli

## Active Work

- F-001 T6: the packed-consumer proof is complete; the controlled Reuse benchmark remains active.

## Tasks

- Done: Scaffold the CLI package with analyzer and core dependencies; do not expose a binary before
  command behavior exists.
- Done: Implement parser, global root/help/version/JSON options, and query dispatch.
- Done: Implement fresh analysis and safe generated-cache refresh for search, inspect, and context.
- Done: Implement deterministic human/JSON formatters and 0, 1, and 2 exit contracts.
- Done: Implement safe init planning, opt-in creation, skip-existing, explicit-force replacement,
  deterministic JSON, and fixed-path writes through `RepositoryRoot`.
- Done: Build the CLI dependency closure, pack its local artifacts, install them in the controlled
  Next.js fixture with install scripts disabled, and prove `lattice --help`, JSON search, generated
  cache output, extracted package identity, and source preservation.
- Done: Stage the fixed compiled dependency closure in one temporary bundled npm tarball. Install it
  offline in the minimal external TypeScript/JSX fixture and prove version, help, JSON search,
  generated-cache output, extracted package identity, and source preservation.
