# Module: Cli

## Purpose

Expose LatticeOS through the short `lattice` command with predictable help, output, exit behavior,
and safe initialization.

## Owns

- Argument parsing, command dispatch, human presentation, JSON envelopes, stdout/stderr separation,
  exit codes, and `lattice init` planning/writes.

## Does Not Own

- Source analysis rules, domain identity, cache internals, or application UI changes.

## Public Interfaces

- Implemented: `lattice init`, `lattice search`, `lattice inspect`, `lattice context`, and global
  `--help`, `--version`, `--root`, and `--json` options. Init plans the fixed
  `.lattice/config.json` file by default; `--write` creates it and `--write --force` is the only
  replacement form.
- Developer-only package proof: `pnpm test:package` builds, packs, and installs the CLI dependency
  closure in both the controlled Next.js fixture and a minimal external TypeScript/JSX fixture. The
  external proof installs one bundled tarball offline, runs the extracted `lattice` binary, and does
  not publish a package or change CLI runtime behavior.

## Boundaries

CLI depends on analyzer and core public interfaces. Human and JSON output describe the same result.
Machine output remains stable within its schema version. Init writes only the fixed, validated
LatticeOS config through `RepositoryRoot`; it never accepts a destination path or writes application
source. The package builders have fixed inputs, disable install scripts, restore temporary workspace
metadata before the legacy fixture analysis, and remove only their own temporary directories.
