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

- `lattice init`, `lattice search`, `lattice inspect`, `lattice context`, and global `--help`,
  `--version`, `--root`, and `--json` options.

## Boundaries

CLI depends on analyzer and core public interfaces. Human and JSON output describe the same result.
Machine output remains stable within its schema version. Init writes only validated LatticeOS files.
