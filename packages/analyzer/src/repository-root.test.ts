import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AnalyzerError,
  HARD_MAX_FILE_BYTES,
  INITIAL_LATTICE_CONFIG_CONTENT,
  LATTICE_CONFIG_PATH,
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

test("creates the fixed initial configuration, skips existing content, and replaces only with force", async () => {
  const rootPath = await temporaryRepository();
  const root = await RepositoryRoot.open(rootPath);

  assert.equal(await root.inspectLatticeConfig(), "missing");
  assert.deepEqual(await root.writeInitialLatticeConfig(), { status: "created" });
  assert.equal(await root.inspectLatticeConfig(), "present");
  assert.equal(await readFile(join(rootPath, LATTICE_CONFIG_PATH), "utf8"), INITIAL_LATTICE_CONFIG_CONTENT);

  await writeFile(join(rootPath, LATTICE_CONFIG_PATH), '{"schemaVersion":99}\n', "utf8");
  assert.deepEqual(await root.writeInitialLatticeConfig(), { status: "skipped" });
  assert.equal(await readFile(join(rootPath, LATTICE_CONFIG_PATH), "utf8"), '{"schemaVersion":99}\n');
  assert.deepEqual(await root.writeInitialLatticeConfig(true), { status: "created" });
  assert.equal(await readFile(join(rootPath, LATTICE_CONFIG_PATH), "utf8"), INITIAL_LATTICE_CONFIG_CONTENT);
});

test("initial configuration rejects symlinked files without writing outside the root", async () => {
  const rootPath = await temporaryRepository();
  const outside = await mkdtemp(join(tmpdir(), "lattice-config-outside-"));
  const outsideConfig = join(outside, "config.json");
  await writeFile(outsideConfig, '{"schemaVersion":99}\n', "utf8");
  await mkdir(join(rootPath, ".lattice"));
  await symlink(outsideConfig, join(rootPath, LATTICE_CONFIG_PATH));
  const root = await RepositoryRoot.open(rootPath);

  await assert.rejects(
    root.inspectLatticeConfig(),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CONFIG_FILE_INVALID",
  );
  await assert.rejects(
    root.writeInitialLatticeConfig(true),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CONFIG_FILE_INVALID",
  );
  assert.equal(await readFile(outsideConfig, "utf8"), '{"schemaVersion":99}\n');
});

test("initial configuration does not create files below a symlinked LatticeOS directory", async () => {
  const rootPath = await temporaryRepository();
  const outside = await mkdtemp(join(tmpdir(), "lattice-config-directory-outside-"));
  await symlink(outside, join(rootPath, ".lattice"));
  const root = await RepositoryRoot.open(rootPath);

  await assert.rejects(
    root.writeInitialLatticeConfig(),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CONFIG_DIRECTORY_INVALID",
  );
  await assert.rejects(lstat(join(outside, "config.json")));
});

test("writes and atomically replaces the one LatticeOS-owned Reuse index cache", async () => {
  const rootPath = await temporaryRepository();
  await mkdir(join(rootPath, "src"));
  await writeFile(join(rootPath, "src", "button.tsx"), "export const Button = () => null;\n", "utf8");
  const root = await RepositoryRoot.open(rootPath);

  await root.writeReuseIndexCache("{\"version\":1}\n");
  assert.equal(await root.readReuseIndexCache(), "{\"version\":1}\n");
  await assert.rejects(
    root.readReuseIndexCache(5),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CACHE_TOO_LARGE",
  );
  await root.writeReuseIndexCache("{\"version\":2}\n");
  assert.equal(await root.readReuseIndexCache(), "{\"version\":2}\n");
  assert.match(await root.readText("src/button.tsx"), /Button/u);
  const cacheMetadata = await lstat(join(rootPath, ".lattice", "cache", "reuse-index.json"));
  assert.equal(cacheMetadata.isSymbolicLink(), false);
  assert.equal(cacheMetadata.isFile(), true);
});

test("rejects missing and symlinked Reuse index cache paths without following them", async () => {
  const rootPath = await temporaryRepository();
  const outside = await mkdtemp(join(tmpdir(), "lattice-cache-outside-"));
  await writeFile(join(outside, "reuse-index.json"), "outside\n", "utf8");
  const root = await RepositoryRoot.open(rootPath);

  await assert.rejects(
    root.readReuseIndexCache(),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CACHE_NOT_FOUND",
  );
  await assert.rejects(lstat(join(rootPath, ".lattice")));
  await mkdir(join(rootPath, ".lattice", "cache"), { recursive: true });
  await symlink(join(outside, "reuse-index.json"), join(rootPath, ".lattice", "cache", "reuse-index.json"));
  await assert.rejects(
    root.readReuseIndexCache(),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CACHE_FILE_INVALID",
  );
  await assert.rejects(
    root.writeReuseIndexCache("replacement\n"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CACHE_FILE_INVALID",
  );
});

test("does not create a cache below a symlinked LatticeOS directory", async () => {
  const rootPath = await temporaryRepository();
  const outside = await mkdtemp(join(tmpdir(), "lattice-cache-directory-outside-"));
  await symlink(outside, join(rootPath, ".lattice"));
  const root = await RepositoryRoot.open(rootPath);

  await assert.rejects(
    root.writeReuseIndexCache("{}\n"),
    (error: unknown) => error instanceof AnalyzerError && error.code === "CACHE_DIRECTORY_INVALID",
  );
  await assert.rejects(lstat(join(outside, "cache")));
});
