# Engineering Standards

Repository rules override model preferences.

Baseline rules:

- Never commit secrets.
- Keep changes scoped.
- Update docs when behavior or architecture changes.
- Add tests or document why tests were skipped.
- Do not claim completion without evidence.
- Keep framework knowledge behind adapters and the normalized core framework-neutral.
- Prefer deterministic, serializable output and repository-relative paths.
- Parse consumer repositories as untrusted data; never execute their configuration.
- Pin and review dependencies, and test the packed consumer artifact.
