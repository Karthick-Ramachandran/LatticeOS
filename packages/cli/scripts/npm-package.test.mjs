import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { copyRegularTree, removeNpmCliTarball } from "./npm-package.mjs";

async function withTemporaryRoot(run) {
  const root = await mkdtemp(join(tmpdir(), "latticeos-npm-package-test-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 });
  }
}

test("copies a bounded regular-file tree without links", async () => {
  await withTemporaryRoot(async (root) => {
    const source = join(root, "source");
    const target = join(root, "target");
    await mkdir(join(source, "nested"), { recursive: true });
    await writeFile(join(source, "nested", "index.js"), "export const value = 1;\n", "utf8");

    const state = { files: 0, bytes: 0 };
    await copyRegularTree(source, target, state);

    assert.equal(await readFile(join(target, "nested", "index.js"), "utf8"), "export const value = 1;\n");
    assert.equal((await lstat(join(target, "nested", "index.js"))).isSymbolicLink(), false);
    assert.equal(state.files, 1);
  });
});

test("rejects symbolic links in staged package input", async () => {
  await withTemporaryRoot(async (root) => {
    const source = join(root, "source");
    await mkdir(source);
    await writeFile(join(root, "outside.js"), "export const unsafe = true;\n", "utf8");
    await symlink(join(root, "outside.js"), join(source, "linked.js"));

    await assert.rejects(
      copyRegularTree(source, join(root, "target"), { files: 0, bytes: 0 }),
      /cannot contain a symlink/u,
    );
  });
});

test("refuses to remove a temporary release-shaped path it did not create", async () => {
  const unownedRoot = await mkdtemp(join(tmpdir(), "latticeos-npm-cli-unowned-"));
  try {
    await assert.rejects(
      removeNpmCliTarball(unownedRoot),
      /this process did not create/u,
    );
    assert.equal((await lstat(unownedRoot)).isDirectory(), true);
  } finally {
    await rm(unownedRoot, { recursive: true, force: true, maxRetries: 3 });
  }
});
