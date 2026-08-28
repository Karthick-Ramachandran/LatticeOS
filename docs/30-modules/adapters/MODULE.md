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

Adapters depend on core. React analysis also depends on the pinned TypeScript compiler. Analyzer owns
filesystem traversal and calls adapters with validated inputs. Adapters never execute consumer code.
