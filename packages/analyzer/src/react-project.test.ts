import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createComponentId, stableStringify } from "@latticeos/core";

import { analyzeReactProject } from "./react-project.js";
import { RepositoryRoot } from "./repository-root.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

test("adopts bounded React sources and direct root tsconfig aliases without executing configuration", async () => {
  const result = await analyzeReactProject(await RepositoryRoot.open(fixtureRoot));
  const buttonId = createComponentId({
    packageKey: "@fixture/ui",
    sourcePath: "packages/ui/src/button.tsx",
    exportKey: "Button",
  });

  assert.deepEqual(result.compiler, {
    baseUrl: ".",
    paths: { "@fixture/ui": ["packages/ui/src/index.ts"] },
  });
  assert.equal(result.truncated, false);
  assert.equal(result.sourcePaths.includes(".storybook/main.ts"), false);
  assert.equal(result.sourcePaths.includes("apps/web/next.config.mjs"), false);
  assert.ok(result.sourcePaths.includes("packages/ui/src/button.stories.tsx"));
  assert.ok(result.analysis.components.some((component) => component.id === buttonId));
  assert.ok(
    result.analysis.imports.some(
      (item) => item.importerPath === "apps/web/app/page.tsx" && item.localName === "PrimaryButton" && item.resolvedComponentId === buttonId,
    ),
  );
  assert.equal(result.analysis.diagnostics.length, 0);

  const golden = await readFile(resolve(fixtureRoot, "../goldens/react-project.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(result), golden);
});

test("marks aggregate source limits as incomplete instead of feeding an unbounded program", async () => {
  const result = await analyzeReactProject(await RepositoryRoot.open(fixtureRoot), { maxReactSourceFiles: 1 });

  assert.equal(result.truncated, true);
  assert.equal(result.sourcePaths.length, 1);
  assert.ok(result.analysis.diagnostics.some((item) => item.code === "REACT_SOURCE_FILE_LIMIT"));
});

test("reads commented tsconfig text without loading extends or unsafe alias targets", async () => {
  const path = await mkdtemp(join(tmpdir(), "lattice-react-project-"));
  await mkdir(join(path, "src"));
  await writeFile(join(path, "package.json"), "{\"dependencies\":{\"react\":\"19.2.8\"}}\n", "utf8");
  await writeFile(
    join(path, "tsconfig.json"),
    `{
      // This file is data, not code.
      "extends": "./throws.js",
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@safe/*": ["src/*"],
          "@escape/*": ["../outside/*"],
          "__proto__": ["src/*"]
        }
      }
    }\n`,
    "utf8",
  );
  await writeFile(join(path, "throws.js"), "throw new Error('must not execute')", "utf8");
  await writeFile(
    join(path, "src", "card.tsx"),
    "export function Card({ title }: { title: string }) { return <section>{title}</section>; }",
    "utf8",
  );

  const result = await analyzeReactProject(await RepositoryRoot.open(path));

  assert.deepEqual(result.compiler, { baseUrl: ".", paths: { "@safe/*": ["src/*"] } });
  assert.ok(result.analysis.components.some((component) => component.displayName === "Card"));
  assert.ok(result.analysis.diagnostics.some((item) => item.code === "TSCONFIG_EXTENDS_IGNORED"));
  assert.ok(result.analysis.diagnostics.some((item) => item.code === "TSCONFIG_PATH_TARGET_INVALID"));
  assert.equal(Object.prototype.hasOwnProperty.call(result.compiler.paths ?? {}, "__proto__"), false);
  assert.equal((Object.prototype as { polluted?: unknown }).polluted, undefined);
  assert.equal(JSON.stringify(result).includes("must not execute"), false);
});
