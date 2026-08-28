import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AnalyzerError,
  HARD_MAX_FILE_BYTES,
  RepositoryRoot,
  isDefaultExcluded,
} from "./repository-root.js";

async function temporaryRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "lattice-analyzer-"));
  await writeFile(join(root, "package.json"), "{}\n", "utf8");
  return root;
}

test("RepositoryRoot rejects files and missing roots", async () => {
  const root = await temporaryRepository();
  await assert.rejects(
    RepositoryRoot.open(join(root, "missing")),
    (error: unknown) => error instanceof AnalyzerError && error.code === "ROOT_NOT_FOUND",
  );
  await assert.rejects(
    RepositoryRoot.open(join(root, "package.json")),
    (error: unknown) => error instanceof AnalyzerError && error.code === "ROOT_NOT_DIRECTORY",
  );
});

test("reads stay inside the root and default exclusions are not readable", async () => {
  const rootPath = await temporaryRepository();
  const outside = await mkdtemp(join(tmpdir(), "lattice-outside-"));
  await writeFile(join(outside, "secret.txt"), "do not read", "utf8");
  await symlink(join(outside, "secret.txt"), join(rootPath, "escape.txt"));
  await writeFile(join(rootPath, ".env"), "TOKEN=not-a-real-secret\n", "utf8");
  const root = await RepositoryRoot.open(rootPath);

  await assert.rejects(
    root.readText("../secret.txt"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "PATH_INVALID",
  );
  await assert.rejects(
    root.readText("/etc/passwd"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "PATH_INVALID",
  );
  await assert.rejects(
    root.readText("escape.txt"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "PATH_ESCAPES_ROOT",
  );
  await assert.rejects(
    root.readText(".env"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "PATH_EXCLUDED",
  );
});

test("an in-root file symlink can be read explicitly but discovery never follows symlinks", async () => {
  const rootPath = await temporaryRepository();
  await mkdir(join(rootPath, "src"));
  await writeFile(join(rootPath, "src", "button.tsx"), "export const Button = () => null;\n", "utf8");
  await symlink(join(rootPath, "src", "button.tsx"), join(rootPath, "button-link.tsx"));
  await symlink(join(rootPath, "src", "missing.tsx"), join(rootPath, "broken-link.tsx"));
  const root = await RepositoryRoot.open(rootPath);

  assert.match(await root.readText("button-link.tsx"), /Button/u);
  const inventory = await root.listFiles();
  assert.equal(inventory.files.includes("button-link.tsx"), false);
  assert.ok(inventory.diagnostics.some((item) => item.code === "SYMLINK_SKIPPED"));
  assert.ok(inventory.diagnostics.some((item) => item.code === "SYMLINK_BROKEN"));
});

test("file, depth, and byte bounds produce deterministic containment", async () => {
  const rootPath = await temporaryRepository();
  await mkdir(join(rootPath, "src", "nested"), { recursive: true });
  await writeFile(join(rootPath, "src", "large.ts"), "x".repeat(20), "utf8");
  await writeFile(join(rootPath, "src", "nested", "deep.ts"), "ok", "utf8");
  const root = await RepositoryRoot.open(rootPath);

  await assert.rejects(
    root.readText("src/large.ts", 10),
    (error: unknown) => error instanceof AnalyzerError && error.code === "FILE_TOO_LARGE",
  );
  const inventory = await root.listFiles({ maxFiles: 10, maxDepth: 1, maxFileBytes: 10 });
  assert.equal(inventory.truncated, true);
  assert.ok(inventory.diagnostics.some((item) => item.code === "DEPTH_LIMIT"));
  assert.ok(inventory.diagnostics.some((item) => item.code === "FILE_SIZE_LIMIT"));

  const directoryBound = await root.listFiles({ maxDirectoryEntries: 1 });
  assert.equal(directoryBound.truncated, true);
  assert.ok(directoryBound.diagnostics.some((item) => item.code === "DIRECTORY_ENTRY_LIMIT"));
  await assert.rejects(
    root.readText("package.json", HARD_MAX_FILE_BYTES + 1),
    (error: unknown) => error instanceof AnalyzerError && error.code === "BOUND_INVALID",
  );
});

test("known dependency, generated, VCS, cache, report, and secret paths are excluded", () => {
  for (const path of [
    "node_modules/react/index.js",
    ".git/config",
    ".lattice/cache/reuse-index.json",
    ".next/server/app.js",
    "coverage/index.html",
    ".env.local",
    ".npmrc",
  ]) {
    assert.equal(isDefaultExcluded(path), true, path);
  }
  assert.equal(isDefaultExcluded(".lattice/config.json"), false);
  assert.equal(isDefaultExcluded("src/button.tsx"), false);
});

test("committed LatticeOS configuration is readable while generated state stays excluded", async () => {
  const rootPath = await temporaryRepository();
  await mkdir(join(rootPath, ".lattice", "cache"), { recursive: true });
  await writeFile(join(rootPath, ".lattice", "config.json"), "{}\n", "utf8");
  await writeFile(join(rootPath, ".lattice", "cache", "reuse-index.json"), "{}\n", "utf8");
  const root = await RepositoryRoot.open(rootPath);

  assert.equal(await root.readText(".lattice/config.json"), "{}\n");
  await assert.rejects(
    root.readText(".lattice/cache/reuse-index.json"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "PATH_EXCLUDED",
  );
});
