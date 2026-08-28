# Module: Benchmark

## Purpose

Provide local, auditable evidence about whether LatticeOS Reuse changes canonical component choices
on pre-registered coding-agent tasks.

## Owns

- Versioned task manifests, result records, reviewer annotations, schema validation, deterministic
  summary, synthetic verifier fixtures, and benchmark documentation.
- The control/treatment prompt contract and capture of exact treatment context.

## Does Not Own

- LatticeOS CLI commands, analyzer discovery, core ranking, component semantics, Figma, browser
  evaluation, Doctor, source rewrites, package publishing, or production runtime behavior.

## Public Interfaces

- Planned: a developer-only benchmark command that validates a `reuse-v1` result set and emits a
  deterministic local summary.
- Planned: task and result JSON contracts documented under F-003. They are not LatticeOS runtime APIs.

## Boundaries

The module consumes the existing `lattice context --json` output as treatment evidence and only reads
controlled fixture/submission text. It never executes a submission or consumer configuration. It
uses no network, secrets, telemetry, cloud, MCP runtime, AI API, or new runtime dependency.
