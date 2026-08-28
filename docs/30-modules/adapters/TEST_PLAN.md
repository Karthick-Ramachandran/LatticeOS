# Module Test Plan: Adapters

## Unit Tests

- One focused test per supported syntax form plus absence, malformed input, and diagnostic cases.

## Integration Tests

- Next.js and workspace goldens verify normalized adapter evidence through the analyzer.

## Security Tests

- Consumer config is never evaluated, dynamic syntax is not invented, and adapter diagnostics do not
  dump secret or arbitrary source content.
