import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const packageRoot = new URL("..", import.meta.url);
const sourceRoot = new URL("../src/", import.meta.url);
const files = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && entry.name !== "testing.ts")
  .map((entry) => entry.name);
const forbidden = ["@latticeos/", "react", "next", "tailwind", "node:fs", "node:path"];
const errors = [];

for (const file of files) {
  const content = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
  for (const match of content.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/gu)) {
    const specifier = match[1];
    if (specifier && forbidden.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`))) {
      errors.push(`${file}: forbidden core import '${specifier}'`);
    }
  }
}

const packageJson = JSON.parse(await readFile(join(packageRoot.pathname, "package.json"), "utf8"));
if (Object.keys(packageJson.dependencies ?? {}).length > 0) {
  errors.push("@latticeos/core must not have runtime dependencies");
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Core dependency boundary passed.\n");
}
