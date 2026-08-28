# Module Test Plan: Adapters

## Unit Tests

- One focused test per supported syntax form plus absence, malformed input, and diagnostic cases.
  The React suite now covers named/default/function/arrow/memo/forwardRef forms, inherited props,
  optional/defaulted literal variants, alias imports, JSX, composition, call sites, malformed syntax,
  and virtual-root traversal rejection.
- The Tailwind suite covers v4 `@theme` CSS, direct static v3 theme configuration, className values,
  fully static merge calls, reordered repeated bundles, original-literal alignment, dynamic source,
  and configuration non-execution.

## Integration Tests

- Named Next.js workspace goldens verify direct React and Tailwind evidence. Analyzer integration
  will add end-to-end Tailwind admission after it owns bounded CSS/config/source selection.

## Security Tests

- Consumer config is never evaluated, dynamic syntax is not invented, and adapter diagnostics do not
  dump secret or arbitrary source content.
