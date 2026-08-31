# Threat Model

## Status

Accepted Phase 1 threat model.

## Assets

- Confidential application source and developer filesystem data.
- Integrity of application source, LatticeOS configuration, generated indexes, and CLI output.
- Developer trust in reuse recommendations and deterministic evidence.
- Availability of local development and CI jobs.

## Entry Points

- CLI arguments, working directory, repository root, queries, and output options.
- Source files, tsconfig/package/workspace manifests, CSS, shadcn configuration, and Storybook
  manifests in the analyzed repository.
- Filesystem metadata, symlinks, path aliases, and workspace boundaries.

## Trust Boundaries

- Caller input to CLI path resolution.
- Untrusted repository data to parsers and normalized core entities.
- Normalized evidence to generated cache/report writes.
- Packaged LatticeOS code to consumer repositories and CI environments.
- The package builder's fixed compiled closure in the current LatticeOS checkout. It is trusted build
  input, not a caller-selected repository; ADR-0019 records its narrower integrity boundary.

## Threats

- **Tampering/path traversal:** a crafted root, alias, or symlink redirects reads or writes outside the
  repository.
- **Code execution:** a config or source file is imported while being analyzed.
- **Information disclosure:** secret or unrelated filesystem data enters output or leaves the host.
- **Denial of service:** enormous files, recursive links, or dependency/build trees exhaust resources.
- **Evidence poisoning:** ambiguous or malicious syntax is presented as exact reusable truth.
- **Supply-chain compromise:** a dependency or packaged artifact runs unexpected code.

Spoofing, repudiation, and remote privilege elevation are not applicable in Phase 1 because no
remote identity or service exists.

## Mitigations

- Validate real paths, reject escaping symlinks, and write only to explicit LatticeOS-owned paths.
- Parse repository configuration and source as data; never import or evaluate it.
- Exclude secret paths, keep evidence local, avoid source dumps, and use repository-relative paths.
- Exclude dependency/build trees, bound file size and context output, and diagnose malformed input.
- Label evidence by source, prefer exact static facts, and expose uncertainty and unsupported syntax.
- Minimize dependencies, pin the lockfile, and test the packed artifact in a clean fixture.

## Open Risks

- TypeScript and framework syntax evolve; unsupported syntax may reduce recall without a diagnostic.
- Very large repositories can use substantial memory until incremental caching is proven.
- Static Tailwind extraction cannot resolve arbitrary dynamic class construction.
