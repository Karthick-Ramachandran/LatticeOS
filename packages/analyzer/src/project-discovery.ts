import { createHash } from "node:crypto";

import {
  compareStrings,
  type AnalysisDiagnostic,
  type EvidenceRecord,
  type ToolDetection,
  type UiPackage,
  type UiProject,
} from "@latticeos/core";

import { AnalyzerError, RepositoryRoot, type ListFileOptions } from "./repository-root.js";

interface ManifestRecord {
  readonly path: string;
  readonly rootPath: string;
  readonly value: Record<string, unknown>;
  readonly content: string;
}

interface ProjectMarker {
  readonly path: string;
  readonly content?: string;
  readonly method?: EvidenceRecord["method"];
}

export interface ProjectDiscovery {
  readonly project: UiProject;
  readonly packages: readonly UiPackage[];
  readonly files: readonly string[];
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
  readonly truncated: boolean;
}

function fingerprint(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function evidenceId(scope: string, name: string, path: string): string {
  const key = createHash("sha256").update(`${scope}\0${name}\0${path}`).digest("hex").slice(0, 16);
  return `ev:${scope}:${name}:${key}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dependencyNames(manifest: Record<string, unknown>): Set<string> {
  const result = new Set<string>();
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const) {
    const dependencies = manifest[field];
    if (!isRecord(dependencies)) continue;
    Object.keys(dependencies).forEach((name) => result.add(name));
  }
  return result;
}

function extractWorkspacePatterns(rootManifest: Record<string, unknown> | undefined, pnpmWorkspace: string | undefined): string[] {
  const patterns: string[] = [];
  const workspaces = rootManifest?.workspaces;
  if (Array.isArray(workspaces)) patterns.push(...workspaces.filter((item): item is string => typeof item === "string"));
  if (isRecord(workspaces) && Array.isArray(workspaces.packages)) {
    patterns.push(...workspaces.packages.filter((item): item is string => typeof item === "string"));
  }
  if (pnpmWorkspace) {
    let inPackages = false;
    for (const line of pnpmWorkspace.split(/\r?\n/u)) {
      const section = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(?:#.*)?$/u);
      if (section?.[1]) {
        inPackages = section[1] === "packages";
        continue;
      }
      if (!inPackages) continue;
      const match = line.match(/^\s*-\s*["']?([^"'#]+?)["']?\s*(?:#.*)?$/u);
      if (match?.[1]) patterns.push(match[1].trim());
    }
  }
  return [...new Set(patterns.map((item) => item.replace(/^\.\//u, "").replace(/\/$/u, "")))].sort(compareStrings);
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

function matchesWorkspace(path: string, pattern: string): boolean {
  const source = escapeRegex(pattern).replaceAll("**", "\0").replaceAll("*", "[^/]*").replaceAll("\0", ".*");
  return new RegExp(`^${source}$`, "u").test(path);
}

function matchesWorkspacePatterns(path: string, patterns: readonly string[]): boolean {
  const included = patterns.filter((pattern) => !pattern.startsWith("!")).some((pattern) => matchesWorkspace(path, pattern));
  const excluded = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .some((pattern) => matchesWorkspace(path, pattern.slice(1)));
  return included && !excluded;
}

function markerEvidence(
  name: string,
  path: string,
  content: string,
  method: EvidenceRecord["method"],
): EvidenceRecord {
  return {
    id: evidenceId("project", name, path),
    kind: "project",
    location: { path, line: 1, column: 1 },
    method,
    classification: "exact",
    fingerprint: fingerprint(content),
    limitations: [],
  };
}

function packageEvidence(path: string, content: string): EvidenceRecord {
  return {
    id: evidenceId("package", "manifest", path),
    kind: "package",
    location: { path, line: 1, column: 1 },
    method: "manifest",
    classification: "exact",
    fingerprint: fingerprint(content),
    limitations: [],
  };
}

async function readOptional(root: RepositoryRoot, path: string): Promise<string | undefined> {
  try {
    return await root.readText(path);
  } catch (error) {
    if (error instanceof AnalyzerError && error.code === "PATH_NOT_FOUND") return undefined;
    throw error;
  }
}

function findDependencyMarker(manifests: readonly ManifestRecord[], predicate: (name: string) => boolean): ManifestRecord | undefined {
  return manifests.find((manifest) => [...dependencyNames(manifest.value)].some(predicate));
}

function detectPackageManager(files: ReadonlySet<string>, rootManifest: Record<string, unknown> | undefined): UiProject["packageManager"] {
  if (files.has("pnpm-lock.yaml")) return "pnpm";
  if (files.has("package-lock.json")) return "npm";
  if (files.has("yarn.lock")) return "yarn";
  if (files.has("bun.lock") || files.has("bun.lockb")) return "bun";
  const declared = rootManifest?.packageManager;
  if (typeof declared === "string") {
    if (declared.startsWith("pnpm@")) return "pnpm";
    if (declared.startsWith("npm@")) return "npm";
    if (declared.startsWith("yarn@")) return "yarn";
    if (declared.startsWith("bun@")) return "bun";
  }
  return "unknown";
}

export async function detectProject(root: RepositoryRoot, options: ListFileOptions = {}): Promise<ProjectDiscovery> {
  const inventory = await root.listFiles(options);
  const files = new Set(inventory.files);
  const diagnostics: AnalysisDiagnostic[] = [...inventory.diagnostics];
  const allManifests: ManifestRecord[] = [];

  for (const path of inventory.files.filter((item) => item === "package.json" || item.endsWith("/package.json"))) {
    let content: string;
    try {
      content = await root.readText(path);
    } catch {
      diagnostics.push({
        code: "MANIFEST_UNREADABLE",
        severity: "warning",
        message: `Skipped unreadable package manifest: ${path}`,
        limitations: ["Dependencies and workspace ownership from this manifest are unknown."],
      });
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(content);
      if (!isRecord(parsed)) throw new Error("manifest root must be an object");
      allManifests.push({
        path,
        rootPath: path === "package.json" ? "." : path.slice(0, -"/package.json".length),
        value: parsed,
        content,
      });
    } catch {
      diagnostics.push({
        code: "MANIFEST_INVALID",
        severity: "warning",
        message: `Skipped malformed package manifest: ${path}`,
        limitations: ["Dependencies and workspace ownership from this manifest are unknown."],
      });
    }
  }

  const rootManifest = allManifests.find((item) => item.path === "package.json");
  const pnpmWorkspace = files.has("pnpm-workspace.yaml") ? await readOptional(root, "pnpm-workspace.yaml") : undefined;
  const workspacePatterns = extractWorkspacePatterns(rootManifest?.value, pnpmWorkspace);
  const manifests = allManifests.filter(
    (item) => item.rootPath === "." || matchesWorkspacePatterns(item.rootPath, workspacePatterns),
  );
  const evidence: EvidenceRecord[] = manifests.map((item) => packageEvidence(item.path, item.content));
  const packageEvidenceByPath = new Map(evidence.map((item) => [item.location.path, item.id]));
  const usedKeys = new Set<string>();
  const packages: UiPackage[] = manifests.map((manifest) => {
    const rawName = typeof manifest.value.name === "string" ? manifest.value.name : undefined;
    const name = rawName && rawName.trim() === rawName && !/[:#\r\n]/u.test(rawName) ? rawName : undefined;
    if (rawName && !name) {
      diagnostics.push({
        code: "PACKAGE_NAME_UNSUPPORTED",
        severity: "warning",
        message: `Package name at ${manifest.path} cannot be used as a stable package key; the repository path is used instead.`,
        limitations: ["Component IDs use the repository-relative package path."],
      });
    }
    let key = manifest.rootPath === "." ? "root" : (name ?? manifest.rootPath);
    if (usedKeys.has(key)) {
      diagnostics.push({
        code: "PACKAGE_KEY_COLLISION",
        severity: "warning",
        message: `Package key '${key}' is duplicated at ${manifest.rootPath}; the path is appended for stable identity.`,
        limitations: ["Component IDs use the disambiguated package key."],
      });
      key = `${key}@${manifest.rootPath}`;
    }
    usedKeys.add(key);
    return {
      key,
      ...(name ? { name } : {}),
      rootPath: manifest.rootPath,
      manifestPath: manifest.path,
      evidenceIds: [packageEvidenceByPath.get(manifest.path) as string],
    };
  });
  if (!packages.some((item) => item.rootPath === ".")) {
    packages.push({ key: "root", rootPath: ".", evidenceIds: [] });
  }

  const incompleteDetection = inventory.truncated || diagnostics.some((item) => item.code.startsWith("MANIFEST_"));

  const addMarker = async (
    name: keyof UiProject["tools"],
    marker: ProjectMarker | undefined,
    uncertain = false,
  ): Promise<ToolDetection> => {
    if (!marker) return { status: incompleteDetection || uncertain ? "unknown" : "absent", evidenceIds: [] };
    let content: string;
    try {
      content = marker.content ?? (await root.readText(marker.path));
    } catch {
      diagnostics.push({
        code: "TOOL_MARKER_UNREADABLE",
        severity: "warning",
        message: `Could not read the ${name} marker at ${marker.path}.`,
        limitations: [`${name} detection is unknown.`],
      });
      return { status: "unknown", evidenceIds: [] };
    }
    const record = markerEvidence(name, marker.path, content, marker.method ?? "static-config");
    evidence.push(record);
    return { status: "present", evidenceIds: [record.id] };
  };

  const dependencyMarker = (predicate: (name: string) => boolean): ProjectMarker | undefined => {
    const manifest = findDependencyMarker(manifests, predicate);
    return manifest ? { path: manifest.path, content: manifest.content, method: "manifest" } : undefined;
  };
  const pathMarker = (predicate: (path: string) => boolean): ProjectMarker | undefined => {
    const path = inventory.files.find(predicate);
    return path ? { path } : undefined;
  };

  const react = await addMarker("react", dependencyMarker((name) => name === "react"));
  const nextjs = await addMarker(
    "nextjs",
    dependencyMarker((name) => name === "next") ?? pathMarker((path) => /(^|\/)next\.config\.(?:js|cjs|mjs|ts)$/u.test(path)),
  );
  const typescript = await addMarker(
    "typescript",
    dependencyMarker((name) => name === "typescript") ?? pathMarker((path) => /(^|\/)tsconfig(?:\.[^/]+)?\.json$/u.test(path)),
  );

  let tailwindMarker: ProjectMarker | undefined = dependencyMarker((name) => name === "tailwindcss");
  let tailwindUncertain = false;
  if (!tailwindMarker) tailwindMarker = pathMarker((path) => /(^|\/)tailwind\.config\.(?:js|cjs|mjs|ts)$/u.test(path));
  if (!tailwindMarker) {
    for (const path of inventory.files.filter((item) => item.endsWith(".css"))) {
      let content: string;
      try {
        content = await root.readText(path);
      } catch {
        diagnostics.push({
          code: "TOOL_MARKER_UNREADABLE",
          severity: "warning",
          message: `Could not read a possible Tailwind marker at ${path}.`,
          limitations: ["Tailwind detection is unknown."],
        });
        tailwindUncertain = true;
        continue;
      }
      if (/(?:^|\s)@theme\b/u.test(content)) {
        tailwindMarker = { path, content, method: "css" };
        break;
      }
    }
  }
  const tailwind = await addMarker("tailwind", tailwindMarker, tailwindUncertain);

  let shadcnMarker: ProjectMarker | undefined;
  let shadcnUncertain = false;
  for (const path of inventory.files.filter((item) => item === "components.json" || item.endsWith("/components.json"))) {
    let content: string;
    try {
      content = await root.readText(path);
      const parsed: unknown = JSON.parse(content);
      const schema = isRecord(parsed) ? parsed.$schema : undefined;
      const supported =
        isRecord(parsed) &&
        ((typeof schema === "string" && schema.includes("ui.shadcn.com")) ||
          (typeof parsed.style === "string" && isRecord(parsed.aliases)));
      if (supported) {
        shadcnMarker = { path, content, method: "static-config" };
        break;
      }
      throw new Error("unsupported shadcn marker");
    } catch {
      diagnostics.push({
        code: "SHADCN_MARKER_INVALID",
        severity: "warning",
        message: `Ignored malformed or unsupported shadcn marker: ${path}`,
        limitations: ["shadcn detection is unknown unless another valid marker is found."],
      });
      shadcnUncertain = true;
    }
  }
  const shadcn = await addMarker("shadcn", shadcnMarker, shadcnUncertain);
  const storybook = await addMarker(
    "storybook",
    dependencyMarker((name) => name === "storybook" || name.startsWith("@storybook/")) ??
      pathMarker((path) => /(^|\/)\.storybook\/(?:main|preview)\.(?:js|cjs|mjs|ts|tsx)$/u.test(path)),
  );

  return {
    project: {
      rootPath: ".",
      packageManager: detectPackageManager(files, rootManifest?.value),
      tools: { react, nextjs, typescript, tailwind, shadcn, storybook },
    },
    packages: packages.sort((left, right) => compareStrings(left.key, right.key)),
    files: inventory.files,
    evidence: evidence.sort((left, right) => compareStrings(left.id, right.id)),
    diagnostics: diagnostics.sort(
      (left, right) => compareStrings(left.code, right.code) || compareStrings(left.message, right.message),
    ),
    truncated: inventory.truncated,
  };
}
