# Plan: Npm Cli Distribution

## Approach

1. Record the package-distribution decision, release scope, acceptance criteria, security boundary,
   and test plan before changing package metadata.
2. Build each existing package, create a fresh temporary staging package with a fixed manifest, and
   copy compiled regular files for core, analyzer, adapters, and TypeScript 6.0.3 into its bundled
   dependency closure.
3. Pack the staged package without publishing. Keep the source workspace package private.
4. Add a small non-workspace TypeScript/JSX fixture. Install only the tarball offline with scripts
   disabled, then prove binary behavior, real analysis, source preservation, and generated-cache validity.
5. Document the local artifact flow, review package and filesystem behavior, run all gates, and keep
   the external feedback step separate from the Phase 1 benchmark claim.

## Boundaries

- The package builder is developer tooling, not a `lattice` runtime command.
- It uses no user-controlled source, destination, dependency list, registry setting, or publish path.
- The released artifact has one public package name and binary. Internal packages remain implementation
  details; they are bundled only to make the artifact self-contained.
- The external fixture proves a small independent repository, not universal repository compatibility
  or the Phase 1 reuse-improvement gate.
