import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { stableStringify } from "@latticeos/core";

import { analyzeTailwindProject } from "./tailwind-project.js";
import { RepositoryRoot } from "./repository-root.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

test("admits bounded Tailwind inputs without executing configuration", async () => {
  const result = await analyzeTailwindProject(await RepositoryRoot.open(fixtureRoot));

  assert.equal(result.truncated, false);
  assert.ok(result.sourcePaths.includes("apps/web/app/globals.css"));
  assert.ok(result.sourcePaths.includes("apps/web/app/page.tsx"));
  assert.ok(result.sourcePaths.includes("tailwind.config.ts"));
  assert.ok(result.analysis.tailwind.tokens.some((token) => token.name === "--color-brand"));
  assert.ok(result.analysis.tailwind.repeatedClassBundles.some((bundle) => bundle.count === 2));
  assert.equal(result.analysis.diagnostics.length, 0);
  assert.equal(JSON.stringify(result).includes("LatticeOS must never execute"), false);

  const golden = await readFile(resolve(fixtureRoot, "../goldens/tailwind-project.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(result), golden);
});

test("marks aggregate Tailwind source limits as incomplete", async () => {
  const result = await analyzeTailwindProject(await RepositoryRoot.open(fixtureRoot), { maxTailwindSourceFiles: 1 });

  assert.equal(result.truncated, true);
  assert.equal(result.sourcePaths.length, 1);
  assert.ok(result.analysis.diagnostics.some((item) => item.code === "TAILWIND_SOURCE_FILE_LIMIT"));
});
