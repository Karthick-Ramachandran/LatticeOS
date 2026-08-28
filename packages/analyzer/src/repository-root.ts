import { randomUUID } from "node:crypto";
import { constants, type Dirent } from "node:fs";
import { link, lstat, mkdir, open, opendir, realpath, rename, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { normalizeRepositoryPath, type AnalysisDiagnostic, type RepositoryPath } from "@latticeos/core";

export const DEFAULT_MAX_FILE_BYTES = 1_048_576;
export const DEFAULT_MAX_FILES = 20_000;
export const DEFAULT_MAX_DEPTH = 20;
export const DEFAULT_MAX_DIRECTORY_ENTRIES = 20_000;
export const HARD_MAX_FILE_BYTES = 16_777_216;
export const HARD_MAX_FILES = 100_000;
export const HARD_MAX_DEPTH = 100;
export const HARD_MAX_DIRECTORY_ENTRIES = 100_000;
export const REUSE_INDEX_CACHE_PATH = ".lattice/cache/reuse-index.json";
export const LATTICE_CONFIG_PATH = ".lattice/config.json";
export const STORYBOOK_COMPONENTS_MANIFEST_PATH = "storybook-static/manifests/components.json";
export const INITIAL_LATTICE_CONFIG_CONTENT = '{\n  "schemaVersion": 1\n}\n';

const excludedDirectoryNames = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".output",
  "node_modules",
  "bower_components",
  "coverage",
  "dist",
  "build",
  "out",
  "storybook-static",
]);

const excludedFileNames = new Set([
  ".npmrc",
  ".netrc",
  ".pypirc",
  "id_rsa",
  "id_ed25519",
  "credentials",
  "credentials.json",
]);

export class AnalyzerError extends Error {
  readonly code: string;
  readonly repositoryPath: RepositoryPath | undefined;

  constructor(code: string, message: string, repositoryPath?: RepositoryPath) {
    super(message);
    this.name = "AnalyzerError";
    this.code = code;
    this.repositoryPath = repositoryPath;
  }
}

export interface FileInventory {
  readonly files: readonly RepositoryPath[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
  readonly truncated: boolean;
}

export interface ListFileOptions {
  readonly maxFiles?: number;
  readonly maxDepth?: number;
  readonly maxFileBytes?: number;
  readonly maxDirectoryEntries?: number;
}

export type LatticeConfigStatus = "missing" | "present";

export interface LatticeConfigWriteResult {
  readonly status: "created" | "skipped";
}

function inside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot));
}

function portablePath(root: string, absolutePath: string): RepositoryPath {
  const path = relative(root, absolutePath).split(sep).join("/");
  return normalizeRepositoryPath(path);
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

export function isDefaultExcluded(path: RepositoryPath): boolean {
  const segments = path.split("/");
  const fileName = segments.at(-1) ?? "";
  const latticeGenerated =
    path === ".lattice/cache" ||
    path.startsWith(".lattice/cache/") ||
    path === ".lattice/reports" ||
    path.startsWith(".lattice/reports/");
  return (
    segments.some((segment) => excludedDirectoryNames.has(segment)) ||
    latticeGenerated ||
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    excludedFileNames.has(fileName)
  );
}

export class RepositoryRoot {
  readonly absolutePath: string;

  private constructor(absolutePath: string) {
    this.absolutePath = absolutePath;
  }

  static async open(inputPath: string): Promise<RepositoryRoot> {
    const requested = resolve(inputPath);
    let canonical: string;
    try {
      canonical = await realpath(requested);
    } catch {
      throw new AnalyzerError("ROOT_NOT_FOUND", `Repository root does not exist: ${requested}`);
    }
    const metadata = await stat(canonical);
    if (!metadata.isDirectory()) {
      throw new AnalyzerError("ROOT_NOT_DIRECTORY", `Repository root is not a directory: ${requested}`);
    }
    return new RepositoryRoot(canonical);
  }

  private async resolveExistingPath(
    repositoryPath: string,
    allowDefaultExcluded = false,
  ): Promise<{ requested: RepositoryPath; canonical: string }> {
    let normalized: RepositoryPath;
    try {
      normalized = normalizeRepositoryPath(repositoryPath);
    } catch (error) {
      throw new AnalyzerError(
        "PATH_INVALID",
        error instanceof Error ? error.message : "Repository path is invalid",
      );
    }
    if (!allowDefaultExcluded && isDefaultExcluded(normalized)) {
      throw new AnalyzerError("PATH_EXCLUDED", `Repository path is excluded: ${normalized}`, normalized);
    }

    const unresolved = join(this.absolutePath, ...normalized.split("/"));
    let canonical: string;
    try {
      canonical = await realpath(unresolved);
    } catch {
      throw new AnalyzerError("PATH_NOT_FOUND", `Repository path does not exist: ${normalized}`, normalized);
    }
    if (!inside(this.absolutePath, canonical)) {
      throw new AnalyzerError("PATH_ESCAPES_ROOT", `Repository path resolves outside the root: ${normalized}`, normalized);
    }
    return { requested: normalized, canonical };
  }

  private async ensureOwnedDirectory(
    repositoryPath: ".lattice" | ".lattice/cache",
    create: boolean,
  ): Promise<string> {
    const target = join(this.absolutePath, ...repositoryPath.split("/"));
    if (create) {
      try {
        await mkdir(target, { mode: 0o700 });
      } catch (error) {
        if (errorCode(error) !== "EEXIST") {
          throw new AnalyzerError("CACHE_DIRECTORY_CREATE_FAILED", `Could not create LatticeOS directory: ${repositoryPath}`);
        }
      }
    }
    let metadata;
    try {
      metadata = await lstat(target);
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        throw new AnalyzerError("CACHE_NOT_FOUND", "Reuse index cache does not exist.", REUSE_INDEX_CACHE_PATH);
      }
      throw new AnalyzerError("CACHE_DIRECTORY_INVALID", `LatticeOS directory is unavailable: ${repositoryPath}`);
    }
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new AnalyzerError("CACHE_DIRECTORY_INVALID", `LatticeOS directory is not a regular directory: ${repositoryPath}`);
    }
    let canonical: string;
    try {
      canonical = await realpath(target);
    } catch {
      throw new AnalyzerError("CACHE_DIRECTORY_INVALID", `LatticeOS directory is unavailable: ${repositoryPath}`);
    }
    if (!inside(this.absolutePath, canonical)) {
      throw new AnalyzerError("CACHE_DIRECTORY_ESCAPES_ROOT", `LatticeOS directory resolves outside the root: ${repositoryPath}`);
    }
    return canonical;
  }

  private async reuseIndexCacheDirectory(create: boolean): Promise<string> {
    await this.ensureOwnedDirectory(".lattice", create);
    return this.ensureOwnedDirectory(".lattice/cache", create);
  }

  private async latticeConfigDirectory(create: boolean): Promise<string | undefined> {
    const target = join(this.absolutePath, ".lattice");
    if (create) {
      try {
        await mkdir(target, { mode: 0o700 });
      } catch (error) {
        if (errorCode(error) !== "EEXIST") {
          throw new AnalyzerError("CONFIG_DIRECTORY_CREATE_FAILED", "Could not create .lattice for configuration.");
        }
      }
    }
    let metadata;
    try {
      metadata = await lstat(target);
    } catch (error) {
      if (errorCode(error) === "ENOENT") return undefined;
      throw new AnalyzerError("CONFIG_DIRECTORY_INVALID", ".lattice is unavailable for configuration.");
    }
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new AnalyzerError("CONFIG_DIRECTORY_INVALID", ".lattice is not a regular directory.");
    }
    let canonical: string;
    try {
      canonical = await realpath(target);
    } catch {
      throw new AnalyzerError("CONFIG_DIRECTORY_INVALID", ".lattice is unavailable for configuration.");
    }
    if (!inside(this.absolutePath, canonical)) {
      throw new AnalyzerError("CONFIG_DIRECTORY_ESCAPES_ROOT", ".lattice resolves outside the repository root.");
    }
    return canonical;
  }

  async inspectLatticeConfig(): Promise<LatticeConfigStatus> {
    const latticeDirectory = await this.latticeConfigDirectory(false);
    if (!latticeDirectory) return "missing";
    const target = join(latticeDirectory, "config.json");
    let metadata;
    try {
      metadata = await lstat(target);
    } catch (error) {
      if (errorCode(error) === "ENOENT") return "missing";
      throw new AnalyzerError("CONFIG_READ_FAILED", "LatticeOS configuration could not be inspected safely.", LATTICE_CONFIG_PATH);
    }
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new AnalyzerError("CONFIG_FILE_INVALID", "LatticeOS configuration is not a regular file.", LATTICE_CONFIG_PATH);
    }
    let canonical: string;
    try {
      canonical = await realpath(target);
    } catch {
      throw new AnalyzerError("CONFIG_READ_FAILED", "LatticeOS configuration could not be inspected safely.", LATTICE_CONFIG_PATH);
    }
    if (!inside(this.absolutePath, canonical)) {
      throw new AnalyzerError("CONFIG_FILE_ESCAPES_ROOT", "LatticeOS configuration resolves outside the repository root.", LATTICE_CONFIG_PATH);
    }
    return "present";
  }

  async writeInitialLatticeConfig(force = false): Promise<LatticeConfigWriteResult> {
    if (typeof force !== "boolean") {
      throw new AnalyzerError("CONFIG_WRITE_INVALID", "Configuration force option must be a boolean.", LATTICE_CONFIG_PATH);
    }
    const latticeDirectory = await this.latticeConfigDirectory(true);
    if (!latticeDirectory) {
      throw new AnalyzerError("CONFIG_DIRECTORY_INVALID", ".lattice is unavailable for configuration.");
    }
    const existing = await this.inspectLatticeConfig();
    if (existing === "present" && !force) return { status: "skipped" };

    const target = join(latticeDirectory, "config.json");
    const temporary = join(latticeDirectory, `.config-${randomUUID()}.tmp`);
    let handle;
    try {
      const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
      handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
      await handle.writeFile(INITIAL_LATTICE_CONFIG_CONTENT, "utf8");
      await handle.sync();
      await handle.close();
      handle = undefined;

      if (force) {
        await this.inspectLatticeConfig();
        await rename(temporary, target);
        return { status: "created" };
      }

      try {
        await link(temporary, target);
      } catch (error) {
        if (errorCode(error) !== "EEXIST") throw error;
        if (await this.inspectLatticeConfig() === "present") return { status: "skipped" };
        throw new AnalyzerError("CONFIG_WRITE_FAILED", "LatticeOS configuration could not be created safely.", LATTICE_CONFIG_PATH);
      }
      try {
        await unlink(temporary);
      } catch {
        // The configuration link is durable; a later cleanup can remove the unique temporary link.
      }
      return { status: "created" };
    } catch (error) {
      await handle?.close();
      try {
        await unlink(temporary);
      } catch {
        // The temporary path is unique and may have been linked, renamed, or removed.
      }
      if (error instanceof AnalyzerError) throw error;
      throw new AnalyzerError("CONFIG_WRITE_FAILED", "LatticeOS configuration could not be written safely.", LATTICE_CONFIG_PATH);
    }
  }

  private async readTextInternal(
    repositoryPath: string,
    maxBytes: number,
    allowDefaultExcluded: boolean,
  ): Promise<string> {
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > HARD_MAX_FILE_BYTES) {
      throw new AnalyzerError(
        "BOUND_INVALID",
        `Maximum read size must be an integer between 1 and ${HARD_MAX_FILE_BYTES}`,
      );
    }
    const resolved = await this.resolveExistingPath(repositoryPath, allowDefaultExcluded);
    let handle;
    try {
      const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
      handle = await open(resolved.canonical, constants.O_RDONLY | noFollow);
      const metadata = await handle.stat();
      if (!metadata.isFile()) {
        throw new AnalyzerError("PATH_NOT_FILE", `Repository path is not a regular file: ${resolved.requested}`, resolved.requested);
      }
      if (metadata.size > maxBytes) {
        throw new AnalyzerError(
          "FILE_TOO_LARGE",
          `Repository file exceeds the ${maxBytes} byte read limit: ${resolved.requested}`,
          resolved.requested,
        );
      }

      const bytes = Buffer.alloc(maxBytes + 1);
      let offset = 0;
      while (offset < bytes.byteLength) {
        const result = await handle.read(bytes, offset, bytes.byteLength - offset, null);
        if (result.bytesRead === 0) break;
        offset += result.bytesRead;
      }
      if (offset > maxBytes) {
        throw new AnalyzerError(
          "FILE_TOO_LARGE",
          `Repository file exceeds the ${maxBytes} byte read limit: ${resolved.requested}`,
          resolved.requested,
        );
      }
      return bytes.subarray(0, offset).toString("utf8");
    } catch (error) {
      if (error instanceof AnalyzerError) throw error;
      throw new AnalyzerError(
        "FILE_OPEN_FAILED",
        `Repository file could not be opened safely: ${resolved.requested}`,
        resolved.requested,
      );
    } finally {
      await handle?.close();
    }
  }

  async readText(repositoryPath: string, maxBytes = DEFAULT_MAX_FILE_BYTES): Promise<string> {
    return this.readTextInternal(repositoryPath, maxBytes, false);
  }

  async readStorybookComponentsManifest(maxBytes = DEFAULT_MAX_FILE_BYTES): Promise<string> {
    let target = this.absolutePath;
    for (const segment of STORYBOOK_COMPONENTS_MANIFEST_PATH.split("/")) {
      target = join(target, segment);
      let metadata;
      try {
        metadata = await lstat(target);
      } catch (error) {
        if (errorCode(error) === "ENOENT") return this.readTextInternal(STORYBOOK_COMPONENTS_MANIFEST_PATH, maxBytes, true);
        throw new AnalyzerError(
          "STORYBOOK_MANIFEST_UNREADABLE",
          "Storybook components manifest could not be inspected safely.",
          STORYBOOK_COMPONENTS_MANIFEST_PATH,
        );
      }
      if (metadata.isSymbolicLink()) {
        throw new AnalyzerError(
          "STORYBOOK_MANIFEST_SYMLINK",
          "Storybook components manifest path cannot contain a symbolic link.",
          STORYBOOK_COMPONENTS_MANIFEST_PATH,
        );
      }
    }
    return this.readTextInternal(STORYBOOK_COMPONENTS_MANIFEST_PATH, maxBytes, true);
  }

  async readReuseIndexCache(maxBytes = HARD_MAX_FILE_BYTES): Promise<string> {
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > HARD_MAX_FILE_BYTES) {
      throw new AnalyzerError(
        "BOUND_INVALID",
        `Maximum cache read size must be an integer between 1 and ${HARD_MAX_FILE_BYTES}`,
      );
    }
    const cacheDirectory = await this.reuseIndexCacheDirectory(false);
    const target = join(cacheDirectory, "reuse-index.json");
    let canonical: string;
    try {
      const metadata = await lstat(target);
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new AnalyzerError("CACHE_FILE_INVALID", `Reuse index cache is not a regular file: ${REUSE_INDEX_CACHE_PATH}`);
      }
      canonical = await realpath(target);
    } catch (error) {
      if (error instanceof AnalyzerError) throw error;
      if (errorCode(error) === "ENOENT") {
        throw new AnalyzerError("CACHE_NOT_FOUND", "Reuse index cache does not exist.", REUSE_INDEX_CACHE_PATH);
      }
      throw new AnalyzerError("CACHE_READ_FAILED", "Reuse index cache could not be opened safely.", REUSE_INDEX_CACHE_PATH);
    }
    if (!inside(this.absolutePath, canonical)) {
      throw new AnalyzerError("CACHE_FILE_ESCAPES_ROOT", `Reuse index cache resolves outside the root: ${REUSE_INDEX_CACHE_PATH}`);
    }

    let handle;
    try {
      const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
      handle = await open(canonical, constants.O_RDONLY | noFollow);
      const metadata = await handle.stat();
      if (!metadata.isFile()) {
        throw new AnalyzerError("CACHE_FILE_INVALID", `Reuse index cache is not a regular file: ${REUSE_INDEX_CACHE_PATH}`);
      }
      if (metadata.size > maxBytes) {
        throw new AnalyzerError(
          "CACHE_TOO_LARGE",
          `Reuse index cache exceeds the ${maxBytes} byte read limit.`,
          REUSE_INDEX_CACHE_PATH,
        );
      }
      const bytes = Buffer.alloc(maxBytes + 1);
      let offset = 0;
      while (offset < bytes.byteLength) {
        const result = await handle.read(bytes, offset, bytes.byteLength - offset, null);
        if (result.bytesRead === 0) break;
        offset += result.bytesRead;
      }
      if (offset > maxBytes) {
        throw new AnalyzerError(
          "CACHE_TOO_LARGE",
          `Reuse index cache exceeds the ${maxBytes} byte read limit.`,
          REUSE_INDEX_CACHE_PATH,
        );
      }
      return bytes.subarray(0, offset).toString("utf8");
    } catch (error) {
      if (error instanceof AnalyzerError) throw error;
      throw new AnalyzerError("CACHE_READ_FAILED", "Reuse index cache could not be read safely.", REUSE_INDEX_CACHE_PATH);
    } finally {
      await handle?.close();
    }
  }

  async writeReuseIndexCache(content: string): Promise<void> {
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > HARD_MAX_FILE_BYTES) {
      throw new AnalyzerError(
        "CACHE_TOO_LARGE",
        `Reuse index cache exceeds the ${HARD_MAX_FILE_BYTES} byte write limit.`,
        REUSE_INDEX_CACHE_PATH,
      );
    }
    const cacheDirectory = await this.reuseIndexCacheDirectory(true);
    const target = join(cacheDirectory, "reuse-index.json");
    const temporary = join(cacheDirectory, `.reuse-index-${randomUUID()}.tmp`);
    let handle;
    try {
      const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
      handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
      await handle.writeFile(content, "utf8");
      await handle.sync();
      await handle.close();
      handle = undefined;
      try {
        const metadata = await lstat(target);
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new AnalyzerError("CACHE_FILE_INVALID", `Reuse index cache is not a regular file: ${REUSE_INDEX_CACHE_PATH}`);
        }
      } catch (error) {
        if (error instanceof AnalyzerError) throw error;
        if (errorCode(error) !== "ENOENT") {
          throw new AnalyzerError("CACHE_WRITE_FAILED", "Reuse index cache could not be prepared safely.", REUSE_INDEX_CACHE_PATH);
        }
      }
      await rename(temporary, target);
    } catch (error) {
      await handle?.close();
      try {
        await unlink(temporary);
      } catch {
        // The temporary path is unique and may already have been renamed or removed.
      }
      if (error instanceof AnalyzerError) throw error;
      throw new AnalyzerError("CACHE_WRITE_FAILED", "Reuse index cache could not be replaced safely.", REUSE_INDEX_CACHE_PATH);
    }
  }

  async listFiles(options: ListFileOptions = {}): Promise<FileInventory> {
    const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    const maxDirectoryEntries = options.maxDirectoryEntries ?? DEFAULT_MAX_DIRECTORY_ENTRIES;
    const bounds = {
      maxFiles: [maxFiles, HARD_MAX_FILES],
      maxDepth: [maxDepth, HARD_MAX_DEPTH],
      maxFileBytes: [maxFileBytes, HARD_MAX_FILE_BYTES],
      maxDirectoryEntries: [maxDirectoryEntries, HARD_MAX_DIRECTORY_ENTRIES],
    } as const;
    for (const [name, [value, hardMaximum]] of Object.entries(bounds)) {
      if (!Number.isInteger(value) || value < 1 || value > hardMaximum) {
        throw new AnalyzerError("BOUND_INVALID", `${name} must be an integer between 1 and ${hardMaximum}`);
      }
    }

    const files: RepositoryPath[] = [];
    const diagnostics: AnalysisDiagnostic[] = [];
    let truncated = false;
    let stopped = false;
    let visitedFiles = 0;

    const visit = async (directory: string, depth: number): Promise<void> => {
      if (stopped) return;
      let entries: Dirent[] = [];
      try {
        let overflow = false;
        const handle = await opendir(directory);
        for await (const entry of handle) {
          if (entries.length >= maxDirectoryEntries) {
            overflow = true;
            break;
          }
          entries.push(entry);
        }
        if (overflow) {
          const repositoryPath = directory === this.absolutePath ? "." : portablePath(this.absolutePath, directory);
          diagnostics.push({
            code: "DIRECTORY_ENTRY_LIMIT",
            severity: "warning",
            message: `Skipped directory with more than ${maxDirectoryEntries} entries: ${repositoryPath}`,
            limitations: ["Project detection may be incomplete."],
          });
          truncated = true;
          return;
        }
        entries = entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
      } catch {
        const repositoryPath = directory === this.absolutePath ? "." : portablePath(this.absolutePath, directory);
        diagnostics.push({
          code: "DIRECTORY_UNREADABLE",
          severity: "warning",
          message: `Skipped unreadable directory: ${repositoryPath}`,
          limitations: ["Project detection may be incomplete."],
        });
        truncated = true;
        return;
      }
      for (const entry of entries) {
        if (stopped) break;
        const absolutePath = join(directory, entry.name);
        const repositoryPath = portablePath(this.absolutePath, absolutePath);
        if (isDefaultExcluded(repositoryPath)) continue;

        if (entry.isSymbolicLink()) {
          let target: string;
          try {
            target = await realpath(absolutePath);
          } catch {
            diagnostics.push({
              code: "SYMLINK_BROKEN",
              severity: "warning",
              message: `Skipped broken symlink: ${repositoryPath}`,
              limitations: ["The linked source was not analyzed."],
            });
            continue;
          }
          const targetInsideRoot = inside(this.absolutePath, target);
          diagnostics.push({
            code: targetInsideRoot ? "SYMLINK_SKIPPED" : "SYMLINK_ESCAPES_ROOT",
            severity: "warning",
            message: targetInsideRoot
              ? `Skipped symlink during discovery: ${repositoryPath}`
              : `Skipped symlink that resolves outside the repository: ${repositoryPath}`,
            limitations: ["Directory discovery does not follow symlinks."],
          });
          truncated = true;
          continue;
        }

        if (entry.isDirectory()) {
          if (depth >= maxDepth) {
            diagnostics.push({
              code: "DEPTH_LIMIT",
              severity: "warning",
              message: `Skipped directory beyond depth ${maxDepth}: ${repositoryPath}`,
              limitations: ["Project detection may be incomplete."],
            });
            truncated = true;
            continue;
          }
          await visit(absolutePath, depth + 1);
          continue;
        }

        if (!entry.isFile()) continue;
        if (visitedFiles >= maxFiles) {
          diagnostics.push({
            code: "FILE_COUNT_LIMIT",
            severity: "warning",
            message: `Stopped discovery at the ${maxFiles} file limit.`,
            limitations: ["Project detection may be incomplete."],
          });
          truncated = true;
          stopped = true;
          break;
        }
        visitedFiles += 1;
        let metadata;
        try {
          metadata = await stat(absolutePath);
        } catch {
          diagnostics.push({
            code: "FILE_UNREADABLE",
            severity: "warning",
            message: `Skipped unreadable file: ${repositoryPath}`,
            limitations: ["Evidence in this file was not analyzed."],
          });
          truncated = true;
          continue;
        }
        if (metadata.size > maxFileBytes) {
          diagnostics.push({
            code: "FILE_SIZE_LIMIT",
            severity: "warning",
            message: `Skipped file larger than ${maxFileBytes} bytes: ${repositoryPath}`,
            limitations: ["Evidence in this file was not analyzed."],
          });
          truncated = true;
          continue;
        }
        files.push(repositoryPath);
      }
    };

    await visit(this.absolutePath, 0);
    return { files: files.sort(), diagnostics, truncated };
  }
}
