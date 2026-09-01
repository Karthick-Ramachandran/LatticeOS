# Test Plan: Agent Ready Documentation

## Unit Tests

- Feature metadata and guide mapping.
- Agent prompt required sections and single-copy-block rule.
- LLM text conversion and Markdown content type.
- Source-link and internal-link resolution helpers.

## Integration Tests

- Next.js production build and static parameter generation.
- Fumadocs search route over tracked content.
- `llms.txt`, `llms-full.txt`, and per-page Markdown route responses.
- Copy-enabled Agent prompt rendering.
- Phase 1 guide examples against current CLI/schema fixtures.

## Security Tests

- Assert that docs routes do not import AI SDK/model clients, telemetry, or analytics.
- Assert that builds require no secret environment variable.
- Check Markdown rendering and external links use safe link behavior supplied by Fumadocs.

## Content quality tests

- Internal and repository source links resolve.
- A completed feature without a guide fails coverage.
- A guide without the required Agent prompt sections fails validation.
- Humanizer review changes prose only and preserves every technical claim and literal block.
