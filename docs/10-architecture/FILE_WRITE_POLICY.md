# File Write Policy

Default behavior:

- Skip existing files.
- Use dry run before risky writes.
- Require explicit force to overwrite.
- Never write outside the repository root.

For the implemented initialization floor, `lattice init` is a dry-run plan, `lattice init --write`
creates only `.lattice/config.json`, and `lattice init --write --force` is the only replacement form.
The command never accepts an output-path argument.
