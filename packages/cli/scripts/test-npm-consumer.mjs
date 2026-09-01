import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { cp, lstat, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import { createNpmCliTarball, isolatedNpmArguments, removeNpmCliTarball } from "./npm-package.mjs";

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixtureRoot = join(repositoryRoot, "fixtures/npm-consumer");
const packageManager = process.platform === "win32" ? "npm.cmd" : "npm";
const temporaryPrefix = "latticeos-npm-consumer-";
const preservedFixtureFiles = ["package.json", "tsconfig.json", "components/button.tsx", "app/page.tsx"];

async function run(command, arguments_, cwd, label) {
  try {
    return await execFile(command, arguments_, {
      cwd,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown command failure";
    throw new Error(`${label} failed: ${message}`);
  }
}

async function createTemporaryConsumer() {
  return mkdtemp(join(tmpdir(), temporaryPrefix));
}

function installedBinary(consumerDirectory) {
  if (process.platform === "win32") {
    return {
      command: process.execPath,
      arguments_: [join(consumerDirectory, "node_modules/@latticeos/cli/dist/bin.js")],
      shim: join(consumerDirectory, "node_modules/.bin/lattice.cmd"),
    };
  }
  return {
    command: join(consumerDirectory, "node_modules/.bin/lattice"),
    arguments_: [],
    shim: join(consumerDirectory, "node_modules/.bin/lattice"),
  };
}

async function verifyReleaseArtifact(release) {
  assert.equal(release.descriptor.name, "@latticeos/cli");
  assert.equal(release.descriptor.version, "0.1.0-rc.0");
  assert.equal(release.descriptor.private, undefined);
  assert.equal(release.descriptor.workspaces, undefined);
  assert.deepEqual(release.descriptor.bundledDependencies, [
    "@latticeos/adapter-react",
    "@latticeos/adapter-shadcn",
    "@latticeos/adapter-storybook",
    "@latticeos/adapter-tailwind",
    "@latticeos/analyzer",
    "@latticeos/core",
    "typescript",
  ]);
  await run(
    packageManager,
    ["pack", "--json", "--dry-run", "--offline", "--ignore-scripts", ...isolatedNpmArguments(release.stagingRoot)],
    release.packageRoot,
    "Dry-run the staged npm artifact",
  );
}

async function verifyInstalledPackage(consumerDirectory) {
  const installedCli = join(consumerDirectory, "node_modules/@latticeos/cli");
  const installedCliPath = await realpath(installedCli);
  assert.equal((await lstat(installedCli)).isSymbolicLink(), false, "the CLI must be extracted from its tarball");
  assert.ok(
    relative(repositoryRoot, installedCliPath).startsWith(".."),
    "the installed CLI must not resolve back into this worktree",
  );
  for (const packageName of ["@latticeos/core", "@latticeos/analyzer", "typescript"]) {
    const packagePath = join(installedCli, "node_modules", ...packageName.split("/"));
    assert.equal((await lstat(packagePath)).isSymbolicLink(), false, `${packageName} must be bundled, not linked`);
  }
  const shim = await lstat(installedBinary(consumerDirectory).shim);
  assert.equal(shim.isFile() || shim.isSymbolicLink(), true, "npm must expose the lattice binary");
}

async function snapshotFixtureSources(root) {
  return Object.fromEntries(await Promise.all(
    preservedFixtureFiles.map(async (path) => [path, await readFile(join(root, path), "utf8")]),
  ));
}

async function verifyLatticeWriteBoundary(consumerDirectory, sourceBefore) {
  assert.deepEqual(await snapshotFixtureSources(consumerDirectory), sourceBefore, "analysis must not rewrite fixture files");
  assert.deepEqual(await readdir(join(consumerDirectory, ".lattice")), ["cache"]);
  assert.deepEqual(await readdir(join(consumerDirectory, ".lattice/cache")), ["reuse-index.json"]);
  await assert.rejects(lstat(join(consumerDirectory, "package-lock.json")), { code: "ENOENT" });
}

async function main() {
  const release = await createNpmCliTarball();
  let consumerDirectory;
  try {
    await verifyReleaseArtifact(release);
    consumerDirectory = await createTemporaryConsumer();
    await cp(fixtureRoot, consumerDirectory, { recursive: true });
    const sourceBefore = await snapshotFixtureSources(consumerDirectory);
    const userConfig = join(consumerDirectory, "npmrc");
    const globalConfig = join(consumerDirectory, "npm-globalrc");
    await writeFile(userConfig, "", { encoding: "utf8", mode: 0o600 });
    await writeFile(globalConfig, "", { encoding: "utf8", mode: 0o600 });

    await run(
      packageManager,
      [
        "install",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-save",
        "--package-lock=false",
        ...isolatedNpmArguments(consumerDirectory),
        release.tarballPath,
      ],
      consumerDirectory,
      "Install the staged npm CLI artifact",
    );
    await verifyInstalledPackage(consumerDirectory);

    const lattice = installedBinary(consumerDirectory);
    const version = await run(lattice.command, [...lattice.arguments_, "--version"], consumerDirectory, "Run lattice --version");
    assert.equal(version.stdout, `${release.descriptor.version}\n`);
    assert.equal(version.stderr, "");

    const help = await run(lattice.command, [...lattice.arguments_, "--help"], consumerDirectory, "Run lattice --help");
    assert.match(help.stdout, /LatticeOS Reuse CLI/u);
    assert.equal(help.stderr, "");

    const search = await run(
      lattice.command,
      [...lattice.arguments_, "search", "Button", "--json"],
      consumerDirectory,
      "Run npm-installed lattice analysis",
    );
    assert.equal(search.stderr, "");
    const output = JSON.parse(search.stdout);
    assert.equal(output.schemaVersion, 1);
    assert.equal(output.command, "search");
    assert.ok(output.result.some((item) => item.displayName === "Button"), "the npm CLI should find Button");
    await verifyLatticeWriteBoundary(consumerDirectory, sourceBefore);

    const cache = JSON.parse(await readFile(join(consumerDirectory, ".lattice/cache/reuse-index.json"), "utf8"));
    assert.equal(cache.schemaVersion, 1, "analysis should write only its validated generated cache");
    process.stdout.write("Bundled LatticeOS npm CLI passed the minimal external consumer proof.\n");
  } finally {
    if (consumerDirectory) await rm(consumerDirectory, { recursive: true, force: true, maxRetries: 3 });
    await removeNpmCliTarball(release.stagingRoot);
  }
}

await main();
