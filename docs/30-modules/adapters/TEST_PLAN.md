# Module Test Plan: Adapters

## Unit Tests

- One focused test per supported syntax form plus absence, malformed input, and diagnostic cases.
  The React suite now covers named/default/function/arrow/memo/forwardRef forms, inherited props,
  optional/defaulted literal variants, alias imports, JSX, composition, call sites, malformed syntax,
  and virtual-root traversal rejection.
- The Tailwind suite covers v4 `@theme` CSS, direct static v3 theme configuration, className values,
  fully static merge calls, reordered repeated bundles, original-literal alignment, dynamic source,
  and configuration non-execution.
- The shadcn suite covers the named `components.json` fixture, repository-relative, exact, and
  single-wildcard direct root aliases; malformed and unresolved config; deterministic registry
  evidence; and config-content redaction.
- The Storybook suite covers the named local components manifest, resolved React story imports,
  deterministic story evidence, malformed and unmapped entries, type-only imports, and a named
  golden. It does not parse CSF or Storybook configuration.

## Integration Tests

- Named Next.js workspace goldens verify direct React and Tailwind evidence. The analyzer's Tailwind
  bridge golden verifies end-to-end bounded CSS, config, and source admission. The shadcn and
  Storybook direct goldens and Reuse index golden verify optional evidence mapping.

## Security Tests

- Consumer config is never evaluated, dynamic syntax is not invented, and adapter diagnostics do not
  dump secret or arbitrary source content.
- shadcn tests reject malformed or unresolved aliases without copying config text into output. The
  analyzer bridge bounds config count and bytes while leaving React evidence available.
- Storybook tests exclude generated static output from ordinary discovery, allow only the fixed
  manifest reader, bound the read, reject malformed data without content leaks, and leave existing
  React and shadcn evidence available.
