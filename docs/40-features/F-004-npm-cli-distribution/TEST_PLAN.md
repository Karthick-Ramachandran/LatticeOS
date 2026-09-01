# Test Plan: Npm Cli Distribution

## Unit Tests

- Validate the fixed staged manifest, allowed source package list, bundled dependency versions, and
  rejection of missing, symlinked, or non-regular package input.
- Verify the release builder accepts only the exact staged descriptor: no workspace specifier,
  lifecycle script, publish configuration, or caller-selected output path.

## Integration Tests

- Build and pack one staged tarball, inspect its package metadata, and install it offline with scripts
  disabled into the minimal external fixture.
- Run installed `lattice --help`, `lattice --version`, and `lattice search Button --json`; validate
  output, cache schema, package extraction, and source preservation.

## Security Tests

- Reject symlinked package input and cleanup of a temporary-looking root this process did not create.
- Assert the consumer install uses `--offline` and `--ignore-scripts`, contains no workspace link, and
  needs no registry contact or runtime network path.
- Confirm the installed CLI still follows repository root, cache, exclusion, and source-read-only
  boundaries in the external fixture.
