import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixtureRoot = join(repositoryRoot, "fixtures/next-workspace");
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const packedPackages = [
  { name: "@latticeos/core", directory: "packages/core", tarball: "core.tgz" },
  { name: "@latticeos/adapter-react", directory: "packages/adapters/react", tarball: "adapter-react.tgz" },
  { name: "@latticeos/adapter-tailwind", directory: "packages/adapters/tailwind", tarball: "adapter-tailwind.tgz" },
  { name: "@latticeos/adapter-shadcn", directory: "packages/adapters/shadcn", tarball: "adapter-shadcn.tgz" },
  { name: "@latticeos/adapter-storybook", directory: "packages/adapters/storybook", tarball: "adapter-storybook.tgz" },
  { name: "@latticeos/analyzer", directory: "packages/analyzer", tarball: "analyzer.tgz" },
  { name: "@latticeos/cli", directory: "packages/cli", tarball: "cli.tgz" },
];

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

function localTarballDependencies() {
  return Object.fromEntries(
    packedPackages.map((item) => [item.name, `file:../tarballs/${item.tarball}`]),
  );
}

async function packWorkspacePackages(tarballDirectory) {
  for (const item of packedPackages) {
    await run(
      packageManager,
      ["pack", "--out", join(tarballDirectory, item.tarball)],
      join(repositoryRoot, item.directory),
      `Pack ${item.name}`,
    );
  }
}

async function prepareConsumer(consumerDirectory) {
  await cp(fixtureRoot, consumerDirectory, { recursive: true });
  const manifestPath = join(consumerDirectory, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const workspaces = manifest.workspaces;
  delete manifest.workspaces;
  manifest.dependencies = {
    ...manifest.dependencies,
    ...localTarballDependencies(),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return workspaces;
}

async function restoreConsumerWorkspaces(consumerDirectory, workspaces) {
  const manifestPath = join(consumerDirectory, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.workspaces = workspaces;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
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

async function verifyInstalledPackage(consumerDirectory) {
  const installedCli = join(consumerDirectory, "node_modules/@latticeos/cli");
  const installedCliPath = await realpath(installedCli);
  assert.equal((await lstat(installedCli)).isSymbolicLink(), false, "the CLI must be extracted from its tarball");
  assert.ok(
    relative(repositoryRoot, installedCliPath).startsWith(".."),
    "the installed CLI must not resolve back into this worktree",
  );
  const shim = await lstat(installedBinary(consumerDirectory).shim);
  assert.equal(shim.isFile() || shim.isSymbolicLink(), true, "npm must expose the lattice binary");
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "latticeos-packed-consumer-"));
  const tarballDirectory = join(temporaryRoot, "tarballs");
  const consumerDirectory = join(temporaryRoot, "consumer");
  const sourcePath = join(consumerDirectory, "packages/ui/src/button.tsx");

  try {
    await mkdir(tarballDirectory);
    await packWorkspacePackages(tarballDirectory);
    const fixtureWorkspaces = await prepareConsumer(consumerDirectory);
    const sourceBefore = await readFile(sourcePath, "utf8");

    await run(
      npm,
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--omit=dev", "--workspaces=false"],
      consumerDirectory,
      "Install packed LatticeOS dependencies",
    );
    await restoreConsumerWorkspaces(consumerDirectory, fixtureWorkspaces);
    await verifyInstalledPackage(consumerDirectory);

    const lattice = installedBinary(consumerDirectory);
    const help = await run(lattice.command, [...lattice.arguments_, "--help"], consumerDirectory, "Run lattice --help");
    assert.match(help.stdout, /LatticeOS Reuse CLI/u);
    assert.equal(help.stderr, "");

    const search = await run(
      lattice.command,
      [...lattice.arguments_, "search", "Button", "--json"],
      consumerDirectory,
      "Run packed lattice analysis",
    );
    assert.equal(search.stderr, "");
    const output = JSON.parse(search.stdout);
    assert.equal(output.schemaVersion, 1);
    assert.equal(output.command, "search");
    assert.ok(output.result.some((item) => item.displayName === "Button"), "the packed CLI should find Button");
    assert.equal(await readFile(sourcePath, "utf8"), sourceBefore, "analysis must not rewrite fixture source");

    const cache = JSON.parse(await readFile(join(consumerDirectory, ".lattice/cache/reuse-index.json"), "utf8"));
    assert.equal(cache.schemaVersion, 1, "analysis should write only its validated generated cache");
    process.stdout.write("Packed LatticeOS CLI passed the controlled Next.js consumer proof.\n");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 3 });
  }
}

await main();
