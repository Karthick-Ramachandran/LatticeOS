# LatticeOS CLI pre-release

This directory describes the one-package `@latticeos/cli` pre-release tarball. LatticeOS is a
repository-native UI evidence tool for coding agents, not a UI kit or CSS framework. The tarball is
built from the workspace with `pnpm release:pack`; it is not published to npm.

Install the generated tarball in a scratch directory with npm offline mode and lifecycle scripts
disabled, then point it at the repository you want to analyze:

```bash
npm install --offline --ignore-scripts --no-audit --no-fund --no-save --package-lock=false /absolute/path/latticeos-cli-0.1.0-rc.0.tgz
./node_modules/.bin/lattice --root /absolute/path/to/repository search Button --json
```

LatticeOS analyzes source locally. It does not execute repository code or configuration, send
telemetry, or rewrite application source. Analysis may write its generated cache under
`.lattice/cache/`.

The tarball bundles LatticeOS's internal packages and the pinned TypeScript compiler so the install
does not need registry access. It is a pre-release artifact, not a supported published package.
