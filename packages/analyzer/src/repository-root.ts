import { constants, type Dirent } from "node:fs";
import { open, opendir, realpath, stat } from "node:fs/promises";
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

function inside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot));
}

function portablePath(root: string, absolutePath: string): RepositoryPath {
  const path = relative(root, absolutePath).split(sep).join("/");
  return normalizeRepositoryPath(path);
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

  private async resolveExistingPath(repositoryPath: string): Promise<{ requested: RepositoryPath; canonical: string }> {
    let normalized: RepositoryPath;
    try {
      normalized = normalizeRepositoryPath(repositoryPath);
    } catch (error) {
      throw new AnalyzerError(
        "PATH_INVALID",
        error instanceof Error ? error.message : "Repository path is invalid",
      );
    }
    if (isDefaultExcluded(normalized)) {
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

  async readText(repositoryPath: string, maxBytes = DEFAULT_MAX_FILE_BYTES): Promise<string> {
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > HARD_MAX_FILE_BYTES) {
      throw new AnalyzerError(
        "BOUND_INVALID",
        `Maximum read size must be an integer between 1 and ${HARD_MAX_FILE_BYTES}`,
      );
    }
    const resolved = await this.resolveExistingPath(repositoryPath);
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
