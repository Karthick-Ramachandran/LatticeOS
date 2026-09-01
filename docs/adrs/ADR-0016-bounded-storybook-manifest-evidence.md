# ADR-0016: Bounded Storybook Manifest Evidence

## Status

Accepted

## Context

Phase 1 needs Storybook examples as local Reuse evidence without evaluating `.storybook` files or
rebuilding Storybook's CSF and documentation parsers. Storybook's current React components manifest
contains component names, source story paths, and story entries. It is generated at
`/manifests/components.json` in a running or built Storybook.

The official manifest API is explicitly preview-only, so its current shape cannot become an
unqualified LatticeOS compatibility claim. Normal repository discovery must also exclude generated
Storybook output so a large static site is never treated as ordinary React or Tailwind source.

## Decision

Read only the conventional local built-manifest path
`storybook-static/manifests/components.json`. General discovery excludes `storybook-static`; a
dedicated `RepositoryRoot` method may read this one fixed file with the same root containment,
regular-file, and byte-limit checks used by ordinary reads. It rejects a symlink at every path
segment so the fixed generated-output exception cannot read an excluded in-root file. No
caller-controlled manifest path is accepted.

The Storybook adapter receives bounded JSON text, normalized React components, and React imports. It
accepts a narrow current manifest subset: a component entry needs a string name, a repository-relative
CSF path, and one or more named story entries. It attaches story evidence only when the CSF path
matches an admitted React source and a resolved React import in that source identifies a component
with the same display name. This avoids mapping a manifest name to a component by name alone.

Each attached `story` record is `corroborating` `manifest` evidence. It identifies the static
manifest location but does not copy descriptions, prop documentation, snippets, imports, or absolute
paths into the Reuse index. It does not claim a rendered result, Storybook runtime behavior, semantic
intent, or universal reuse suitability. Missing, malformed, changed, oversized, or unmappable
manifests yield bounded diagnostics and leave React analysis usable.

## Alternatives Considered

- Parse and execute `.storybook/main` or CSF files. Rejected because consumer configuration and
  source are untrusted, and the project requirement is to consume generated manifest output rather
  than duplicate Storybook's parser.
- Read a manifest at any user-provided path. Rejected because it expands the analyzer read surface
  and makes it easy to treat arbitrary generated data as Storybook evidence.
- Map manifest entries to components solely by display name. Rejected because duplicate names and
  unrelated entries would make that weak association look exact.
- Ingest descriptions, prop documentation, and snippets now. Rejected because the Phase 1 core has
  no accepted semantic-text contract, and arbitrary generated text would expand the retained source
  surface without supporting deterministic ranking.
- Treat the preview schema as generally stable. Rejected because Storybook documents it as subject
  to change. The supported subset is fixture-bound and must be revised deliberately when the upstream
  shape changes.

## Consequences

Agents can see source-backed Storybook example existence where a generated manifest and a React import
prove the link. Built output is not fed into normal source analysis, and the adapter makes no network,
MCP, registry, package, or execution call.

Only React manifests with the tested subset at the conventional build path work. Custom output
directories, dev-server URLs, ref-based manifests, package-local or external CSF paths, unresolvable
imports, changed schema, and stories without a matching normalized React import remain unsupported.
Future support needs a fixture, security review, and ADR update or supersession.

## Related Documents

- PRD: `docs/00-product/PRD.md`
- Architecture: `docs/10-architecture/ARCHITECTURE.md`
- Security: `docs/20-security/SECURITY_MODEL.md`
- Feature: `docs/40-features/F-001-phase-1-reuse/`
