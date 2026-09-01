import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";

export const BENCHMARK_SCHEMA_VERSION = 1;
export const MAX_ARTIFACT_BYTES = 1024 * 1024;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function isSafeRelativePath(value, extensions = []) {
  if (typeof value !== "string" || value.length === 0 || value.length > 240 || value.includes("\\") || /[\u0000-\u001f]/u.test(value)) {
    return false;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return false;
  return extensions.length === 0 || extensions.some((extension) => value.endsWith(extension));
}

export function isBoundedString(value, maximum = 4_096) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u001f]/u.test(value);
}

export function addError(errors, code, detail) {
  errors.push(`${code}: ${detail}`);
}

export async function readBoundedFile(root, path, extensions, label, errors) {
  if (!isSafeRelativePath(path, extensions)) {
    addError(errors, "invalid-artifact-path", label);
    return undefined;
  }

  let rootPath;
  try {
    rootPath = await realpath(root);
  } catch {
    addError(errors, "artifact-root-unavailable", label);
    return undefined;
  }
  const target = resolve(rootPath, path);
  if (relative(rootPath, target).startsWith("..")) {
    addError(errors, "artifact-path-escape", label);
    return undefined;
  }

  let current = rootPath;
  for (const segment of path.split("/")) {
    current = resolve(current, segment);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) {
        addError(errors, "artifact-symlink", label);
        return undefined;
      }
    } catch {
      addError(errors, "artifact-missing", label);
      return undefined;
    }
  }

  try {
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.size > MAX_ARTIFACT_BYTES) {
      addError(errors, "artifact-not-bounded-file", label);
      return undefined;
    }
    const content = await readFile(target);
    return content;
  } catch {
    addError(errors, "artifact-unreadable", label);
    return undefined;
  }
}

export async function readVerifiedArtifact(root, artifact, extensions, label, errors) {
  if (!isRecord(artifact) || !SHA256_PATTERN.test(artifact.sha256 ?? "")) {
    addError(errors, "invalid-artifact", label);
    return undefined;
  }
  const content = await readBoundedFile(root, artifact.path, extensions, label, errors);
  if (content && sha256(content) !== artifact.sha256) {
    addError(errors, "artifact-hash-mismatch", label);
    return undefined;
  }
  return content;
}
