# Module Test Plan: Adapters

## Unit Tests

- One focused test per supported syntax form plus absence, malformed input, and diagnostic cases.
  The React suite now covers named/default/function/arrow/memo/forwardRef forms, inherited props,
  optional/defaulted literal variants, alias imports, JSX, composition, call sites, malformed syntax,
  and virtual-root traversal rejection.

## Integration Tests

- The named Next.js workspace golden verifies direct normalized React evidence. Analyzer orchestration
  will add the end-to-end adapter integration test after it owns safe source selection and tsconfig
  parsing.

## Security Tests

- Consumer config is never evaluated, dynamic syntax is not invented, and adapter diagnostics do not
  dump secret or arbitrary source content.
