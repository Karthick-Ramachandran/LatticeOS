# Module: Adapters

## Purpose

Translate source-specific React, TypeScript, Tailwind, shadcn, and Storybook evidence into the
framework-neutral core model.

## Owns

- React component/export/prop/import/JSX usage extraction.
- Tailwind presence, static theme/token, class, and exact repetition evidence.
- Optional shadcn and Storybook detection and source connections.
- Source-specific diagnostics and fixture expectations.

## Does Not Own

- Repository writes, CLI formatting, search ranking, accepted semantic meaning, or cross-source
  conflict resolution.

## Public Interfaces

- `analyzeReact`, `analyzeTailwind`, `analyzeShadcn`, and `analyzeStorybook` adapter contracts.

## Boundaries

Adapters depend on core. React analysis uses TypeScript 6.0.3 under ADR-0011. Analyzer owns
filesystem traversal and calls adapters with validated inputs. `analyzeTailwindProject` and
`analyzeShadcnProjectFromDiscovery` and `analyzeStorybookProjectFromDiscovery` are the implemented
optional-evidence bridges. Adapters never execute consumer code.

`analyzeShadcn` reads no filesystem path. It receives JSON text, normalized React components, and
direct root compiler aliases, then adds corroborating registry evidence for components below a
configured `aliases.ui` root. It supports repository-relative, exact alias, and one-wildcard alias
forms only. It does not prove upstream registry origin or product intent.

`analyzeStorybook` receives a bounded generated components manifest, normalized React components,
and imports. It attaches corroborating story evidence only when the manifest's CSF path identifies
a non-type-only resolved import with the same component display name. It does not read a filesystem
path, execute Storybook, retain snippets or descriptions, or treat the preview manifest as a stable
upstream API.
