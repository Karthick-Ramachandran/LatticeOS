import { execFile as execFileCallback } from "node:child_process";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const cliDirectory = join(repositoryRoot, "packages/cli");
const npmDescriptorDirectory = join(cliDirectory, "npm");
const releaseDescriptorPath = join(npmDescriptorDirectory, "package.json");
const releaseReadmePath = join(npmDescriptorDirectory, "README.md");
const releaseLicensePath = join(repositoryRoot, "LICENSE");
const temporaryPrefix = "latticeos-npm-cli-";
const packageManager = process.platform === "win32" ? "npm.cmd" : "npm";
const maximumStagedFiles = 10_000;
const maximumStagedBytes = 64 * 1024 * 1024;
const ownedStagingRoots = new Set();

const bundledPackages = [
  { name: "@latticeos/core", directory: "packages/core", includeSchema: true },
  { name: "@latticeos/adapter-react", directory: "packages/adapters/react" },
  { name: "@latticeos/adapter-tailwind", directory: "packages/adapters/tailwind" },
  { name: "@latticeos/adapter-shadcn", directory: "packages/adapters/shadcn" },
  { name: "@latticeos/adapter-storybook", directory: "packages/adapters/storybook" },
  { name: "@latticeos/analyzer", directory: "packages/analyzer" },
];

const bundledDependencyNames = sorted([...bundledPackages.map((item) => item.name), "typescript"]);
const releaseDescriptor = {
  name: "@latticeos/cli",
  version: "0.1.0-rc.0",
  description: "Repository-native UI reuse evidence for coding agents.",
  license: "MIT",
  type: "module",
  engines: { node: ">=22.0.0" },
  bin: { lattice: "./dist/bin.js" },
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    },
  },
  files: ["dist", "README.md", "LICENSE"],
  dependencies: Object.fromEntries(bundledDependencyNames.map((name) => [name, name === "typescript" ? "6.0.3" : "0.1.0-rc.0"])),
  bundledDependencies: bundledDependencyNames,
};

function releaseError(message) {
  return new Error(`npm CLI package failed: ${message}`);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, "en-US"));
}

function isInside(root, path) {
  const value = relative(root, path);
  return value.length === 0 || (!value.startsWith("..") && !value.includes(`..${process.platform === "win32" ? "\\" : "/"}`));
}

function shouldCopyCompiledFile(path) {
  return !path.endsWith(".map") && !path.includes(".test.");
}

function runtimePackageManifest(name, version, includeSchema) {
  const manifest = {
    name,
    version,
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    },
  };
  if (includeSchema) {
    manifest.exports["./schema/reuse-index.schema.json"] = "./schema/reuse-index.schema.json";
  }
  return manifest;
}

async function requireRegularDirectory(path, label) {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch {
    throw releaseError(`${label} is unavailable.`);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw releaseError(`${label} must be a regular directory.`);
}

async function requireRegularFile(path, label) {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch {
    throw releaseError(`${label} is unavailable.`);
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw releaseError(`${label} must be a regular file.`);
  return metadata;
}

function isSameFile(before, after) {
  return before.dev === after.dev && before.ino === after.ino && before.size === after.size;
}

function sourceReadFlags() {
  if (process.platform === "win32") return constants.O_RDONLY;
  return constants.O_RDONLY | (typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0);
}

async function writeExactly(source, target, metadata, label) {
  let sourceHandle;
  try {
    sourceHandle = await open(source, sourceReadFlags());
  } catch {
    throw releaseError(`${label} changed while staging.`);
  }
  try {
    const current = await sourceHandle.stat();
    if (!current.isFile() || !isSameFile(metadata, current)) throw releaseError(`${label} changed while staging.`);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    const targetHandle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    try {
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, Math.max(1, metadata.size)));
      let position = 0;
      while (position < metadata.size) {
        const { bytesRead } = await sourceHandle.read(buffer, 0, Math.min(buffer.length, metadata.size - position), position);
        if (bytesRead === 0) throw releaseError(`${label} changed while staging.`);
        let written = 0;
        while (written < bytesRead) {
          const result = await targetHandle.write(buffer, written, bytesRead - written, position + written);
          if (result.bytesWritten === 0) throw releaseError("could not write the staged package input.");
          written += result.bytesWritten;
        }
        position += bytesRead;
      }
      const extra = Buffer.allocUnsafe(1);
      if ((await sourceHandle.read(extra, 0, 1, metadata.size)).bytesRead !== 0) {
        throw releaseError(`${label} changed while staging.`);
      }
    } finally {
      await targetHandle.close();
    }
  } finally {
    await sourceHandle.close();
  }
}

async function copyRegularTree(sourceRoot, targetRoot, state, filter = () => true) {
  await requireRegularDirectory(sourceRoot, "package input");
  const resolvedSourceRoot = await realpath(sourceRoot);
  await mkdir(targetRoot, { recursive: true, mode: 0o700 });

  async function visit(sourceDirectory, targetDirectory, relativeDirectory) {
    const resolvedDirectory = await realpath(sourceDirectory);
    if (!isInside(resolvedSourceRoot, resolvedDirectory)) {
      throw releaseError("package input cannot leave its staged source directory.");
    }
    const entries = await readdir(sourceDirectory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en-US"))) {
      const relativePath = relativeDirectory.length === 0 ? entry.name : `${relativeDirectory}/${entry.name}`;
      const sourcePath = join(sourceDirectory, entry.name);
      const targetPath = join(targetDirectory, entry.name);
      const metadata = await lstat(sourcePath);
      if (metadata.isSymbolicLink()) throw releaseError("package input cannot contain a symlink.");
      if (metadata.isDirectory()) {
        await mkdir(targetPath, { recursive: true, mode: 0o700 });
        await visit(sourcePath, targetPath, relativePath);
        continue;
      }
      if (!metadata.isFile()) throw releaseError("package input contains an unsupported entry.");
      if (!filter(relativePath)) continue;
      state.files += 1;
      state.bytes += metadata.size;
      if (state.files > maximumStagedFiles || state.bytes > maximumStagedBytes) {
        throw releaseError("package input exceeds the staging bounds.");
      }
      await writeExactly(sourcePath, targetPath, metadata, "package input");
    }
  }

  await visit(sourceRoot, targetRoot, "");
}

async function copyRegularFile(source, target, label) {
  const metadata = await requireRegularFile(source, label);
  await writeExactly(source, target, metadata, label);
}

async function readReleaseDescriptor() {
  let descriptor;
  try {
    descriptor = JSON.parse(await readFile(releaseDescriptorPath, "utf8"));
  } catch {
    throw releaseError("the fixed release descriptor is invalid.");
  }
  if (JSON.stringify(descriptor) !== JSON.stringify(releaseDescriptor)) {
    throw releaseError("the fixed release descriptor does not match the bundled closure.");
  }
  return descriptor;
}

async function copyBundledPackage(packageRoot, descriptor, state, item) {
  const sourceDirectory = join(repositoryRoot, item.directory);
  const sourceDist = join(sourceDirectory, "dist");
  const targetDirectory = join(packageRoot, "node_modules", ...item.name.split("/"));
  await requireRegularDirectory(sourceDirectory, "package source");
  await copyRegularTree(sourceDist, join(targetDirectory, "dist"), state, shouldCopyCompiledFile);
  if (item.includeSchema) {
    await copyRegularTree(join(sourceDirectory, "schema"), join(targetDirectory, "schema"), state, (path) => path.endsWith(".json"));
  }
  await writeFile(
    join(targetDirectory, "package.json"),
    `${JSON.stringify(runtimePackageManifest(item.name, descriptor.version, item.includeSchema), null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

async function copyTypeScript(packageRoot, state) {
  const typeScriptPath = await realpath(join(repositoryRoot, "packages/analyzer/node_modules/typescript"));
  if (!isInside(repositoryRoot, typeScriptPath)) throw releaseError("the pinned TypeScript package escaped the repository.");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(typeScriptPath, "package.json"), "utf8"));
  } catch {
    throw releaseError("the pinned TypeScript manifest is invalid.");
  }
  if (manifest?.name !== "typescript" || manifest?.version !== "6.0.3") {
    throw releaseError("the pinned TypeScript package version is not available.");
  }
  await copyRegularTree(typeScriptPath, join(packageRoot, "node_modules/typescript"), state, (path) => !path.endsWith(".map"));
}

function isolatedNpmArguments(stagingRoot) {
  return [
    "--userconfig",
    join(stagingRoot, "npmrc"),
    "--globalconfig",
    join(stagingRoot, "npm-globalrc"),
    "--cache",
    join(stagingRoot, "npm-cache"),
    "--logs-dir",
    join(stagingRoot, "npm-logs"),
  ];
}

async function packStagedPackage(stagingRoot, packageRoot) {
  const userConfig = join(stagingRoot, "npmrc");
  const globalConfig = join(stagingRoot, "npm-globalrc");
  await writeFile(userConfig, "", { encoding: "utf8", mode: 0o600 });
  await writeFile(globalConfig, "", { encoding: "utf8", mode: 0o600 });
  let output;
  try {
    output = await execFile(packageManager, ["pack", "--json", "--offline", "--ignore-scripts", ...isolatedNpmArguments(stagingRoot)], {
      cwd: packageRoot,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    throw releaseError("npm could not pack the staged CLI artifact.");
  }
  let packed;
  try {
    packed = JSON.parse(output.stdout);
  } catch {
    throw releaseError("npm did not describe the staged CLI artifact.");
  }
  const filename = packed?.[0]?.filename;
  if (typeof filename !== "string" || filename !== basename(filename) || !filename.endsWith(".tgz")) {
    throw releaseError("npm returned an unsafe staged tarball name.");
  }
  const tarball = join(packageRoot, filename);
  await requireRegularFile(tarball, "staged tarball");
  return tarball;
}

export async function createNpmCliTarball() {
  const descriptor = await readReleaseDescriptor();
  const stagingRoot = await mkdtemp(join(tmpdir(), temporaryPrefix));
  ownedStagingRoots.add(stagingRoot);
  try {
    const packageRoot = join(stagingRoot, "package");
    const state = { files: 0, bytes: 0 };
    await mkdir(packageRoot, { recursive: true, mode: 0o700 });
    await copyRegularTree(join(cliDirectory, "dist"), join(packageRoot, "dist"), state, shouldCopyCompiledFile);
    await copyRegularFile(releaseReadmePath, join(packageRoot, "README.md"), "release README");
    await copyRegularFile(releaseLicensePath, join(packageRoot, "LICENSE"), "release license");
    for (const item of bundledPackages) {
      await copyBundledPackage(packageRoot, descriptor, state, item);
    }
    await copyTypeScript(packageRoot, state);
    await writeFile(join(packageRoot, "package.json"), `${JSON.stringify(descriptor, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    const tarballPath = await packStagedPackage(stagingRoot, packageRoot);
    return { stagingRoot, packageRoot, tarballPath, descriptor };
  } catch (error) {
    await removeNpmCliTarball(stagingRoot);
    throw error;
  }
}

export async function removeNpmCliTarball(stagingRoot) {
  const temporaryRoot = resolve(tmpdir());
  const resolved = resolve(stagingRoot);
  if (dirname(resolved) !== temporaryRoot || !basename(resolved).startsWith(temporaryPrefix)) {
    throw releaseError("refusing to remove a non-release temporary directory.");
  }
  if (!ownedStagingRoots.has(resolved)) {
    throw releaseError("refusing to remove a temporary directory this process did not create.");
  }
  const metadata = await lstat(resolved);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw releaseError("refusing to remove an unsafe release temporary directory.");
  }
  await rm(resolved, { recursive: true, force: true, maxRetries: 3 });
  ownedStagingRoots.delete(resolved);
}

export { copyRegularTree, isolatedNpmArguments };
