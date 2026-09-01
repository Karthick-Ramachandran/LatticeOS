import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { stableStringify } from "@latticeos/core";

import { detectProject } from "./project-discovery.js";
import { RepositoryRoot } from "./repository-root.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

test("detects workspace packages and supported tool markers without executing config", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const result = await detectProject(root);

  assert.equal(result.project.packageManager, "pnpm");
  assert.deepEqual(
    result.packages.map((item) => item.key),
    ["@fixture/ui", "root", "web"],
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.project.tools).map(([name, detection]) => [name, detection.status])),
    {
      react: "present",
      nextjs: "present",
      typescript: "present",
      tailwind: "present",
      shadcn: "present",
      storybook: "present",
    },
  );
  assert.equal(result.diagnostics.length, 0);
  assert.ok(result.evidence.every((item) => !item.location.path.startsWith("/")));
  assert.ok(result.project.tools.react.evidenceIds.every((id) => result.evidence.some((item) => item.id === id)));
  const golden = await readFile(resolve(fixtureRoot, "../goldens/project-discovery.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(result), golden);
});

test("a truncated scan reports missing tools as unknown", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const result = await detectProject(root, { maxFiles: 1 });

  assert.equal(result.truncated, true);
  assert.ok(Object.values(result.project.tools).some((item) => item.status === "unknown"));
  assert.ok(result.diagnostics.some((item) => item.code === "FILE_COUNT_LIMIT"));
});

test("malformed manifests become bounded diagnostics without source contents", async () => {
  const path = await mkdtemp(join(tmpdir(), "lattice-manifest-"));
  await mkdir(join(path, "src"));
  await writeFile(join(path, "package.json"), "{ secret: 'not json' }", "utf8");
  await writeFile(join(path, "src", "index.ts"), "export {};", "utf8");
  const root = await RepositoryRoot.open(path);
  const result = await detectProject(root);

  assert.ok(result.diagnostics.some((item) => item.code === "MANIFEST_INVALID"));
  assert.equal(JSON.stringify(result).includes("not json"), false);
  assert.equal(result.project.tools.react.status, "unknown");
  assert.deepEqual(result.packages.map((item) => item.key), ["root"]);
});

test("an unrelated or malformed components.json does not prove shadcn presence", async () => {
  const path = await mkdtemp(join(tmpdir(), "lattice-shadcn-"));
  await writeFile(join(path, "package.json"), "{\"name\":\"fixture\"}\n", "utf8");
  await writeFile(join(path, "components.json"), "{\"components\": []}\n", "utf8");
  const root = await RepositoryRoot.open(path);
  const result = await detectProject(root);

  assert.equal(result.project.tools.shadcn.status, "unknown");
  assert.ok(result.diagnostics.some((item) => item.code === "SHADCN_MARKER_INVALID"));
});
