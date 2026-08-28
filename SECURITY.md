# Security policy

LatticeOS analyzes source repositories that may be private. Repository files, paths, manifests,
configuration, symlinks, and generated tool output are untrusted input.

## Supported versions

LatticeOS has no stable release yet. Security fixes are applied to the default branch and the active
Phase 1 development branch. Published support versions will be listed here when packages are
released.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability
reporting flow from the repository Security tab. If that option is unavailable, contact the
repository owner privately before sharing technical details.

Include the affected commit or version, operating system, reproduction steps, impact, and whether a
proof of concept reads data, writes files, executes repository code, or uses the network. Remove real
credentials and confidential source from the report.

The maintainer will acknowledge the report, reproduce it, assess severity, and coordinate a fix and
disclosure. Response dates depend on maintainer availability while the project is pre-release.

## High-priority security boundaries

Reports are especially useful when they show that LatticeOS can:

- read through traversal or a symlink outside the selected repository;
- read `.env`, credential, dependency, VCS, build, coverage, cache, or report paths that should be
  excluded;
- execute consumer source or JavaScript and TypeScript configuration;
- write outside `.lattice/` or overwrite application source;
- make `lattice init` create a file without `--write`, replace config without `--write --force`, or
  follow a configuration symlink;
- include source contents, secrets, or absolute host paths in generated evidence;
- send repository data through telemetry, network, cloud, MCP, or AI API behavior;
- bypass file count, depth, size, or diagnostic bounds with malformed input.

The accepted Phase 1 security model is in `docs/20-security/SECURITY_MODEL.md`. File write rules are
in `docs/10-architecture/FILE_WRITE_POLICY.md` and ADR-0009 records the local-only boundary.

## Safe research

Use repositories and data you own or have permission to test. Keep proof of concept activity local,
avoid persistence, and stop after demonstrating the minimum impact. Do not access other people's
data, disrupt services, or publish a vulnerability before a fix is available.
