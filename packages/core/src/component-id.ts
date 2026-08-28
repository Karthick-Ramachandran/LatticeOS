import type { ComponentId, RepositoryPath } from "./types.js";

export interface ComponentIdentity {
  readonly packageKey: string;
  readonly sourcePath: RepositoryPath;
  readonly exportKey: string;
}

const windowsAbsolutePath = /^[A-Za-z]:[\\/]/u;

export function normalizeRepositoryPath(path: string, allowRoot = false): RepositoryPath {
  if (path.length === 0 || /[\u0000-\u001F\u007F]/u.test(path) || windowsAbsolutePath.test(path)) {
    throw new Error(`Invalid repository path: ${JSON.stringify(path)}`);
  }

  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`Repository path must be relative and normalized: ${JSON.stringify(path)}`);
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "..")) {
    throw new Error(`Repository path escapes or contains an empty segment: ${JSON.stringify(path)}`);
  }

  const compact = segments.filter((segment) => segment !== ".").join("/");
  if (compact.length === 0) {
    if (allowRoot) return ".";
    throw new Error("A source path cannot resolve to the repository root");
  }

  return compact;
}

function assertIdentityPart(label: string, value: string, forbidden: RegExp): void {
  if (value.trim() !== value || value.length === 0 || forbidden.test(value)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`);
  }
}

export function createComponentId(identity: ComponentIdentity): ComponentId {
  assertIdentityPart("package key", identity.packageKey, /[:#\r\n]/u);
  assertIdentityPart("export key", identity.exportKey, /[#\r\n]/u);
  const sourcePath = normalizeRepositoryPath(identity.sourcePath);
  return `react:${identity.packageKey}:${sourcePath}#${identity.exportKey}`;
}

export function parseComponentId(id: string): ComponentIdentity | undefined {
  if (!id.startsWith("react:")) return undefined;

  const body = id.slice("react:".length);
  const packageSeparator = body.indexOf(":");
  const exportSeparator = body.lastIndexOf("#");
  if (packageSeparator <= 0 || exportSeparator <= packageSeparator + 1) return undefined;

  const packageKey = body.slice(0, packageSeparator);
  const sourcePath = body.slice(packageSeparator + 1, exportSeparator);
  const exportKey = body.slice(exportSeparator + 1);

  try {
    const normalized = createComponentId({ packageKey, sourcePath, exportKey });
    if (normalized !== id) return undefined;
    return { packageKey, sourcePath, exportKey };
  } catch {
    return undefined;
  }
}

export function isComponentId(value: string): value is ComponentId {
  return parseComponentId(value) !== undefined;
}
