import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { serializeReuseIndex } from "@latticeos/core";

import { analyzeProject } from "./project-analysis.js";
import { readReuseIndex, writeReuseIndex } from "./reuse-index-cache.js";
import { AnalyzerError, RepositoryRoot } from "./repository-root.js";

async function temporaryRepository(): Promise<RepositoryRoot> {
  const path = await mkdtemp(join(tmpdir(), "lattice-reuse-cache-"));
  await writeFile(join(path, "package.json"), "{}\n", "utf8");
  return RepositoryRoot.open(path);
}

test("loads a valid generated Reuse index and treats missing state as a cache miss", async () => {
  const root = await temporaryRepository();
  assert.deepEqual(await readReuseIndex(root), { status: "missing" });

  const analysis = await analyzeProject(root, { generatorVersion: "0.0.0-test" });
  await writeReuseIndex(root, analysis.index);
  const cached = await readReuseIndex(root);

  assert.equal(cached.status, "hit");
  if (cached.status !== "hit") throw new Error("Expected a Reuse index cache hit");
  assert.equal(serializeReuseIndex(cached.index), serializeReuseIndex(analysis.index));
});

test("treats malformed and incompatible generated state as invalid without parsing it as evidence", async () => {
  const root = await temporaryRepository();

  await root.writeReuseIndexCache("not-json\n");
  assert.deepEqual(await readReuseIndex(root), { status: "invalid" });
  await root.writeReuseIndexCache('{"schemaVersion":999}\n');
  assert.deepEqual(await readReuseIndex(root), { status: "invalid" });
});

test("rejects an unsafe cache path instead of treating it as an ordinary cache miss", async () => {
  const root = await temporaryRepository();
  const outside = await mkdtemp(join(tmpdir(), "lattice-reuse-cache-outside-"));
  await writeFile(join(outside, "reuse-index.json"), "outside\n", "utf8");
  await mkdir(join(root.absolutePath, ".lattice", "cache"), { recursive: true });
  await symlink(join(outside, "reuse-index.json"), join(root.absolutePath, ".lattice", "cache", "reuse-index.json"));

  await assert.rejects(
    readReuseIndex(root),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CACHE_FILE_INVALID",
  );
});
