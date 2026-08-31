# Architecture Impact: Npm Cli Distribution

## Affected Modules

- `cli` gains a developer-only release-package builder and the single distribution descriptor.
- `fixtures` gains a minimal independent TypeScript/JSX consumer used only for offline package proof.
- `apps/docs`, README, and `llms.txt` explain how to prepare and install the local pre-release
  tarball. They must not describe it as published.

## ADR Impact

ADR-0018 accepts a bundled single-package pre-release path. It does not supersede local-only runtime
or product-ownership decisions.

## Security Impact

The builder is developer-only. It creates an OS temporary staging root, copies a fixed compiled
closure, and runs the local package manager with config, cache, and logs located inside that root.
Cleanup accepts only the exact temporary root created by the current process. The user-facing
`release:pack` command may retain its temporary tarball for manual installation, but accepts no
output path. The builder reads only the fixed compiled closure in the current LatticeOS checkout; it
does not traverse a consumer-selected source tree.

There is no runtime network, telemetry, cloud, MCP, AI API, auth, secret, or consumer-source write
path. Offline install with lifecycle scripts disabled proves the package needs no registry access.
