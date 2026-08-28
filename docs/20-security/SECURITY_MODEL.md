# Security Model

## Status

Accepted baseline for Phase 1 Reuse.

## Security Boundary

LatticeOS is a local CLI that analyzes a caller-selected repository. Repository files, paths,
manifests, configuration, source text, symlinks, and generated-tool outputs are untrusted input.
Phase 1 has no server, account, cloud service, telemetry, MCP runtime, or AI API.

## Baseline Rules

- Never commit secrets or credentials, and never read or copy `.env` files into docs.
- Validate and authorize untrusted input at every trust boundary.
- Do not add network, telemetry, cloud, MCP runtime, or AI API behavior without explicit review.
- Never execute analyzed repository source or JavaScript/TypeScript configuration.
- Resolve every read and write against the selected repository root and reject escaping symlinks.
- Exclude dependency, VCS, generated build, coverage, secret, and LatticeOS cache paths by default.

## Authentication And Authorization

Phase 1 has no remote identity boundary. Authorization is the operating-system access of the local
user invoking `lattice`. Supplying a repository path authorizes analysis inside that validated root
only; it does not authorize writes outside LatticeOS-owned paths.

## Secrets And Configuration

LatticeOS configuration contains analysis roots, excludes, thresholds, and output limits only.
Secrets are unsupported. Configuration and generated indexes must never contain environment values.
Diagnostics use repository-relative paths and do not dump arbitrary source contents.

## Sensitive Data

Application source may be confidential. Analysis is local-only. The generated Reuse index stores the
minimum derived evidence needed for discovery and is reconstructable. No evidence leaves the machine
in Phase 1.

## File Writes

- `lattice init` owns only `.lattice/config.json` and supports a dry-run plan. `--write` is required
  to create it.
- Existing config is skipped by default and replaced only with `--write --force`.
- Cache/report writes stay under `.lattice/cache/` and `.lattice/reports/`, use temporary files plus
  atomic rename, and reject symlink or root escapes.
- Application source is always read-only.

## Dependencies And Supply Chain

Runtime dependencies are minimized. Resolutions are exact in the lockfile. New runtime dependencies
require review for maintenance, license, install scripts, network behavior, and transitive risk.
Analyzer fixtures prove behavior against the pinned TypeScript compiler version.

## Security Verification

Tests cover traversal, symlink escape, excluded secret/generated paths, malformed input,
non-execution of repository config, safe overwrite behavior, and deterministic local output.

## Accepted Decision

- [ADR-0009: Local-only privacy and network boundary](../adrs/ADR-0009-local-only-privacy-and-network-boundary.md)
