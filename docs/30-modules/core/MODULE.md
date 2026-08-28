# Module: Core

## Purpose

Provide the framework-neutral language shared by analysis, CLI, cache, tests, and future read-only
agent interfaces.

## Owns

- Normalized project, package, component, prop, import, usage, source, Tailwind, and diagnostic types.
- Stable component identity.
- Deterministic sorting, search ranking, context budgets, and JSON schema envelopes.

## Does Not Own

- Filesystem access, TypeScript programs, React detection, Tailwind parsing, cache writes, or CLI text.

## Public Interfaces

- `ComponentId` constructors/parsers.
- `ReuseIndex` schema version 1 and validators.
- Search, inspect resolution, and bounded context functions.

## Boundaries

Core uses platform-neutral TypeScript and imports no other workspace module. Analyzer, adapters, CLI,
and documentation examples depend on its public contracts. Serialized output must remain deterministic.
